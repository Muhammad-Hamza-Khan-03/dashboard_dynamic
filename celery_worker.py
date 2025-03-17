import os
import queue
import time
import json
import logging
import traceback
import threading
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import sqlite3
from celery import Celery, Task, group, chain, chord
from celery.result import AsyncResult
from scipy import stats

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler("worker.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Celery configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

# Create Celery app
celery_app = Celery('stats_worker', 
                    broker=CELERY_BROKER_URL,
                    backend=CELERY_RESULT_BACKEND)

# Celery configuration
celery_app.conf.update(
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_time_limit=3600,  # 1 hour timeout for tasks
    task_soft_time_limit=3000,  # 50 minutes soft timeout
    task_default_queue='stats_queue',
    broker_transport_options={'visibility_timeout': 3600},
    result_expires=86400,  # Results expire after 1 day
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# Constants
MAX_WORKERS = 4  # Maximum number of threads per column processing task
CHUNK_SIZE = 50000  # Chunk size for large tables
MAX_SAMPLE_SIZE = 10000  # Maximum sample size for dataset statistics
COLUMN_BATCH_SIZE = 5  # Number of columns to process in parallel

# Database connection helpers
def get_db_connection(db_name: str) -> sqlite3.Connection:
    """Get a database connection with proper settings."""
    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row
    return conn

def close_db_connection(conn: sqlite3.Connection) -> None:
    """Safely close a database connection."""
    if conn:
        conn.close()

# Task status management
def update_task_status(task_id: str, status: str, progress: Optional[float] = None, 
                       message: Optional[str] = None) -> bool:
    """Update the status of a statistics calculation task."""
    conn = None
    try:
        conn = get_db_connection('stats.db')
        c = conn.cursor()
        
        # Update task status
        if progress is not None and message is not None:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?, progress = ?, message = ?
                WHERE task_id = ?
            """, (status, progress, message, task_id))
        elif progress is not None:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?, progress = ?
                WHERE task_id = ?
            """, (status, progress, task_id))
        elif message is not None:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?, message = ?
                WHERE task_id = ?
            """, (status, message, task_id))
        else:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?
                WHERE task_id = ?
            """, (status, task_id))
        
        # If task is completed, update the completed_at timestamp
        if status == 'completed':
            c.execute("""
                UPDATE stats_tasks 
                SET completed_at = CURRENT_TIMESTAMP
                WHERE task_id = ?
            """, (task_id,))
        
        conn.commit()
        
        # Update global status dictionary for quicker access
        # Celery tasks can't access global variables across processes, 
        # so we store them in the database only
        
        return True
    except Exception as e:
        logger.error(f"Error updating task status: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        close_db_connection(conn)

class StatisticsTask(Task):
    """Base class for statistics tasks with error handling."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        try:
            # Extract the main task_id from args
            main_task_id = args[0] if args else kwargs.get('task_id')
            if main_task_id:
                update_task_status(
                    main_task_id, 
                    'failed', 
                    message=f"Task failed: {str(exc)}"
                )
                logger.error(f"Task {task_id} failed for main task {main_task_id}: {str(exc)}")
            else:
                logger.error(f"Task {task_id} failed but couldn't find main task_id in args/kwargs")
        except Exception as e:
            logger.error(f"Error in on_failure handler: {str(e)}")
            
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry."""
        try:
            main_task_id = args[0] if args else kwargs.get('task_id')
            if main_task_id:
                update_task_status(
                    main_task_id, 
                    'processing', 
                    message=f"Retrying due to error: {str(exc)}"
                )
        except Exception as e:
            logger.error(f"Error in on_retry handler: {str(e)}")

# Column statistics calculation with optimizations
def calculate_column_statistics_chunked(df: pd.DataFrame, column_name: str, sample_size: int = 50000) -> Dict[str, Any]:
    """Calculate statistics for a column using sampling and chunking for large datasets."""
    
    # If df is very large, use a sample
    if len(df) > sample_size:
        column_data = df[column_name].sample(sample_size)
    else:
        column_data = df[column_name]
    
    # Determine data type
    if pd.api.types.is_numeric_dtype(column_data):
        data_type = 'numeric'
        # Filter out NaN values for calculations
        clean_data = column_data.dropna()
        
        if len(clean_data) == 0:
            # Handle empty columns
            return {
                'data_type': 'numeric',
                'basic_stats': json.dumps({'missing_count': len(column_data), 'missing_percentage': 100.0}),
                'distribution': json.dumps({}),
                'shape_stats': json.dumps({}),
                'outlier_stats': json.dumps({})
            }
        
        # Basic stats computation
        basic_stats = {
            'min': float(clean_data.min()),
            'max': float(clean_data.max()),
            'mean': float(clean_data.mean()),
            'median': float(clean_data.median()),
            'count': int(len(clean_data)),
            'missing_count': int(len(column_data) - len(clean_data)),
            'missing_percentage': float((len(column_data) - len(clean_data)) / len(column_data) * 100)
        }
        
        # Try to get mode, but handle potential errors
        try:
            mode_result = clean_data.mode()
            basic_stats['mode'] = float(mode_result.iloc[0]) if not mode_result.empty else None
        except Exception:
            basic_stats['mode'] = None
        
        # Calculate quartiles
        q1 = float(clean_data.quantile(0.25))
        q3 = float(clean_data.quantile(0.75))
        iqr = q3 - q1
        
        # For large datasets, limit number of bins for histogram
        bin_count = min(50, max(10, int(len(clean_data) / 1000)))
        
        try:
            hist, bin_edges = np.histogram(clean_data, bins=bin_count)
            
            # Generate a sampled version of the data for QQ-plot
            # Use sampling for huge datasets
            if len(clean_data) > 10000:
                sample_size = 5000
                sampled_data = clean_data.sample(sample_size) if len(clean_data) > sample_size else clean_data
                sorted_sample = sampled_data.sort_values().values
                n = len(sorted_sample)
                
                # Handle potential overflow in ppf calculation
                try:
                    theoretical_quantiles = np.array([stats.norm.ppf((i + 0.5) / n) for i in range(n)])
                    valid_mask = ~np.isnan(theoretical_quantiles)
                    x_values = theoretical_quantiles[valid_mask].tolist()
                    y_values = sorted_sample[valid_mask].tolist()
                except Exception as e:
                    logger.warning(f"Error calculating QQ plot for {column_name}: {str(e)}")
                    x_values = []
                    y_values = []
            else:
                sorted_values = clean_data.sort_values().values
                n = len(sorted_values)
                
                try:
                    theoretical_quantiles = np.array([stats.norm.ppf((i + 0.5) / n) for i in range(n)])
                    valid_mask = ~np.isnan(theoretical_quantiles)
                    x_values = theoretical_quantiles[valid_mask].tolist()
                    y_values = sorted_values[valid_mask].tolist()
                except Exception as e:
                    logger.warning(f"Error calculating QQ plot for {column_name}: {str(e)}")
                    x_values = []
                    y_values = []
            
            distribution = {
                'histogram': {
                    'counts': hist.tolist(),
                    'bin_edges': bin_edges.tolist()
                },
                'boxplot': {
                    'q1': float(q1),
                    'q3': float(q3),
                    'median': basic_stats['median'],
                    'whislo': float(max(basic_stats['min'], q1 - 1.5 * iqr)),
                    'whishi': float(min(basic_stats['max'], q3 + 1.5 * iqr))
                },
                'qqplot': {
                    'x': x_values,
                    'y': y_values
                }
            }
        except Exception as e:
            logger.warning(f"Error generating distribution for {column_name}: {str(e)}")
            distribution = {}
        
        # Calculate skewness and kurtosis on sampled data for large datasets
        if len(clean_data) > 50000:
            sample_size = 10000
            skew_sample = clean_data.sample(sample_size) if len(clean_data) > sample_size else clean_data
            
            try:
                skewness = float(skew_sample.skew())
                kurtosis = float(skew_sample.kurtosis())
            except Exception as e:
                logger.warning(f"Error calculating shape stats for {column_name}: {str(e)}")
                skewness = 0.0
                kurtosis = 0.0
        else:
            try:
                skewness = float(clean_data.skew())
                kurtosis = float(clean_data.kurtosis())
            except Exception as e:
                logger.warning(f"Error calculating shape stats for {column_name}: {str(e)}")
                skewness = 0.0
                kurtosis = 0.0
        
        shape_stats = {
            'skewness': skewness,
            'kurtosis': kurtosis,
            'range': float(basic_stats['max'] - basic_stats['min'])
        }
        
        # Find outliers - limit to prevent memory issues
        try:
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            # Use boolean indexing for efficiency
            outlier_mask = (clean_data < lower_bound) | (clean_data > upper_bound)
            outlier_count = outlier_mask.sum()
            
            # Get a limited number of example outliers
            max_outliers = 100
            outlier_examples = clean_data[outlier_mask].head(max_outliers).tolist()
            
            outlier_stats = {
                'count': int(outlier_count),
                'percentage': float((outlier_count / len(clean_data)) * 100),
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound),
                'outlier_values': outlier_examples
            }
        except Exception as e:
            logger.warning(f"Error calculating outliers for {column_name}: {str(e)}")
            outlier_stats = {}
    
    elif pd.api.types.is_categorical_dtype(column_data) or pd.api.types.is_object_dtype(column_data):
        data_type = 'categorical'
        
        # For large datasets, limit the number of unique values processed
        if len(column_data) > 100000:
            sample = column_data.sample(min(50000, len(column_data)))
            value_counts = sample.value_counts()
        else:
            value_counts = column_data.value_counts()
        
        # Limit to top 1000 categories for very large categorical columns
        if len(value_counts) > 1000:
            value_counts = value_counts.head(1000)
        
        basic_stats = {
            'unique_count': int(value_counts.shape[0]),
            'missing_count': int(column_data.isna().sum()),
            'missing_percentage': float(column_data.isna().sum() / len(column_data) * 100)
        }
        
        # Try to get top value, but handle potential errors
        try:
            if not value_counts.empty:
                basic_stats['top'] = str(value_counts.index[0])
                basic_stats['top_count'] = int(value_counts.iloc[0])
            else:
                basic_stats['top'] = None
                basic_stats['top_count'] = 0
        except Exception:
            basic_stats['top'] = None
            basic_stats['top_count'] = 0
        
        # Distribution for categorical data
        value_dict = {}
        for k, v in value_counts.items():
            # Convert key to string to ensure JSON serialization
            key = str(k) if k is not None else 'null'
            value_dict[key] = int(v)
            
        distribution = {
            'value_counts': value_dict
        }
        
        # Shape stats (minimal for categorical)
        # Calculate entropy with a limit on number of categories
        try:
            entropy_val = float(stats.entropy(value_counts.values)) if len(value_counts) > 1 else 0
            shape_stats = {'entropy': entropy_val}
        except Exception as e:
            logger.warning(f"Error calculating entropy for {column_name}: {str(e)}")
            shape_stats = {'entropy': 0}
        
        # No outliers for categorical data
        outlier_stats = {}
    
    else:
        # For other types (datetime, etc.)
        data_type = 'other'
        missing_count = column_data.isna().sum()
        basic_stats = {
            'missing_count': int(missing_count),
            'missing_percentage': float(missing_count / len(column_data) * 100)
        }
        distribution = {}
        shape_stats = {}
        outlier_stats = {}
    
    # Ensure the results are JSON serializable and handle potential NaN/Infinity values
    def clean_for_json(obj):
        """Ensure all values are JSON serializable."""
        if isinstance(obj, dict):
            return {k: clean_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [clean_for_json(v) for v in obj]
        elif isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        else:
            return obj
    
    return {
        'data_type': data_type,
        'basic_stats': json.dumps(clean_for_json(basic_stats)),
        'distribution': json.dumps(clean_for_json(distribution)),
        'shape_stats': json.dumps(clean_for_json(shape_stats)),
        'outlier_stats': json.dumps(clean_for_json(outlier_stats))
    }

def calculate_dataset_statistics_optimized(df: pd.DataFrame, max_columns: int = 15, 
                                          sample_size: int = 5000) -> Dict[str, str]:
    """Calculate dataset-level statistics with optimizations for large datasets."""
    # Only include numeric columns for dataset-wide statistics
    numeric_df = df.select_dtypes(include=['number'])
    
    if numeric_df.empty or numeric_df.shape[1] < 2:
        # Not enough numeric columns for meaningful dataset statistics
        return {
            'correlation_matrix': '{}',
            'parallel_coords': '{}',
            'violin_data': '{}',
            'heatmap_data': '{}',
            'scatter_matrix': '{}'
        }
    
    # Limit the number of columns to analyze
    if numeric_df.shape[1] > max_columns:
        # Choose columns with highest variance
        variances = numeric_df.var().sort_values(ascending=False)
        selected_columns = variances.head(max_columns).index.tolist()
        numeric_df = numeric_df[selected_columns]
    
    # Sample the data for large datasets
    if len(df) > sample_size:
        sampled_df = numeric_df.sample(sample_size)
    else:
        sampled_df = numeric_df
    
    # Calculate correlation matrix with error handling
    try:
        corr_matrix = sampled_df.corr().round(4).fillna(0)
        corr_dict = {col: corr_matrix[col].to_dict() for col in corr_matrix.columns}
    except Exception as e:
        logger.warning(f"Error calculating correlation matrix: {str(e)}")
        corr_dict = {}
    
    # Calculate p-values for correlations - with optimizations and error handling
    p_values = {}
    for col1 in numeric_df.columns:
        p_values[col1] = {}
        for col2 in numeric_df.columns:
            if col1 != col2:
                # Use the sampled data for p-value calculations
                try:
                    clean_data1 = sampled_df[col1].dropna()
                    clean_data2 = sampled_df[col2].dropna()
                    
                    # Only calculate if there's enough data
                    if len(clean_data1) > 2 and len(clean_data2) > 2:
                        try:
                            _, p_value = stats.pearsonr(clean_data1, clean_data2)
                            p_values[col1][col2] = float(p_value)
                        except Exception:
                            p_values[col1][col2] = 1.0
                    else:
                        p_values[col1][col2] = 1.0
                except Exception:
                    p_values[col1][col2] = 1.0
            else:
                p_values[col1][col2] = 0.0  # p-value for correlation with self
    
    # Prepare parallel coordinates data with error handling
    try:
        # Normalize sampled data for visualization
        parallel_df = sampled_df.copy()
        for col in parallel_df.columns:
            min_val = parallel_df[col].min()
            max_val = parallel_df[col].max()
            if max_val > min_val:
                parallel_df[col] = (parallel_df[col] - min_val) / (max_val - min_val)
        
        # Limit to 1000 rows for parallel coords
        viz_sample_size = min(1000, len(parallel_df))
        viz_df = parallel_df.sample(viz_sample_size) if len(parallel_df) > viz_sample_size else parallel_df
        
        parallel_coords = {
            'columns': numeric_df.columns.tolist(),
            'data': viz_df.fillna(0).values.tolist(),
            'ranges': {col: [float(numeric_df[col].min()), float(numeric_df[col].max())] 
                     for col in numeric_df.columns}
        }
    except Exception as e:
        logger.warning(f"Error calculating parallel coordinates data: {str(e)}")
        parallel_coords = {}
    
    # Prepare violin plot data with error handling
    try:
        # Limit data points for each violin
        max_points_per_violin = 1000
        violin_data = {
            'columns': numeric_df.columns.tolist(),
            'data': {
                col: numeric_df[col].dropna().sample(
                    min(max_points_per_violin, numeric_df[col].dropna().shape[0])
                ).tolist() for col in numeric_df.columns
            },
            'stats': {
                col: {
                    'min': float(numeric_df[col].min()),
                    'max': float(numeric_df[col].max()),
                    'mean': float(numeric_df[col].mean()),
                    'median': float(numeric_df[col].median()),
                    'q1': float(numeric_df[col].quantile(0.25)),
                    'q3': float(numeric_df[col].quantile(0.75))
                } for col in numeric_df.columns
            }
        }
    except Exception as e:
        logger.warning(f"Error calculating violin plot data: {str(e)}")
        violin_data = {}
    
    # Prepare heatmap data with error handling
    try:
        heatmap_data = {
            'z': corr_matrix.values.tolist(),
            'x': corr_matrix.columns.tolist(),
            'y': corr_matrix.columns.tolist(),
            'p_values': p_values
        }
    except Exception as e:
        logger.warning(f"Error calculating heatmap data: {str(e)}")
        heatmap_data = {}
    
    # Prepare scatter matrix data with error handling
    try:
        # Limit to 500 points for scatter plots
        scatter_sample_size = min(500, len(sampled_df))
        scatter_df = sampled_df.sample(scatter_sample_size) if len(sampled_df) > scatter_sample_size else sampled_df
        
        scatter_matrix = {
            'columns': numeric_df.columns.tolist(),
            'data': scatter_df.fillna(0).to_dict('records')
        }
    except Exception as e:
        logger.warning(f"Error calculating scatter matrix data: {str(e)}")
        scatter_matrix = {}
    
    # Ensure all values are JSON serializable
    def clean_for_json(obj):
        """Ensure all values are JSON serializable."""
        if isinstance(obj, dict):
            return {k: clean_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [clean_for_json(v) for v in obj]
        elif isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return clean_for_json(obj.tolist())
        else:
            return obj
    
    return {
        'correlation_matrix': json.dumps(clean_for_json(corr_dict)),
        'parallel_coords': json.dumps(clean_for_json(parallel_coords)),
        'violin_data': json.dumps(clean_for_json(violin_data)),
        'heatmap_data': json.dumps(clean_for_json(heatmap_data)),
        'scatter_matrix': json.dumps(clean_for_json(scatter_matrix))
    }

# Celery tasks definition
@celery_app.task(bind=True, base=StatisticsTask, max_retries=3)
def process_column_statistics(self, task_id: str, table_id: str, table_name: str, 
                             column_name: str, column_index: int, total_columns: int) -> Dict[str, Any]:
    """Process statistics for a single column."""
    logger.info(f"Processing column {column_index}/{total_columns}: {column_name}")
    
    try:
        # Update progress
        progress = 0.1 + (0.7 * (column_index / total_columns))
        update_task_status(
            task_id, 
            'processing', 
            progress, 
            f'Processing column {column_index}/{total_columns}: {column_name}'
        )
        
        conn_user = get_db_connection('user_files.db')
        conn_stats = get_db_connection('stats.db')
        
        # Check if table is very large
        try:
            c = conn_user.cursor()
            c.execute(f"SELECT COUNT(*) FROM '{table_name}'")
            row_count = c.fetchone()[0]
        except Exception as e:
            logger.error(f"Error getting row count: {str(e)}")
            row_count = 0
        
        if row_count > CHUNK_SIZE:
            # For large tables, process in chunks
            # First, get a small sample to determine column type
            sample_query = f"SELECT '{column_name}' FROM '{table_name}' LIMIT 1000"
            sample_df = pd.read_sql_query(sample_query, conn_user)
            
            # Then read the column in chunks
            chunks = []
            chunk_query = f"SELECT '{column_name}' FROM '{table_name}'"
            
            # Use smaller chunks for very large tables
            effective_chunk_size = min(CHUNK_SIZE, max(10000, row_count // 20))
            
            for chunk_df in pd.read_sql_query(chunk_query, conn_user, chunksize=effective_chunk_size):
                chunks.append(chunk_df)
            
            # Process chunks
            if chunks:
                full_column_df = pd.concat(chunks)
                column_stats = calculate_column_statistics_chunked(full_column_df, column_name)
            else:
                # Fallback if chunking fails
                logger.warning(f"Chunking returned no data for {column_name}, using sample")
                column_stats = calculate_column_statistics_chunked(sample_df, column_name)
        else:
            # For smaller tables, read the whole column
            query = f"SELECT '{column_name}' FROM '{table_name}'"
            df = pd.read_sql_query(query, conn_user)
            column_stats = calculate_column_statistics_chunked(df, column_name)
        
        # Store column statistics
        c_stats = conn_stats.cursor()
        c_stats.execute("""
            INSERT OR REPLACE INTO column_stats 
            (table_id, column_name, data_type, basic_stats, distribution, 
             shape_stats, outlier_stats)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            table_id, 
            column_name, 
            column_stats['data_type'],
            column_stats['basic_stats'],
            column_stats['distribution'],
            column_stats['shape_stats'],
            column_stats['outlier_stats']
        ))
        conn_stats.commit()
        
        logger.info(f"Successfully processed column {column_name}")
        return {'column': column_name, 'success': True}
        
    except Exception as e:
        logger.error(f"Error processing column {column_name}: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Retry with exponential backoff
        retry_delay = 30 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=retry_delay)
    
    finally:
        # Clean up connections
        if 'conn_user' in locals():
            close_db_connection(conn_user)
        if 'conn_stats' in locals():
            close_db_connection(conn_stats)

@celery_app.task(bind=True, base=StatisticsTask, max_retries=2)
def process_dataset_statistics(self, task_id: str, table_id: str, table_name: str, row_count: int) -> Dict[str, Any]:
    """Process dataset-level statistics."""
    logger.info(f"Processing dataset statistics for table {table_name} with {row_count} rows")
    
    try:
        # Update progress
        update_task_status(
            task_id, 
            'processing', 
            0.8, 
            'Calculating dataset statistics'
        )
        
        conn_user = get_db_connection('user_files.db')
        conn_stats = get_db_connection('stats.db')
        
        # For very large datasets, use a sample
        if row_count > MAX_SAMPLE_SIZE:
            sample_size = min(MAX_SAMPLE_SIZE, max(1000, row_count // 100))
            sample_query = f"SELECT * FROM '{table_name}' ORDER BY RANDOM() LIMIT {sample_size}"
            sample_df = pd.read_sql_query(sample_query, conn_user)
            dataset_stats = calculate_dataset_statistics_optimized(sample_df)
        elif row_count > CHUNK_SIZE:
            # For large but not massive datasets, use chunking
            chunks = []
            for chunk_df in pd.read_sql_query(f"SELECT * FROM '{table_name}'", conn_user, chunksize=CHUNK_SIZE):
                chunks.append(chunk_df.sample(min(1000, len(chunk_df))))
                if sum(len(chunk) for chunk in chunks) > MAX_SAMPLE_SIZE:
                    break
            
            combined_df = pd.concat(chunks)
            # If still too large, sample down
            if len(combined_df) > MAX_SAMPLE_SIZE:
                combined_df = combined_df.sample(MAX_SAMPLE_SIZE)
            
            dataset_stats = calculate_dataset_statistics_optimized(combined_df)
        else:
            # For smaller datasets, use the full dataset
            df = pd.read_sql_query(f"SELECT * FROM '{table_name}'", conn_user)
            dataset_stats = calculate_dataset_statistics_optimized(df)
        
        # Store dataset statistics
        c_stats = conn_stats.cursor()
        c_stats.execute("""
            INSERT OR REPLACE INTO dataset_stats 
            (table_id, correlation_matrix, parallel_coords, 
             violin_data, heatmap_data, scatter_matrix)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            table_id,
            dataset_stats['correlation_matrix'],
            dataset_stats['parallel_coords'],
            dataset_stats['violin_data'],
            dataset_stats['heatmap_data'],
            dataset_stats['scatter_matrix']
        ))
        conn_stats.commit()
        
        logger.info(f"Successfully processed dataset statistics for {table_name}")
        return {'success': True}
        
    except Exception as e:
        logger.error(f"Error processing dataset statistics: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Retry with exponential backoff
        retry_delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=retry_delay)
    
    finally:
        # Clean up connections
        if 'conn_user' in locals():
            close_db_connection(conn_user)
        if 'conn_stats' in locals():
            close_db_connection(conn_stats)

@celery_app.task(bind=True, base=StatisticsTask)
def finalize_task(self, task_id: str, results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Mark the main task as completed."""
    logger.info(f"Finalizing task {task_id}")
    
    try:
        # Count successful columns
        successful_columns = sum(1 for result in results if 'success' in result and result['success'])
        
        # Update task status
        update_task_status(
            task_id, 
            'completed', 
            1.0, 
            f'Statistics calculation completed for {successful_columns} columns'
        )
        
        logger.info(f"Task {task_id} completed successfully")
        return {'success': True, 'task_id': task_id}
    
    except Exception as e:
        logger.error(f"Error finalizing task {task_id}: {str(e)}")
        update_task_status(task_id, 'failed', None, f'Error finalizing task: {str(e)}')
        return {'success': False, 'task_id': task_id, 'error': str(e)}

@celery_app.task(bind=True, base=StatisticsTask)
def process_statistics_coordinator(self, task_id: str, table_id: str, table_name: str) -> Dict[str, Any]:
    """
    Main task to coordinate processing of statistics.
    
    This task orchestrates the process:
    1. Load table metadata and determine approach
    2. Process columns in parallel batches
    3. Calculate dataset statistics
    4. Mark task as complete
    """
    logger.info(f"Starting statistics coordinator for task {task_id}")
    
    try:
        # Update task status
        update_task_status(task_id, 'processing', 0.0, 'Starting statistics calculation')
        
        conn_user = get_db_connection('user_files.db')
        
        # Get row count
        c = conn_user.cursor()
        c.execute(f"SELECT COUNT(*) FROM '{table_name}'")
        row_count = c.fetchone()[0]
        
        # Get column names
        c.execute(f"PRAGMA table_info('{table_name}')")
        columns = [row[1] for row in c.fetchall()]
        
        # Close connection that won't be needed by subtasks
        close_db_connection(conn_user)
        
        if not columns:
            update_task_status(task_id, 'failed', None, 'No columns found in table')
            return {'success': False, 'error': 'No columns found in table'}
        
        # Update status with table info
        update_task_status(
            task_id, 
            'processing', 
            0.05, 
            f'Processing table with {row_count} rows and {len(columns)} columns'
        )
        
        # Process columns in parallel using Celery Canvas
        # Group columns into batches to avoid overloading the system
        column_batches = [columns[i:i+COLUMN_BATCH_SIZE] for i in range(0, len(columns), COLUMN_BATCH_SIZE)]
        
        all_column_tasks = []
        for batch_idx, batch in enumerate(column_batches):
            batch_tasks = []
            for col_idx, column in enumerate(batch):
                # Calculate overall column index for progress reporting
                overall_idx = batch_idx * COLUMN_BATCH_SIZE + col_idx
                batch_tasks.append(
                    process_column_statistics.s(
                        task_id, table_id, table_name, column, overall_idx + 1, len(columns)
                    )
                )
            
            # Create a group for this batch
            batch_group = group(batch_tasks)
            all_column_tasks.append(batch_group)
        
        # Process each batch sequentially to avoid memory issues
        current_result = []
        for batch_task in all_column_tasks:
            batch_result = batch_task.apply_async()
            current_result.extend(batch_result.get())
        
        # Now process dataset statistics
        dataset_result = process_dataset_statistics.apply_async(
            args=[task_id, table_id, table_name, row_count]
        )
        dataset_result.get()
        
        # Finalize task
        finalize_result = finalize_task.apply_async(args=[task_id, current_result])
        result = finalize_result.get()
        
        return {'success': True, 'task_id': task_id}
    
    except Exception as e:
        logger.error(f"Error in statistics coordinator: {str(e)}")
        logger.error(traceback.format_exc())
        update_task_status(task_id, 'failed', None, f'Error: {str(e)}')
        return {'success': False, 'task_id': task_id, 'error': str(e)}

def process_statistics_task(task):
    """
    Process a statistics calculation task - entry point from the old API
    
    This function maintains compatibility with the existing API, but delegates
    the actual work to the Celery task system.
    """
    task_id = task['task_id']
    table_id = task['table_id']
    table_name = task['table_name']
    
    logger.info(f"Starting statistics task {task_id} for table {table_name}")
    
    try:
        # Initialize task status
        update_task_status(task_id, 'pending', 0.0, 'Task queued for processing')
        
        # Launch the Celery task
        result = process_statistics_coordinator.apply_async(
            args=[task_id, table_id, table_name]
        )
        
        # For synchronous operation, we could wait for the result, but that defeats
        # the purpose of using Celery for background processing
        logger.info(f"Task {task_id} queued with Celery task ID: {result.id}")
        
        return True
    except Exception as e:
        logger.error(f"Error queuing statistics task: {str(e)}")
        logger.error(traceback.format_exc())
        update_task_status(task_id, 'failed', None, f'Error: {str(e)}')
        return False

# Queue and worker implementation for backwards compatibility
stats_task_queue = queue.Queue()

def background_worker():
    """Background worker function to process statistics tasks"""
    logger.info("Starting background worker for statistics calculation")
    while True:
        try:
            # Get a task from the queue with a timeout
            task = stats_task_queue.get(timeout=5)
            logger.info(f"Processing task: {task['task_id']}")
            
            # Process the task using the Celery-based implementation
            process_statistics_task(task)
            
            # Mark the task as done
            stats_task_queue.task_done()
        except queue.Empty:
            # No tasks in queue, just continue polling
            pass
        except Exception as e:
            logger.error(f"Error in background worker: {str(e)}")
            logger.error(traceback.format_exc())

def start_background_worker():
    """Start the background worker thread"""
    worker_thread = threading.Thread(target=background_worker)
    worker_thread.daemon = True  # Thread will exit when main thread exits
    worker_thread.start()
    logger.info("Background worker started")

# Start the worker when this module is imported
if __name__ != '__main__':
    start_background_worker()