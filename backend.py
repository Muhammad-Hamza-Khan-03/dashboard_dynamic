from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import sqlite3
import io
import csv
import logging

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
            return send_file(
                io.BytesIO(result[0]),
                mimetype='text/csv',
                as_attachment=True,
                download_name=filename
            )
        else:
            return "File not found", 404
    except Exception as e:
        app.logger.error(f"Error retrieving file: {str(e)}")
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
        
        # Convert the new content to CSV format
        output = io.BytesIO()
        csv_writer = csv.writer(io.TextIOWrapper(output, encoding='utf-8'))
        headers = new_content[0].keys() if new_content else []
        csv_writer.writerow(headers)
        for row in new_content:
            csv_writer.writerow(row.values())
        
        # Get the binary content
        output.seek(0)
        updated_content = output.getvalue()
        
        conn = sqlite3.connect('user_csvs.db')
        c = conn.cursor()
        
        # Update the database with the new content
        c.execute("UPDATE csv_files SET content = ? WHERE user_id = ? AND filename = ?",
                  (sqlite3.Binary(updated_content), user_id, filename))
        conn.commit()
        conn.close()
        
        app.logger.info(f"Successfully updated the blob content for file '{filename}' for user '{user_id}'")
        return jsonify({"message": "Successfully updated the blob content"}), 200
    
    except sqlite3.Error as db_error:
        app.logger.error(f"Database error: {str(db_error)}")
        return jsonify({"error": "Database error: " + str(db_error)}), 500
    except Exception as e:
        app.logger.error(f"Error updating blob content: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True,port=5000)