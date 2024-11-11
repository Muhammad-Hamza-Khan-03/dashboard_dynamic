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
    conn.commit()
    conn.close()

init_db()

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

@app.route('/get-file/<user_id>/<file_id>', methods=['GET'])
def get_file(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    try:
        # Debug logging
        app.logger.info(f"Retrieving file for user_id: {user_id}, file_id: {file_id}")
        
        # First get the file metadata
        c.execute("""
            SELECT filename, file_type, is_structured, unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        file_metadata = c.fetchone()
        
        if not file_metadata:
            app.logger.error(f"File not found for user_id: {user_id}, file_id: {file_id}")
            return jsonify({'error': 'File not found'}), 404

        filename, file_type, is_structured, unique_key = file_metadata
        app.logger.info(f"File metadata found: {filename}, {file_type}, {is_structured}, {unique_key}")

        if is_structured:
            # Get the table name from structured_file_storage
            c.execute("""
                SELECT table_name FROM structured_file_storage
                WHERE unique_key = ?
            """, (unique_key,))
            result = c.fetchone()
            
            if not result:
                app.logger.error(f"Structured data not found for unique_key: {unique_key}")
                return jsonify({'error': 'Structured data not found'}), 404
            
            table_name = result[0]
            app.logger.info(f"Found table name: {table_name}")
            
            # Get the table schema
            c.execute(f"PRAGMA table_info('{table_name}')")
            columns = [col[1] for col in c.fetchall()]
            
            # Fetch data with proper column names
            c.execute(f"SELECT * FROM '{table_name}'")
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
                'data': data
            }
            
            app.logger.info(f"Returning structured data with {len(data)} rows")
            return jsonify(response_data)
        else:
            # Handle unstructured data
            c.execute("""
                SELECT content FROM unstructured_file_storage
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
            result = c.fetchone()
            
            if not result:
                app.logger.error(f"Unstructured data not found for file_id: {file_id}")
                return jsonify({'error': 'Unstructured data not found'}), 404
                
            content = result[0]
            
            # For text-based unstructured files, decode content
            if file_type in ['txt', 'csv', 'tsv']:
                try:
                    decoded_content = content.decode('utf-8')
                except UnicodeDecodeError:
                    decoded_content = content.decode('latin1')
                    
                response_data = {
                    'type': 'unstructured',
                    'file_type': file_type,
                    'content': decoded_content
                }
            else:
                # For binary files, return base64 encoded content
                import base64
                encoded_content = base64.b64encode(content).decode('utf-8')
                response_data = {
                    'type': 'unstructured',
                    'file_type': file_type,
                    'content': encoded_content
                }
            
            app.logger.info(f"Returning unstructured data of type {file_type}")
            return jsonify(response_data)

    except Exception as e:
        app.logger.error(f"Error retrieving file: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

################################################        
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
        # Verify file ownership
        c.execute("""
            SELECT is_structured, unique_key FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        result = c.fetchone()
        if not result:
            return 'File not found or access denied', 404
        is_structured, unique_key = result
        
        if is_structured:
            # Delete from structured_file_storage and drop the table
            c.execute("""
                SELECT table_name FROM structured_file_storage
                WHERE unique_key = ?
            """, (unique_key,))
            table_result = c.fetchone()
            if table_result:
                table_name = table_result[0]
                c.execute(f"DROP TABLE IF EXISTS '{table_name}'")
                c.execute("""
                    DELETE FROM structured_file_storage
                    WHERE unique_key = ?
                """, (unique_key,))
        else:
            # Delete from unstructured_file_storage
            c.execute("""
                DELETE FROM unstructured_file_storage
                WHERE file_id = ?
            """, (file_id,))
        
        # Delete from user_files
        c.execute("""
            DELETE FROM user_files
            WHERE file_id = ?
        """, (file_id,))
        
        conn.commit()
        return 'File deleted successfully', 200
    except Exception as e:
        app.logger.error(f"Error deleting file: {str(e)}")
        return f'Error deleting file: {str(e)}', 500
    finally:
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)