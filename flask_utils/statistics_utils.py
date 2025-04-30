import json
import math
import numpy as np
import pandas as pd
from scipy import stats


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
