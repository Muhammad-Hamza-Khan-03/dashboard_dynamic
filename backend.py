import traceback
from flask import Flask, Response, request, send_file, jsonify
from flask_cors import CORS
import sqlite3
import io
import csv
import logging
import openpyxl
import pandas as pd
import os

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)

def init_db():
    conn = sqlite3.connect('user_csvs.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS csv_files
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
    
    if file and file.filename.endswith('.csv') or file.filename.endswith('.xlsx'):
        try:
            content = file.read()
            conn = sqlite3.connect('user_csvs.db')
            c = conn.cursor()
            c.execute("INSERT INTO csv_files (user_id, filename, content) VALUES (?, ?, ?)",
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
        conn = sqlite3.connect('user_csvs.db')
        c = conn.cursor()
        c.execute("SELECT filename FROM csv_files WHERE user_id = ?", (user_id,))
        files = [row[0] for row in c.fetchall()]
        conn.close()
        return jsonify({"files": files})
    except Exception as e:
        app.logger.error(f"Error listing files: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_file/<user_id>/<filename>', methods=['GET'])
def get_file(user_id, filename):
    try:
        conn = sqlite3.connect('user_csvs.db')
        c = conn.cursor()
        c.execute("SELECT content FROM csv_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        result = c.fetchone()
        conn.close()
        
        if result:
            content = result[0]
            chunk_size = 50 * 1024 * 1024  # 50MB chunks
            chunk_number = int(request.args.get('chunk', 0))
            
            app.logger.info(f"Processing file: {filename} for user: {user_id}, chunk: {chunk_number}")
            
            if filename.endswith('.xlsx'):
                # Handle Excel file
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
            else:
                # Handle CSV file
                if isinstance(content, bytes):
                    content = content.decode('utf-8')
                csv_buffer = io.StringIO(content)
                
                def generate_csv_chunks():
                    try:
                        reader = csv.reader(csv_buffer)
                        headers = next(reader)
                        yield ','.join(headers) + '\n'
                        
                        csv_buffer.seek(0)
                        csv_buffer.readline()  # Skip header
                        
                        start_pos = chunk_number * chunk_size
                        csv_buffer.seek(start_pos)
                        
                        bytes_read = 0
                        for row in reader:
                            row_data = ','.join(row) + '\n'
                            bytes_read += len(row_data)
                            yield row_data
                            
                            if bytes_read >= chunk_size:
                                break
                        
                        if csv_buffer.tell() >= len(content):
                            yield 'EOF'
                    except Exception as e:
                        app.logger.error(f"Error processing CSV file: {str(e)}")
                        app.logger.error(traceback.format_exc())
                        yield f"Error: {str(e)}"
                
                return Response(generate_csv_chunks(), mimetype='text/csv')
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
        conn = sqlite3.connect('user_csvs.db')
        c = conn.cursor()
        c.execute("SELECT content FROM csv_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        result = c.fetchone()
        conn.close()
        
        if result:
            content = result[0]
            
            if filename.endswith('.xlsx'):
                excel_buffer = io.BytesIO(content)
                book = openpyxl.load_workbook(excel_buffer, read_only=True)
                sheet_count = len(book.worksheets)
                sheet_names = book.sheetnames
                app.logger.info(f"Sheet names for {filename}: {sheet_names}")
                return jsonify({"sheet_count": sheet_count, "sheet_names": sheet_names})
            else:
                app.logger.info(f"CSV file {filename}: single sheet")
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
        conn = sqlite3.connect('user_csvs.db')
        c = conn.cursor()
        c.execute("DELETE FROM csv_files WHERE user_id = ? AND filename = ?", (user_id, filename))
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
        if filename.endswith('.xlsx'):
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False)
            content = output.getvalue()
        else:  # Assume CSV for all other cases
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            content = csv_buffer.getvalue().encode()
        
        conn = sqlite3.connect('user_csvs.db')
        c = conn.cursor()
        
        # Update the database with the new content
        c.execute("UPDATE csv_files SET content = ? WHERE user_id = ? AND filename = ?",
                  (content, user_id, filename))
        conn.commit()
        conn.close()
        
        app.logger.info(f"Successfully updated the blob content for file '{filename}' for user '{user_id}'")
        return jsonify({"message": "Successfully updated the blob content"}), 200
    
    except Exception as e:
        app.logger.error(f"Error updating blob content: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True,port=5000)