import nest_asyncio
from scipy import stats
import numpy as np
from typing import Dict, Any
import plotly.express as px
import plotly.graph_objects as go
import tempfile
import traceback
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import sqlite3
import io
import logging
import pandas as pd
import xml.etree.ElementTree as ET
import PyPDF2
from werkzeug.utils import secure_filename
import uuid
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import os
import threading
from flask_caching import Cache
from pyecharts import options as opts
from pyecharts.charts import (
    Line, Bar, Pie, Scatter, Boxplot, Grid, EffectScatter,
    Funnel, Gauge, HeatMap, Kline, Radar, TreeMap, Surface3D,
    Bar3D, Line3D, Scatter3D, Map, Graph, Liquid, Parallel,
    Sankey, Sunburst
)
from pyecharts.commons.utils import JsCode
import pandas as pd
import sqlite3
import uuid
import traceback

import sqlite3
import psutil
import datetime
import decimal
import math
import logging
import json
import time
from typing import List, Dict, Any, Generator, Tuple,Optional
from dataclasses import dataclass
from flask import jsonify, request
import traceback
import queue
from background_worker_implementation import *
import threading
import asyncio
from EnhancedGenerator import *

app = Flask(__name__)
cache = Cache(app, config={'CACHE_TYPE': 'simple'})
CORS(app)
logging.basicConfig(level=logging.DEBUG)
CACHE_TIMEOUT = 300  # Cache timeout in seconds
CHUNK_SIZE = 100000  # Maximum rows to fetch at once
stats_task_queue = queue.Queue()
TASK_STATUS = {}


## Background worker implementation starts
def process_statistics_task(task):
    """Process a statistics calculation task"""
    task_id = task['task_id']
    table_id = task['table_id']
    table_name = task['table_name']
    
    try:
        update_task_status(task_id, 'processing', 0.0, 'Starting statistics calculation')
        
        conn_user = sqlite3.connect('user_files.db')
        conn_stats = sqlite3.connect('stats.db')
        
        # Load the data
        query = f'SELECT * FROM "{table_name}"'
        
        # For large tables, check row count first
        row_count_query = f'SELECT COUNT(*) FROM "{table_name}"'
        row_count = pd.read_sql_query(row_count_query, conn_user).iloc[0, 0]
        
        # If table is very large, use chunking
        if row_count > 100000:
            chunk_size = 50000
            # Just get the column names first
            col_query = f'SELECT * FROM "{table_name}" LIMIT 1'
            df_schema = pd.read_sql_query(col_query, conn_user)
            columns = df_schema.columns.tolist()
            
            # Update status
            update_task_status(task_id, 'processing', 0.1, f'Processing large table with {row_count} rows')
            
            # Process prioritized columns first
            numeric_cols = []
            categorical_cols = []
            other_cols = []
            
            # Load a sample to determine column types
            sample_query = f'SELECT * FROM "{table_name}" LIMIT 1000'
            sample_df = pd.read_sql_query(sample_query, conn_user)
            
            # Categorize columns by type
            for col in columns:
                if pd.api.types.is_numeric_dtype(sample_df[col]):
                    numeric_cols.append(col)
                elif pd.api.types.is_categorical_dtype(sample_df[col]) or pd.api.types.is_object_dtype(sample_df[col]):
                    categorical_cols.append(col)
                else:
                    other_cols.append(col)
            
            # Prioritize columns
            prioritized_cols = numeric_cols + categorical_cols + other_cols
            
            # Calculate column statistics for each column with chunking
            for i, column in enumerate(prioritized_cols):
                # Update progress
                progress = 0.1 + (0.7 * (i / len(prioritized_cols)))
                update_task_status(
                    task_id, 
                    'processing', 
                    progress, 
                    f'Processing column {i+1}/{len(prioritized_cols)}: {column}'
                )
                
                # Read column data in chunks
                column_data = []
                for chunk_df in pd.read_sql_query(query, conn_user, chunksize=chunk_size):
                    column_data.append(chunk_df[column])
                
                # Combine chunks
                full_column = pd.concat(column_data)
                
                # Calculate statistics for this column
                column_stats = calculate_column_statistics_chunked(
                    pd.DataFrame({column: full_column}), 
                    column
                )
                
                # Store or update column statistics
                c_stats = conn_stats.cursor()
                c_stats.execute("""
                    INSERT OR REPLACE INTO column_stats 
                    (table_id, column_name, data_type, basic_stats, distribution, 
                     shape_stats, outlier_stats)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    table_id, 
                    column, 
                    column_stats['data_type'],
                    column_stats['basic_stats'],
                    column_stats['distribution'],
                    column_stats['shape_stats'],
                    column_stats['outlier_stats']
                ))
                conn_stats.commit()
            
            # Update progress
            update_task_status(task_id, 'processing', 0.8, 'Calculating dataset statistics')
            
            # For dataset statistics, use a sample
            if row_count > 10000:
                sample_size = 10000
                sample_query = f'SELECT * FROM "{table_name}" ORDER BY RANDOM() LIMIT {sample_size}'
                sample_df = pd.read_sql_query(sample_query, conn_user)
                dataset_stats = calculate_dataset_statistics_optimized(sample_df)
            else:
                full_df = pd.concat([chunk for chunk in pd.read_sql_query(query, conn_user, chunksize=chunk_size)])
                dataset_stats = calculate_dataset_statistics_optimized(full_df)
        else:
            # For smaller tables, process everything at once
            df = pd.read_sql_query(query, conn_user)
            update_task_status(task_id, 'processing', 0.2, 'Processing columns')
            
            # Calculate statistics for each column
            for i, column in enumerate(df.columns):
                progress = 0.2 + (0.6 * (i / len(df.columns)))
                update_task_status(
                    task_id, 
                    'processing', 
                    progress, 
                    f'Processing column {i+1}/{len(df.columns)}: {column}'
                )
                
                column_stats = calculate_column_statistics_chunked(df, column)
                
                c_stats = conn_stats.cursor()
                c_stats.execute("""
                    INSERT OR REPLACE INTO column_stats 
                    (table_id, column_name, data_type, basic_stats, distribution, 
                     shape_stats, outlier_stats)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    table_id, 
                    column, 
                    column_stats['data_type'],
                    column_stats['basic_stats'],
                    column_stats['distribution'],
                    column_stats['shape_stats'],
                    column_stats['outlier_stats']
                ))
                conn_stats.commit()
            
            update_task_status(task_id, 'processing', 0.8, 'Calculating dataset statistics')
            dataset_stats = calculate_dataset_statistics_optimized(df)
        
        # Store or update dataset statistics
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
        
        # Update task status to completed
        update_task_status(task_id, 'completed', 1.0, 'Statistics calculation completed')
        
        conn_user.close()
        conn_stats.close()
        
        return True
    except Exception as e:
        logging.error(f"Error processing statistics task: {str(e)}")
        traceback.print_exc()
        update_task_status(task_id, 'failed', None, f'Error: {str(e)}')
        return False

def background_worker():
    """Background worker function to process statistics tasks"""
    logging.info("Starting background worker for statistics calculation")
    while True:
        try:
            # Get a task from the queue with a timeout
            task = stats_task_queue.get(timeout=5)
            logging.info(f"Processing task: {task['task_id']}")
            
            # Process the task
            process_statistics_task(task)
            
            # Mark the task as done
            stats_task_queue.task_done()
        except queue.Empty:
            # No tasks in queue, just continue polling
            pass
        except Exception as e:
            logging.error(f"Error in background worker: {str(e)}")
            traceback.print_exc()

def start_background_worker():
    """Start the background worker thread"""
    worker_thread = threading.Thread(target=background_worker)
    worker_thread.daemon = True  # Thread will exit when main thread exits
    worker_thread.start()
    logging.info("Background worker started")
## Background worker implementation ends

def init_db():
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    -- username TEXT NOT NULL,
    -- email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
              ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  user_files 
              (file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(user_id),
    filename TEXT NOT NULL,
    file_type TEXT, --CHECK(file_type IN ('csv', 'xlsx','xls', 'db', 'tsv', 'doc', 'docx', 'txt', 'xml','pdf')),
    is_structured BOOLEAN,
    sheet_table TEXT, -- For Excel sheets or DB tables
    unique_key TEXT,  -- Random unique identifier for structured data storage table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
              ''')
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    # Check if parent_file_id column exists
    c.execute("PRAGMA table_info(user_files)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'parent_file_id' not in columns:
        # Add parent_file_id column
        c.execute('''ALTER TABLE user_files 
                    ADD COLUMN parent_file_id INTEGER 
                    REFERENCES user_files(file_id)''')
    
    c.execute('''
    CREATE TABLE IF NOT EXISTS  structured_file_storage (
    unique_key TEXT PRIMARY KEY,
    file_id INTEGER REFERENCES user_files(file_id),
    table_name TEXT NOT NULL, -- Name of dynamically created table for each file
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES user_files(file_id)
    );
              ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  unstructured_file_storage (
    file_id INTEGER REFERENCES user_files(file_id),
    unique_key TEXT PRIMARY KEY,
    content BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_text TEXT,
    FOREIGN KEY (file_id) REFERENCES user_files(file_id)
    );
    ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  dashboard_store (
        dashboard_id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER REFERENCES user_files(file_id),
        dashboard_data BLOB,
              user_id TEXT REFERENCES users(user_id),
        dashboardname TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')
    c.execute('''CREATE TABLE IF NOT EXISTS graph_cache (
        graph_id TEXT PRIMARY KEY,
        html_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Check if the column 'dashboard_name' exists before adding it
    c.execute("PRAGMA table_info(graph_cache)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'dashboard_name' not in columns:
        c.execute('''ALTER TABLE graph_cache ADD COLUMN dashboard_name TEXT''')
    
    if 'image_blob' not in columns:
        c.execute('''ALTER TABLE graph_cache ADD COLUMN image_blob BLOB''')
    
    if 'isImageSuccess' not in columns:
        c.execute('''ALTER TABLE graph_cache ADD COLUMN isImageSuccess INTEGER DEFAULT 0''')
    
    c.execute('''CREATE INDEX IF NOT EXISTS idx_graph_cache_dashboard 
        ON graph_cache(dashboard_name, isImageSuccess);
     ''')
    c.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_exports (
                export_id TEXT PRIMARY KEY,
                user_id TEXT,
                dashboard_ids TEXT,
                export_name TEXT,
                export_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

    c.execute("""
            CREATE TABLE IF NOT EXISTS dashboards (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT,
                charts TEXT,
                textboxes TEXT,
                datatables TEXT,
                statcards TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
    conn.commit()
    conn.close()

def init_stats_db():
    """Initialize the stats database structure"""
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    
    # Table for column-level statistics
    c.execute('''CREATE TABLE IF NOT EXISTS column_stats (
        stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT NOT NULL,
        column_name TEXT NOT NULL,
        data_type TEXT NOT NULL,
        basic_stats TEXT,
        distribution TEXT,
        shape_stats TEXT,
        outlier_stats TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(table_id, column_name)
    )''')
    
    # Table for dataset-level statistics
    c.execute('''CREATE TABLE IF NOT EXISTS dataset_stats (
        stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT NOT NULL UNIQUE,
        correlation_matrix TEXT,
        parallel_coords TEXT,
        violin_data TEXT,
        heatmap_data TEXT,
        scatter_matrix TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Table for tracking task status
    c.execute('''CREATE TABLE IF NOT EXISTS stats_tasks (
        task_id TEXT PRIMARY KEY,
        table_id TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0.0,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    )''')
    
    conn.commit()
    conn.close()
    logging.info("Stats database initialized")
    
    # Start the background worker
    start_background_worker()

init_db()
init_stats_db()   


@cache.memoize(timeout=CACHE_TIMEOUT)
def get_table_data(table_name, selected_columns):
    """
    Fetch and cache data from database.
    Only retrieves requested columns for better performance.
    """
    try:
        conn = sqlite3.connect('user_files.db')
        # Only select requested columns
        columns_str = ', '.join(f'"{col}"' for col in selected_columns)
        query = f'SELECT {columns_str} FROM "{table_name}" LIMIT {CHUNK_SIZE}'
        
        df = pd.read_sql_query(query, conn)
        return df
    finally:
        if conn:
            conn.close()        
def process_pdf_content(pdf_content):
    """Process PDF content and return text with formatting preserved"""
    try:
        # Create a temporary file to write PDF content
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(pdf_content)
            temp_path = temp_file.name

        try:
            # Use pdfminer for better text extraction
            text = extract_text(
                temp_path,
                laparams=LAParams(
                    line_margin=0.5,
                    word_margin=0.1,
                    boxes_flow=0.5,
                    detect_vertical=True
                )
            )
            
            # Clean up extracted text
            text = '\n'.join(line.strip() for line in text.split('\n') if line.strip())
            return text
        finally:
            # Clean up temporary file
            os.unlink(temp_path)

    except Exception as e:
        logging.error(f"Error processing PDF: {str(e)}")
        return None

def handle_sqlite_upload(file, user_id, filename, c, conn):
    """Handle SQLite file by extracting tables and storing them similarly to Excel sheets."""
    try:
        content = file.read()
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        # Connect to the uploaded (temporary) SQLite database
        temp_conn = sqlite3.connect(temp_path)
        temp_cursor = temp_conn.cursor()

        # Fetch all tables except internal sqlite_* tables
        tables_query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        temp_cursor.execute(tables_query)
        tables = temp_cursor.fetchall()

        if not tables:
            raise ValueError("No tables found in the uploaded SQLite database.")

        # Create parent file entry with no specific table
        parent_unique_key = str(uuid.uuid4())
        c.execute("""
            INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, filename, 'db', True, parent_unique_key))
        parent_file_id = c.lastrowid

        # Process each table and create separate entries in user_files
        for table_name, in tables:
            try:
                # Read table data
                df = pd.read_sql_query(f"SELECT * FROM '{table_name}'", temp_conn)
                
                # Generate unique key for this table
                table_unique_key = str(uuid.uuid4())
                
                # Create new table name
                new_table_name = f"table_{table_unique_key}"
                
                # Store data in new table
                df.to_sql(new_table_name, conn, index=False, if_exists='replace')
                
                # Create entry in user_files for this table
                c.execute("""
                    INSERT INTO user_files (
                        user_id, filename, file_type, is_structured, 
                        unique_key, sheet_table, parent_file_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, f"{filename}:{table_name}", 'db', True, 
                      table_unique_key, table_name, parent_file_id))

            except Exception as e:
                app.logger.error(f"Error processing table {table_name}: {str(e)}")
                continue

        temp_conn.close()
        os.unlink(temp_path)

        conn.commit()
        return parent_file_id

    except Exception as e:
        app.logger.error(f"Error in handle_sqlite_upload: {str(e)}")
        if 'temp_conn' in locals():
            temp_conn.close()
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        raise

# //////////////////////////////////////////////

def calculate_column_statistics_chunked(df, column_name, chunk_size=10000):
    """Calculate statistics for a column using chunking for large datasets"""
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
        
        # Process in chunks for better performance
        chunks = [clean_data[i:i+chunk_size] for i in range(0, len(clean_data), chunk_size)]
        
        # Calculate basic stats incrementally
        count = 0
        sum_val = 0
        sum_sq = 0
        min_val = float('inf')
        max_val = float('-inf')
        
        # First pass - calculate sums, min, max
        for chunk in chunks:
            chunk_min = chunk.min()
            chunk_max = chunk.max()
            min_val = min(min_val, chunk_min)
            max_val = max(max_val, chunk_max)
            
            chunk_count = len(chunk)
            chunk_sum = chunk.sum()
            
            count += chunk_count
            sum_val += chunk_sum
            sum_sq += (chunk ** 2).sum()
        
        # Calculate mean and variance
        mean = sum_val / count if count > 0 else 0
        variance = (sum_sq / count) - (mean ** 2) if count > 0 else 0
        std_dev = math.sqrt(variance) if variance > 0 else 0
        
        # Calculate median and quartiles
        sorted_data = clean_data.sort_values().reset_index(drop=True)
        median_idx = len(sorted_data) // 2
        median = sorted_data.iloc[median_idx]
        
        q1_idx = len(sorted_data) // 4
        q3_idx = q1_idx * 3
        q1 = sorted_data.iloc[q1_idx]
        q3 = sorted_data.iloc[q3_idx]
        iqr = q3 - q1
        
        # Calculate mode efficiently
        value_counts = clean_data.value_counts()
        mode_value = value_counts.index[0] if not value_counts.empty else None
        
        # Basic stats
        basic_stats = {
            'min': float(min_val),
            'max': float(max_val),
            'mean': float(mean),
            'median': float(median),
            'mode': float(mode_value) if mode_value is not None else None,
            'count': int(count),
            'missing_count': int(len(column_data) - count),
            'missing_percentage': float((len(column_data) - count) / len(column_data) * 100)
        }
        
        # Calculate histogram with fewer bins for large datasets
        bin_count = min(50, max(10, int(count / 1000)))
        hist, bin_edges = np.histogram(clean_data, bins=bin_count)
        
        # Generate a sampled version of the data for QQ-plot
        # Use sampling for huge datasets
        if len(clean_data) > 10000:
            sample_size = 5000
            sampled_data = clean_data.sample(sample_size) if len(clean_data) > sample_size else clean_data
            sorted_sample = sampled_data.sort_values().values
            n = len(sorted_sample)
            theoretical_quantiles = np.array([stats.norm.ppf((i + 0.5) / n) for i in range(n)])
            valid_mask = ~np.isnan(theoretical_quantiles)
            x_values = theoretical_quantiles[valid_mask].tolist()
            y_values = sorted_sample[valid_mask].tolist()
        else:
            sorted_values = clean_data.sort_values().values
            n = len(sorted_values)
            theoretical_quantiles = np.array([stats.norm.ppf((i + 0.5) / n) for i in range(n)])
            valid_mask = ~np.isnan(theoretical_quantiles)
            x_values = theoretical_quantiles[valid_mask].tolist()
            y_values = sorted_values[valid_mask].tolist()
        
        distribution = {
            'histogram': {
                'counts': hist.tolist(),
                'bin_edges': bin_edges.tolist()
            },
            'boxplot': {
                'q1': float(q1),
                'q3': float(q3),
                'median': float(median),
                'whislo': float(max(min_val, q1 - 1.5 * iqr)),
                'whishi': float(min(max_val, q3 + 1.5 * iqr))
            },
            'qqplot': {
                'x': x_values,
                'y': y_values
            }
        }
        
        # Calculate skewness and kurtosis on sampled data for large datasets
        if len(clean_data) > 50000:
            sample_size = 10000
            skew_sample = clean_data.sample(sample_size) if len(clean_data) > sample_size else clean_data
            skewness = float(skew_sample.skew())
            kurtosis = float(skew_sample.kurtosis())
        else:
            skewness = float(clean_data.skew())
            kurtosis = float(clean_data.kurtosis())
        
        shape_stats = {
            'skewness': skewness,
            'kurtosis': kurtosis,
            'range': float(max_val - min_val)
        }
        
        # Find outliers
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers = clean_data[(clean_data < lower_bound) | (clean_data > upper_bound)]
        
        # Limit the number of outliers stored
        max_outliers = 100
        outlier_list = outliers.head(max_outliers).tolist()
        
        outlier_stats = {
            'count': len(outliers),
            'percentage': float((len(outliers) / len(clean_data)) * 100),
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound),
            'outlier_values': outlier_list
        }
    
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
            'top': str(value_counts.index[0]) if not value_counts.empty else None,
            'top_count': int(value_counts.iloc[0]) if not value_counts.empty else 0,
            'missing_count': int(column_data.isna().sum()),
            'missing_percentage': float(column_data.isna().sum() / len(column_data) * 100)
        }
        
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
        shape_stats = {
            'entropy': float(stats.entropy(value_counts.values)) if len(value_counts) > 1 else 0
        }
        
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
    
    return {
        'data_type': data_type,
        'basic_stats': json.dumps(basic_stats),
        'distribution': json.dumps(distribution),
        'shape_stats': json.dumps(shape_stats),
        'outlier_stats': json.dumps(outlier_stats)
    }

def calculate_dataset_statistics_optimized(df, max_columns=15, sample_size=5000):
    """Calculate dataset-level statistics with optimizations for large datasets"""
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
    
    # Calculate correlation matrix
    corr_matrix = sampled_df.corr().round(4).fillna(0)
    corr_dict = {col: corr_matrix[col].to_dict() for col in corr_matrix.columns}
    
    # Calculate p-values for correlations - with optimizations
    p_values = {}
    for col1 in numeric_df.columns:
        p_values[col1] = {}
        for col2 in numeric_df.columns:
            if col1 != col2:
                # Use the sampled data for p-value calculations
                clean_data1 = sampled_df[col1].dropna()
                clean_data2 = sampled_df[col2].dropna()
                # Only calculate if there's enough data
                if len(clean_data1) > 2 and len(clean_data2) > 2:
                    try:
                        _, p_value = stats.pearsonr(clean_data1, clean_data2)
                        p_values[col1][col2] = float(p_value)
                    except:
                        p_values[col1][col2] = 1.0
                else:
                    p_values[col1][col2] = 1.0
            else:
                p_values[col1][col2] = 0.0  # p-value for correlation with self
    
    # Prepare parallel coordinates data
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
    
    # Prepare violin plot data
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
    
    # Prepare heatmap data
    heatmap_data = {
        'z': corr_matrix.values.tolist(),
        'x': corr_matrix.columns.tolist(),
        'y': corr_matrix.columns.tolist(),
        'p_values': p_values
    }
    
    # Prepare scatter matrix data
    # Limit to 500 points for scatter plots
    scatter_sample_size = min(500, len(sampled_df))
    scatter_df = sampled_df.sample(scatter_sample_size) if len(sampled_df) > scatter_sample_size else sampled_df
    
    scatter_matrix = {
        'columns': numeric_df.columns.tolist(),
        'data': scatter_df.fillna(0).to_dict('records')
    }
    
    return {
        'correlation_matrix': json.dumps(corr_dict),
        'parallel_coords': json.dumps(parallel_coords),
        'violin_data': json.dumps(violin_data),
        'heatmap_data': json.dumps(heatmap_data),
        'scatter_matrix': json.dumps(scatter_matrix)
    }
# /////////////////////////////////
def calculate_column_statistics(df, column_name):
    """Calculate comprehensive statistics for a single column"""
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
        
        # Basic stats
        basic_stats = {
            'min': float(clean_data.min()),
            'max': float(clean_data.max()),
            'mean': float(clean_data.mean()),
            'median': float(clean_data.median()),
            'mode': float(clean_data.mode().iloc[0]) if not clean_data.mode().empty else None
        }
        
        # Calculate quartiles for box plot
        q1 = float(clean_data.quantile(0.25))
        q3 = float(clean_data.quantile(0.75))
        iqr = q3 - q1
        
        # Distribution data - histogram
        hist, bin_edges = np.histogram(clean_data, bins='auto')
        
        # Generate QQ-plot data
        sorted_data = clean_data.sort_values().values
        n = len(sorted_data)
        theoretical_quantiles = np.array([stats.norm.ppf((i + 0.5) / n) for i in range(n)])
        valid_mask = ~np.isnan(theoretical_quantiles)
        
        distribution = {
            'histogram': {
                'counts': hist.tolist(),
                'bin_edges': bin_edges.tolist()
            },
            'boxplot': {
                'q1': q1,
                'q3': q3,
                'median': basic_stats['median'],
                'whislo': float(max(clean_data.min(), q1 - 1.5 * iqr)),
                'whishi': float(min(clean_data.max(), q3 + 1.5 * iqr))
            },
            'qqplot': {
                'x': theoretical_quantiles[valid_mask].tolist(),
                'y': sorted_data[valid_mask].tolist()
            }
        }
        
        # Shape statistics
        shape_stats = {
            'skewness': float(clean_data.skew()),
            'kurtosis': float(clean_data.kurtosis()),
            'range': float(basic_stats['max'] - basic_stats['min'])
        }
        
        # Outlier statistics
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers = clean_data[(clean_data < lower_bound) | (clean_data > upper_bound)]
        outlier_stats = {
            'count': len(outliers),
            'percentage': (len(outliers) / len(clean_data)) * 100,
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound),
            'outlier_values': outliers.head(10).tolist()  # First 10 outliers
        }
    
    elif pd.api.types.is_categorical_dtype(column_data) or pd.api.types.is_object_dtype(column_data):
        data_type = 'categorical'
        value_counts = column_data.value_counts()
        
        basic_stats = {
            'unique_count': len(value_counts),
            'top': str(column_data.mode().iloc[0]) if not column_data.mode().empty else None,
            'top_count': int(value_counts.iloc[0]) if not value_counts.empty else 0
        }
        
        # Distribution for categorical data
        value_dict = {}
        for k, v in value_counts.items():
            key = str(k) if k is not None else 'null'
            value_dict[key] = int(v)
            
        distribution = {
            'value_counts': value_dict
        }
        
        # Shape stats (minimal for categorical)
        shape_stats = {
            'entropy': float(stats.entropy(value_counts)) if len(value_counts) > 1 else 0
        }
        
        # No outliers for categorical data
        outlier_stats = {}
    
    else:
        # For other types (datetime, etc.)
        data_type = 'other'
        basic_stats = {}
        distribution = {}
        shape_stats = {}
        outlier_stats = {}
    
    # Calculate missing value statistics for all types
    missing_count = column_data.isna().sum()
    missing_percentage = (missing_count / len(column_data)) * 100
    
    if isinstance(basic_stats, dict):
        basic_stats['missing_count'] = int(missing_count)
        basic_stats['missing_percentage'] = float(missing_percentage)
    
    return {
        'data_type': data_type,
        'basic_stats': json.dumps(basic_stats),
        'distribution': json.dumps(distribution),
        'shape_stats': json.dumps(shape_stats),
        'outlier_stats': json.dumps(outlier_stats)
    }

def calculate_dataset_statistics(df):
    """Calculate dataset-level statistics for visualization"""
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
    
    # Calculate correlation matrix
    corr_matrix = numeric_df.corr().round(4).fillna(0)
    corr_dict = {col: corr_matrix[col].to_dict() for col in corr_matrix.columns}
    
    # Calculate p-values for correlations
    p_values = {}
    for col1 in numeric_df.columns:
        p_values[col1] = {}
        for col2 in numeric_df.columns:
            if col1 != col2:
                clean_data1 = numeric_df[col1].dropna()
                clean_data2 = numeric_df[col2].dropna()
                # Only calculate if there's enough data
                if len(clean_data1) > 2 and len(clean_data2) > 2:
                    try:
                        _, p_value = stats.pearsonr(clean_data1, clean_data2)
                        p_values[col1][col2] = float(p_value)
                    except:
                        p_values[col1][col2] = 1.0
                else:
                    p_values[col1][col2] = 1.0
            else:
                p_values[col1][col2] = 0.0  # p-value for correlation with self
    
    # Prepare parallel coordinates data with normalization
    parallel_df = numeric_df.copy()
    for col in parallel_df.columns:
        min_val = parallel_df[col].min()
        max_val = parallel_df[col].max()
        if max_val > min_val:
            parallel_df[col] = (parallel_df[col] - min_val) / (max_val - min_val)
    
    # Sample data to keep size reasonable
    sample_size = min(1000, len(df))
    sample_df = parallel_df.sample(sample_size) if len(df) > sample_size else parallel_df
    
    parallel_coords = {
        'columns': numeric_df.columns.tolist(),
        'data': sample_df.fillna(0).values.tolist(),
        'ranges': {col: [float(numeric_df[col].min()), float(numeric_df[col].max())] 
                 for col in numeric_df.columns}
    }
    
    # Prepare violin plot data
    violin_data = {
        'columns': numeric_df.columns.tolist(),
        'data': {col: numeric_df[col].dropna().tolist() for col in numeric_df.columns},
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
    
    # Prepare heatmap data
    heatmap_data = {
        'z': corr_matrix.values.tolist(),
        'x': corr_matrix.columns.tolist(),
        'y': corr_matrix.columns.tolist(),
        'p_values': p_values
    }
    
    # Prepare scatter matrix data
    scatter_matrix = {
        'columns': numeric_df.columns.tolist(),
        'data': sample_df.fillna(0).to_dict('records')
    }
    
    return {
        'correlation_matrix': json.dumps(corr_dict),
        'parallel_coords': json.dumps(parallel_coords),
        'violin_data': json.dumps(violin_data),
        'heatmap_data': json.dumps(heatmap_data),
        'scatter_matrix': json.dumps(scatter_matrix)
    }

def store_statistics_for_table(table_id, table_name):
    """Calculate and store statistics for a table in the stats database"""
    conn_user = sqlite3.connect('user_files.db')
    conn_stats = sqlite3.connect('stats.db')
    
    try:
        # Load the data
        df = pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn_user)
        
        # Calculate statistics for each column
        for column in df.columns:
            stats = calculate_column_statistics(df, column)
            
            # Check if statistics already exist for this column
            c_stats = conn_stats.cursor()
            c_stats.execute("""
                SELECT stats_id FROM column_stats
                WHERE table_id = ? AND column_name = ?
            """, (table_id, column))
            
            existing_stats = c_stats.fetchone()
            
            if existing_stats:
                # Update existing statistics
                c_stats.execute("""
                    UPDATE column_stats 
                    SET data_type = ?, basic_stats = ?, distribution = ?, 
                        shape_stats = ?, outlier_stats = ?
                    WHERE table_id = ? AND column_name = ?
                """, (
                    stats['data_type'],
                    stats['basic_stats'],
                    stats['distribution'],
                    stats['shape_stats'],
                    stats['outlier_stats'],
                    table_id, 
                    column
                ))
            else:
                # Insert new statistics
                c_stats.execute("""
                    INSERT INTO column_stats 
                    (table_id, column_name, data_type, basic_stats, distribution, 
                     shape_stats, outlier_stats)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    table_id, 
                    column, 
                    stats['data_type'],
                    stats['basic_stats'],
                    stats['distribution'],
                    stats['shape_stats'],
                    stats['outlier_stats']
                ))
        
        # Calculate and store dataset statistics
        dataset_stats = calculate_dataset_statistics(df)
        
        # Check if dataset statistics already exist
        c_stats.execute("""
            SELECT stats_id FROM dataset_stats
            WHERE table_id = ?
        """, (table_id,))
        
        existing_stats = c_stats.fetchone()
        
        if existing_stats:
            # Update existing statistics
            c_stats.execute("""
                UPDATE dataset_stats 
                SET correlation_matrix = ?, parallel_coords = ?, 
                    violin_data = ?, heatmap_data = ?, scatter_matrix = ?
                WHERE table_id = ?
            """, (
                dataset_stats['correlation_matrix'],
                dataset_stats['parallel_coords'],
                dataset_stats['violin_data'],
                dataset_stats['heatmap_data'],
                dataset_stats['scatter_matrix'],
                table_id
            ))
        else:
            # Insert new statistics
            c_stats.execute("""
                INSERT INTO dataset_stats 
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
        logging.info(f"Statistics calculated and stored for table {table_name}")
        
    except Exception as e:
        logging.error(f"Error calculating statistics: {str(e)}")
        traceback.print_exc()
    finally:
        conn_user.close()
        conn_stats.close()


def process_table_statistics_background(table_id, table_name):
    """Run statistics calculation in a background thread"""
    thread = threading.Thread(
        target=store_statistics_for_table,
        args=(table_id, table_name)
    )
    thread.daemon = True  # Thread will exit when main thread exits
    thread.start()
    return thread


@app.route('/upload/<user_id>', methods=['POST'])
def upload_file(user_id):
    app.logger.info(f"Received upload request for user: {user_id}")
    
    if 'file' not in request.files:
        app.logger.warning("No file part in the request")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        app.logger.warning("No selected file")
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)# was not in earlier one
    extension = filename.split('.')[-1].lower()
    
    allowed_extensions = {'csv', 'xlsx', 'xls', 'db', 'txt', 'tsv', 'pdf', 'xml', 'docx', 'doc'}
    structured_extensions = {'csv', 'xlsx', 'xls', 'db', 'tsv','sqlite','sqlite3'}
    unstructured_extensions = {'txt', 'pdf', 'xml', 'docx', 'doc'}
    
    if extension not in allowed_extensions:
        return jsonify({'error': 'Invalid file type'}), 400

    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    try:
        # Ensure user exists
        c.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))

        file_id = None
        if extension in structured_extensions:
            # Handle different file types
            if extension in ['xlsx', 'xls']: #2
                file_id = handle_excel_upload(file, user_id, filename, c, conn)
                # process_table_statistics_background(sheet_unique_key, table_name)
                task_id = create_stats_task(sheet_unique_key, new_table_name)

            elif extension in ['db', 'sqlite', 'sqlite3']:
                file_id = handle_sqlite_upload(file, user_id, filename, c, conn)
                # process_table_statistics_background(table_unique_key, new_table_name)
                task_id = create_stats_task(table_unique_key, new_table_name)

            elif extension in {'csv','tsv'}: #1
                # Handle CSV files (implement similar parent-child structure if needed)
                unique_key = str(uuid.uuid4())
                df = pd.read_csv(file)
                table_name = f"table_{unique_key}"
                df.to_sql(table_name, conn, if_exists='replace', index=False)

                c.execute("""
                    INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, filename, 'csv', True, unique_key))
                file_id = c.lastrowid
                # Insert into 'structured_file_storage'
                c.execute("""
                    INSERT INTO structured_file_storage (unique_key, file_id, table_name)
                    VALUES (?, ?, ?)
                """, (unique_key, file_id, table_name))

                #backgroud process
                # process_table_statistics_background(unique_key, table_name)
                task_id = create_stats_task(unique_key, table_name) # create bg task

            conn.commit()
            
            return jsonify({
                'success': True,
                'file_id': file_id,
                'message': 'File uploaded successfully',
                'status_task_id': task_id
            }), 200
        elif extension in unstructured_extensions:
            if extension =='pdf':
               content = file.read()
            
               # Process PDF content immediately during upload
               processed_text = process_pdf_content(content)
               if not processed_text:
                   return 'Error processing PDF', 500
                   
               unique_key = str(uuid.uuid4())
               
               # Store file metadata
               c.execute("""
                   INSERT INTO user_files 
                   (user_id, filename, file_type, is_structured, unique_key)
                   VALUES (?, ?, ?, ?, ?)
               """, (user_id, file.filename, extension, False, unique_key))
               file_id = c.lastrowid
                   # Store processed text content
               c.execute("""
                   INSERT INTO unstructured_file_storage 
                   (file_id, unique_key, content)
                   VALUES (?, ?, ?)
               """, (file_id, unique_key, processed_text))
            else:   
                content = file.read()
                unique_key = str(uuid.uuid4())
                # Insert metadata into 'user_files'
                c.execute("""
                    INSERT INTO user_files (user_id, filename, file_type, is_structured,unique_key)
                    VALUES (?, ?, ?, ?,?)
                """, (user_id, file.filename, extension, False,unique_key))
                file_id = c.lastrowid

                # Insert the content into 'unstructured_file_storage'
                c.execute("""
                    INSERT INTO unstructured_file_storage (file_id,unique_key, content)
                    VALUES (?,?, ?)
                """, (file_id, unique_key, content)) 
        conn.commit()
        app.logger.info(f"File uploaded successfully for user {user_id}")
        return 'File Uploaded successfully',200
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error during file upload: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

@app.route('/get-column-statistics/<user_id>/<file_id>/<column_name>', methods=['GET'])
def get_column_statistics_from_db(user_id, file_id, column_name):
    """Get pre-computed statistics for a specific column"""
    try:
        conn_user = sqlite3.connect('user_files.db')
        conn_stats = sqlite3.connect('stats.db')
        c_user = conn_user.cursor()
        
        # Get file information to find the table_id
        c_user.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c_user.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        table_id = result[0]
        
        # Get the column statistics
        c_stats = conn_stats.cursor()
        c_stats.execute("""
            SELECT data_type, basic_stats, distribution, shape_stats, outlier_stats
            FROM column_stats
            WHERE table_id = ? AND column_name = ?
        """, (table_id, column_name))
        
        stats_result = c_stats.fetchone()
        
        if not stats_result:
            # Statistics not yet calculated, return empty response
            return jsonify({
                'message': 'Statistics are being calculated',
                'ready': False
            })
            
        data_type, basic_stats, distribution, shape_stats, outlier_stats = stats_result
        
        response = {
            'ready': True,
            'data_type': data_type,
            'basic_stats': json.loads(basic_stats),
            'distribution': json.loads(distribution),
            'shape_stats': json.loads(shape_stats),
            'outlier_stats': json.loads(outlier_stats)
        }
        
        return jsonify(response)
        
    except Exception as e:
        logging.error(f"Error retrieving column statistics: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn_user' in locals():
            conn_user.close()
        if 'conn_stats' in locals():
            conn_stats.close()

@app.route('/get-dataset-statistics/<user_id>/<file_id>', methods=['GET'])
def get_dataset_statistics(user_id, file_id):
    """Get pre-computed statistics for an entire dataset"""
    try:
        conn_user = sqlite3.connect('user_files.db')
        conn_stats = sqlite3.connect('stats.db')
        c_user = conn_user.cursor()
        
        # Get file information to find the table_id
        c_user.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c_user.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        table_id = result[0]
        
        # Get the dataset statistics
        c_stats = conn_stats.cursor()
        c_stats.execute("""
            SELECT correlation_matrix, parallel_coords, violin_data, 
                   heatmap_data, scatter_matrix
            FROM dataset_stats
            WHERE table_id = ?
        """, (table_id,))
        
        stats_result = c_stats.fetchone()
        
        if not stats_result:
            # Statistics not yet calculated, return empty response
            return jsonify({
                'message': 'Dataset statistics are being calculated',
                'ready': False
            })
            
        correlation_matrix, parallel_coords, violin_data, heatmap_data, scatter_matrix = stats_result
        
        response = {
            'ready': True,
            'correlation_matrix': json.loads(correlation_matrix),
            'parallel_coords': json.loads(parallel_coords),
            'violin_data': json.loads(violin_data),
            'heatmap_data': json.loads(heatmap_data),
            'scatter_matrix': json.loads(scatter_matrix)
        }
        
        return jsonify(response)
        
    except Exception as e:
        logging.error(f"Error retrieving dataset statistics: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn_user' in locals():
            conn_user.close()
        if 'conn_stats' in locals():
            conn_stats.close()

@app.route('/get-stats-status/<user_id>/<file_id>', methods=['GET'])
def get_stats_status(user_id, file_id):
    """Check if statistics have been calculated for a file"""
    try:
        conn_user = sqlite3.connect('user_files.db')
        conn_stats = sqlite3.connect('stats.db')
        c_user = conn_user.cursor()
        
        # Get file information and table ID
        c_user.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c_user.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        table_id = result[0]
        
        # Check if column statistics exist
        c_stats = conn_stats.cursor()
        c_stats.execute("""
            SELECT COUNT(*) 
            FROM column_stats
            WHERE table_id = ?
        """, (table_id,))
        
        column_stats_count = c_stats.fetchone()[0]
        
        # Check if dataset statistics exist
        c_stats.execute("""
            SELECT COUNT(*) 
            FROM dataset_stats
            WHERE table_id = ?
        """, (table_id,))
        
        dataset_stats_exist = c_stats.fetchone()[0] > 0
        
        return jsonify({
            'column_stats_count': column_stats_count,
            'dataset_stats_exist': dataset_stats_exist,
            'stats_complete': column_stats_count > 0 and dataset_stats_exist
        })
        
    except Exception as e:
        logging.error(f"Error checking statistics status: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn_user' in locals():
            conn_user.close()
        if 'conn_stats' in locals():
            conn_stats.close()

# Task status starts
def create_stats_task(table_id, table_name):
    """Create a new statistics calculation task"""
    task_id = f"stats_{table_id}_{int(time.time())}"
    
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO stats_tasks (task_id, table_id, status, message)
            VALUES (?, ?, ?, ?)
        """, (task_id, table_id, 'pending', 'Task created'))
        
        conn.commit()
        
        # Queue the task for background processing
        stats_task_queue.put({
            'task_id': task_id,
            'table_id': table_id,
            'table_name': table_name
        })
        
        return task_id
    except Exception as e:
        logging.error(f"Error creating stats task: {str(e)}")
        return None
    finally:
        conn.close()

def update_task_status(task_id, status, progress=None, message=None):
    """Update the status of a statistics calculation task"""
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    
    try:
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
        TASK_STATUS[task_id] = {
            'status': status,
            'progress': progress if progress is not None else 0.0,
            'message': message
        }
        
        return True
    except Exception as e:
        logging.error(f"Error updating task status: {str(e)}")
        return False
    finally:
        conn.close()

def get_task_status(task_id):
    """Get the current status of a task"""
    # Check the in-memory cache first
    if task_id in TASK_STATUS:
        return TASK_STATUS[task_id]
    
    # If not in cache, check the database
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT status, progress, message, created_at, completed_at
            FROM stats_tasks
            WHERE task_id = ?
        """, (task_id,))
        
        result = c.fetchone()
        if not result:
            return None
            
        status, progress, message, created_at, completed_at = result
        
        # Cache the result
        TASK_STATUS[task_id] = {
            'status': status,
            'progress': progress,
            'message': message,
            'created_at': created_at,
            'completed_at': completed_at
        }
        
        return TASK_STATUS[task_id]
    except Exception as e:
        logging.error(f"Error getting task status: {str(e)}")
        return None
    finally:
        conn.close()
#Task status ends


## status updates API ENDPOINTS start
@app.route('/start-stats-calculation/<user_id>/<file_id>', methods=['POST'])
def start_stats_calculation(user_id, file_id):
    """Start a new statistics calculation task for a file"""
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file information
        c.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        table_id = result[0]
        table_name = f"table_{table_id}"
        
        # Create a new task
        task_id = create_stats_task(table_id, table_name)
        
        if not task_id:
            return jsonify({'error': 'Failed to create task'}), 500
            
        return jsonify({
            'task_id': task_id,
            'status': 'pending',
            'message': 'Statistics calculation has been queued'
        })
        
    except Exception as e:
        logging.error(f"Error starting statistics calculation: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/check-stats-task/<task_id>', methods=['GET'])
def check_stats_task(task_id):
    """Check the status of a statistics calculation task"""
    try:
        status = get_task_status(task_id)
        
        if not status:
            return jsonify({'error': 'Task not found'}), 404
            
        return jsonify(status)
        
    except Exception as e:
        logging.error(f"Error checking task status: {str(e)}")
        return jsonify({'error': str(e)}), 500
## status updates API ENDPOINTS end

# Columns rotes updates here
@app.route('/delete-column/<user_id>/<file_id>', methods=['POST'])
def delete_column(user_id, file_id):
    """Delete a column from a table"""
    try:
        data = request.json
        column_name = data.get('column')
        
        if not column_name:
            return jsonify({'error': 'Column name is required'}), 400
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file information
        c.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        unique_key = result[0]
        table_name = f"table_{unique_key}"
        
        # Verify table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not c.fetchone():
            return jsonify({'error': f'Table {table_name} not found'}), 404
        
        # Get current columns
        c.execute(f'PRAGMA table_info("{table_name}")')
        columns = [col[1] for col in c.fetchall()]
        
        if column_name not in columns:
            return jsonify({'error': f'Column {column_name} not found in table'}), 404
        
        # Create a new table without the specified column
        columns_to_keep = [col for col in columns if col != column_name]
        columns_str = ', '.join([f'"{col}"' for col in columns_to_keep])
        
        # Create new table without the column - use a safe name without hyphens
        temp_table_name = f"temp_{uuid.uuid4().hex}"  # Use hex UUID to avoid special characters
        c.execute(f'CREATE TABLE "{temp_table_name}" AS SELECT {columns_str} FROM "{table_name}"')
        
        # Drop old table and rename new one
        c.execute(f'DROP TABLE "{table_name}"')
        c.execute(f'ALTER TABLE "{temp_table_name}" RENAME TO "{table_name}"')
        
        conn.commit()
        
        # Return updated columns
        return jsonify({
            'success': True,
            'message': f'Column {column_name} deleted successfully',
            'columns': columns_to_keep
        })
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        app.logger.error(f"Error deleting column: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/rename-column/<user_id>/<file_id>', methods=['POST'])
def rename_column(user_id, file_id):
    """Rename a column in a table"""
    try:
        data = request.json
        old_name = data.get('oldName')
        new_name = data.get('newName')
        
        if not old_name or not new_name:
            return jsonify({'error': 'Both old and new column names are required'}), 400
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file information
        c.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        unique_key = result[0]
        table_name = f"table_{unique_key}"
        
        # Verify table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not c.fetchone():
            return jsonify({'error': f'Table {table_name} not found'}), 404
        
        # Get current columns to verify old name exists
        c.execute(f'PRAGMA table_info("{table_name}")')
        columns = [col[1] for col in c.fetchall()]
        
        if old_name not in columns:
            return jsonify({'error': f'Column {old_name} not found in table'}), 404
        
        if new_name in columns:
            return jsonify({'error': f'Column {new_name} already exists in table'}), 400
        
        # Rename column by creating a new table with the renamed column
        columns_select = []
        columns_create = []
        
        for col in columns:
            if col == old_name:
                columns_select.append(f'"{old_name}" AS "{new_name}"')
                columns_create.append(f'"{new_name}"')
            else:
                columns_select.append(f'"{col}"')
                columns_create.append(f'"{col}"')
        
        select_str = ', '.join(columns_select)
        
        # Use hex UUID for temporary table name to avoid hyphens
        temp_table_name = f"temp_{uuid.uuid4().hex}"
        
        # Create new table with renamed column
        c.execute(f'CREATE TABLE "{temp_table_name}" AS SELECT {select_str} FROM "{table_name}"')
        
        # Drop old table and rename new one
        c.execute(f'DROP TABLE "{table_name}"')
        c.execute(f'ALTER TABLE "{temp_table_name}" RENAME TO "{table_name}"')
        
        conn.commit()
        
        # Return updated columns
        updated_columns = [new_name if col == old_name else col for col in columns]
        return jsonify({
            'success': True,
            'message': f'Column renamed from {old_name} to {new_name} successfully',
            'columns': updated_columns
        })
        
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error renaming column: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# @app.route('/add-column/<user_id>/<file_id>', methods=['POST'])
# def add_column(user_id, file_id):
#     """Add a new column by splitting an existing one"""
#     try:
#         data = request.json
#         source_column = data.get('sourceColumn')
#         new_column_name = data.get('newColumnName')
#         delimiter = data.get('delimiter')
#         split_index = data.get('splitIndex', 0)
        
#         if not source_column or not new_column_name or not delimiter:
#             return jsonify({'error': 'Source column, new column name, and delimiter are required'}), 400
        
#         conn = sqlite3.connect('user_files.db')
#         c = conn.cursor()
        
#         # Get file information
#         c.execute("""
#             SELECT unique_key
#             FROM user_files
#             WHERE file_id = ? AND user_id = ?
#         """, (file_id, user_id))
        
#         result = c.fetchone()
#         if not result:
#             return jsonify({'error': 'File not found'}), 404
            
#         unique_key = result[0]
#         table_name = f"table_{unique_key}"
        
#         # Verify table exists
#         c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
#         if not c.fetchone():
#             return jsonify({'error': f'Table {table_name} not found'}), 404
        
#         # Get current columns to verify source column exists
#         c.execute(f"PRAGMA table_info('{table_name}')")
#         columns = [col[1] for col in c.fetchall()]
        
#         if source_column not in columns:
#             return jsonify({'error': f'Column {source_column} not found in table'}), 404
        
#         if new_column_name in columns:
#             return jsonify({'error': f'Column {new_column_name} already exists in table'}), 400
        
#         # Add new column
#         try:
#             c.execute(f'ALTER TABLE "{table_name}" ADD COLUMN "{new_column_name}" TEXT')
#         except sqlite3.OperationalError as e:
#             # If it fails with older SQLite versions, use a workaround with temp table
#             if "duplicate column name" in str(e):
#                 return jsonify({'error': f'Column {new_column_name} already exists'}), 400
#             raise
        
#         # Update the new column with split values
#         # For SQLite we use instr and substr functions for string manipulation
#         if split_index == 0:
#             # Get first part before delimiter
#             c.execute(f"""
#                 UPDATE "{table_name}" 
#                 SET "{new_column_name}" = 
#                     CASE 
#                         WHEN instr("{source_column}", ?) > 0 THEN substr("{source_column}", 1, instr("{source_column}", ?) - 1)
#                         ELSE "{source_column}"
#                     END
#             """, (delimiter, delimiter))
#         else:
#             # Get part after delimiter at specific position
#             # This is a bit complex in SQLite, we'll implement a simplified version
#             c.execute(f"""
#                 UPDATE "{table_name}" 
#                 SET "{new_column_name}" = 
#                     CASE 
#                         WHEN instr("{source_column}", ?) > 0 THEN 
#                             substr(
#                                 "{source_column}", 
#                                 instr("{source_column}", ?) + 1
#                             )
#                         ELSE NULL
#                     END
#             """, (delimiter, delimiter))
        
#         conn.commit()
        
#         # Return updated columns
#         updated_columns = columns + [new_column_name]
#         return jsonify({
#             'success': True,
#             'message': f'New column {new_column_name} added successfully',
#             'columns': updated_columns
#         })
        
#     except Exception as e:
#         conn.rollback()
#         app.logger.error(f"Error adding column: {str(e)}")
#         app.logger.error(traceback.format_exc())
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if 'conn' in locals():
#             conn.close()

@app.route('/rename-file/<user_id>/<file_id>', methods=['POST'])
def rename_file(user_id, file_id):
    """Rename a file and update all related references"""
    try:
        data = request.json
        new_filename = data.get('newFilename')
        
        if not new_filename:
            return jsonify({'error': 'New filename is required'}), 400
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file information
        c.execute("""
            SELECT filename, file_type, parent_file_id, unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        old_filename, file_type, parent_file_id, unique_key = result
        
        # Check if this is a parent file with children
        if parent_file_id is None:  # This is a parent file
            c.execute("""
                SELECT file_id, filename, sheet_table
                FROM user_files
                WHERE parent_file_id = ?
            """, (file_id,))
            
            child_files = c.fetchall()
            
            # Update parent file
            c.execute("""
                UPDATE user_files
                SET filename = ?
                WHERE file_id = ?
            """, (new_filename, file_id))
            
            # Update child files
            for child_id, child_filename, sheet_table in child_files:
                # For child files, format is typically "parentname:sheetname"
                # So we replace the parent part
                if ':' in child_filename:
                    _, sheet_name = child_filename.split(':', 1)
                    new_child_filename = f"{new_filename}:{sheet_name}"
                else:
                    new_child_filename = f"{new_filename}:{sheet_table}"
                
                c.execute("""
                    UPDATE user_files
                    SET filename = ?
                    WHERE file_id = ?
                """, (new_child_filename, child_id))
        else:
            # This is a child file, we need to update just this file
            # but keep the parent prefix
            c.execute("""
                SELECT filename
                FROM user_files
                WHERE file_id = ?
            """, (parent_file_id,))
            
            parent_result = c.fetchone()
            if not parent_result:
                # Parent not found, just update this file
                c.execute("""
                    UPDATE user_files
                    SET filename = ?
                    WHERE file_id = ?
                """, (new_filename, file_id))
            else:
                parent_filename = parent_result[0]
                # For child files, keep "parentname:sheetname" format
                # But update the sheet part
                if ':' in old_filename:
                    sheet_table = old_filename.split(':', 1)[1]
                    new_child_filename = f"{parent_filename}:{new_filename}"
                else:
                    new_child_filename = f"{parent_filename}:{new_filename}"
                
                c.execute("""
                    UPDATE user_files
                    SET filename = ?, sheet_table = ?
                    WHERE file_id = ?
                """, (new_child_filename, new_filename, file_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'File renamed successfully',
            'newFilename': new_filename
        })
        
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error renaming file: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# Columns rotes updates end
@app.route('/update-row/<user_id>/<file_id>', methods=['POST'])
def update_row(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key
            FROM user_files f
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        is_structured, unique_key = result
        table_name = "table_" + unique_key
        if not table_name:
            return jsonify({'error': 'Table name not found'}), 404
            
        data = request.json
        
        if is_structured:
            edit_item = data.get('editItem', {})
            # Process empty or null values
            processed_item = {}
            
            # Get column types from the table
            c.execute(f'PRAGMA table_info("{table_name}")')
            columns_info = {col[1]: col[2] for col in c.fetchall()}
            
            for key, value in edit_item.items():
                # Handle different SQL types appropriately
                if value is None:
                    processed_item[key] = None
                else:
                    col_type = columns_info.get(key, '').upper()
                    if 'INT' in col_type:
                        processed_item[key] = int(value) if value != '' else None
                    elif 'REAL' in col_type or 'FLOAT' in col_type:
                        processed_item[key] = float(value) if value != '' else None
                    elif 'BOOL' in col_type:
                        processed_item[key] = bool(value) if value != '' else None
                    else:
                        # For text/varchar types, empty string is kept as empty string
                        processed_item[key] = value
            
            if processed_item:
                quoted_table = f'"{table_name}"'
                
                if data.get('editIndex') is not None:  # Update existing row
                    row_query = f'SELECT ROWID FROM {quoted_table} LIMIT 1 OFFSET ?'
                    c.execute(row_query, (data['editIndex'],))
                    row_result = c.fetchone()
                    
                    if row_result:
                        row_id = row_result[0]
                        set_clause = ', '.join([f'"{k}" = ?' for k in processed_item.keys()])
                        values = list(processed_item.values())
                        
                        update_query = f'''
                            UPDATE {quoted_table} 
                            SET {set_clause} 
                            WHERE ROWID = ?
                        '''
                        c.execute(update_query, values + [row_id])
                        
                        # Fetch updated row
                        c.execute(f'SELECT * FROM {quoted_table} WHERE ROWID = ?', [row_id])
                        
                else:  # Create new row
                    columns = [f'"{k}"' for k in processed_item.keys()]
                    values = list(processed_item.values())
                    placeholders = ','.join(['?' for _ in values])
                    
                    insert_query = f'''
                        INSERT INTO {quoted_table} ({','.join(columns)})
                        VALUES ({placeholders})
                    '''
                    c.execute(insert_query, values)
                    
                    # Fetch the new row
                    c.execute(f'SELECT * FROM {quoted_table} WHERE ROWID = last_insert_rowid()')
                
                columns = [description[0] for description in c.description]
                row = c.fetchone()
                if row:
                    updated_row = dict(zip(columns, row))
                    conn.commit()
                    return jsonify({
                        'success': True,
                        'data': updated_row
                    })
                else:
                    raise Exception("Failed to retrieve updated row")
            else:
                return jsonify({'error': 'No valid data provided for update'}), 400            
        else:  # Unstructured data handling remains the same
            c.execute("""
                SELECT content 
                FROM unstructured_file_storage 
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
            
            result = c.fetchone()
            if not result:
                return jsonify({'error': 'Content not found'}), 404
                
            content = result[0]
            try:
                content_str = content.decode('utf-8') if isinstance(content, bytes) else content
                lines = content_str.split('\n')
            except Exception as e:
                app.logger.error(f"Error decoding content: {str(e)}")
                lines = []
            
            edit_index = data.get('editIndex')
            edit_item = data.get('editItem', {})
            new_content = edit_item.get('content', '')
            
            if edit_index is not None and 0 <= edit_index < len(lines):
                lines[edit_index] = new_content
            else:
                lines.append(new_content)
                
            final_content = '\n'.join(lines)
            
            c.execute("""
                UPDATE unstructured_file_storage 
                SET content = ? 
                WHERE file_id = ? AND unique_key = ?
            """, (final_content, file_id, unique_key))
            
            conn.commit()
            return jsonify({
                'success': True,
                'data': {'content': new_content}
            })
            
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error in row operation: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/search-pdf/<user_id>/<file_id>', methods=['POST'])
def search_pdf(user_id, file_id):
    query = request.json.get('query', '').lower()
    if not query:
        return jsonify({'error': 'No search query provided'}), 400

    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    try:
        # Get PDF content
        c.execute("""
            SELECT ufs.content
            FROM unstructured_file_storage ufs
            JOIN user_files uf ON ufs.file_id = uf.file_id
            WHERE uf.file_id = ? AND uf.user_id = ? AND uf.file_type = 'pdf'
        """, (file_id, user_id))

        result = c.fetchone()
        if not result:
            return jsonify({'error': 'PDF not found'}), 404

        content = result[0]
        
        # Search for query in content
        lines = content.split('\n')
        matches = []
        
        for i, line in enumerate(lines):
            if query in line.lower():
                context_start = max(0, i - 2)
                context_end = min(len(lines), i + 3)
                matches.append({
                    'line_number': i + 1,
                    'context': '\n'.join(lines[context_start:context_end]),
                    'matched_text': line
                })

        return jsonify({
            'matches': matches,
            'total_matches': len(matches)
        })

    except Exception as e:
        logging.error(f"Error searching PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()
@app.route('/delete-rows/<user_id>/<file_id>', methods=['POST'])
def delete_rows(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key
            FROM user_files f
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        is_structured, unique_key= result
        table_name = "table_" + unique_key
        if not table_name and is_structured:
            return jsonify({'error': 'Table name not found'}), 404
            
        indices = request.json.get('indices', [])
        
        if not indices:
            return jsonify({'error': 'No indices provided for deletion'}), 400
        
        if is_structured:
            # Properly quote table name
            quoted_table = f'"{table_name}"'
            
            # Delete rows one by one using ROWID
            for index in indices:
                # First get the ROWID for the index
                c.execute(f'SELECT ROWID FROM {quoted_table} LIMIT 1 OFFSET ?', (index,))
                row_result = c.fetchone()
                if row_result:
                    row_id = row_result[0]
                    c.execute(f'DELETE FROM {quoted_table} WHERE ROWID = ?', (row_id,))
            
        else:
            # Handle unstructured data
            c.execute("""
                SELECT content 
                FROM unstructured_file_storage 
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
            
            result = c.fetchone()
            if not result:
                return jsonify({'error': 'Content not found'}), 404
                
            content = result[0]
            try:
                content_str = content.decode('utf-8') if isinstance(content, bytes) else content
                lines = content_str.split('\n')
                
                # Create new content without deleted lines
                new_lines = [line for i, line in enumerate(lines) if i not in indices]
                new_content = '\n'.join(new_lines)
                
                c.execute("""
                    UPDATE unstructured_file_storage 
                    SET content = ? 
                    WHERE file_id = ? AND unique_key = ?
                """, (new_content, file_id, unique_key))
                
            except Exception as e:
                app.logger.error(f"Error processing content: {str(e)}")
                return jsonify({'error': 'Error processing content'}), 500
        
        conn.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error deleting rows: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/list_files/<user_id>', methods=['GET'])
def list_files(user_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    try:
        c.execute("""
            SELECT file_id, filename, file_type, is_structured, created_at,unique_key,parent_file_id
            FROM user_files
            WHERE user_id = ? 
        """, (user_id,))
        files = c.fetchall()
        file_list = [
            {
                'file_id': f[0],
                'filename': f[1],
                'file_type': f[2],
                'is_structured': bool(f[3]),
                'created_at': f[4],
                'unique_key': f[5]
            } for f in files if f[2] == 'csv' or f[2] =='pdf' or f[6] is not None
        ]
        return jsonify({'files': file_list}), 200
    except Exception as e:
        app.logger.error(f"Error listing files: {str(e)}")
        return f'Error listing files: {str(e)}', 500
    finally:
        conn.close()

def handle_excel_upload(file, user_id, filename, c, conn):
    """Handle Excel file by extracting sheets and storing them similarly to DB tables."""
    try:
        # Read Excel file
        df_excel = pd.ExcelFile(file)
        sheet_names = df_excel.sheet_names
        
        if not sheet_names:
            raise ValueError("No sheets found in the Excel file.")

        # Create parent file entry
        parent_unique_key = str(uuid.uuid4())
        c.execute("""
            INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, filename, filename.split('.')[-1].lower(), True, parent_unique_key))
        parent_file_id = c.lastrowid
        
        app.logger.info(f"Created parent entry for Excel file: {parent_file_id}")

        # Process each sheet
        for sheet_name in sheet_names:
            try:
                # Read sheet data
                df = pd.read_excel(df_excel, sheet_name=sheet_name)
                
                # Generate unique key for this sheet
                sheet_unique_key = str(uuid.uuid4())
                
                # Create new table name
                table_name = f"table_{sheet_unique_key}"
                
                # Store sheet data in new table
                df.to_sql(table_name, conn, index=False, if_exists='replace')
                
                # Create entry in user_files for this sheet
                c.execute("""
                    INSERT INTO user_files (
                        user_id, filename, file_type, is_structured, 
                        unique_key, sheet_table, parent_file_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, f"{filename}:{sheet_name}", filename.split('.')[-1].lower(), 
                      True, sheet_unique_key, sheet_name, parent_file_id))

                app.logger.info(f"Processed sheet {sheet_name} as {table_name}")

            except Exception as e:
                app.logger.error(f"Error processing sheet {sheet_name}: {str(e)}")
                continue

        conn.commit()
        return parent_file_id

    except Exception as e:
        app.logger.error(f"Error in handle_excel_upload: {str(e)}")
        raise

@app.route('/get-file/<user_id>/<file_id>', methods=['GET'])
def get_file(user_id, file_id):
    
    page = request.args.get('page',1,type=int)
    page_size = request.args.get('page_size', 50, type=int)
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT filename, file_type, is_structured, unique_key, sheet_table,parent_file_id
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        file_info = c.fetchone()
        app.logger.debug(f"File info: {file_info}")
        
        if not file_info:
            return jsonify({'error': 'File not found'}), 404
            
        filename, file_type, is_structured, unique_key,sheet_table, parent_file_id = file_info

        if is_structured:
            # Handle parent files (Excel workbooks or DB files)
            if parent_file_id is None and file_type in ['xlsx', 'xls', 'db', 'sqlite', 'sqlite3']:
                c.execute("""
                    SELECT file_id, sheet_table, filename
                    FROM user_files
                    WHERE parent_file_id = ? AND user_id = ?
                    ORDER BY sheet_table
                """, (file_id, user_id))

                sheets = c.fetchall()
                app.logger.debug(f"Found child entries: {sheets}")

                return jsonify({
                    'type': 'structured',
                    'file_type': file_type,
                    'tables': [{
                        'id': str(row[0]),
                        'name': row[1],
                        'full_name': row[2]
                    } for row in sheets]
                })


            # Get the table name for this sheet/table
            table_name = f"table_{unique_key}"
            app.logger.debug(f"Looking for table: {table_name}")

            # Verify table exists
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not c.fetchone():
                return jsonify({'error': f'Table not found: {table_name}'}), 404

            # Get pagination parameters
            page = request.args.get('page', 1, type=int)
            page_size = request.args.get('page_size', 50, type=int)
            offset = (page - 1) * page_size

            # Get total rows
            c.execute(f"SELECT COUNT(*) FROM '{table_name}'")
            total_rows = c.fetchone()[0]

            # Get columns
            c.execute(f"PRAGMA table_info('{table_name}')")
            columns = [col[1] for col in c.fetchall()]

            # Get paginated data
            c.execute(f"""
                SELECT * FROM '{table_name}'
                LIMIT ? OFFSET ?
            """, (page_size, offset))

            rows = c.fetchall()
            app.logger.debug(f"Retrieved {len(rows)} rows from {table_name}")

            # Convert to list of dictionaries
            data = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[columns[i]] = value
                data.append(row_dict)

            return jsonify({
                'type': 'structured',
                'file_type': file_type,
                'columns': columns,
                'data': data,
                'pagination': {
                    'total_rows': total_rows,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total_rows + page_size - 1) // page_size
                }
            })

        else: #unstructered data
            c.execute("""
                 SELECT content FROM unstructured_file_storage
                 WHERE file_id = ? AND unique_key = ?
             """, (file_id, unique_key))
            result = c.fetchone()
            
            if not result:
                return jsonify({'error': 'Unstructured data not found'}), 404
                
            content = result[0]

            if file_type in ['txt', 'docx', 'doc']:
                try:
                    decoded_content = content.decode('utf-8')
                except UnicodeDecodeError:
                    decoded_content = content.decode('latin1')
                    
                response_data = {
                    'type': 'unstructured',
                    'file_type': file_type,
                    'content': decoded_content,
                    'editable': True
                }
            elif file_type == 'pdf':
                c.execute("""
                SELECT content FROM unstructured_file_storage
                WHERE file_id = ? AND unique_key = ?
                """, (file_id, unique_key))
            
                result = c.fetchone()
                if not result:
                    return jsonify({'error': 'PDF content not found'}), 404

                content = result[0]

                # Content is already processed text, return directly
                response_data = {
                    'type': 'unstructured',
                    'file_type': file_type,
                    'content': content,
                    'editable': True
                }

                return jsonify(response_data)
    except Exception as e:
        app.logger.error(f"Error retrieving file: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

@app.route('/get-tables/<user_id>/<file_id>', methods=['GET'])
def get_tables(user_id, file_id):
    """Get available tables/sheets for a file."""
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file type first
        c.execute("""
            SELECT file_type, is_structured
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        file_info = c.fetchone()
        if not file_info:
            app.logger.error(f"File not found: {file_id}")
            return jsonify({'error': 'File not found'}), 404
            
        file_type, is_structured = file_info
        app.logger.info(f"File type: {file_type}, Is structured: {is_structured}")

        # For SQLite files, get tables from structured_file_storage
        if file_type == 'db':
            c.execute("""
                SELECT table_name
                FROM structured_file_storage
                WHERE file_id = ?
            """, (file_id,))
            tables = c.fetchall()
            app.logger.info(f"Found {len(tables)} tables for DB file")
            
            return jsonify({
                'tables': [{
                    'id': file_id,
                    'name': row[0],
                    'full_name': f"{file_id}_{row[0]}"
                } for row in tables]
            })
        
        # For Excel files, get sheets from user_files
        elif file_type in ['xlsx', 'xls']:
            c.execute("""
                SELECT file_id, sheet_table
                FROM user_files
                WHERE parent_file_id = ? AND user_id = ?
                ORDER BY sheet_table
            """, (file_id, user_id))
            
            sheets = c.fetchall()
            app.logger.info(f"Found {len(sheets)} sheets for Excel file")
            
            return jsonify({
                'tables': [{
                    'id': str(row[0]),
                    'name': row[1],
                    'full_name': f"{file_id}_{row[1]}"
                } for row in sheets]
            })
        
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
            
    except Exception as e:
        app.logger.error(f"Error getting tables: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/get-sheets/<user_id>/<file_id>', methods=['GET'])
def get_sheets(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata and check if it's an Excel file
        c.execute("""
            SELECT filename, unique_key, file_type
            FROM user_files
            WHERE file_id = ? AND user_id = ? AND file_type IN ('xlsx', 'xls')
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'Excel file not found'}), 404
            
        _, unique_key, _ = result
        
        # Get all sheets for this file
        c.execute("""
            SELECT sheet_table
            FROM user_files
            WHERE unique_key = ? AND sheet_table IS NOT NULL
        """, (unique_key,))
        
        sheets = [row[0] for row in c.fetchall()]
        return jsonify({'sheets': sheets})
        
    except Exception as e:
        app.logger.error(f"Error getting sheets: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
################################################      

# Add a new route for saving unstructured content
@app.route('/save-unstructured/<user_id>/<file_id>', methods=['POST'])
def save_unstructured(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Verify file ownership and type
        c.execute("""
            SELECT file_type, unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ? AND is_structured = 0
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found or not unstructured'}), 404
            
        file_type, unique_key = result
        
        # Get the new content from request
        new_content = request.json.get('content')
        if not new_content:
            return jsonify({'error': 'No content provided'}), 400
            
        # Convert string content to bytes
        if isinstance(new_content, str):
            content_bytes = new_content.encode('utf-8')
        else:
            content_bytes = new_content
            
        # Update the content in unstructured_file_storage
        c.execute("""
            UPDATE unstructured_file_storage
            SET content = ?
            WHERE file_id = ? AND unique_key = ?
        """, (content_bytes, file_id, unique_key))
        
        conn.commit()
        return jsonify({'message': 'Content updated successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Error saving unstructured content: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/get_table_count/<user_id>/<filename>', methods=['GET'])
def get_table_count(user_id, filename):
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("SELECT content FROM user_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        result = c.fetchone()
        conn.close()

        if result:
            content = result[0]
            with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_db_file:
                temp_db_file.write(content)
                temp_db_path = temp_db_file.name

            conn = sqlite3.connect(temp_db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [table[0] for table in cursor.fetchall()]
            conn.close()

            app.logger.info(f"Tables in {filename}: {tables}")
            return jsonify({"table_count": len(tables), "table_names": tables})
        else:
            app.logger.warning(f"File not found: {filename}")
            return "File not found", 404
    except Exception as e:
        app.logger.error(f"Error getting table count: {str(e)}")
        return str(e), 500

@app.route('/delete-file/<user_id>/<file_id>', methods=['DELETE'])
def delete_file(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    try:
        # Verify file ownership and get metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key, f.file_type, f.sheet_table, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found or access denied'}), 404
            
        is_structured, unique_key, file_type, sheet_table, table_name = result
        
        if is_structured:
            if file_type in ['xlsx', 'xls'] and sheet_table:
                # For Excel files with multiple sheets
                c.execute("""
                    SELECT table_name FROM structured_file_storage
                    WHERE file_id = ?
                """, (file_id,))
                sheets = c.fetchall()
                
                # Drop all sheet tables
                for sheet in sheets:
                    sheet_table_name = sheet[0]
                    c.execute(f"DROP TABLE IF EXISTS '{sheet_table_name}'")
                
                # Delete all sheet records
                c.execute("""
                    DELETE FROM structured_file_storage
                    WHERE file_id = ?
                """, (file_id,))
                
            else:
                # For other structured files
                if table_name:
                    c.execute(f"DROP TABLE IF EXISTS '{table_name}'")
                c.execute("""
                    DELETE FROM structured_file_storage
                    WHERE unique_key = ?
                """, (unique_key,))
        else:
            # Delete from unstructured_file_storage
            c.execute("""
                DELETE FROM unstructured_file_storage
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
        
        # Finally, delete from user_files
        c.execute("DELETE FROM user_files WHERE file_id = ?", (file_id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'File deleted successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error deleting file: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
# @app.route('/split-column/<user_id>/<file_id>', methods=['POST'])
# def split_column(user_id, file_id):
#     try:
#         data = request.json
#         column_name = data.get('column')
#         delimiter = data.get('delimiter')
#         new_column_prefix = data.get('newColumnPrefix', 'split')
        
#         conn = sqlite3.connect('user_files.db')
#         c = conn.cursor()
        
#         # Get table info
#         c.execute("""
#             SELECT f.unique_key, s.table_name
#             FROM user_files f
#             LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
#             WHERE f.file_id = ? AND f.user_id = ?
#         """, (file_id, user_id))
        
#         result = c.fetchone()
#         if not result:
#             return jsonify({'error': 'File not found'}), 404
            
#         unique_key, table_name = result
        
#         # Read data into pandas
#         df = pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn)
        
#         # Perform split operation efficiently
#         split_df = df[column_name].str.split(delimiter, expand=True)
        
#         # Name new columns
#         num_cols = len(split_df.columns)
#         new_columns = [f"{new_column_prefix}_{i+1}" for i in range(num_cols)]
#         split_df.columns = new_columns
        
#         # Add new columns to original dataframe
#         for col in new_columns:
#             df[col] = split_df[col]
        
#         # Update database
#         df.to_sql(table_name, conn, if_exists='replace', index=False)
        
#         conn.commit()
        
#         return jsonify({
#             'success': True,
#             'newColumns': new_columns,
#             'data': df.to_dict('records')
#         })
        
#     except Exception as e:
#         app.logger.error(f"Error in split_column: {str(e)}")
#         return jsonify({'error': str(e)}), 500
#     finally:
#         conn.close()

# @app.route('/add-column/<user_id>/<file_id>', methods=['POST'])
# def add_column(user_id, file_id):
#     """Add a new column by splitting an existing one"""
#     try:
#         data = request.json
#         app.logger.info(f"Received add column request: {data}")
        
#         source_column = data.get('sourceColumn')
#         new_column_name = data.get('newColumnName')
#         delimiter = data.get('delimiter')
#         split_index = data.get('splitIndex', 0)
        
#         if not source_column or not new_column_name or delimiter is None:
#             return jsonify({'error': 'Source column, new column name, and delimiter are required'}), 400
        
#         conn = sqlite3.connect('user_files.db')
#         c = conn.cursor()
        
#         # Get file information
#         c.execute("""
#             SELECT unique_key
#             FROM user_files
#             WHERE file_id = ? AND user_id = ?
#         """, (file_id, user_id))
        
#         result = c.fetchone()
#         if not result:
#             return jsonify({'error': 'File not found'}), 404
            
#         unique_key = result[0]
#         table_name = f"table_{unique_key}"
        
#         # Get current columns
#         c.execute(f'PRAGMA table_info("{table_name}")')
#         columns = [col[1] for col in c.fetchall()]
        
#         if source_column not in columns:
#             return jsonify({'error': f'Column {source_column} not found in table'}), 404
        
#         if new_column_name in columns:
#             return jsonify({'error': f'Column {new_column_name} already exists in table'}), 400
        
#         # Read data into pandas for processing
#         df = pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn)
        
#         # Create new column
#         df[new_column_name] = ""
        
#         # Update with split values
#         for idx, row in df.iterrows():
#             value = row[source_column]
#             if value and isinstance(value, str):
#                 parts = value.split(delimiter)
#                 if parts and len(parts) > split_index:
#                     df.at[idx, new_column_name] = parts[split_index].strip()
        
#         # Create temporary table, then swap
#         temp_table = f"temp_{uuid.uuid4().hex}"
#         df.to_sql(temp_table, conn, if_exists='replace', index=False)
        
#         # Drop original and rename temp
#         c.execute(f'DROP TABLE "{table_name}"')
#         c.execute(f'ALTER TABLE "{temp_table}" RENAME TO "{table_name}"')
        
#         conn.commit()
        
#         return jsonify({
#             'success': True,
#             'message': f'New column {new_column_name} added successfully',
#             'columns': list(df.columns)
#         })
        
#     except Exception as e:
#         if 'conn' in locals():
#             conn.rollback()
#         app.logger.error(f"Error adding column: {str(e)}")
#         app.logger.error(traceback.format_exc())
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if 'conn' in locals():
#             conn.close()

def calculate_basic_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate basic statistics for the dataset."""
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    
    return {
        'describe': df.describe().to_dict(),
        'missing_values': df.isnull().sum().to_dict(),
        'unique_counts': df.nunique().to_dict(),
        'numeric_summaries': {
            col: {
                'mean': df[col].mean(),
                'median': df[col].median(),
                'std': df[col].std(),
                'quartiles': df[col].quantile([0.25, 0.75]).to_dict()
            } for col in numeric_cols
        }
    }

def calculate_advanced_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate advanced statistics for the dataset."""
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    categorical_cols = df.select_dtypes(include=['object']).columns
    
    # Correlation matrix with p-values
    def correlation_with_pvalue(x: pd.Series, y: pd.Series):
        return stats.pearsonr(x.dropna(), y.dropna())
    
    correlation_matrix = {}
    for col1 in numeric_cols:
        correlation_matrix[col1] = {}
        for col2 in numeric_cols:
            if col1 != col2:
                corr, p_value = correlation_with_pvalue(df[col1], df[col2])
                correlation_matrix[col1][col2] = {'correlation': corr, 'p_value': p_value}
    
    # Calculate statistical tests and distributions
    distribution_tests = {}
    for col in numeric_cols:
        clean_data = df[col].dropna()
        distribution_tests[col] = {
            'normality': {
                'shapiro': stats.shapiro(clean_data[:5000]),  # Limit sample size for performance
                'skewness': stats.skew(clean_data),
                'kurtosis': stats.kurtosis(clean_data)
            },
            'outliers': identify_outliers(clean_data)
        }
    
    # Categorical analysis
    categorical_analysis = {}
    for col in categorical_cols:
        value_counts = df[col].value_counts()
        categorical_analysis[col] = {
            'frequencies': value_counts.to_dict(),
            'proportions': (value_counts / len(df)).to_dict(),
            'chi_square': calculate_chi_square(df, col) if len(value_counts) < 50 else None
        }
    
    return {
        'correlation_matrix': correlation_matrix,
        'distribution_tests': distribution_tests,
        'categorical_analysis': categorical_analysis,
        'summary_statistics': df.describe(include='all').to_dict()
    }

def identify_outliers(series: pd.Series) -> Dict[str, Any]:
    """Identify outliers using IQR method."""
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    outliers = series[(series < lower_bound) | (series > upper_bound)]
    
    return {
        'count': len(outliers),
        'percentage': (len(outliers) / len(series)) * 100,
        'bounds': {'lower': lower_bound, 'upper': upper_bound},
        'outlier_values': outliers.head(10).to_dict()  # Return first 10 outliers
    }

def calculate_chi_square(df: pd.DataFrame, column: str) -> Dict[str, Any]:
    """Perform chi-square test of independence."""
    observed = df[column].value_counts()
    n = len(df)
    expected = pd.Series([n/len(observed)] * len(observed), index=observed.index)
    chi_square_stat, p_value = stats.chisquare(observed, expected)
    
    return {
        'statistic': chi_square_stat,
        'p_value': p_value,
        'dof': len(observed) - 1
    }

def generate_visualizations(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate various visualizations for the dataset."""
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    categorical_cols = df.select_dtypes(include=['object']).columns
    
    visualizations = {}
    
    # Distribution plots for numeric columns
    for col in numeric_cols[:5]:  # Limit to first 5 columns
        fig = px.histogram(df, x=col, marginal="box")
        visualizations[f'{col}_distribution'] = fig.to_json()
    
    # Correlation heatmap
    correlation = df[numeric_cols].corr()
    fig = go.Figure(data=go.Heatmap(
        z=correlation.values,
        x=correlation.columns,
        y=correlation.columns
    ))
    visualizations['correlation_heatmap'] = fig.to_json()
    
    # Bar plots for categorical columns
    for col in categorical_cols[:5]:
        fig = px.bar(df[col].value_counts().head(10))
        visualizations[f'{col}_distribution'] = fig.to_json()
    
    return visualizations
def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Series):
        return convert_numpy_types(obj.to_dict())
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

def prepare_response_data(data):
    """Prepare data for JSON response by converting numpy types."""
    return convert_numpy_types(data)

@app.route('/analyze/<user_id>/<file_id>', methods=['POST'])
def analyze_data(user_id: str, file_id: str):
    """Main analysis endpoint supporting different types of analysis."""
    try:
        data = request.json
        analysis_type = data.get('analysis_type')
        options = data.get('options', [])

        conn = sqlite3.connect('user_files.db')
        cursor = conn.cursor()

        # Get file metadata and table name
        cursor.execute("""
            SELECT f.unique_key, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = cursor.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404

        _, table_name = result

        # Read data in chunks if it's a large dataset
        chunk_size = 100000  # Adjust based on memory constraints

        chunks = []
        for chunk in pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn, chunksize=chunk_size):
            chunks.append(chunk)
        df = pd.concat(chunks)

        response = {}
        
        if analysis_type == 'basic' or 'basic' in options:
            response['basic'] = prepare_response_data(calculate_basic_stats(df))
            
        if analysis_type == 'advanced' or 'advanced' in options:
            response['advanced'] = prepare_response_data(calculate_advanced_stats(df))
            
        if analysis_type == 'custom':
            custom_response = {}
            for option in options:
                if option in ['correlation', 'distributions', 'outliers']:
                    stats = calculate_advanced_stats(df)
                    custom_response[option] = stats.get(option)
                elif option == 'visualizations':
                    custom_response['visualizations'] = generate_visualizations(df)
            response = prepare_response_data(custom_response)
        
        # Add metadata about the analysis
        response['metadata'] = prepare_response_data({
            'rows': len(df),
            'columns': len(df.columns),
            'memory_usage': int(df.memory_usage(deep=True).sum()),
            'timestamp': pd.Timestamp.now().isoformat()
        })

        return jsonify(response)

    except Exception as e:
        app.logger.error(f"Error in analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

            
@app.route('/update_blob/<user_id>/<filename>', methods=['POST'])
def update_blob(user_id, filename):
    app.logger.info(f"Received update blob request for user: {user_id}, file: {filename}")
    
    try:
        data = request.json
        new_content = data.get('newContent', [])
        
        if not new_content:
            return jsonify({"error": "No content to update"}), 400
        
        app.logger.info(f"Received new content: {new_content[:5]}...")  # Log first 5 items
        
        # Convert the new content to a pandas DataFrame
        df = pd.DataFrame(new_content)
        
        # Determine file type and save accordingly
        file_extension = filename.split('.')[-1].lower()
        
        if file_extension == 'xlsx':
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False)
            content = output.getvalue()
        elif file_extension in ['csv', 'tsv', 'txt']:
            delimiter = ',' if file_extension == 'csv' else '\t'
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False, sep=delimiter)
            content = csv_buffer.getvalue().encode()
        elif file_extension == 'db':
            temp_db = io.BytesIO()
            conn = sqlite3.connect(temp_db)
            df.to_sql('data', conn, if_exists='replace', index=False)
            conn.commit()
            content = temp_db.getvalue()
        elif file_extension == 'xml':
            root = ET.Element('root')
            for _, row in df.iterrows():
                child = ET.SubElement(root, 'item')
                for col, value in row.items():
                    child.set(col, str(value))
            content = ET.tostring(root)
        elif file_extension == 'pdf':
            # We can't easily update PDF content, so we'll create a new PDF with the data
            output = io.BytesIO()
            pdf = PyPDF2.PdfWriter()
            page = pdf.add_blank_page(width=612, height=792)
            page.insert_text(50, 700, str(df))
            pdf.write(output)
            content = output.getvalue()
        else:
            return jsonify({"error": "Unsupported file type for update"}), 400
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Update the database with the new content
        c.execute("UPDATE user_files SET content = ? WHERE user_id = ? AND filename = ?",
                  (content, user_id, filename))
        conn.commit()
        conn.close()
        
        app.logger.info(f"Successfully updated the blob content for file '{filename}' for user '{user_id}'")
        return jsonify({"message": "Successfully updated the blob content"}), 200
    
    except Exception as e:
        app.logger.error(f"Error updating blob content: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add these new routes to your Flask backend (backend.py)

@app.route('/get-column-metadata/<user_id>/<file_id>/<column_name>', methods=['GET'])
def get_column_metadata(user_id, file_id, column_name):
    """Get metadata about a specific column including unique values, statistics etc."""
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file metadata and table name
        c.execute("""
            SELECT f.unique_key
            FROM user_files f
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        unique_key = result[0]
        table_name = f"table_{unique_key}"

        # Get column data
        df = pd.read_sql_query(f'SELECT "{column_name}" FROM "{table_name}"', conn)
        
        # Determine if column is numeric
        is_numeric = pd.api.types.is_numeric_dtype(df[column_name])
        
        if is_numeric:
            metadata = {
                'type': 'numeric',
                'min': float(df[column_name].min()),
                'max': float(df[column_name].max()),
                'mean': float(df[column_name].mean()),
                'unique_values': df[column_name].nunique(),
                'value_counts': df[column_name].value_counts().head(10).to_dict()
            }
        else:
            metadata = {
                'type': 'categorical',
                'unique_values': df[column_name].nunique(),
                'value_counts': df[column_name].value_counts().head(50).to_dict()
            }
            
        return jsonify(metadata)
        
    except Exception as e:
        app.logger.error(f"Error getting column metadata: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# Add this helper function at the top of your backend.py file
def convert_numpy_types(obj):
    """
    Recursively convert numpy types to Python native types for JSON serialization.
    This ensures all data can be properly converted to JSON.
    """
    if isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32,
                       np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    elif isinstance(obj, (pd.Timestamp)):
        return obj.isoformat()
    elif isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    elif isinstance(obj, (pd.Series)):
        return convert_numpy_types(obj.values)
    elif isinstance(obj, (decimal.Decimal)):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy_types(item) for item in obj]
    return obj

@app.route('/apply-filters/<user_id>/<file_id>', methods=['POST'])
def apply_filters(user_id, file_id):
    """
    Apply filters and sorting to the data, handling all numeric types properly.
    Returns paginated, filtered, and sorted data in JSON format.
    """
    try:
        app.logger.info(f"Applying filters for user {user_id}, file {file_id}")
        filters = request.json.get('filters', {})
        sort_by = request.json.get('sort_by', {})
        page = request.json.get('page', 1)
        page_size = request.json.get('page_size', 50)
        
        app.logger.debug(f"Received filters: {filters}")
        app.logger.debug(f"Sort by: {sort_by}")
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get table name
        c.execute("""
            SELECT f.unique_key
            FROM user_files f
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        unique_key = result[0]
        table_name = f"table_{unique_key}"
        
        # Build the SQL query with filters
        where_clauses = []
        params = []
        
        for column, filter_value in filters.items():
            if isinstance(filter_value, dict):
                # Numeric range filter
                if 'min' in filter_value and filter_value['min'] is not None:
                    where_clauses.append(f'CAST("{column}" AS FLOAT) >= ?')
                    params.append(float(filter_value['min']))
                if 'max' in filter_value and filter_value['max'] is not None:
                    where_clauses.append(f'CAST("{column}" AS FLOAT) <= ?')
                    params.append(float(filter_value['max']))
            else:
                # Categorical filter
                where_clauses.append(f'"{column}" = ?')
                params.append(str(filter_value))
        
        where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'
        
        # Add sorting
        order_by = ''
        if sort_by:
            column = sort_by.get('column')
            direction = sort_by.get('direction', 'asc').upper()
            if column:
                # Add CAST for numeric columns to ensure proper sorting
                order_by = f' ORDER BY CAST("{column}" AS FLOAT) {direction}' if column in numericColumns else f' ORDER BY "{column}" {direction}'
        
        # Add pagination
        offset = (page - 1) * page_size
        limit_sql = f' LIMIT {page_size} OFFSET {offset}'
        
        # Execute query
        query = f'SELECT * FROM "{table_name}" WHERE {where_sql}{order_by}{limit_sql}'
        app.logger.debug(f"Executing query: {query} with params: {params}")
        
        df = pd.read_sql_query(query, conn, params=params)
        
        # Get total count for pagination
        count_query = f'SELECT COUNT(*) FROM "{table_name}" WHERE {where_sql}'
        total_rows = pd.read_sql_query(count_query, conn, params=params).iloc[0, 0]
        
        # Convert the data to a format that can be JSON serialized
        result_data = convert_numpy_types(df.to_dict('records'))
        
        response_data = {
            'data': result_data,
            'pagination': {
                'total_rows': int(total_rows),  # Convert numpy.int64 to native int
                'page': page,
                'page_size': page_size,
                'total_pages': int((total_rows + page_size - 1) // page_size)
            }
        }
        
        app.logger.info(f"Successfully applied filters. Returning {len(result_data)} rows")
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Error applying filters: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/generate-graph/<user_id>/<file_id>', methods=['POST'])
def generate_graph(user_id, file_id):
    """
    Enhanced route handler for generating interactive charts.
    Supports an expanded set of chart types with improved data processing.
    """
    try:
        app.logger.debug(f"Received request: user_id={user_id}, file_id={file_id}")
        data = request.json
        
        # Get chart parameters
        chart_type = data.get('chartType')
        selected_columns = data.get('selectedColumns', [])
        options = data.get('options', {})
        
        # Validate input
        if not chart_type or not selected_columns:
            return jsonify({'error': 'Missing required parameters'}), 400

        # Special handling for different chart types
        required_columns = {
            'kline': 5,  # date, open, close, low, high
            'surface3d': 3,
            'bar3d': 3,
            'line3d': 3,
            'scatter3d': 3,
            'sankey': 2,
            'graph': 2
        }

        if chart_type in required_columns and len(selected_columns) < required_columns[chart_type]:
            return jsonify({
                'error': f'{chart_type} requires at least {required_columns[chart_type]} columns'
            }), 400

        # Database connection
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        try:
            # Get file information
            c.execute("""
                SELECT file_type, unique_key
                FROM user_files
                WHERE file_id = ? AND user_id = ?
            """, (file_id, user_id))
            
            file_info = c.fetchone()
            if not file_info:
                return jsonify({'error': 'File not found'}), 404
                
            file_type, unique_key = file_info
            table_name = f"table_{unique_key}"

            # Verify table exists
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not c.fetchone():
                return jsonify({'error': f'Table {table_name} not found'}), 404

            # Get data using optimized function with specific handling for each chart type
            df = get_table_data(table_name, selected_columns)
            
            # Special data processing for specific chart types
            if chart_type == 'kline':
                # Ensure data is sorted by date
                df = df.sort_values(by=selected_columns[0])
            elif chart_type in ['surface3d', 'bar3d', 'line3d', 'scatter3d']:
                # Normalize 3D data
                for col in selected_columns[1:]:
                    df[col] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())
            elif chart_type == 'gauge':
                # Ensure single value for gauge
                if len(df) > 1:
                    df = df.iloc[[0]]
            elif chart_type == 'liquid':
                # Convert to percentage if needed
                if df[selected_columns[0]].max() > 1:
                    df[selected_columns[0]] = df[selected_columns[0]] / 100

            # Generate chart
            chart_result = EnhancedChartGenerator.create_chart(chart_type, df, selected_columns, options)
            print(chart_result)
            chart,title = chart_result

            # Generate HTML and cache it
            graph_id = str(uuid.uuid4())
            html_content = chart.render_embed()
            
            c.execute("""
                INSERT INTO graph_cache (graph_id, html_content, created_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (graph_id, html_content))
            
            conn.commit()
            
            return jsonify({
                'graph_id': graph_id,
                'url': f'/graph/{graph_id}',
                'title':title
            })
            
        finally:
            conn.close()
            
    except Exception as e:
        app.logger.error(f"Error generating graph: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/graph/<graph_id>', methods=['GET'])
def serve_graph(graph_id):
    try:
        # Get query parameters
        hide_title = request.args.get('hideTitle', 'false').lower() == 'true'
        theme_name = request.args.get('theme', 'light')
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        c.execute("""
            SELECT html_content
            FROM graph_cache
            WHERE graph_id = ?
        """, (graph_id,))
        
        result = c.fetchone()
        if not result:
            return 'Graph not found', 404
            
        html_content = result[0]
        
        # Define theme styles
        theme_styles = {
            'light': {
                'background': '#ffffff',
                'text': '#333333',
                'grid': '#f0f0f0'
            },
            'dark': {
                'background': '#1a1a1a',
                'text': '#ffffff',
                'grid': '#333333'
            },
            # Add more themes...
        }
        
        theme_colors = theme_styles.get(theme_name, theme_styles['light'])
        
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                html, body {{
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }}
                
                #chart-container {{
                    width: 100%;
                    height: 100%;
                    position: relative;
                }}
                
                .echarts-container {{
                    width: 100% !important;
                    height: 100% !important;
                }}
            </style>
        </head>
        <body>
            <div id="chart-container">
                {html_content}
            </div>
            
            <script>
                document.addEventListener('DOMContentLoaded', function() {{
                    const chartInstance = echarts.getInstanceByDom(
                        document.querySelector('#chart-container div')
                    );
                    
                    if (chartInstance) {{
                        window.chart = chartInstance;
                        const option = chartInstance.getOption();
                        
                        // Hide title if requested
                        if ({str(hide_title).lower()}) {{
                            if (option.title) {{
                                option.title.forEach(title => {{
                                    title.show = false;
                                }});
                            }}
                        }}
                        
                        // Apply theme
                        option.backgroundColor = '{theme_colors['background']}';
                        
                        if (option.textStyle) {{
                            option.textStyle.color = '{theme_colors['text']}';
                        }}
                        
                        // Update axes
                        ['xAxis', 'yAxis'].forEach(axisName => {{
                            if (option[axisName]) {{
                                [].concat(option[axisName]).forEach(axis => {{
                                    if (axis) {{
                                        if (axis.axisLine && axis.axisLine.lineStyle) {{
                                            axis.axisLine.lineStyle.color = '{theme_colors['grid']}';
                                        }}
                                        if (axis.splitLine && axis.splitLine.lineStyle) {{
                                            axis.splitLine.lineStyle.color = '{theme_colors['grid']}';
                                        }}
                                        if (axis.axisLabel) {{
                                            axis.axisLabel.color = '{theme_colors['text']}';
                                        }}
                                    }}
                                }});
                            }}
                        }});
                        
                        // Improve grid layout
                        if (option.grid) {{
                            option.grid.forEach(grid => {{
                                if (grid) {{
                                    grid.left = '3%';
                                    grid.right = '4%';
                                    grid.top = '5%';  // Reduced top margin since title is removed
                                    grid.bottom = '8%';
                                    grid.containLabel = true;
                                }}
                            }});
                        }}
                        
                        chartInstance.setOption(option);
                        
                        // Handle resizing
                        const handleResize = () => {{
                            if (window.chart) {{
                                window.chart.resize();
                            }}
                        }};
                        
                        window.addEventListener('resize', handleResize);
                        
                        if (typeof ResizeObserver !== 'undefined') {{
                            const resizeObserver = new ResizeObserver(handleResize);
                            resizeObserver.observe(document.getElementById('chart-container'));
                        }}
                    }}
                }});
            </script>
        </body>
        </html>
        """
        
        return Response(full_html, mimetype='text/html')
        
    except Exception as e:
        app.logger.error(f"Error serving graph: {str(e)}")
        return str(e), 500
    finally:
        if 'conn' in locals():
            conn.close()

# Export here

@app.route('/check-dashboard-images/<user_id>/<dashboard_id>', methods=['GET'])
def check_dashboard_images(user_id, dashboard_id):
    """
    Check if a dashboard has pre-rendered images available.
    """
    try:
        # Get dashboard name
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # First, get the dashboard name
        dashboard_name = None
        
        try:
            # Try to get from dashboard table first
            c.execute("""
                SELECT name FROM dashboards
                WHERE id = ? AND user_id = ?
            """, (dashboard_id, user_id))
            
            result = c.fetchone()
            if result:
                dashboard_name = result[0]
        except Exception as e:
            app.logger.warning(f"Error getting dashboard name from dashboards table: {str(e)}")
            # This is just a fallback - no need to re-raise
        
        if not dashboard_name:
            # Try to use dashboard_id as name (fallback)
            dashboard_name = f"Dashboard-{dashboard_id}"
        
        # Count charts with pre-rendered images for this dashboard
        c.execute("""
            SELECT COUNT(*) FROM graph_cache
            WHERE dashboard_name = ? AND isImageSuccess = 1
        """, (dashboard_name,))
        
        count = c.fetchone()[0]
        
        # Also count total charts for this dashboard
        c.execute("""
            SELECT COUNT(*) FROM graph_cache
            WHERE dashboard_name = ?
        """, (dashboard_name,))
        
        total = c.fetchone()[0]
        
        return jsonify({
            'hasSavedImages': count > 0,
            'savedImageCount': count,
            'totalCharts': total
        })
        
    except Exception as e:
        app.logger.error(f"Error checking dashboard images: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/export-dashboard-images/<user_id>', methods=['POST'])
def export_dashboard_images(user_id):
    """Generate a PDF export of dashboard using pre-captured images."""
    try:
        data = request.json
        dashboard_ids = data.get('dashboard_ids', [])
        export_name = data.get('export_name', 'Dashboard Export')
        use_relative_positioning = data.get('use_relative_positioning', True)
        
        # Get node images
        node_images = data.get('node_images', {})
        
        # Get positions data
        node_positions = data.get('node_positions', {})
        
        app.logger.info(f"Exporting dashboard with {len(node_images)} images")
        
        # Ensure we have at least one dashboard ID
        if not dashboard_ids or not isinstance(dashboard_ids, list):
            return jsonify({'error': 'No dashboards selected for export'}), 400
        
        # Create directories for exports
        export_id = str(uuid.uuid4())
        export_dir = os.path.join('static', 'exports')
        os.makedirs(export_dir, exist_ok=True)
        
        # Create temporary directory for storing individual images
        temp_dir = os.path.join(export_dir, f"temp_{export_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        export_path = os.path.join(export_dir, f"{export_name.replace(' ', '_')}_{export_id}.pdf")
        
        # Import required libraries
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm, inch
        from reportlab.lib.utils import ImageReader
        import base64
        from io import BytesIO
        from PIL import Image
        
        # Create PDF canvas
        c = canvas.Canvas(export_path, pagesize=landscape(A4))
        page_width, page_height = landscape(A4)
        
        # Dashboard info
        dashboards_info = data.get('dashboards', [])
        
        # Save images from base64 to files
        image_files = {}
        
        # Map node types to their positions array
        node_type_map = {
            'chart': node_positions.get('charts', []),
            'textbox': node_positions.get('textBoxes', []),
            'datatable': node_positions.get('dataTables', []),
            'statcard': node_positions.get('statCards', [])
        }
        
        # Process and save all images
        for image_key, image_data in node_images.items():
            try:
                # Parse the node type and ID
                parts = image_key.split('_', 1)
                if len(parts) != 2:
                    continue
                    
                node_type, node_id = parts
                
                # Skip if invalid node type
                if node_type not in node_type_map:
                    continue
                
                # Remove data:image/png;base64, prefix
                if image_data.startswith('data:image/png;base64,'):
                    image_data = image_data[len('data:image/png;base64,'):]
                
                # Decode base64 to bytes
                try:
                    img_bytes = base64.b64decode(image_data)
                except Exception as e:
                    app.logger.error(f"Error decoding base64 for {image_key}: {str(e)}")
                    continue
                
                # Save to temporary file
                image_file_path = os.path.join(temp_dir, f"{image_key}.png")
                with open(image_file_path, 'wb') as f:
                    f.write(img_bytes)
                
                # Store the file path
                image_files[image_key] = image_file_path
                
            except Exception as e:
                app.logger.error(f"Error processing image {image_key}: {str(e)}")
                app.logger.error(traceback.format_exc())
        
        app.logger.info(f"Processed {len(image_files)} images for PDF export")
        
        # Process each dashboard
        for dashboard_index, dashboard_id in enumerate(dashboard_ids):
            # Start a new page for each dashboard except the first one
            if dashboard_index > 0:
                c.showPage()
            
            # Find the dashboard name
            dashboard_name = f"Dashboard Export - {export_name}"
            for dash in dashboards_info:
                if dash.get('id') == dashboard_id:
                    dashboard_name = dash.get('name', dashboard_name)
            
            # Add a colored header background
            c.setFillColorRGB(0.9, 0.9, 1.0)  # Light blue background
            c.rect(0, page_height-35*mm, page_width, 35*mm, fill=1)
            
            # Add dashboard title with more prominence
            c.setFillColorRGB(0.1, 0.1, 0.5)  # Dark blue text
            c.setFont("Helvetica-Bold", 18)
            c.drawString(15*mm, page_height-20*mm, dashboard_name)
            
            # Add timestamp
            c.setFillColorRGB(0.3, 0.3, 0.3)  # Dark gray text
            c.setFont("Helvetica", 10)
            c.drawString(15*mm, page_height-30*mm, f"Exported: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
            
            # For relative positioning, calculate the bounding box
            all_node_positions = []
            
            # Build a list of all node positions from the different node types
            for node_type, positions in node_type_map.items():
                for pos in positions:
                    # Only include nodes that have corresponding images
                    node_id = pos.get('id')
                    image_key = f"{node_type}_{node_id}"
                    if image_key in image_files and node_id and 'position' in pos:
                        all_node_positions.append({
                            'type': node_type,
                            'id': node_id,
                            'position': pos.get('position', {}),
                            'title': pos.get('title', '')
                        })
            
            # Skip empty dashboards
            if not all_node_positions:
                app.logger.warning(f"No valid nodes found for dashboard {dashboard_id}")
                continue
            
            # Set up coordinate transformation based on positioning method
            if use_relative_positioning:
                # Find min and max positions with null safety
                min_x = min((node.get('position', {}).get('x', 0) or 0) for node in all_node_positions)
                min_y = min((node.get('position', {}).get('y', 0) or 0) for node in all_node_positions)
                max_x = max((node.get('position', {}).get('x', 0) or 0) + 
                          (node.get('position', {}).get('width', 400) or 400) for node in all_node_positions)
                max_y = max((node.get('position', {}).get('y', 0) or 0) + 
                          (node.get('position', {}).get('height', 300) or 300) for node in all_node_positions)
                
                # Calculate scale factors to fit everything on the page with margins
                margin_mm = 20
                available_width = page_width - 2 * margin_mm
                available_height = page_height - 40*mm  # Account for header
                
                width_scale = available_width / (max_x - min_x) if max_x > min_x else 1
                height_scale = available_height / (max_y - min_y) if max_y > min_y else 1
                
                # Use the smaller scale to ensure everything fits
                scale = min(width_scale, height_scale) * 0.9  # Add some extra margin
                
                # Function to transform coordinates
                def transform_coords(pos):
                    x = ((pos.get('x', 0) or 0) - min_x) * scale + margin_mm
                    y = page_height - (((pos.get('y', 0) or 0) - min_y) * scale + 40*mm)  # Flip Y and account for header
                    width = (pos.get('width', 400) or 400) * scale
                    height = (pos.get('height', 300) or 300) * scale
                    return x, y - height, width, height  # Adjust y for PDF coordinates
            else:
                # For absolute positioning, use a simple scale factor
                scale_factor = 0.15
                
                # Function to transform coordinates with absolute positioning
                def transform_coords(pos):
                    x = (pos.get('x', 0) or 0) * scale_factor
                    y = page_height - (pos.get('y', 0) or 0) * scale_factor - (pos.get('height', 300) or 300) * scale_factor
                    width = (pos.get('width', 400) or 400) * scale_factor
                    height = (pos.get('height', 300) or 300) * scale_factor
                    return x, y, width, height
                    
            # Process all nodes
            for node in all_node_positions:
                node_type = node.get('type')
                node_id = node.get('id')
                image_key = f"{node_type}_{node_id}"
                
                if image_key in image_files:
                    try:
                        image_path = image_files[image_key]
                        
                        # Get node position
                        pos = node.get('position', {})
                        x, y, width, height = transform_coords(pos)
                        
                        # Ensure dimensions are positive
                        if width <= 0 or height <= 0:
                            app.logger.warning(f"Invalid dimensions for {image_key}: {width}x{height}")
                            continue
                        
                        # Draw the image
                        c.drawImage(image_path, x, y, width, height)
                        
                        # Add a border around each element
                        c.setStrokeColorRGB(0.8, 0.8, 0.8)
                        c.rect(x, y, width, height, fill=0)
                        
                    except Exception as e:
                        app.logger.error(f"Error adding {image_key} to PDF: {str(e)}")
                        app.logger.error(traceback.format_exc())
        
        # Add page numbers if multiple pages
        if len(dashboard_ids) > 1:
            for i in range(c.getPageNumber()):
                c.showPage()
                c.setFont("Helvetica", 8)
                c.drawRightString(
                    page_width - 10*mm, 
                    10*mm, 
                    f"Page {i+1} of {len(dashboard_ids)}"
                )
        
        # Save PDF
        c.save()
        
        # Clean up temporary images
        for image_path in image_files.values():
            try:
                os.remove(image_path)
            except:
                pass
        
        try:
            os.rmdir(temp_dir)
        except:
            pass
        
        # Record the export in the database
        conn = sqlite3.connect('user_files.db')
        cursor = conn.cursor()
        
        # Create table if needed
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_exports (
                export_id TEXT PRIMARY KEY,
                user_id TEXT,
                dashboard_ids TEXT,
                export_name TEXT,
                export_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Save export record
        cursor.execute("""
            INSERT INTO dashboard_exports (
                export_id, user_id, dashboard_ids, export_name, export_path, created_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (export_id, user_id, json.dumps(dashboard_ids), export_name, export_path))
        
        conn.commit()
        conn.close()
        
        # Return download URL
        return jsonify({
            'success': True,
            'export_id': export_id,
            'export_name': export_name,
            'download_url': f'/download-export/{export_id}'
        })
        
    except Exception as e:
        app.logger.error(f"Error exporting dashboard images: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/export-dashboard-pre-rendered/<user_id>', methods=['POST'])
def export_dashboard_pre_rendered(user_id):
    """
    Generate a PDF export of dashboard using pre-rendered images from the database.
    This is like creating a photo album from previously captured photographs.
    """
    try:
        data = request.json
        dashboard_ids = data.get('dashboard_ids', [])
        export_name = data.get('export_name', 'Dashboard Export')
        use_relative_positioning = data.get('use_relative_positioning', True)
        
        # Get node positions
        node_positions = data.get('node_positions', {})
        
        app.logger.info(f"Exporting dashboard with pre-rendered images")
        
        # Ensure we have at least one dashboard ID
        if not dashboard_ids or not isinstance(dashboard_ids, list):
            return jsonify({'error': 'No dashboards selected for export'}), 400
        
        # Create directories for exports
        export_id = str(uuid.uuid4())
        export_dir = os.path.join('static', 'exports')
        os.makedirs(export_dir, exist_ok=True)
        
        # Create temporary directory for storing individual images
        temp_dir = os.path.join(export_dir, f"temp_{export_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        export_path = os.path.join(export_dir, f"{export_name.replace(' ', '_')}_{export_id}.pdf")
        
        # Import required libraries
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm, inch
        from reportlab.lib.utils import ImageReader
        from io import BytesIO
        from PIL import Image
        
        # Create PDF canvas
        c = canvas.Canvas(export_path, pagesize=landscape(A4))
        page_width, page_height = landscape(A4)
        
        # Dashboard info
        dashboards_info = data.get('dashboards', [])
        
        # Connect to database to retrieve saved images
        conn = sqlite3.connect('user_files.db')
        db_cursor = conn.cursor()
        
        # Save images from database to files
        image_files = {}
        
        # Map node types to their positions array
        node_type_map = {
            'chart': node_positions.get('charts', []),
            'textbox': node_positions.get('textBoxes', []),
            'datatable': node_positions.get('dataTables', []),
            'statcard': node_positions.get('statCards', [])
        }
        
        # For each dashboard, get pre-rendered images
        for dashboard_index, dashboard_id in enumerate(dashboard_ids):
            # Find the dashboard name
            dashboard_name = None
            for dash in dashboards_info:
                if dash.get('id') == dashboard_id:
                    dashboard_name = dash.get('name')
                    break
            
            if not dashboard_name:
                app.logger.warning(f"Dashboard name not found for {dashboard_id}")
                dashboard_name = f"Dashboard-{dashboard_id}"
            
            # Get all chart IDs for this dashboard that have pre-rendered images
            chart_nodes = [n for n in node_type_map.get('chart', []) if n.get('id')]
            
            # Get pre-rendered images from database
            for chart_node in chart_nodes:
                chart_id = chart_node.get('id')
                if not chart_id:
                    continue
                
                db_cursor.execute("""
                    SELECT image_blob 
                    FROM graph_cache 
                    WHERE graph_id = ? AND dashboard_name = ? AND isImageSuccess = 1
                """, (chart_id, dashboard_name))
                
                result = db_cursor.fetchone()
                if not result or not result[0]:
                    app.logger.warning(f"No pre-rendered image found for chart {chart_id}")
                    continue
                
                image_blob = result[0]
                
                # Save to temporary file
                image_key = f"chart_{chart_id}"
                image_file_path = os.path.join(temp_dir, f"{image_key}.png")
                with open(image_file_path, 'wb') as f:
                    f.write(image_blob)
                
                # Store the file path
                image_files[image_key] = image_file_path
        
        # Fetch non-chart elements (which would use captureElementAsImage on frontend)
        non_chart_images = data.get('node_images', {})
        for image_key, image_data in non_chart_images.items():
            if image_key.startswith('chart_'):
                # Skip chart images as we already processed them from database
                continue
                
            try:
                # Parse the node type and ID
                parts = image_key.split('_', 1)
                if len(parts) != 2:
                    continue
                    
                node_type, node_id = parts
                
                # Skip if invalid node type
                if node_type not in node_type_map:
                    continue
                
                # Remove data:image/png;base64, prefix
                if image_data.startswith('data:image/png;base64,'):
                    image_data = image_data[len('data:image/png;base64,'):]
                
                # Decode base64 to bytes
                img_bytes = base64.b64decode(image_data)
                
                # Save to temporary file
                image_file_path = os.path.join(temp_dir, f"{image_key}.png")
                with open(image_file_path, 'wb') as f:
                    f.write(img_bytes)
                
                # Store the file path
                image_files[image_key] = image_file_path
                
            except Exception as e:
                app.logger.error(f"Error processing image {image_key}: {str(e)}")
        
        app.logger.info(f"Processed {len(image_files)} images for PDF export")
        
        # Process each dashboard - This part is the same as the original export function
        for dashboard_index, dashboard_id in enumerate(dashboard_ids):
            # Start a new page for each dashboard except the first one
            if dashboard_index > 0:
                c.showPage()
            
            # Find the dashboard name
            dashboard_name = f"Dashboard Export - {export_name}"
            for dash in dashboards_info:
                if dash.get('id') == dashboard_id:
                    dashboard_name = dash.get('name', dashboard_name)
            
            # Add a colored header background
            c.setFillColorRGB(0.9, 0.9, 1.0)  # Light blue background
            c.rect(0, page_height-35*mm, page_width, 35*mm, fill=1)
            
            # Add dashboard title with more prominence
            c.setFillColorRGB(0.1, 0.1, 0.5)  # Dark blue text
            c.setFont("Helvetica-Bold", 18)
            c.drawString(15*mm, page_height-20*mm, dashboard_name)
            
            # Add timestamp
            c.setFillColorRGB(0.3, 0.3, 0.3)  # Dark gray text
            c.setFont("Helvetica", 10)
            c.drawString(15*mm, page_height-30*mm, f"Exported: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
            
            # For relative positioning, calculate the bounding box
            all_node_positions = []
            
            # Build a list of all node positions from the different node types
            for node_type, positions in node_type_map.items():
                for pos in positions:
                    # Only include nodes that have corresponding images
                    node_id = pos.get('id')
                    image_key = f"{node_type}_{node_id}"
                    if image_key in image_files and node_id and 'position' in pos:
                        all_node_positions.append({
                            'type': node_type,
                            'id': node_id,
                            'position': pos.get('position', {}),
                            'title': pos.get('title', '')
                        })
            
            # Skip empty dashboards
            if not all_node_positions:
                app.logger.warning(f"No valid nodes found for dashboard {dashboard_id}")
                continue
            
            # Set up coordinate transformation based on positioning method
            if use_relative_positioning:
                # Find min and max positions with null safety
                min_x = min((node.get('position', {}).get('x', 0) or 0) for node in all_node_positions)
                min_y = min((node.get('position', {}).get('y', 0) or 0) for node in all_node_positions)
                max_x = max((node.get('position', {}).get('x', 0) or 0) + 
                          (node.get('position', {}).get('width', 400) or 400) for node in all_node_positions)
                max_y = max((node.get('position', {}).get('y', 0) or 0) + 
                          (node.get('position', {}).get('height', 300) or 300) for node in all_node_positions)
                
                # Calculate scale factors to fit everything on the page with margins
                margin_mm = 20
                available_width = page_width - 2 * margin_mm
                available_height = page_height - 40*mm  # Account for header
                
                width_scale = available_width / (max_x - min_x) if max_x > min_x else 1
                height_scale = available_height / (max_y - min_y) if max_y > min_y else 1
                
                # Use the smaller scale to ensure everything fits
                scale = min(width_scale, height_scale) * 0.9  # Add some extra margin
                
                # Function to transform coordinates
                def transform_coords(pos):
                    x = ((pos.get('x', 0) or 0) - min_x) * scale + margin_mm
                    y = page_height - (((pos.get('y', 0) or 0) - min_y) * scale + 40*mm)  # Flip Y and account for header
                    width = (pos.get('width', 400) or 400) * scale
                    height = (pos.get('height', 300) or 300) * scale
                    return x, y - height, width, height  # Adjust y for PDF coordinates
            else:
                # For absolute positioning, use a simple scale factor
                scale_factor = 0.15
                
                # Function to transform coordinates with absolute positioning
                def transform_coords(pos):
                    x = (pos.get('x', 0) or 0) * scale_factor
                    y = page_height - (pos.get('y', 0) or 0) * scale_factor - (pos.get('height', 300) or 300) * scale_factor
                    width = (pos.get('width', 400) or 400) * scale_factor
                    height = (pos.get('height', 300) or 300) * scale_factor
                    return x, y, width, height
                    
            # Process all nodes
            for node in all_node_positions:
                node_type = node.get('type')
                node_id = node.get('id')
                image_key = f"{node_type}_{node_id}"
                
                if image_key in image_files:
                    try:
                        image_path = image_files[image_key]
                        
                        # Get node position
                        pos = node.get('position', {})
                        x, y, width, height = transform_coords(pos)
                        
                        # Ensure dimensions are positive
                        if width <= 0 or height <= 0:
                            app.logger.warning(f"Invalid dimensions for {image_key}: {width}x{height}")
                            continue
                        
                        # Draw the image
                        c.drawImage(image_path, x, y, width, height)
                        
                        # Add a border around each element
                        c.setStrokeColorRGB(0.8, 0.8, 0.8)
                        c.rect(x, y, width, height, fill=0)
                        
                    except Exception as e:
                        app.logger.error(f"Error adding {image_key} to PDF: {str(e)}")
                        app.logger.error(traceback.format_exc())
        
        # Add page numbers if multiple pages
        if len(dashboard_ids) > 1:
            for i in range(c.getPageNumber()):
                c.showPage()
                c.setFont("Helvetica", 8)
                c.drawRightString(
                    page_width - 10*mm, 
                    10*mm, 
                    f"Page {i+1} of {len(dashboard_ids)}"
                )
        
        # Save PDF
        c.save()
        
        # Clean up temporary images
        for image_path in image_files.values():
            try:
                os.remove(image_path)
            except:
                pass
        
        try:
            os.rmdir(temp_dir)
        except:
            pass
        
        # Record the export in the database
        db_cursor.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_exports (
                export_id TEXT PRIMARY KEY,
                user_id TEXT,
                dashboard_ids TEXT,
                export_name TEXT,
                export_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Save export record
        db_cursor.execute("""
            INSERT INTO dashboard_exports (
                export_id, user_id, dashboard_ids, export_name, export_path, created_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (export_id, user_id, json.dumps(dashboard_ids), export_name, export_path))
        
        conn.commit()
        
        # Return download URL
        return jsonify({
            'success': True,
            'export_id': export_id,
            'export_name': export_name,
            'download_url': f'/download-export/{export_id}'
        })
        
    except Exception as e:
        app.logger.error(f"Error exporting dashboard with pre-rendered images: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/download-export/<export_id>', methods=['GET'])
def download_export(export_id):
    """Serve the exported PDF for download."""
    try:
        conn = sqlite3.connect('user_files.db')
        cursor = conn.cursor()
        cursor.execute("SELECT export_path, export_name FROM dashboard_exports WHERE export_id = ?", (export_id,))
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return "Export not found", 404
            
        export_path, export_name = result
        
        if not os.path.exists(export_path):
            return "Export file not found", 404
            
        # Make sure filename is safe
        download_name = secure_filename(export_name)
        if not download_name:
            download_name = f"dashboard_export_{export_id}.pdf"
        else:
            if not download_name.lower().endswith('.pdf'):
                download_name += '.pdf'
            
        # Serve file for download
        from flask import send_file
        return send_file(
            export_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=download_name
        )
        
    except Exception as e:
        app.logger.error(f"Error downloading export: {str(e)}")
        return str(e), 500

# New endpoint to get a list of dashboards for export selection
@app.route('/get-dashboards/<user_id>', methods=['GET'])
def get_dashboards(user_id):
    """Get a list of dashboards for the user."""
    try:
        conn = sqlite3.connect('user_files.db')
        cursor = conn.cursor()
        
        # Create dashboards table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dashboards (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT,
                charts TEXT,
                textboxes TEXT,
                datatables TEXT,
                statcards TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        
        # Get dashboards for the user
        cursor.execute("""
            SELECT id, name, created_at
            FROM dashboards
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
        
        dashboard_rows = cursor.fetchall()
        dashboards = [{
            'id': row[0],
            'name': row[1],
            'created_at': row[2]
        } for row in dashboard_rows]
        
        conn.close()
        
        return jsonify({'dashboards': dashboards})
        
    except Exception as e:
        app.logger.error(f"Error getting dashboards: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/save-dashboard/<user_id>/<dashboard_id>', methods=['POST'])
def save_dashboard(user_id, dashboard_id):
    """
    Endpoint to capture and save the current dashboard state as images.
    
    This creates "photographs" of all charts in the dashboard and stores them
    in the database for later export.
    """
    try:
        data = request.json
        dashboard_name = data.get('dashboard_name', 'Unnamed Dashboard')
        charts = data.get('charts', [])
        
        app.logger.info(f"Saving dashboard {dashboard_id} with {len(charts)} charts")
        
        # Connect to database
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Results tracking
        results = {
            'success': 0,
            'failed': 0,
            'chart_ids': []
        }
        
        # Process each chart
        for chart in charts:
            chart_id = chart.get('id')
            
            if not chart_id:
                app.logger.warning(f"Chart missing ID, skipping")
                results['failed'] += 1
                continue
                
            # Check if the chart exists in graph_cache
            c.execute("""
                SELECT graph_id, html_content 
                FROM graph_cache 
                WHERE graph_id = ?
            """, (chart_id,))
            
            result = c.fetchone()
            if not result:
                app.logger.warning(f"Chart {chart_id} not found in cache")
                results['failed'] += 1
                continue
                
            html_content = result[1]
            
            try:
                # Generate image from HTML content using pyppeteer
                # This has to be done asynchronously
                image_data = asyncio.run(generate_chart_image(html_content))
                
                # Save the image to database
                c.execute("""
                    UPDATE graph_cache 
                    SET dashboard_name = ?, image_blob = ?, isImageSuccess = 1
                    WHERE graph_id = ?
                """, (dashboard_name, image_data, chart_id))
                
                results['success'] += 1
                results['chart_ids'].append(chart_id)
                
            except Exception as e:
                app.logger.error(f"Error capturing chart {chart_id}: {str(e)}")
                app.logger.error(traceback.format_exc())
                results['failed'] += 1
                
                # Mark as failed in database
                c.execute("""
                    UPDATE graph_cache 
                    SET dashboard_name = ?, isImageSuccess = 0
                    WHERE graph_id = ?
                """, (dashboard_name, chart_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f"Dashboard saved: {results['success']} charts captured successfully, {results['failed']} failed",
            'results': results
        })
        
    except Exception as e:
        app.logger.error(f"Error saving dashboard: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
            
# nest_asyncio.apply()
# async def generate_chart_image(html_content):

#     """
#     Generate an image from HTML content using pyppeteer without using signal handlers.
    
#     Args:
#         html_content: The HTML content of the chart
        
#     Returns:
#         Binary image data (PNG)
#     """
#     # Import here to avoid blocking the main thread
#     import pyppeteer
    
#     # Full HTML template with necessary scripts
#     full_html = f"""
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <meta charset="utf-8">
#         <meta name="viewport" content="width=device-width, initial-scale=1.0">
#         <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
#         <script src="https://cdn.jsdelivr.net/npm/echarts-gl@2/dist/echarts-gl.min.js"></script>
#         <style>
#             body, html {{
#                 margin: 0;
#                 padding: 0;
#                 overflow: hidden;
#                 width: 1000px;
#                 height: 600px;
#             }}
#             #chart-container {{
#                 width: 100%;
#                 height: 100%;
#             }}
#         </style>
#     </head>
#     <body>
#         <div id="chart-container">
#             {html_content}
#         </div>
#     </body>
#     </html>
#     """
    
#     # Launch browser with args that avoid signal handling issues
#     browser = await pyppeteer.launch({
#         'headless': True,
#         'handleSIGINT': False,
#         'handleSIGTERM': False,
#         'handleSIGHUP': False,
#         'args': ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
#     })
    
#     try:
#         page = await browser.newPage()
#         await page.setViewport({'width': 1000, 'height': 600})
        
#         # Set content and wait for chart to render
#         await page.setContent(full_html)
#         await page.waitForSelector('#chart-container')
        
#         # Wait for charts to render
#         # await page.waitForFunction("""
#         #     () => {
#         #         const charts = document.querySelectorAll('.echarts-container');
#         #         return charts.length > 0 && 
#         #                Array.from(charts).every(chart => chart.__echarts__ && 
#         #                !chart.__echarts__.isLoading());
#         #     }
#         # """, {'timeout': 5000})
#         await page.waitForSelector('#chart-container div', {'timeout': 10000})
#         # Additional wait to ensure animations complete
#         await page.waitForTimeout(2000)
        
#         # Take screenshot
#         screenshot = await page.screenshot({
#             'type': 'png',
#             'fullPage': False,
#             'clip': {
#                 'x': 0,
#                 'y': 0,
#                 'width': 1000,
#                 'height': 600
#             }
#         })
        
#         return screenshot
        
#     finally:
#         await browser.close()

# async def generate_chart_image(html_content):
#     """
#     Generate an image from HTML content using pyppeteer with simplified approach.
    
#     Args:
#         html_content: The HTML content of the chart
        
#     Returns:
#         Binary image data (PNG)
#     """
#     # Import here to avoid blocking the main thread
#     import pyppeteer
    
#     # Full HTML template with necessary scripts
#     full_html = f"""
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <meta charset="utf-8">
#         <meta name="viewport" content="width=device-width, initial-scale=1.0">
#         <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
#         <script src="https://cdn.jsdelivr.net/npm/echarts-gl@2/dist/echarts-gl.min.js"></script>
#         <style>
#             body, html {{
#                 margin: 0;
#                 padding: 0;
#                 overflow: hidden;
#                 width: 1000px;
#                 height: 600px;
#                 background-color: white;
#             }}
#             #chart-container {{
#                 width: 100%;
#                 height: 100%;
#                 display: flex;
#                 align-items: center;
#                 justify-content: center;
#                 background-color: white;
#             }}
#         </style>
#     </head>
#     <body>
#         <div id="chart-container">
#             {html_content}
#         </div>
#     </body>
#     </html>
#     """
    
#     # Launch browser with args that avoid signal handling issues
#     browser = await pyppeteer.launch({
#         'headless': True,
#         'handleSIGINT': False,
#         'handleSIGTERM': False,
#         'handleSIGHUP': False,
#         'args': [
#             '--no-sandbox', 
#             '--disable-setuid-sandbox', 
#             '--disable-dev-shm-usage',
#             '--disable-web-security',
#             '--disable-features=IsolateOrigins,site-per-process'
#         ]
#     })
    
#     try:
#         page = await browser.newPage()
        
#         # Increase default navigation timeout
#         page.setDefaultNavigationTimeout(30000)
        
#         # Set viewport
#         await page.setViewport({'width': 1000, 'height': 600})
        
#         # Load content
#         await page.setContent(full_html)
        
#         # Use the correct method name for waiting in pyppeteer
#         await page.waitFor(5000)  # waitFor is the correct method in pyppeteer
        
#         # Take screenshot
#         screenshot = await page.screenshot({
#             'type': 'png',
#             'fullPage': False,
#             'omitBackground': False
#         })
        
#         return screenshot
        
#     except Exception as e:
#         # Log the error but don't raise it
#         import logging
#         logging.error(f"Error during screenshot capture: {str(e)}")
        
#         # Return a basic fallback image
#         from PIL import Image, ImageDraw, ImageFont
#         import io
        
#         # Create a blank white image with error text
#         img = Image.new('RGB', (1000, 600), color='white')
#         d = ImageDraw.Draw(img)
#         d.text((20, 20), f"Chart rendering failed: {str(e)}", fill=(255, 0, 0))
        
#         # Convert to bytes
#         buffer = io.BytesIO()
#         img.save(buffer, format='PNG')
#         return buffer.getvalue()
        
#     finally:
#         await browser.close()

# calculator statistics here
# Add these routes to your Flask application
# Helper functions integrated with existing database structure

def get_file_data(user_id, file_id):
    """
    Retrieve structured file data from the database
    Returns data as a list of dictionaries (rows)
    """
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file metadata to find the unique_key
        c.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return None
            
        unique_key = result[0]
        table_name = f"table_{unique_key}"
        
        # Verify table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not c.fetchone():
            return None
        
        # Get column names
        c.execute(f'PRAGMA table_info("{table_name}")')
        columns = [col[1] for col in c.fetchall()]
        
        # Get all data
        c.execute(f'SELECT * FROM "{table_name}"')
        rows = c.fetchall()
        
        # Convert to list of dictionaries
        data = []
        for row in rows:
            row_dict = {}
            for i, col_name in enumerate(columns):
                row_dict[col_name] = row[i]
            data.append(row_dict)
            
        return data
        
    except Exception as e:
        app.logger.error(f"Error retrieving file data: {str(e)}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()


def update_file_data(user_id, file_id, data):
    """
    Update file data in database by adding or updating a column
    
    Args:
        user_id: User ID
        file_id: File ID
        data: List of dictionaries with the updated data
    """
    try:
        if not data:
            return False
            
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file metadata to find the unique_key
        c.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return False
            
        unique_key = result[0]
        table_name = f"table_{unique_key}"
        
        # Convert data to DataFrame for easier manipulation
        df = pd.DataFrame(data)
        
        # Drop the old table and recreate with the new data
        # This is a simple approach - a more optimized approach would be to only add/update 
        # the specific column, but this ensures all data is preserved
        temp_table = f"temp_{uuid.uuid4().hex}"
        df.to_sql(temp_table, conn, if_exists='replace', index=False)
        
        c.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        c.execute(f'ALTER TABLE "{temp_table}" RENAME TO "{table_name}"')
        
        conn.commit()
        return True
        
    except Exception as e:
        app.logger.error(f"Error updating file data: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
        return False
    finally:
        if 'conn' in locals():
            conn.close()


@app.route('/calculate-statistics/<user_id>/<file_id>', methods=['POST'])
def calculate_statistics(user_id, file_id):
    """
    Perform statistical calculations on columns in a file
    """
    try:
        data = request.json
        first_column = data.get('first_column')
        second_column = data.get('second_column')
        operator = data.get('operator')
        new_column_name = data.get('new_column_name')

        # Input validation
        if not first_column:
            return jsonify({"success": False, "error": "First column is required"}), 400
        
        if not new_column_name:
            return jsonify({"success": False, "error": "Output column name is required"}), 400

        # Get file data from database
        file_data = get_file_data(user_id, file_id)
        
        if not file_data:
            return jsonify({"success": False, "error": "File not found"}), 404
        
        # Convert to pandas DataFrame for easier manipulation
        df = pd.DataFrame(file_data)
        
        # Check if columns exist
        if first_column not in df.columns:
            return jsonify({"success": False, "error": f"Column '{first_column}' not found"}), 400
        
        if second_column and second_column not in df.columns:
            return jsonify({"success": False, "error": f"Column '{second_column}' not found"}), 400

        # Make sure columns contain numeric data
        try:
            df[first_column] = pd.to_numeric(df[first_column], errors='coerce')
            if second_column:
                df[second_column] = pd.to_numeric(df[second_column], errors='coerce')
        except Exception as e:
            return jsonify({"success": False, "error": f"Columns must contain numeric data: {str(e)}"}), 400

        # Calculate based on operator
        result = None
        message = ""
        
        if operator == '+':
            result = df[first_column] + df[second_column]
            message = f"Added columns '{first_column}' and '{second_column}'"
        
        elif operator == '-':
            result = df[first_column] - df[second_column]
            message = f"Subtracted '{second_column}' from '{first_column}'"
        
        elif operator == '*':
            result = df[first_column] * df[second_column]
            message = f"Multiplied '{first_column}' by '{second_column}'"
        
        elif operator == '/':
            # Handle division by zero
            result = df[first_column] / df[second_column].replace(0, np.nan)
            message = f"Divided '{first_column}' by '{second_column}'"
        
        elif operator == 'min':
            result = df[[first_column, second_column]].min(axis=1)
            message = f"Calculated minimum between '{first_column}' and '{second_column}'"
        
        elif operator == 'max':
            result = df[[first_column, second_column]].max(axis=1)
            message = f"Calculated maximum between '{first_column}' and '{second_column}'"
        
        elif operator == 'mean':
            # For mean, if second_column is provided, calculate mean of both columns
            if second_column:
                result = df[[first_column, second_column]].mean(axis=1)
                message = f"Calculated mean of '{first_column}' and '{second_column}'"
            else:
                result = df[first_column]
                message = f"Prepared '{first_column}' for mean calculation"
        
        elif operator == 'correlation':
            # Calculate correlation coefficient (Pearson's r)
            correlation = df[first_column].corr(df[second_column])
            result = correlation
            message = f"Correlation between '{first_column}' and '{second_column}' is {correlation:.4f}"
        
        elif operator == 'stddev':
            # For standard deviation, if second_column is provided, calculate pooled std
            if second_column:
                # Pooled standard deviation
                n1 = df[first_column].count()
                n2 = df[second_column].count()
                s1 = df[first_column].std()
                s2 = df[second_column].std()
                
                pooled_std = np.sqrt(((n1-1)*s1**2 + (n2-1)*s2**2) / (n1+n2-2))
                result = pooled_std
                message = f"Pooled standard deviation of '{first_column}' and '{second_column}' is {pooled_std:.4f}"
            else:
                std = df[first_column].std()
                result = std
                message = f"Standard deviation of '{first_column}' is {std:.4f}"
        
        else:
            return jsonify({"success": False, "error": f"Unknown operator: {operator}"}), 400

        # Prepare and return the result
        if isinstance(result, pd.Series):
            result_data = result.to_dict()
            
            # Get descriptive statistics on the result
            stats_data = {
                "mean": float(result.mean()),
                "median": float(result.median()),
                "std": float(result.std()),
                "min": float(result.min()) if not pd.isna(result.min()) else None,
                "max": float(result.max()) if not pd.isna(result.max()) else None,
                "count": int(result.count()),
                "missing": int(result.isna().sum())
            }
            
            sample_data = {i: float(val) if not pd.isna(val) else None 
                          for i, val in enumerate(result.iloc[:5])}
            
            return jsonify({
                "success": True,
                "result": {
                    "data": result_data,
                    "stats": stats_data,
                    "sample": sample_data
                },
                "message": message
            })
        else:
            # For scalar results (like correlation or single std)
            return jsonify({
                "success": True,
                "result": float(result) if result is not None else None,
                "message": message
            })
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        app.logger.error(f"Error calculating statistics: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/apply-calculation/<user_id>/<file_id>', methods=['POST'])
def apply_calculation(user_id, file_id):
    """
    Apply calculation result as a new column in the file
    """
    try:
        data = request.json
        new_column_name = data.get('new_column_name')
        result_data = data.get('result_data')
        
        if not new_column_name:
            return jsonify({"success": False, "error": "New column name is required"}), 400
        
        if not result_data:
            return jsonify({"success": False, "error": "Result data is required"}), 400

        # Get file data
        file_data = get_file_data(user_id, file_id)
        
        if not file_data:
            return jsonify({"success": False, "error": "File not found"}), 404
        
        # Check if column already exists
        df = pd.DataFrame(file_data)
        if new_column_name in df.columns:
            return jsonify({"success": False, "error": f"Column '{new_column_name}' already exists"}), 400
        
        # Handle different result formats
        if isinstance(result_data, dict) and 'data' in result_data:
            # Series data from operations like +, -, etc.
            new_data = result_data['data']
            
            # Convert string indices to integers if needed
            if all(k.isdigit() for k in new_data.keys()):
                new_data = {int(k): v for k, v in new_data.items()}
            
            # Add the new column to each row
            for i, row in enumerate(file_data):
                # Handle potential missing indices
                if str(i) in new_data:
                    row[new_column_name] = new_data[str(i)]
                elif i in new_data:
                    row[new_column_name] = new_data[i]
                else:
                    row[new_column_name] = None
        
        elif isinstance(result_data, (int, float)):
            # Scalar result like correlation or stddev
            # Add the same value to all rows
            for row in file_data:
                row[new_column_name] = result_data
        
        # Save the updated data back to database
        success = update_file_data(user_id, file_id, file_data)
        
        if not success:
            return jsonify({"success": False, "error": "Failed to update data"}), 500
            
        return jsonify({
            "success": True,
            "message": f"New column '{new_column_name}' created successfully"
        })
        
    except Exception as e:
        app.logger.error(f"Error applying calculation: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
# calculator statistics end
if __name__ == '__main__':
    app.run(debug=True, port=5000)