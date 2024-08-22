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

app = Flask(__name__)
CORS(app)
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
    
    allowed_extensions = {'csv', 'xlsx', 'db', 'txt', 'tsv', 'pdf', 'xml'}
    if file and file.filename.split('.')[-1].lower() in allowed_extensions:
        try:
            content = file.read()
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
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("SELECT filename FROM user_files WHERE user_id = ?", (user_id,))
        files = [row[0] for row in c.fetchall()]
        conn.close()
        return jsonify({"files": files})
    except Exception as e:
        app.logger.error(f"Error listing files: {str(e)}")
        return jsonify({"error": str(e)}), 500

        
def process_excel(content, chunk_number, chunk_size):
    excel_buffer = io.BytesIO(content)
    sheet_index = int(request.args.get('sheet', 0))
    
    def generate_excel_chunks():
        try:
            book = openpyxl.load_workbook(excel_buffer, read_only=True)
            sheet = book.worksheets[sheet_index]
            
            headers = [cell.value for cell in sheet[1]]
            yield ','.join(map(str, headers)) + '\n'
            
            row_count = sheet.max_row
            start_row = chunk_number * chunk_size + 2
            end_row = min((chunk_number + 1) * chunk_size + 1, row_count)
            
            for row in sheet.iter_rows(min_row=start_row, max_row=end_row, values_only=True):
                yield ','.join(map(str, row)) + '\n'
            
            if end_row >= row_count:
                yield 'EOF'
        except Exception as e:
            app.logger.error(f"Error processing Excel file: {str(e)}")
            app.logger.error(traceback.format_exc())
            yield f"Error: {str(e)}"
    
    return Response(generate_excel_chunks(), mimetype='text/csv')

def process_text(content, chunk_number, chunk_size, delimiter=','):
    if isinstance(content, bytes):
        content = content.decode('utf-8')
    text_buffer = io.StringIO(content)
    
    def generate_text_chunks():
        try:
            reader = csv.reader(text_buffer, delimiter=delimiter)
            headers = next(reader)
            yield delimiter.join(headers) + '\n'
            
            text_buffer.seek(0)
            text_buffer.readline()  # Skip header
            
            start_pos = chunk_number * chunk_size
            text_buffer.seek(start_pos)
            
            bytes_read = 0
            for row in reader:
                row_data = delimiter.join(row) + '\n'
                bytes_read += len(row_data)
                yield row_data
                
                if bytes_read >= chunk_size:
                    break
            
            if text_buffer.tell() >= len(content):
                yield 'EOF'
        except Exception as e:
            app.logger.error(f"Error processing text file: {str(e)}")
            app.logger.error(traceback.format_exc())
            yield f"Error: {str(e)}"
    
    return Response(generate_text_chunks(), mimetype='text/plain')


def process_sqlite(content, chunk_number, chunk_size,table_name): # noqa
    
    def generate_sqlite_chunks():
        conn = None
        table_name = "Models"#strange.......................here
        try:
            # Create a temporary file to store the SQLite database content
            with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_db_file:
                temp_db_file.write(content)
                temp_db_path = temp_db_file.name

            app.logger.info(f"Temporary SQLite file created at: {temp_db_path}")

            # Connect to the SQLite database using the temporary file
            conn = sqlite3.connect(temp_db_path)
            cursor = conn.cursor()

            app.logger.info(f"Connected to SQLite database. Processing table: {table_name}")

            # If no table is specified, get the list of tables
            if not table_name:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                # app.logger.info(f"Tables in the database: {tables}")
                
                if not tables:
                    # app.logger.warning("No tables found in the database")
                    yield "No tables found in the database"
                    return

                # Assign the first table name
                table_name = tables[0][0]
                # app.logger.info(f"No table specified. Defaulting to the first table: {table_name}")
            else:
                # Verify the specified table_name exists
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
                if cursor.fetchone() is None:
                    # app.logger.warning(f"Specified table '{table_name}' does not exist.")
                    yield f"Specified table '{table_name}' does not exist."
                    return

            app.logger.info(f"Fetching columns for table: {table_name}")

            # Fetch and yield table headers
            cursor.execute(f"PRAGMA table_info({table_name})")
            headers = [column[1] for column in cursor.fetchall()]
            if not headers:
                app.logger.warning(f"No columns found in table {table_name}")
                yield "No columns found in the selected table"
                return

            app.logger.info(f"Table columns: {headers}")
            yield ','.join(headers) + '\n'

            # Fetch and yield table rows in chunks
            app.logger.info(f"Fetching rows for table {table_name}. Chunk: {chunk_number}, Size: {chunk_size}")
            cursor.execute(f"SELECT * FROM {table_name} LIMIT ? OFFSET ?", 
                           (chunk_size, chunk_number * chunk_size))
            rows = cursor.fetchall()
            app.logger.info(f"Fetched {len(rows)} rows from {table_name}")

            for row in rows:
                yield ','.join(map(str, row)) + '\n'

            if len(rows) < chunk_size:
                app.logger.info("Reached end of data")
                yield 'EOF'
                
        except sqlite3.Error as e:
            app.logger.error(f"SQLite error occurred: {e}")
            yield f"SQLite Error: {str(e)}"
        except Exception as e:
            app.logger.error(f"Error processing SQLite file: {str(e)}")
            app.logger.error(traceback.format_exc())
            yield f"Error: {str(e)}"
        finally:
            if conn:
                conn.close()
                app.logger.info("SQLite connection closed")

    return Response(generate_sqlite_chunks(), mimetype='text/csv')


def process_xml(content, chunk_number, chunk_size):
    root = ET.fromstring(content)
    
    def generate_xml_chunks():
        try:
            all_tags = set()
            for elem in root.iter():
                all_tags.update(elem.attrib.keys())
            
            headers = list(all_tags)
            yield ','.join(headers) + '\n'
            
            start = chunk_number * chunk_size
            end = start + chunk_size
            
            for i, elem in enumerate(root.iter()):
                if start <= i < end:
                    row = [elem.attrib.get(tag, '') for tag in headers]
                    yield ','.join(row) + '\n'
                elif i >= end:
                    break
            
            if i < end:
                yield 'EOF'
        except Exception as e:
            app.logger.error(f"Error processing XML file: {str(e)}")
            app.logger.error(traceback.format_exc())
            yield f"Error: {str(e)}"
    
    return Response(generate_xml_chunks(), mimetype='text/csv')

def process_pdf(content, chunk_number, chunk_size):
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
    
    def generate_pdf_chunks():
        try:
            yield 'Page,Content\n'
            
            start_page = chunk_number * chunk_size
            end_page = min(start_page + chunk_size, len(pdf_reader.pages))
            
            for page_num in range(start_page, end_page):
                page = pdf_reader.pages[page_num]
                text = page.extract_text().replace('\n', ' ').replace(',', ' ')
                yield f"{page_num + 1},{text}\n"
            
            if end_page >= len(pdf_reader.pages):
                yield 'EOF'
        except Exception as e:
            app.logger.error(f"Error processing PDF file: {str(e)}")
            app.logger.error(traceback.format_exc())
            yield f"Error: {str(e)}"
    
    return Response(generate_pdf_chunks(), mimetype='text/csv')

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
            temp_db = io.BytesIO(content)

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


@app.route('/get_file/<user_id>/<filename>', methods=['GET'])
def get_file(user_id, filename):
    try:
        app.logger.info(f"Received request for file: {filename}, user: {user_id}")
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("SELECT content FROM user_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        result = c.fetchone()
        conn.close()
        if result:
            content = result[0]
            chunk_size = 5000
            chunk_number = int(request.args.get('chunk', 0))
            table_name = request.args.get('table')
            app.logger.info("2selected table: ",table_name)
            app.logger.info(f"Processing file: {filename} for user: {user_id}, chunk: {chunk_number}, table: {table_name}")
            
            file_extension = filename.split('.')[-1].lower()
            
            if file_extension == 'db':
                app.logger.info("Detected SQLite database file")
                return process_sqlite(content, chunk_number, chunk_size,table_name)
            elif file_extension == 'xlsx':
                app.logger.info("Detected Excel file")
                return process_excel(content, chunk_number, chunk_size)
            elif file_extension in ['csv', 'tsv', 'txt']:
                app.logger.info(f"Detected text file: {file_extension}")
                return process_text(content, chunk_number, chunk_size, delimiter=',' if file_extension == 'csv' else '\t')
            elif file_extension == 'xml':
                app.logger.info("Detected XML file")
                return process_xml(content, chunk_number, chunk_size)
            elif file_extension == 'pdf':
                app.logger.info("Detected PDF file")
                return process_pdf(content, chunk_number, chunk_size)
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
    
@app.route('/get_sheet_count/<user_id>/<filename>', methods=['GET'])
def get_sheet_count(user_id, filename):
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("SELECT content FROM user_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        result = c.fetchone()
        conn.close()
        
        if result:
            content = result[0]
            file_extension = filename.split('.')[-1].lower()
            
            if file_extension == 'xlsx':
                excel_buffer = io.BytesIO(content)
                book = openpyxl.load_workbook(excel_buffer, read_only=True)
                sheet_count = len(book.worksheets)
                sheet_names = book.sheetnames
                app.logger.info(f"Sheet names for {filename}: {sheet_names}")
                return jsonify({"sheet_count": sheet_count, "sheet_names": sheet_names})
            elif file_extension == 'db':
                temp_db = io.BytesIO(content)
                conn = sqlite3.connect(temp_db)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                conn.close()
                return jsonify({"sheet_count": len(tables), "sheet_names": [table[0] for table in tables]})
            else:
                app.logger.info(f"File {filename}: single sheet")
                return jsonify({"sheet_count": 1, "sheet_names": ["Sheet1"]})
        else:
            app.logger.warning(f"File not found: {filename}")
            return "File not found", 404
    except Exception as e:
        app.logger.error(f"Error getting sheet count: {str(e)}")
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