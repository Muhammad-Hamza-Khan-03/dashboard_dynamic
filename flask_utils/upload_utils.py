import tempfile
import traceback
from flask import Flask, app
from flask_cors import CORS
import sqlite3
import logging
import uuid
import os
from flask_caching import Cache
from dotenv import load_dotenv
import json
import traceback
import queue
import pandas as pd
from insightai import InsightAI
from unstructured.partition.auto import partition

import os
import matplotlib
from flask_utils.task_utils import stats_task_queue
from flask_utils.task_utils import update_task_status
from flask_utils.statistics_utils import calculate_column_statistics_chunked, calculate_dataset_statistics_optimized


def handle_json_upload(file, user_id, filename, c, conn):
    """
    Handle JSON file upload by:
    1. Saving the file to a json_file folder
    2. Reading using pd.read_json
    3. Normalizing nested structures
    4. Storing in structured database tables
    
    Returns the file_id of the new entry.
    """
    try:
        # Create json_file directory if it doesn't exist
        json_file_dir = os.path.join('../json_file')
        os.makedirs(json_file_dir, exist_ok=True)
        
        # Generate a unique key for this file
        unique_key = str(uuid.uuid4())
        
        # Create unique filename to avoid collisions
        file_extension = os.path.splitext(filename)[1]
        if not file_extension:
            file_extension = '.json'  # Default to .json if no extension
        unique_filename = f"{unique_key}{file_extension}"
        file_path = os.path.join(json_file_dir, unique_filename)
        
        # Save the uploaded file to disk
        file_content = file.read()
        try:
            # Try to decode as UTF-8 to check if it's text content
            content_str = file_content.decode('utf-8')
            # If it's text, write it as text
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content_str)
        except UnicodeDecodeError:
            # If it's binary, write it as binary
            with open(file_path, 'wb') as f:
                f.write(file_content)
        
        # Reset file pointer for potential fallback use
        file.seek(0)
        
        # Try to parse the JSON to validate it
        df = None
        try:
            # Try multiple approaches for reading the JSON file
            
            # Approach 1: Use pandas read_json directly
            try:
                df = pd.read_json(file_path)
                app.logger.info(f"Successfully read JSON file with pd.read_json: {filename}")
            except Exception as pd_error:
                app.logger.warning(f"pd.read_json failed: {str(pd_error)}")
                
                # Approach 2: Load file with json.load and normalize
                try:
                    with open(file_path, 'r', encoding='utf-8') as json_file:
                        json_data = json.load(json_file)
                    
                    # Check JSON structure and normalize accordingly
                    if isinstance(json_data, list) and len(json_data) > 0 and isinstance(json_data[0], dict):
                        app.logger.info(f"Processing JSON array with {len(json_data)} items")
                        # Array of objects - normalize directly
                        df = pd.json_normalize(json_data)
                        app.logger.info(f"Successfully normalized JSON array of {len(json_data)} objects")
                    
                    elif isinstance(json_data, dict):
                        app.logger.info(f"Processing JSON object with {len(json_data.keys())} keys")
                        
                        # Look for nested arrays of objects to normalize
                        array_found = False
                        for key, value in json_data.items():
                            if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
                                app.logger.info(f"Found array of objects in key: {key} with {len(value)} items")
                                # Normalize with record_path for nested array
                                df = pd.json_normalize(json_data, record_path=key)
                                array_found = True
                                app.logger.info(f"Successfully normalized nested array in key: {key}")
                                break
                        
                        # If no nested arrays or normalization failed, normalize the whole object
                        if not array_found:
                            app.logger.info("Normalizing single JSON object")
                            df = pd.json_normalize([json_data])
                            app.logger.info("Successfully normalized single JSON object")
                    
                    else:
                        app.logger.warning(f"Unsupported JSON structure for normalization")
                        df = None
                
                except Exception as json_error:
                    app.logger.error(f"Error parsing JSON file with json.load: {str(json_error)}")
                    df = None
            
            # If all approaches failed, fall back to unstructured storage
            if df is None or df.empty:
                app.logger.warning("Could not convert JSON to structured DataFrame")
                return handle_unstructured_upload(file, user_id, filename, c, conn, 'json', content=file_content)
            
            # Log successful data frame creation
            app.logger.info(f"Successfully created DataFrame with {len(df)} rows and {len(df.columns)} columns")
            
            # Clean up column names by replacing dots and special characters
            df.columns = [col.replace('.', '_').replace('[', '_').replace(']', '_') for col in df.columns]
            
            # Create a table name for this data
            table_name = f"table_{unique_key}"
            
            # Store data in the table (handle potential SQLite limitations with large JSON)
            try:
                app.logger.info(f"Saving DataFrame to SQL table: {table_name}")
                df.to_sql(table_name, conn, if_exists='replace', index=False)
                app.logger.info(f"Successfully saved DataFrame to SQL table: {table_name}")
            except Exception as sql_error:
                app.logger.error(f"Error saving to SQL: {str(sql_error)}")
                # If to_sql fails, try to handle common issues (like NaN values)
                app.logger.info("Handling potential data type issues")
                df = df.fillna('')
                # Convert all columns to string to avoid type issues
                df = df.astype(str)
                app.logger.info("Saving DataFrame with string conversion")
                df.to_sql(table_name, conn, if_exists='replace', index=False)
            
            # Insert metadata into 'user_files'
            app.logger.info(f"Inserting metadata into user_files table")
            c.execute("""
                INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, filename, 'json', True, unique_key))
            file_id = c.lastrowid
            
            # Insert mapping into 'structured_file_storage' including file path
            app.logger.info(f"Inserting mapping into structured_file_storage table")
            c.execute("""
                INSERT INTO structured_file_storage (unique_key, file_id, table_name)
                VALUES (?, ?, ?)
            """, (unique_key, file_id, table_name))
            
            # Create and update json_file_paths table to track physical files
            try:
                c.execute("""
                    CREATE TABLE IF NOT EXISTS json_file_paths (
                        file_id INTEGER PRIMARY KEY,
                        unique_key TEXT,
                        file_path TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                c.execute("""
                    INSERT INTO json_file_paths (file_id, unique_key, file_path)
                    VALUES (?, ?, ?)
                """, (file_id, unique_key, file_path))
                app.logger.info(f"Saved file path in json_file_paths table: {file_path}")
            except Exception as table_error:
                app.logger.error(f"Error with json_file_paths table: {str(table_error)}")
            
            conn.commit()
            app.logger.info(f"Successfully processed JSON file: {filename}")
            return file_id, unique_key, table_name
            
        except Exception as e:
            app.logger.error(f"Failed to process JSON file: {str(e)}")
            traceback.print_exc()
            # If structured handling fails, try unstructured
            return handle_unstructured_upload(file, user_id, filename, c, conn, 'json', content=file_content)
        
    except Exception as e:
        app.logger.error(f"Error handling JSON upload: {str(e)}")
        traceback.print_exc()
        # If overall processing fails, try unstructured
        return handle_unstructured_upload(file, user_id, filename, c, conn, 'json')
        
def handle_xml_upload(file, user_id, filename, c, conn):
    """
    Handle XML file upload, trying to convert to structured data if possible.
    If conversion fails, stores as unstructured text.
    Returns the file_id of the new entry.
    """
    try:
        import xml.etree.ElementTree as ET
        
        # Try to parse the XML
        file_content = file.read()
        
        # Make a copy of the content for potential unstructured storage
        content_copy = file_content
        
        # Reset file pointer to beginning
        file.seek(0)
        
        # Parse the XML
        tree = ET.parse(file)
        root = tree.getroot()
        
        # Check if XML is regular and can be converted to DataFrame
        # Look for repeating elements with similar structure
        children = list(root)
        
        # If there are no children or only one child, treat as unstructured
        if len(children) <= 1:
            return handle_unstructured_upload(file, user_id, filename, c, conn, 'xml', content=content_copy)
        
        # Check if children have similar structure (same tag or similar attributes)
        first_child_tag = children[0].tag
        if not all(child.tag == first_child_tag for child in children):
            # Children have different tags, treat as unstructured
            return handle_unstructured_upload(file, user_id, filename, c, conn, 'xml', content=content_copy)
        
        # Try to convert to structured data
        try:
            # Extract data from similar elements
            data = []
            
            for child in children:
                item = {}
                # Add attributes
                for key, value in child.attrib.items():
                    item[key] = value
                
                # Add text content if element has no children
                if len(list(child)) == 0 and child.text and child.text.strip():
                    item['text'] = child.text.strip()
                
                # Add child elements
                for subchild in child:
                    # Use tag as key, text as value
                    if subchild.text and subchild.text.strip():
                        item[subchild.tag] = subchild.text.strip()
                    # If subchild has attributes but no text, use attributes
                    elif subchild.attrib:
                        for attr_key, attr_val in subchild.attrib.items():
                            item[f"{subchild.tag}_{attr_key}"] = attr_val
                
                data.append(item)
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # If DataFrame is empty or has no columns, treat as unstructured
            if df.empty or len(df.columns) == 0:
                return handle_unstructured_upload(file, user_id, filename, c, conn, 'xml', content=content_copy)
            
            # Generate a unique key for this file
            unique_key = str(uuid.uuid4())
            
            # Create a table name for this data
            table_name = f"table_{unique_key}"
            
            # Store data in the table
            df.to_sql(table_name, conn, if_exists='replace', index=False)
            
            # Insert metadata into 'user_files'
            c.execute("""
                INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, filename, 'xml', True, unique_key))
            file_id = c.lastrowid
            
            # Insert mapping into 'structured_file_storage'
            c.execute("""
                INSERT INTO structured_file_storage (unique_key, file_id, table_name)
                VALUES (?, ?, ?)
            """, (unique_key, file_id, table_name))
            
            conn.commit()
            return file_id, unique_key, table_name
            
        except Exception as e:
            app.logger.error(f"Failed to convert XML to DataFrame: {str(e)}")
            return handle_unstructured_upload(file, user_id, filename, c, conn, 'xml', content=content_copy)
            
    except Exception as e:
        app.logger.error(f"Error handling XML upload: {str(e)}")
        traceback.print_exc()
        return handle_unstructured_upload(file, user_id, filename, c, conn, 'xml')

def handle_unstructured_upload(file, user_id, filename, c, conn, file_type, content=None):
    """Helper function to handle unstructured file storage"""
    try:
        unique_key = str(uuid.uuid4())
        
        # Read content if not provided
        if content is None:
            content = file.read()
        
        # Insert metadata into 'user_files'
        c.execute("""
            INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, filename, file_type, False, unique_key))
        file_id = c.lastrowid

        # Insert the content into 'unstructured_file_storage'
        c.execute("""
            INSERT INTO unstructured_file_storage (file_id, unique_key, content)
            VALUES (?, ?, ?)
        """, (file_id, unique_key, content))
        
        conn.commit()
        app.logger.info(f"Stored {file_type} as unstructured content")
        return file_id, unique_key, None
    except Exception as e:
        app.logger.error(f"Error in handle_unstructured_upload: {str(e)}")
        traceback.print_exc()
        raise

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

# LLM settings
def configure_llm_settings():
    """
    Set up LLM configuration for InsightAI.
    Loads from .env file or sets defaults.
    """
    load_dotenv()
    
    # First try to load API keys
    openai_key = os.getenv('OPENAI_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')
    
    if not openai_key or not groq_key:
        print("Warning: API keys not found in environment variables")
        # For development only - replace with your keys
        os.environ['OPENAI_API_KEY'] = 'sk-your-openai-key'
        os.environ['GROQ_API_KEY'] = 'gsk-your-groq-key'
    
    # Set the LLM_CONFIG
    llm_config = [
        {"agent": "Expert Selector", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 500, "temperature": 0}},
        {"agent": "Analyst Selector", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 500, "temperature": 0}},
        {"agent": "SQL Analyst", "details": {"model": "gpt-4o-mini", "provider":"openai","max_tokens": 2000, "temperature": 0}},
        {"agent": "SQL Generator", "details": {"model": "gpt-4o-mini", "provider":"openai","max_tokens": 2000, "temperature": 0}},
        {"agent": "SQL Executor", "details": {"model": "gpt-4o-mini", "provider":"openai","max_tokens": 2000, "temperature": 0}},
        {"agent": "Planner", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 2000, "temperature": 0}},
        {"agent": "Code Generator", "details": {"model": "gpt-4o-mini", "provider":"openai","max_tokens": 2000, "temperature": 0}},
        {"agent": "Code Debugger", "details": {"model": "gpt-4o-mini", "provider":"openai","max_tokens": 2000, "temperature": 0}},
        {"agent": "Solution Summarizer", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 2000, "temperature": 0}}
    ]
    
    # Set as environment variable
    os.environ['LLM_CONFIG'] = json.dumps(llm_config)
def create_insight_instance(file_id, user_id, report_enabled=False, report_questions=3, diagram_enabled=False):
    """
    Create an InsightAI instance based on file type (CSV or DB)
    """
    # Set API keys and LLM config first
    configure_llm_settings()
    
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    # Get file metadata
    c.execute("""
        SELECT file_type, unique_key, filename, parent_file_id
        FROM user_files
        WHERE file_id = ? AND user_id = ?
    """, (file_id, user_id))
    
    result = c.fetchone()
    if not result:
        conn.close()
        return None, "File not found"
    
    file_type, unique_key, filename, parent_file_id = result
    
    # Create visualization directory - SIMPLIFIED PATH
    viz_dir = os.path.join('../static', 'visualization')
    os.makedirs(viz_dir, exist_ok=True)
    
    # Set environment variable to tell InsightAI where to save visualizations
    os.environ['VISUALIZATION_DIR'] = viz_dir
    
    try:
        if file_type in ['csv', 'json', 'xml']:  # Add other structured file types
            # For structured files
            table_name = f"table_{unique_key}"
            
            # Query all data from the table
            try:
                df = pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn)
                
                # Create InsightAI instance with DataFrame and include diagram_enabled
                insight = InsightAI(
                    df=df,
                    debug=True,
                    exploratory=True,
                    generate_report=report_enabled,
                    report_questions=report_questions,
                    diagram=diagram_enabled
                )
                
                return insight, None
            except Exception as e:
                app.logger.error(f"Error loading data: {str(e)}")
                return None, f"Error loading data: {str(e)}"
            
        elif file_type in ['db', 'sqlite', 'sqlite3']:
            # For database files, we'll use the original stored database
            
            # If this is a child table entry, get the parent file ID
            parent_id = parent_file_id if parent_file_id else file_id
            
            # Get the parent's unique key to find the stored database file
            c.execute("""
                SELECT unique_key 
                FROM user_files 
                WHERE file_id = ?
            """, (parent_id,))
            
            parent_result = c.fetchone()
            if not parent_result:
                return None, "Parent database not found"
            
            parent_unique_key = parent_result[0]
            
            # Find the stored database path
            c.execute("""
                SELECT table_name
                FROM structured_file_storage
                WHERE unique_key = ?
            """, (parent_unique_key,))
            
            path_result = c.fetchone()
            if not path_result:
                return None, "Database file path not found"
            
            db_path = path_result[0]
            
            # Verify the file exists
            if not os.path.exists(db_path):
                return None, f"Database file not found at {db_path}"
            
            # Create InsightAI instance with the original db_path and include diagram_enabled
            try:
                insight = InsightAI(
                    db_path=db_path,
                    debug=True,
                    exploratory=True,
                    generate_report=report_enabled,
                    report_questions=report_questions,
                    diagram=diagram_enabled
                )
                
                return insight, None
            except Exception as e:
                app.logger.error(f"Error creating InsightAI instance: {str(e)}")
                return None, f"Error creating InsightAI instance: {str(e)}"
        else:
            # Unsupported file type
            return None, f"Unsupported file type: {file_type}"
    except Exception as e:
        app.logger.error(f"Error in create_insight_instance: {str(e)}")
        return None, str(e)
    finally:
        conn.close()

def process_document_content(file_content: bytes, suffix: str):
    """
    Process document content of any supported type using Unstructured's auto partition.
    
    Args:
        file_content (bytes): The raw bytes of the document file.
        suffix (str): File extension, e.g. '.pdf', '.docx', '.txt'
    
    Returns:
        str: Cleaned, layout-aware extracted text.
    """
    try:
        # Create a temporary file with appropriate suffix
        
        unique_key = str(uuid.uuid4())
        file_path = os.path.join('static', 'uploads', f"{unique_key}.{suffix}")

        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # Save content to file
        with open(file_path, 'wb') as f:
            f.write(file_content)


        suffix = '.' + suffix
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name

        try:
            # elements = partition(filename=temp_path)


            # Join non-empty text elements with cleaned formatting
            # text = '\n'.join(str(el).strip() for el in elements if str(el).strip())
            text = " "
            return text,file_path
        finally:
            os.unlink(temp_path)

    except Exception as e:
        logging.error(f"Error processing document: {str(e)}")
        return None
