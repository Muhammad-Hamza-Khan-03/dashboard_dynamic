import os
import json
import re
import io
import logging
import tempfile
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import plotly.express as px
import sqlite3
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pdfminer.high_level import extract_text
from docx import Document
from striprtf.striprtf import rtf_to_text
from dotenv import load_dotenv, find_dotenv
from langchain.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain.memory import ConversationBufferMemory
import PyPDF2

class DataExplorerProAPI:
    def __init__(self):
        dotenv_path = find_dotenv()
        load_dotenv(dotenv_path)
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY")

        self.app = Flask(__name__)
        CORS(self.app)

        self.model = ChatGroq(api_key=self.GROQ_API_KEY, model="llama3-70b-8192")
        self.memory = ConversationBufferMemory(return_messages=True)

        self.db_info = {}
        self.document_content = ""

        self.setup_routes()

    def setup_routes(self):
        self.app.add_url_rule('/', 'index', self.index)
        self.app.add_url_rule('/upload', 'upload_file', self.upload_file, methods=['POST'])
        self.app.add_url_rule('/query', 'query_file', self.query_file, methods=['POST'])
        self.app.add_url_rule('/data_stats', 'get_data_stats', self.get_data_stats, methods=['GET'])
        self.app.add_url_rule('/download_csv', 'download_csv', self.download_csv, methods=['GET'])
        self.app.add_url_rule('/export_graph', 'export_graph', self.export_graph, methods=['POST'])

    def index(self):
        return jsonify({'message': 'Welcome to the Data Explorer Pro API'})

    def upload_file(self):
        if 'file' not in request.files:
            return jsonify({'message': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'No selected file'}), 400

        try:
            file_extension = os.path.splitext(file.filename)[1].lower()
            if file_extension == '.csv':
                df = pd.read_csv(file)
                df.to_pickle('dataframe.pkl')
                df = df.fillna("NaN")
                preview = {
                    'columns': df.columns.tolist(),
                    'rows': df.head(1).values.tolist()
                }
                response = jsonify({'message': 'CSV file uploaded successfully', 'preview': preview})
            elif file_extension == '.tsv':
                df = pd.read_csv(file, sep='\t')
                df.to_pickle('dataframe.pkl')
                df = df.fillna("NaN")
                preview = {
                    'columns': df.columns.tolist(),
                    'rows': df.head(1).values.tolist()
                }
                response = jsonify({'message': 'TSV file uploaded successfully', 'preview': preview})
            elif file_extension in ['.xls', '.xlsx']:
                df = pd.read_excel(file)
                df.to_pickle('dataframe.pkl')
                df = df.fillna("NaN")
                preview = {
                    'columns': df.columns.tolist(),
                    'rows': df.head(1).values.tolist()
                }
                response = jsonify({'message': 'Excel file uploaded successfully', 'preview': preview})
            elif file_extension in ['.sqlite', '.db']:
                temp_dir = tempfile.mkdtemp()
                temp_path = os.path.join(temp_dir, file.filename)
                file.save(temp_path)

                conn = sqlite3.connect(temp_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                tables = [table[0] for table in tables]

                self.db_info = {}
                for table in tables:
                    cursor.execute(f"PRAGMA table_info({table});")
                    columns = cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    cursor.execute(f"SELECT * FROM {table} LIMIT 5;")
                    rows = cursor.fetchall()
                    self.db_info[table] = {
                        'columns': column_names,
                        'rows': rows
                    }

                conn.close()
                os.remove(temp_path)
                os.rmdir(temp_dir)

                response = jsonify({'message': 'SQLite file uploaded successfully', 'db_info': self.db_info})
            elif file_extension in ['.txt', '.pdf', '.rtf', '.doc', '.docx']:
                if file_extension == '.txt':
                    self.document_content = file.read().decode('utf-8')
                elif file_extension == '.pdf':
                    pdf_reader = PyPDF2.PdfReader(file)
                    self.document_content = ""
                    for page in pdf_reader.pages:
                        self.document_content += page.extract_text()
                elif file_extension == '.rtf':
                    rtf_text = file.read().decode('utf-8')
                    self.document_content = rtf_to_text(rtf_text)
                elif file_extension in ['.doc', '.docx']:
                    doc = Document(file)
                    self.document_content = "\n".join([paragraph.text for paragraph in doc.paragraphs])

                preview = self.document_content[:1000]
                response = jsonify({'message': f'{file_extension[1:].upper()} file uploaded successfully', 'preview': preview})
            else:
                response = jsonify({'message': 'Unsupported file type'}), 400

            logging.debug(f"Upload response: {response.get_data(as_text=True)}")
            return response
        except Exception as e:
            logging.error(f"Error processing file: {e}")
            return jsonify({'message': f'Error processing file: {str(e)}'}), 500
        
    def handle_mermaid_diagram(self, user_input):
        mermaid_instructions = f"""Create a Mermaid diagram based on: "{user_input}".
        Follow these rules:
        1. Use Mermaid syntax version 10.9.1.
        2. Provide only the Mermaid code, no explanations.
        3. Ensure the diagram is complete and properly formatted.
        4. Don't use colors or styles unless requested.
        5. Only create one of these diagram types:
        - Flowchart: `graph` or `flowchart`
        - Sequence: `sequenceDiagram`
        - Class: `classDiagram`
        - State: `stateDiagram-v2`
        - Entity Relationship: `erDiagram`
        - User Journey: `journey`
        - Gantt: `gantt`
        - Pie: `pie`
        - Quadrant: `quadrantChart`
        - Requirement: `requirementDiagram`
        - Git: `gitGraph`
        - C4: `C4Context`, `C4Container`, `C4Component`, or `C4Dynamic`
        - Mindmap: `mindmap`
        - Timeline: `timeline`
        - Zenuml: `zenuml`
        - Sankey: `sankey-beta`
        - XYChart: `xychart-beta`
        - Block: `block`
        6. Use correct syntax and structure for the chosen diagram type.
        7. Ensure the diagram will render correctly.
        8. Don't include any extra text after it. If you have any confusion or less information then make the diagram based on any assumption"""

        system_message = SystemMessage(content=mermaid_instructions)
        history = self.memory.load_memory_variables({})
        messages = [system_message] + history.get("history", []) + [HumanMessage(content=user_input)]

        try:
            response = self.model(messages)
            mermaid_diagram = response.content.strip()
            
            valid_starts = ["graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram-v2", "erDiagram", "journey", "gantt", "pie", "quadrantChart", "requirementDiagram", "gitGraph", "C4Context", "C4Container", "C4Component", "C4Dynamic", "mindmap", "timeline", "zenuml", "sankey-beta", "xychart-beta", "block"]
            if any(mermaid_diagram.startswith(start) for start in valid_starts):
                result_output = "Mermaid diagram generated successfully."
                self.memory.save_context({"input": user_input}, {"output": mermaid_diagram})
            else:
                result_output = "Invalid Mermaid diagram. Please try again."
                mermaid_diagram = None

            suggestions = self.generate_suggested_prompts(user_input, agent_type='mermaid_diagram')
            
            return jsonify({
                'output': result_output,
                'mermaid': mermaid_diagram,
                'suggestions': suggestions
            })
        except Exception as e:
            logging.error(f"Error in Mermaid diagram generation: {e}")
            return jsonify({'output': f'Error: {str(e)}'}), 500

    def query_file(self):
        if not os.path.exists('dataframe.pkl') and not self.document_content and 'file' not in request.files:
            return jsonify({'error': 'No file has been uploaded yet'}), 400

        user_input = request.json.get('question')
        agent_type = request.json.get('agent_type', 'data_visualization')
        custom_instructions = request.json.get('custom_instructions')

        if not user_input:
            return jsonify({'error': 'No question provided'}), 400

        if agent_type == 'research_assistant':
            if not self.document_content:
                return jsonify({'error': 'No document has been uploaded for analysis'}), 400

            research_instructions = f"""You are a research assistant analyzing a document. The user has the following question:

            User Question: {user_input}

            Please provide an informative answer based on the document's content. If you cannot answer the question based on the given information, please state that clearly.

            Document Content (first 1000 characters):
            {self.document_content[:1000]}

            Important Notes:
            - Base your response solely on the information provided in the document.
            - If the answer is not in the given content, say so clearly.
            - Use markdown formatting in your response for better readability.

            Your response:"""

            system_message = SystemMessage(content=research_instructions)
            messages = [system_message, HumanMessage(content=user_input)]

            try:
                response = self.model(messages)
                result_output = response.content
                suggestions = self.generate_suggested_prompts(user_input, agent_type='research_assistant')
                response_json = jsonify({'output': result_output, 'suggestions': suggestions})
                logging.debug(f"Research assistant response: {response_json.get_data(as_text=True)}")
                return response_json
            except Exception as e:
                logging.error(f"Error getting response from model: {e}")
                return jsonify({'output': f'Error: {str(e)}'}), 500
            
        elif agent_type == 'mermaid_diagram':
            return self.handle_mermaid_diagram(user_input)
        elif agent_type == 'business_analytics':
            if not os.path.exists('dataframe.pkl'):
                return jsonify({'error': 'No dataset has been uploaded for analysis'}), 400

            df = pd.read_pickle('dataframe.pkl')
            df_info = f"Column names: {', '.join(df.columns)}\nTotal rows: {len(df)}\nTotal columns: {len(df.columns)}"
            
            business_analytics_instructions = f"""You are a business analytics expert. Analyze the given dataset and provide key trends, insights, and focus on profit/revenue trends. Use the following information:
            1. Dataset Overview:
            {df_info}
            2. Sample Data (first 5 rows):
            {df.head().to_string()}
            3. User Request:
            {user_input}
            Please provide the following:
            1. An overview of the dataset
            2. Key trends and insights
            3. Profit/revenue analysis (if applicable)
            4. Recommendations based on the data
            5. Potential areas for further investigation

            Use markdown formatting for better readability. Include relevant statistics and percentages where appropriate.
            If you need to perform any calculations, use Python code snippets wrapped in triple backticks.
            """

            system_message = SystemMessage(content=business_analytics_instructions)
            messages = [system_message, HumanMessage(content=user_input)]

            try:
                response = self.model(messages)
                result_output = response.content

                # Extract and execute any Python code snippets
                code_blocks = re.findall(r'```python(.*?)```', result_output, re.DOTALL)
                for code_block in code_blocks:
                    try:
                        exec(code_block, {'df': df, 'pd': pd, 'np': np})
                    except Exception as e:
                        result_output += f"\nError executing code: {str(e)}"

                suggestions = self.generate_suggested_prompts(user_input, df=df, agent_type='business_analytics')
                response_json = jsonify({'output': result_output, 'suggestions': suggestions})
                logging.debug(f"Business analytics response: {response_json.get_data(as_text=True)}")
                return response_json
            except Exception as e:
                logging.error(f"Error getting response from model: {e}")
            return jsonify({'output': f'Error: {str(e)}'}), 500
        elif os.path.exists('dataframe.pkl'):
            df = pd.read_pickle('dataframe.pkl')
            df_5_rows = df.head(2).fillna("NaN")
            column_names = ', '.join(df.columns)
            csv_string = df_5_rows.to_string(index=False)
            total_rows = len(df)
            total_columns = len(df.columns)

            if agent_type == 'sql' and self.db_info:
                db_info_str = json.dumps(self.db_info, indent=4)
                instructions = f"""You are a SQL expert. The dataset is stored in the SQLite database. Please write a SQL query based on the user's request and execute them.
                
                The database contains the following tables and sample data:

                {db_info_str}
                
                4. User Request:
                {user_input}

                Please generate SQL queries based on the user's instructions. Explain the purpose of each query and what insights it aims to derive from the data."""

                system_message = SystemMessage(content=instructions)
                history = self.memory.load_memory_variables({})
                messages = [system_message] + history.get("history", []) + [HumanMessage(content=user_input)]

                try:
                    response = self.model(messages)
                except Exception as e:
                    logging.error(f"Error getting response from model: {e}")
                    return jsonify({'graph': None, 'output': f'Error: {str(e)}'})

                self.memory.save_context({"input": user_input}, {"output": response.content})
                result_output = response.content
                suggestions = self.generate_suggested_prompts(user_input, db_info=self.db_info, agent_type=agent_type)
                
                response_json = {'graph': None, 'output': result_output, 'suggestions': suggestions}
                logging.debug(f"SQL query response: {response_json}")
                return jsonify(response_json)

            else:
                default_instructions = f"""You are a data visualization assistant using the Plotly library. The dataset is stored in the `df` variable. You will be provided with information about the dataset and instructions to create a graph. Please follow these guidelines:

                1. Dataset Overview:
                - Total rows: {total_rows}
                - Total columns: {total_columns}
                - Column names: {column_names}
                
                2. Sample Data:
                Here are the first 5 rows of the dataset:
                {csv_string}

                3. Important Notes:
                - The full dataset is available in the `df` variable.
                - Use `df.dtypes` to check column data types if needed.
                - Handle potential missing values appropriately.
                - Consider the entire dataset when making visualizations or analyses.

                4. User Request:
                {user_input}
                
                5. Markdown Formatting:
                - Use Markdown formatting in your responses.
                - Wrap SQL queries and results in triple backticks (```).
                - Use # for headers, ## for subheaders, etc.
                - Use * or - for bullet points.
                - Use **text** for bold and *text* for italics.
                - Format result tables using | for columns and - for separators.

                Please follow the user's instructions to generate the appropriate graph or analysis. Ensure your code is efficient and can handle the full dataset. If the user's request is unclear or could be interpreted in multiple ways, ask for clarification.

                After executing the code, explain your approach and any insights gained from the visualization or analysis. Always show the number of rows using markdown table. If there are any limitations or potential issues with the requested visualization given the nature of the data, mention them."""

                instructions = custom_instructions or default_instructions

                system_message = SystemMessage(content=instructions)
                history = self.memory.load_memory_variables({})
                messages = [system_message] + history.get("history", []) + [HumanMessage(content=user_input)]

                try:
                    response = self.model(messages)
                except Exception as e:
                    logging.error(f"Error getting response from model: {e}")
                    return jsonify({'graph': None, 'output': f'Error: {str(e)}'})

                self.memory.save_context({"input": user_input}, {"output": response.content})
                result_output = response.content
                suggestions = self.generate_suggested_prompts(user_input, df=df, agent_type=agent_type)
                
                response_json = {'graph': None, 'output': result_output, 'suggestions': suggestions}

                if agent_type == 'data_visualization':
                    code_block_match = re.search(r'```(?:Pp|python)?(.*?)```', result_output, re.DOTALL)
                    if code_block_match:
                        code_block = code_block_match.group(1).strip()
                        cleaned_code = re.sub(r'(?m)^\s*fig\.show\(\)\s*$', '', code_block)
                        
                        printed_output = io.StringIO()
                        try:
                            exec(cleaned_code, {'pd': pd, 'px': px, 'df': df, 'print': lambda *args: printed_output.write(" ".join(map(str, args)) + "\n")})
                            fig = self.get_fig_from_code(cleaned_code, df)
                            if isinstance(fig, str):
                                response_json = {'graph': None, 'output': printed_output.getvalue() + fig, 'suggestions': suggestions}
                            elif fig:
                                fig_json = fig.to_json()
                                response_json = {'graph': fig_json, 'output': printed_output.getvalue() + result_output, 'suggestions': suggestions}
                            else:
                                response_json = {'graph': None, 'output': printed_output.getvalue() + 'No figure was generated.', 'suggestions': suggestions}
                        except SyntaxError as e:
                            response_json = {'graph': None, 'output': printed_output.getvalue() + f'Syntax error in code: {str(e)}', 'suggestions': suggestions}
                        except Exception as e:
                            response_json = {'graph': None, 'output': printed_output.getvalue() + f'Error executing code: {str(e)}', 'suggestions': suggestions}

                logging.debug(f"Query response: {response_json}")
                return jsonify(response_json)

        elif 'file' in request.files:
            file = request.files['file']
            file_extension = os.path.splitext(file.filename)[1].lower()
            
            if file_extension in ['.sqlite', '.db']:
                temp_dir = tempfile.mkdtemp()
                temp_path = os.path.join(temp_dir, file.filename)
                file.save(temp_path)
                
                conn = sqlite3.connect(temp_path)
                cursor = conn.cursor()

                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                tables = [table[0] for table in tables]

                for table in tables:
                    cursor.execute(f"PRAGMA table_info({table});")
                    columns = cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    cursor.execute(f"SELECT * FROM {table} LIMIT 5;")
                    rows = cursor.fetchall()
                    self.db_info[table] = {
                        'columns': column_names,
                        'rows': rows
                    }

                try:
                    cursor.execute(user_input)
                    query_result = cursor.fetchall()
                    columns = [description[0] for description in cursor.description]
                    
                    conn.close()
                    os.remove(temp_path)
                    os.rmdir(temp_dir)
                    
                    result_output = f"Query executed successfully.\n\nResult:\n\n{columns}\n{query_result}"
                    suggestions = self.generate_suggested_prompts(user_input, db_info=self.db_info, agent_type='sql')
                    
                    response_json = {'graph': None, 'output': result_output, 'suggestions': suggestions}
                    logging.debug(f"Query response: {response_json}")
                    return jsonify(response_json)
                except sqlite3.Error as e:
                    conn.close()
                    os.remove(temp_path)
                    os.rmdir(temp_dir)
                    response_json = {'graph': None, 'output': f'SQL Error: {str(e)}', 'suggestions': []}
                    logging.debug(f"Query response: {response_json}")
                    return jsonify(response_json)
        else:
            return jsonify({'error': 'No valid data source found'}), 400
    def get_data_stats(self):
        if not os.path.exists('dataframe.pkl'):
            return jsonify({'error': 'No CSV file has been uploaded yet'}), 400

        df = pd.read_pickle('dataframe.pkl')

        df = df.fillna("NaN")
        stats = {
            'describe': df.describe().to_dict(),
            'correlation': df.corr(numeric_only=True).to_dict()
        }
        return jsonify(stats)

    def download_csv(self):
        if not os.path.exists('dataframe.pkl'):
            return jsonify({'error': 'No CSV file has been uploaded yet'}), 400

        df = pd.read_pickle('dataframe.pkl')
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        
        return send_file(
            io.BytesIO(csv_buffer.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name='data.csv'
        )

    def export_graph(self):
        try:
            logging.debug("Received request to export graph")

            # Extract graph data from request
            graph_json = request.json.get('graph')
            logging.debug(f"Received graph JSON: {graph_json}")

            if not graph_json:
                return jsonify({'error': 'No graph data provided'}), 400

            # Load the graph from JSON
            try:
                graph_data = json.loads(graph_json)
                logging.debug(f"Parsed graph data: {graph_data}")
            except json.JSONDecodeError as e:
                logging.error(f"Error decoding graph JSON: {e}")
                return jsonify({'error': 'Invalid graph JSON data'}), 400

            # Return the graph JSON directly
            return jsonify(graph_data)

        except Exception as e:
            logging.error(f"Error exporting graph: {e}")
            return jsonify({'error': 'An error occurred while exporting the graph'}), 500

    def get_fig_from_code(self, code, df):
        local_variable = {}
        try:
            logging.debug(f"Executing code: {code}")
            exec(code, {'pd': pd, 'px': px, 'df': df}, local_variable)
            return local_variable.get('fig', None)
        except SyntaxError as e:
            logging.error(f"Syntax error in code: {e}")
            return f"Syntax error in code: {e}"
        except Exception as e:
            logging.error(f"Error executing code: {e}")
            return f"Error executing code: {e}"

    def generate_suggested_prompts(self, user_input, df=None, db_info=None, agent_type='data_visualization'):
        if agent_type == 'research_assistant':
            prompt = f"""Based on the following user input and the context of document analysis, suggest 3 follow-up questions that the user might find interesting or useful for further exploration. Make sure the suggestions are relevant to both the user's query and the nature of document analysis.
            User input: {user_input}

            IMPORTANT: Provide ONLY the questions, one per line. Do not include any explanations, numbering, or additional text.

            Suggested questions:"""
        
        if agent_type == 'sql' and db_info:
            db_info_str = json.dumps(db_info, indent=4)
            prompt = f"""Analyze the user's input and the provided database schema. Verify if the necessary columns exist and then generate 3 insightful SQL-oriented follow-up questions that:
        1. Dig deeper into the user's initial query
        2. Explore related aspects of the data
        3. Uncover potential trends or patterns

        Ensure each question:
        - Is directly executable as a SQL query
        - Utilizes appropriate tables and columns from the schema
        - Incorporates relevant SQL functions or operations
        - Avoids redundancy with the original query

        Format: Present only the questions, one per line, without numbering or explanation. Also show any row/s or table using the markdown table.

        User input: {user_input}

        Database schema:
        {db_info_str}

        SQL follow-up questions:"""
        elif agent_type == 'business_analytics':
            prompt = f"""Based on the following user input and the context of business analytics, suggest 3 follow-up questions that the user might find interesting or useful for further exploration. Focus on profit/revenue trends, market insights, and potential business strategies.

            User input: {user_input}

            Dataset information:
            Column names: {', '.join(df.columns)}
            Total rows: {len(df)}
            Total columns: {len(df.columns)}

            IMPORTANT: Provide ONLY the questions, one per line. Do not include any explanations, numbering, or additional text.

            Suggested questions:"""
        else:
            column_names = ', '.join(df.columns) if df is not None else "No columns available"
            df_info = f"Column names: {column_names}\nTotal rows: {len(df) if df is not None else 0}\nTotal columns: {len(df.columns) if df is not None else 0}"

            prompt = f"""Based on the following user input and dataframe information, suggest 3 follow-up questions that the user might find interesting or useful for further data exploration. Make sure the suggestions are relevant to both the user's query and the available data. 

    IMPORTANT: Provide ONLY the questions, one per line. Do not include any explanations, numbering, or additional text.

    User input: {user_input}

    Dataframe information:
    {df_info}

    Suggested questions:"""

        logging.debug(f"Prompt sent to model: {prompt}")

        try:
            response = self.model([SystemMessage(content="You are a helpful data analysis assistant."), HumanMessage(content=prompt)])
            logging.debug(f"Raw response from model: {response.content}")
            
            # Ensure consistent line breaks
            suggestions = response.content.split('\n')
            suggestions = [s.strip() for s in suggestions if s.strip().endswith('?')]
            
            logging.debug(f"Filtered suggestions: {suggestions}")
            return suggestions[:3]
        except Exception as e:
            logging.error(f"Error generating suggestions: {e}")
            return ["Error generating suggestions. Please try again."]

    def run(self):
        self.app.run(debug=False, port=5000)

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    api = DataExplorerProAPI()
    api.run()
