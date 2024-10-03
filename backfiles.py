import tempfile
import traceback
from flask import Flask, Response, request, send_file, jsonify,stream_with_context
from flask_cors import CORS
import sqlite3
import io
import csv
import logging
import openpyxl
import pandas as pd
import xml.etree.ElementTree as ET
import PyPDF2
from docx import Document

app = Flask(__name__)
CORS(app)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
logging.basicConfig(level=logging.DEBUG)

def init_db():
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS user_files
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  filename TEXT,
                  content BLOB)''')
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
    
    allowed_extensions = {'csv', 'xlsx', 'db', 'txt', 'tsv', 'pdf', 'xml','doc'}
    file_extension = file.filename.split('.')[-1].lower()
    if file and file_extension in allowed_extensions:
        try:
            content = file.read()
            ##
            # Handle different file types
            if file_extension in ['csv', 'tsv', 'txt']:
                # Handle text-based datasets
                delimiter = ',' if file_extension == 'csv' else '\t'
                df = pd.read_csv(io.BytesIO(content), delimiter=delimiter)
                df = df.fillna('NULL')  # Replace empty values with 'NULL'
                
                content = df.to_csv(index=False).encode('utf-8')

            elif file_extension == 'xlsx':
                # Handle Excel datasets
                df = pd.read_excel(io.BytesIO(content))
                df = df.fillna('NULL')  # Replace empty values with 'NULL'
                content = df.to_csv(index=False).encode('utf-8')

            elif file_extension in ['doc', 'docx']:
                # Handle Word documents
                doc_buffer = io.BytesIO(content)
                doc = Document(doc_buffer)
                text = '\n'.join([para.text if para.text.strip() != '' else 'NULL' for para in doc.paragraphs])
                content = text.encode('utf-8')  # Re-encode to bytes for storage in BLOB
                ##
            conn = sqlite3.connect('user_files.db')
            c = conn.cursor()
            c.execute("INSERT INTO user_files (user_id, filename, content) VALUES (?, ?, ?)",
                      (user_id, file.filename, content))
            conn.commit()
            conn.close()
            app.logger.info("File uploaded successfully")
            return 'File uploaded successfully', 200
        except Exception as e:
            app.logger.error(f"Error during file upload: {str(e)}")
            return f'Error during file upload: {str(e)}', 500
    
    app.logger.warning("Invalid file type")
    return 'Invalid file type', 400

@app.route('/list_files/<user_id>', methods=['GET'])
def list_files(user_id):
    app.logger.info(f"Received request to list files for user: {user_id}")
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("SELECT filename FROM user_files WHERE user_id = ?", (user_id,))
        files = [row[0] for row in c.fetchall()]
        conn.close()
        app.logger.info(f"Files found for user {user_id}: {files}")
        return jsonify({"files": files})
    except Exception as e:
        app.logger.error(f"Error listing files: {str(e)}")
        return jsonify({"error": str(e)}), 500


CHUNK_SIZE = 5*1024 * 1024  # 5MB chunk size

@app.route('/get_file/<user_id>/<filename>', methods=['GET'])
def get_file(user_id, filename):
    try:
        app.logger.info(f"Received request for file: {filename}, user: {user_id}")
        
        # Connect to the SQLite database
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("SELECT content FROM user_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        result = c.fetchone()
        conn.close()

        if result:
            content = result[0]
            table_name = request.args.get('table')
            app.logger.info(f"Processing file: {filename} for user: {user_id}, table: {table_name}")
            
            file_extension = filename.split('.')[-1].lower()

            # Stream data based on file type
            if file_extension == 'db':
                return stream_with_context(process_sqlite(content, table_name))
            elif file_extension == 'xlsx':
                return stream_with_context(process_excel(content))
            elif file_extension in ['csv', 'tsv', 'txt']:
                delimiter = ',' if file_extension == 'csv' else '\t'
                return stream_with_context(process_text(content, delimiter))
            elif file_extension == 'xml':
                return stream_with_context(process_xml(content))
            elif file_extension == 'pdf':
                return stream_with_context(process_pdf(content))
            else:
                app.logger.warning(f"Unsupported file type: {file_extension}")
                return "Unsupported file type", 400
        else:
            app.logger.warning(f"File not found: {filename} for user: {user_id}")
            return "File not found", 404
    except Exception as e:
        app.logger.error(f"Error retrieving file: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

# Process functions using streaming

def stream_file_content(content):
    """Generator function to stream large files in chunks."""
    start = 0
    while start < len(content):
        chunk = content[start:start + CHUNK_SIZE]
        yield chunk
        start += CHUNK_SIZE

def process_excel(content):
    """Stream Excel file processing."""
    excel_buffer = io.BytesIO(content)
    df = pd.read_excel(excel_buffer, chunksize=10000)
    
    def generate():
        for chunk in df:
            yield chunk.to_csv(index=False)

    return Response(generate(), mimetype='text/csv')

def process_text(content, delimiter=','):
    """Stream text/csv/tsv file processing."""
    if isinstance(content, bytes):
        content = content.decode('utf-8')
    
    def generate():
        for line in content.splitlines():
            yield line + '\n'

    return Response(generate(), mimetype='text/plain')

def process_sqlite(content, table_name):
    """Stream SQLite database processing."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_db_file:
        temp_db_file.write(content)
        temp_db_path = temp_db_file.name

    conn = sqlite3.connect(temp_db_path)
    
    def generate():
        for chunk in pd.read_sql_query(f"SELECT * FROM {table_name}", conn, chunksize=10000):
            yield chunk.to_csv(index=False)
    
    conn.close()
    return Response(generate(), mimetype='text/csv')

def process_xml(content):
    """Stream XML file processing."""
    root = ET.fromstring(content)
    data = []
    
    def generate():
        for elem in root.iter():
            data.append(elem.attrib)
            if len(data) >= 1000:
                df = pd.DataFrame(data)
                yield df.to_csv(index=False)
                data.clear()
        if data:
            df = pd.DataFrame(data)
            yield df.to_csv(index=False)

    return Response(generate(), mimetype='text/csv')

def process_pdf(content):
    """Stream PDF processing."""
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
    text = []

    def generate():
        for i, page in enumerate(pdf_reader.pages, 1):
            text.append(page.extract_text())
            if i % 10 == 0:  # Process in chunks of 10 pages
                df = pd.DataFrame({'page': range(i-9, i+1), 'content': text})
                yield df.to_csv(index=False)
                text.clear()
        if text:
            df = pd.DataFrame({'page': range(i-len(text)+1, i+1), 'content': text})
            yield df.to_csv(index=False)

    return Response(generate(), mimetype='text/csv')


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

@app.route('/delete_file/<user_id>/<filename>', methods=['DELETE'])
def delete_file(user_id, filename):
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("DELETE FROM user_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        conn.commit()
        if c.rowcount == 0:
            conn.close()
            return "File not found", 404
        conn.close()
        app.logger.info(f"File '{filename}' deleted successfully for user '{user_id}'")
        return 'File deleted successfully', 200
    except Exception as e:
        app.logger.error(f"Error deleting file: {str(e)}")
        return f'Error deleting file: {str(e)}', 500

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