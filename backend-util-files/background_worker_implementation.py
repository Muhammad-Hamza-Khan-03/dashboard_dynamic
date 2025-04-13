import threading
import queue
import sqlite3  
import pandas as pd
import logging
import traceback


## Background worker implementation starts
def process_statistics_task(task):
    """
    Enhanced version of process_statistics_task that handles the table naming correctly
    """
    task_id = task['task_id']
    table_id = task['table_id']
    table_name = task['table_name']
    
    try:
        update_task_status(task_id, 'processing', 0.0, 'Starting statistics calculation')
        
        conn_user = sqlite3.connect('user_files.db')
        conn_stats = sqlite3.connect('stats.db')
        
        # Verify table exists
        c_user = conn_user.cursor()
        c_user.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        
        if not c_user.fetchone():
            logging.error(f"Table {table_name} does not exist in the database")
            update_task_status(task_id, 'failed', None, f'Error: Table {table_name} not found')
            return False
        
        # Load the data
        query = f'SELECT * FROM "{table_name}"'
        
        # For large tables, check row count first
        row_count_query = f'SELECT COUNT(*) FROM "{table_name}"'
        try:
            row_count = pd.read_sql_query(row_count_query, conn_user).iloc[0, 0]
        except Exception as count_error:
            logging.error(f"Error counting rows: {str(count_error)}")
            # Fallback to estimate
            row_count = 10000
        
        # Proceed with processing based on table size
        update_task_status(task_id, 'processing', 0.1, f'Processing table with approximately {row_count} rows')
        
        # If table is very large, use chunking
        if row_count > 100000:
            chunk_size = 50000
            # Just get the column names first
            col_query = f'SELECT * FROM "{table_name}" LIMIT 1'
            df_schema = pd.read_sql_query(col_query, conn_user)
            columns = df_schema.columns.tolist()
            
            # Update status
            update_task_status(task_id, 'processing', 0.2, f'Processing large table with {len(columns)} columns')
            
            # Process prioritized columns first
            numeric_cols = []
            categorical_cols = []
            other_cols = []
            
            # Load a sample to determine column types
            sample_query = f'SELECT * FROM "{table_name}" LIMIT 1000'
            sample_df = pd.read_sql_query(sample_query, conn_user)
            
            # Categorize columns by type
            for col in columns:
                try:
                    if pd.api.types.is_numeric_dtype(sample_df[col]):
                        numeric_cols.append(col)
                    elif pd.api.types.is_categorical_dtype(sample_df[col]) or pd.api.types.is_object_dtype(sample_df[col]):
                        categorical_cols.append(col)
                    else:
                        other_cols.append(col)
                except Exception as col_error:
                    logging.error(f"Error processing column {col}: {str(col_error)}")
                    other_cols.append(col)
            
            # Prioritize columns
            prioritized_cols = numeric_cols + categorical_cols + other_cols
            
            # Calculate column statistics for each column with chunking
            for i, column in enumerate(prioritized_cols):
                # Update progress
                progress = 0.2 + (0.6 * (i / len(prioritized_cols)))
                update_task_status(
                    task_id, 
                    'processing', 
                    progress, 
                    f'Processing column {i+1}/{len(prioritized_cols)}: {column}'
                )
                
                try:
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
                    
                except Exception as col_error:
                    logging.error(f"Error processing column {column}: {str(col_error)}")
                    update_task_status(
                        task_id, 
                        'processing', 
                        progress, 
                        f'Error processing column {column}, skipping: {str(col_error)}'
                    )
            
            # Update progress
            update_task_status(task_id, 'processing', 0.8, 'Calculating dataset statistics')
            
            # For dataset statistics, use a sample for very large tables
            if row_count > 10000:
                sample_size = min(10000, row_count)
                sample_query = f'SELECT * FROM "{table_name}" ORDER BY RANDOM() LIMIT {sample_size}'
                sample_df = pd.read_sql_query(sample_query, conn_user)
                dataset_stats = calculate_dataset_statistics_optimized(sample_df)
            else:
                # For smaller tables, process everything at once
                full_df = pd.concat([chunk for chunk in pd.read_sql_query(query, conn_user, chunksize=chunk_size)])
                dataset_stats = calculate_dataset_statistics_optimized(full_df)
        else:
            # For smaller tables, process everything at once
            try:
                df = pd.read_sql_query(query, conn_user)
                update_task_status(task_id, 'processing', 0.2, f'Processing {len(df.columns)} columns')
                
                # Calculate statistics for each column
                for i, column in enumerate(df.columns):
                    progress = 0.2 + (0.6 * (i / len(df.columns)))
                    update_task_status(
                        task_id, 
                        'processing', 
                        progress, 
                        f'Processing column {i+1}/{len(df.columns)}: {column}'
                    )
                    
                    try:
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
                    except Exception as col_error:
                        logging.error(f"Error processing column {column}: {str(col_error)}")
                
                update_task_status(task_id, 'processing', 0.8, 'Calculating dataset statistics')
                dataset_stats = calculate_dataset_statistics_optimized(df)
            except Exception as df_error:
                logging.error(f"Error processing dataframe: {str(df_error)}")
                update_task_status(task_id, 'failed', None, f'Error processing data: {str(df_error)}')
                return False
        
        # Store or update dataset statistics
        try:
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
        except Exception as stats_error:
            logging.error(f"Error storing dataset statistics: {str(stats_error)}")
            update_task_status(task_id, 'failed', None, f'Error storing dataset statistics: {str(stats_error)}')
            return False
        
        # Update task status to completed
        update_task_status(task_id, 'completed', 1.0, 'Statistics calculation completed')
        
        return True
    except Exception as e:
        logging.error(f"Error processing statistics task: {str(e)}")
        traceback.print_exc()
        update_task_status(task_id, 'failed', None, f'Error: {str(e)}')
        return False
    finally:
        if 'conn_user' in locals():
            conn_user.close()
        if 'conn_stats' in locals():
            conn_stats.close()
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
