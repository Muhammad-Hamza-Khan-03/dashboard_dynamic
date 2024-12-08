#backend.py

import tempfile
import traceback
from flask import Flask, Response, request, send_file, jsonify
from flask_cors import CORS
import sqlite3
import io
import csv
import logging
import openpyxl
import pandas as pd
import xml.etree.ElementTree as ET
import PyPDF2
from werkzeug.utils import secure_filename
import uuid
import plotly.express as px
import plotly.graph_objects as go

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)

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
    file_type TEXT CHECK(file_type IN ('csv', 'xlsx','xls', 'db', 'tsv', 'doc', 'docx', 'txt', 'xml','pdf')),
    is_structured BOOLEAN,
    sheet_table TEXT, -- For Excel sheets or DB tables
    unique_key TEXT,  -- Random unique identifier for structured data storage table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
              );
              ''')
    
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
    FOREIGN KEY (file_id) REFERENCES user_files(file_id)
    );
    ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  dashboard_store (
        dashboard_id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER REFERENCES user_files(file_id),
        dashboard_data BLOB,
              user_id TEXT REFERENCES users(user_id),
        dashboard_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')
    c.execute('''CREATE TABLE IF NOT EXISTS graph_cache (
        graph_id TEXT PRIMARY KEY,
        html_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()

init_db()

# Add this to the top of your backend.py file

def debug_sql(query, params=None):
    """Debug helper for SQL queries"""
    app.logger.debug(f"SQL Query: {query}")
    if params:
        app.logger.debug(f"Parameters: {params}")
        
# Add this after creating the cursor in each route
def get_table_info(cursor, table_name):
    """Debug helper for table information"""
    try:
        cursor.execute(f'PRAGMA table_info("{table_name}")')
        columns = cursor.fetchall()
        app.logger.debug(f"Table {table_name} columns: {columns}")
    except Exception as e:
        app.logger.error(f"Error getting table info: {str(e)}")
        
@app.route('/upload/<user_id>', methods=['POST'])
def upload_file(user_id):
    app.logger.info(f"Received upload request for user: {user_id}")
    app.logger.debug(f"Request files: {request.files}")

    if 'file' not in request.files:
        app.logger.warning("No file part in the request")
        return 'No file part', 400

    file = request.files['file']
    app.logger.info(f"File name: {file.filename}")

    if file.filename == '':
        app.logger.warning("No selected file")
        return 'No selected file', 400

    allowed_extensions = {'csv', 'xlsx', 'xls', 'db', 'txt', 'tsv', 'pdf', 'xml', 'docx', 'doc'}
    structured_extensions = {'csv', 'xlsx', 'xls', 'db', 'tsv'}
    unstructured_extensions = {'txt', 'pdf', 'xml', 'docx', 'doc'}

    extension = file.filename.split('.')[-1].lower()

    # Invalid file extension
    if extension not in allowed_extensions:
        app.logger.warning("Invalid file type")
        return 'Invalid file type', 400

    # Connect to the main SQLite database
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    # Ensure the user exists in the 'users' table
    c.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))

    try:
        # For structured files
        if extension in structured_extensions:
            # Generate a unique key for the structured data
            unique_key = str(uuid.uuid4())
            if extension in {'csv', 'tsv'}:
                # Read CSV or TSV file into a DataFrame
                delimiter = ',' if extension == 'csv' else '\t'
                df = pd.read_csv(file, delimiter=delimiter)

                # Create a new table for the structured data
                table_name = f"table_{unique_key}"
                df.to_sql(table_name, conn, if_exists='replace', index=False)

                # Insert metadata into 'user_files'
                c.execute("""
                    INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, file.filename, extension, True, unique_key))
                file_id = c.lastrowid

                # Insert into 'structured_file_storage'
                c.execute("""
                    INSERT INTO structured_file_storage (unique_key, file_id, table_name)
                    VALUES (?, ?, ?)
                """, (unique_key, file_id, table_name))

            elif extension in {'xlsx', 'xls'}:
                # Read Excel file and process each sheet
                excel_file = pd.ExcelFile(file)
                for sheet_name in excel_file.sheet_names:
                    df = excel_file.parse(sheet_name)
                    sheet_unique_key = str(uuid.uuid4())
                    table_name = f"table_{sheet_unique_key}"
                    df.to_sql(table_name, conn, if_exists='replace', index=False)

                    # Insert metadata into 'user_files'
                    c.execute("""
                        INSERT INTO user_files (user_id, filename, file_type, is_structured, sheet_table, unique_key)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (user_id, file.filename, extension, True, sheet_name, sheet_unique_key))
                    file_id = c.lastrowid

                    # Insert into 'structured_file_storage'
                    c.execute("""
                        INSERT INTO structured_file_storage (unique_key, file_id, table_name)
                        VALUES (?, ?, ?)
                    """, (sheet_unique_key, file_id, table_name))

            elif extension == 'db':
                # Read the content of the uploaded .db file
                file_content = file.read()

                # Load the uploaded .db file into an in-memory SQLite database
                in_memory_db = sqlite3.connect(':memory:')
                in_memory_db.executescript(file_content.decode('utf-8', errors='ignore'))
                temp_cursor = in_memory_db.cursor()

                # Get all table names from the in-memory database
                temp_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = temp_cursor.fetchall()

                # Copy each table from the in-memory database to 'user_files.db'
                for table in tables:
                    table_name_in_db = table[0]

                    # Fetch the CREATE TABLE statement
                    temp_cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table_name_in_db}';")
                    create_table_sql = temp_cursor.fetchone()[0]

                    # Generate a unique key and create a new table in 'user_files.db'
                    unique_key = str(uuid.uuid4())
                    table_name = f"table_{unique_key}"
                    c.execute(create_table_sql.replace(table_name_in_db, table_name))

                    # Copy data from the in-memory table to the new table
                    temp_cursor.execute(f"SELECT * FROM {table_name_in_db}")
                    rows = temp_cursor.fetchall()
                    if rows:
                        placeholders = ','.join('?' * len(rows[0]))
                        insert_query = f"INSERT INTO {table_name} VALUES ({placeholders})"
                        c.executemany(insert_query, rows)

                    # Insert metadata into 'user_files'
                    c.execute("""
                        INSERT INTO user_files (user_id, filename, file_type, is_structured, sheet_table, unique_key)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (user_id, file.filename, extension, True, table_name_in_db, unique_key))
                    file_id = c.lastrowid

                    # Insert into 'structured_file_storage'
                    c.execute("""
                        INSERT INTO structured_file_storage (unique_key, file_id, table_name)
                        VALUES (?, ?, ?)
                    """, (unique_key, file_id, table_name))

                in_memory_db.close()

        # For unstructured files
        elif extension in unstructured_extensions:
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
        return 'File uploaded successfully', 200

    except Exception as e:
        app.logger.error(f"Error during file upload: {str(e)}")
        return f'Error during file upload: {str(e)}', 500

    finally:
        conn.close()

# Updated backend endpoints with proper SQL quoting

@app.route('/update-row/<user_id>/<file_id>', methods=['POST'])
def update_row(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        is_structured, unique_key, table_name = result
        if not table_name:
            return jsonify({'error': 'Table name not found'}), 404
            
        data = request.json
        
        if is_structured:
            edit_item = data.get('editItem', {})
            # Remove any empty or null values
            edit_item = {k: v for k, v in edit_item.items() if v is not None and v != ''}
            
            if edit_item:
                # Properly quote column names
                quoted_table = f'"{table_name}"'
                
                if data.get('editIndex') is not None:  # Update existing row
                    # Get the ROWID using the offset
                    row_query = f'SELECT ROWID FROM {quoted_table} LIMIT 1 OFFSET ?'
                    c.execute(row_query, (data['editIndex'],))
                    row_result = c.fetchone()
                    
                    if row_result:
                        row_id = row_result[0]
                        # Quote all column names in the SET clause
                        set_clause = ', '.join([f'"{k}" = ?' for k in edit_item.keys()])
                        values = list(edit_item.values())
                        
                        update_query = f'''
                            UPDATE {quoted_table} 
                            SET {set_clause} 
                            WHERE ROWID = ?
                        '''
                        c.execute(update_query, values + [row_id])
                        
                        # Fetch updated row
                        c.execute(f'SELECT * FROM {quoted_table} WHERE ROWID = ?', [row_id])
                        
                else:  # Create new row
                    # Quote column names in INSERT
                    columns = [f'"{k}"' for k in edit_item.keys()]
                    values = list(edit_item.values())
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

@app.route('/delete-rows/<user_id>/<file_id>', methods=['POST'])
def delete_rows(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        is_structured, unique_key, table_name = result
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
            SELECT file_id, filename, file_type, is_structured, created_at,unique_key
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
            } for f in files
        ]
        return jsonify({'files': file_list}), 200
    except Exception as e:
        app.logger.error(f"Error listing files: {str(e)}")
        return f'Error listing files: {str(e)}', 500
    finally:
        conn.close()
#############################################
# Modified get-file route in backend.py
@app.route('/get-file/<user_id>/<file_id>', methods=['GET'])
def get_file(user_id, file_id):
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 50, type=int)
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    try:
        # Get file metadata
        c.execute("""
            SELECT filename, file_type, is_structured, unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        file_metadata = c.fetchone()
        if not file_metadata:
            return jsonify({'error': 'File not found'}), 404

        filename, file_type, is_structured, unique_key = file_metadata

        if is_structured:
            # Get the table name from structured_file_storage
            c.execute("""
                SELECT table_name FROM structured_file_storage
                WHERE unique_key = ?
            """, (unique_key,))
            result = c.fetchone()
            
            if not result:
                return jsonify({'error': 'Structured data not found'}), 404
            
            table_name = result[0]
            
            # Get total count of rows
            c.execute(f"SELECT COUNT(*) FROM '{table_name}'")
            total_rows = c.fetchone()[0]
            
            # Get columns
            c.execute(f"PRAGMA table_info('{table_name}')")
            columns = [col[1] for col in c.fetchall()]
            
            # Calculate offset
            offset = (page - 1) * page_size
            
            # Fetch paginated data
            c.execute(f"""
                SELECT * FROM '{table_name}'
                LIMIT ? OFFSET ?
            """, (page_size, offset))
            
            rows = c.fetchall()
            
            # Convert to list of dictionaries with column names
            data = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[columns[i]] = value
                data.append(row_dict)
            
            response_data = {
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
            }
            
            return jsonify(response_data)
        else:
            # Handle unstructured data
            c.execute("""
                SELECT content FROM unstructured_file_storage
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
            result = c.fetchone()
            
            if not result:
                return jsonify({'error': 'Unstructured data not found'}), 404
                
            content = result[0]
            
            # For text-based unstructured files
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
                # For PDF files, return base64 encoded content
                import base64
                encoded_content = base64.b64encode(content).decode('utf-8')
                response_data = {
                    'type': 'unstructured',
                    'file_type': file_type,
                    'content': encoded_content,
                    'editable': True
                }
            
            return jsonify(response_data)

    except Exception as e:
        app.logger.error(f"Error retrieving file: {str(e)}")
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
    
@app.route('/split-column/<user_id>/<file_id>', methods=['POST'])
def split_column(user_id, file_id):
    try:
        data = request.json
        column_name = data.get('column')
        delimiter = data.get('delimiter')
        new_column_prefix = data.get('newColumnPrefix', 'split')
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get table info
        c.execute("""
            SELECT f.unique_key, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        unique_key, table_name = result
        
        # Read data into pandas
        df = pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn)
        
        # Perform split operation efficiently
        split_df = df[column_name].str.split(delimiter, expand=True)
        
        # Name new columns
        num_cols = len(split_df.columns)
        new_columns = [f"{new_column_prefix}_{i+1}" for i in range(num_cols)]
        split_df.columns = new_columns
        
        # Add new columns to original dataframe
        for col in new_columns:
            df[col] = split_df[col]
        
        # Update database
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'newColumns': new_columns,
            'data': df.to_dict('records')
        })
        
    except Exception as e:
        app.logger.error(f"Error in split_column: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# Add these imports at the top
from scipy import stats
import numpy as np
from typing import Dict, List, Any
import plotly.express as px
import plotly.graph_objects as go
import json

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

# @app.route('/analyze/<user_id>/<file_id>', methods=['POST'])
# def analyze_data(user_id: str, file_id: str):
#     """Main analysis endpoint supporting different types of analysis."""
#     try:
#         data = request.json
#         analysis_type = data.get('analysis_type')
#         options = data.get('options', [])

#         # Database connection and data retrieval
#         conn = sqlite3.connect('user_files.db')
#         cursor = conn.cursor()

#         # Get file metadata and table name
#         cursor.execute("""
#             SELECT f.unique_key, s.table_name
#             FROM user_files f
#             LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
#             WHERE f.file_id = ? AND f.user_id = ?
#         """, (file_id, user_id))
        
#         result = cursor.fetchone()
#         if not result:
#             return jsonify({'error': 'File not found'}), 404

#         _, table_name = result

#         # Read data in chunks if it's a large dataset
#         chunk_size = 100000  # Adjust based on memory constraints
#         chunks = []
#         for chunk in pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn, chunksize=chunk_size):
#             chunks.append(chunk)
#         df = pd.concat(chunks)

#         response = {}
        
#         if analysis_type == 'basic' or 'basic' in options:
#             response['basic'] = calculate_basic_stats(df)
            
#         if analysis_type == 'advanced' or 'advanced' in options:
#             response['advanced'] = calculate_advanced_stats(df)
            
#         if analysis_type == 'custom':
#             # Process each requested option
#             for option in options:
#                 if option in ['correlation', 'distributions', 'outliers']:
#                     response[option] = calculate_advanced_stats(df).get(option)
#                 elif option == 'visualizations':
#                     response['visualizations'] = generate_visualizations(df)
        
#         # Add metadata about the analysis
#         response['metadata'] = {
#             'rows': len(df),
#             'columns': len(df.columns),
#             'memory_usage': df.memory_usage(deep=True).sum(),
#             'timestamp': pd.Timestamp.now().isoformat()
#         }

#         return jsonify(response)

#     except Exception as e:
#         app.logger.error(f"Error in analysis: {str(e)}")
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if 'conn' in locals():
#             conn.close()

# Add these helper functions at the top of your backend.py
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


@app.route('/generate-graph/<user_id>/<file_id>', methods=['POST'])
def generate_graph(user_id, file_id):
    try:
        app.logger.debug(f"Received request: user_id={user_id}, file_id={file_id}")
        data = request.json
        app.logger.debug(f"Request data: {data}")

        # Convert file_id to string if needed
        file_id = str(file_id)
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get file metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        app.logger.debug(f"Query result: {result}")
        
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        is_structured, unique_key, table_name = result
        
        if not is_structured or not table_name:
            return jsonify({'error': 'Invalid file type'}), 400
            
        # Get data from the table
        query = f'SELECT * FROM "{table_name}"'
        app.logger.debug(f"SQL Query: {query}")
        df = pd.read_sql_query(query, conn)
        app.logger.debug(f"DataFrame shape: {df.shape}")
        
        chart_type = data.get('chartType')
        selected_columns = data.get('selectedColumns', [])
        app.logger.debug(f"Chart type: {chart_type}, Selected columns: {selected_columns}")
        
        # Create figure based on chart type
        try:
            if chart_type == 'line':
                fig = px.line(df, x=selected_columns[0], y=selected_columns[1:])
            elif chart_type == 'bar':
                fig = px.bar(df, x=selected_columns[0], y=selected_columns[1:])
            elif chart_type == 'pie':
                fig = px.pie(df, values=selected_columns[1], names=selected_columns[0])
            elif chart_type == 'scatter':
                fig = px.scatter(df, x=selected_columns[0], y=selected_columns[1])
            elif chart_type == 'box':
                fig = px.box(df, y=selected_columns[1:])
            else:
                return jsonify({'error': f'Unsupported chart type: {chart_type}'}), 400
        except Exception as e:
            app.logger.error(f"Error creating plot: {str(e)}")
            return jsonify({'error': f'Error creating plot: {str(e)}'}), 500

        # Update layout for better appearance
        fig.update_layout(
            template='plotly_white',
            margin=dict(l=40, r=40, t=40, b=40),
            height=400
        )
        
        # Generate HTML
        html = fig.to_html(full_html=False, include_plotlyjs='cdn')
        
        # Save to temporary file or database
        graph_id = str(uuid.uuid4())
        c.execute("""
            INSERT INTO graph_cache (graph_id, html_content, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """, (graph_id, html))
        
        conn.commit()
        return jsonify({
            'graph_id': graph_id,
            'url': f'/graph/{graph_id}'
        })
        
    except Exception as e:
        app.logger.error(f"Error generating graph: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
@app.route('/graph/<graph_id>', methods=['GET'])
def serve_graph(graph_id):
    try:
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
        
        # Create a full HTML page with necessary styling
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ margin: 0; padding: 0; overflow: hidden; }}
                #graph {{ width: 100%; height: 100vh; }}
            </style>
        </head>
        <body>
            <div id="graph">
                {html_content}
            </div>
        </body>
        </html>
        """
        
        return Response(full_html, mimetype='text/html')
        
    except Exception as e:
        app.logger.error(f"Error serving graph: {str(e)}")
        return str(e), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)