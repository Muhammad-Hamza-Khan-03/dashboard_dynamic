import os
from contextlib import redirect_stdout
import io
import re
import time
import pandas as pd
import warnings
import traceback
import sys
import json
from threading import *

warnings.filterwarnings('ignore')

try:
    # Attempt package-relative import
    from . import models, prompts, func_calls, reg_ex, log_manager, output_manager, utils
    from .DataMapper import DataMapper
except ImportError:
    # Fall back to script-style import
    import models, prompts, func_calls, reg_ex, log_manager, output_manager, utils
    from DataMapper import DataMapper

class InsightAI:
    def __init__(self, df: pd.DataFrame = None,
             db_path: str = None,
             max_conversations: int = 4,
             debug: bool = False, 
             exploratory: bool = True,
             df_ontology: bool = False,
             generate_report: bool = False,
             report_questions: int = 5,
             diagram: bool = False):  # Add new parameter
        
        if db_path:
            if not self.initialize_database(db_path):
                raise ValueError(f"Failed to initialize database connection to {db_path}")
        self.df = df if df is not None else None

        self.output_plot = None  # Initialize plot output variable
        
        # Output
        self.output_manager = output_manager.OutputManager()
        
        self.report_enabled = generate_report  # IMPORTANT: Use report_enabled, not generate_report
        self.report_question_count = report_questions  # Store question count
        self.dataset_category = None
        self.report_questions = []
        self.report_answers = []
        self.diagram_enabled = diagram

        # Check if the OPENAI_API_KEY environment variable is set
        # if not os.getenv('OPENAI_API_KEY'):
        #     raise EnvironmentError("OPENAI_API_KEY environment variable not found.")
        
        # Check if the GROQ_API_KEY environment variable is set
        # if not os.getenv('GROQ_API_KEY'):
        #     raise EnvironmentError("GROQ_API_KEY environment variable not found.")

        self.MAX_ERROR_CORRECTIONS = 5
        # Set the maximum number of question/answer pairs to be kept in the conversation memory
        self.MAX_CONVERSATIONS = (max_conversations*2) - 1
        
        # Dataframe
        self.df = df if df is not None else None
        self.original_df_columns = df.columns.tolist() if df is not None else None
        self.df_ontology = df_ontology
        self.query_metrics = None
        
        # Results of the code execution
        self.code_exec_results = None

        # Debug and exploratory modes
        self.debug = debug
        self.exploratory = exploratory
        
        # Prompts
        # Define list of templates
        templates = [
            "default_example_output_df",
            "default_example_output_gen",
            "default_example_output_sql",
            "default_example_plan_sql",
            "sql_generator_system",
            "sql_generator_user_sql",
            "code_generator_system_sql", 
            "code_generator_user_sql",
            "default_example_plan_df",
            "default_example_plan_gen",
            "expert_selector_system",
            "expert_selector_user",
            "analyst_selector_system",
            "analyst_selector_user",
            "planner_system",
            "planner_user_gen",
            "planner_user_df",
            "theorist_system",
            "dataframe_inspector_system",
            "code_generator_system_df",
            "code_generator_system_gen",
            "code_generator_user_df",
            "code_generator_user_gen",
            "error_corector_system",
            "code_debugger_system",
            "code_ranker_system",
            "solution_summarizer_system",
            "dataset_categorizer_system",
            "question_generator_system",
            "code_generator_system_cleaning",
            "ml_model_suggester_system",
            "solution_summarizer_system_cleaning",
            "data_cleaning_planner_system",
            "data_quality_analyzer_system",
            "data_mapper_describe_columns_system",
            "data_mapper_describe_columns_user",
            "data_mapper_match_columns_system",
            "data_mapper_match_columns_user",
        ]

        prompt_data = {}

        # Check if the JSON file exists
        if os.path.exists("PROMPT_TEMPLATES.json"):
            # Load from JSON file
            with open("PROMPT_TEMPLATES.json", "r") as f:
                prompt_data = json.load(f)

        # Set templates to the values from the JSON file or the default values. This dynamicaly sets the object attributes.
        # These attributes are part of the object's state and will exist as long as the object itself exists.
        # The attributes can be called using self.<attribute_name> throughout the class.
        for template in templates:
            value = prompt_data.get(template, getattr(prompts, template, ""))
            setattr(self, template, value)

        # Regular expresions
        self._extract_code = reg_ex._extract_code
        self._extract_rank = reg_ex._extract_rank
        self._extract_expert = reg_ex._extract_expert
        self._extract_analyst = reg_ex._extract_analyst
        self._extract_plan = reg_ex._extract_plan
        self._remove_examples = reg_ex._remove_examples

        # Functions
        self.task_eval_function = func_calls.task_eval_function
        self.insights_function = func_calls.solution_insights_function
        # LLM calls
        self.llm_call = models.llm_call
        self.llm_stream = models.llm_stream

        # Logging
        self.token_cost_dict = {
                'gpt-4o': {'prompt_tokens': 0.0025, 'completion_tokens': 0.01},
                'gpt-4o-2024-11-20': {'prompt_tokens': 0.0025, 'completion_tokens': 0.01},
                'gpt-4o-2024-08-06': {'prompt_tokens': 0.0025, 'completion_tokens': 0.01},
                'gpt-4o-mini': {'prompt_tokens': 0.00015, 'completion_tokens': 0.0006},
                'gpt-4o-mini-2024-07-18': {'prompt_tokens': 0.00015, 'completion_tokens': 0.0006},
                'o1': {'prompt_tokens': 0.015, 'completion_tokens': 0.06},
                'o1-2024-12-17': {'prompt_tokens': 0.015, 'completion_tokens': 0.06},
                'o1-preview': {'prompt_tokens': 0.015, 'completion_tokens': 0.06},
                'o1-preview-2024-09-12': {'prompt_tokens': 0.015, 'completion_tokens': 0.06},
                'o1-mini': {'prompt_tokens': 0.003, 'completion_tokens': 0.012},
                'o1-mini-2024-09-12': {'prompt_tokens': 0.003, 'completion_tokens': 0.012},
                'chatgpt-4o-latest': {'prompt_tokens': 0.005, 'completion_tokens': 0.015},
                'gpt-4-turbo': {'prompt_tokens': 0.01, 'completion_tokens': 0.03},
                'gpt-4-turbo-2024-04-09': {'prompt_tokens': 0.01, 'completion_tokens': 0.03},
                'gpt-4': {'prompt_tokens': 0.03, 'completion_tokens': 0.06},
                'gpt-4-32k': {'prompt_tokens': 0.06, 'completion_tokens': 0.12},
                'gpt-4-0125-preview': {'prompt_tokens': 0.01, 'completion_tokens': 0.03},
                'gpt-4-1106-preview': {'prompt_tokens': 0.01, 'completion_tokens': 0.03},
                'gpt-4-vision-preview': {'prompt_tokens': 0.01, 'completion_tokens': 0.03},
                'gpt-3.5-turbo-0125': {'prompt_tokens': 0.0005, 'completion_tokens': 0.0015},
                'gpt-3.5-turbo-instruct': {'prompt_tokens': 0.0015, 'completion_tokens': 0.002},
                'gpt-3.5-turbo-1106': {'prompt_tokens': 0.001, 'completion_tokens': 0.002},
                'gpt-3.5-turbo-0613': {'prompt_tokens': 0.0015, 'completion_tokens': 0.002},
                'gpt-3.5-turbo-16k-0613': {'prompt_tokens': 0.003, 'completion_tokens': 0.004},
                'davinci-002': {'prompt_tokens': 0.002, 'completion_tokens': 0.002},
                'babbage-002': {'prompt_tokens': 0.0004, 'completion_tokens': 0.0004},
                'llama-3.2-1b-preview': {'prompt_tokens': 0.00004, 'completion_tokens': 0.00004},
                'llama-3.2-3b-preview': {'prompt_tokens': 0.00006, 'completion_tokens': 0.00006},
                'llama-3.3-70b-versatile': {'prompt_tokens': 0.00059, 'completion_tokens': 0.00079},
                'llama-3.1-8b-instant': {'prompt_tokens': 0.00005, 'completion_tokens': 0.00008},
                'llama-3-70b': {'prompt_tokens': 0.00059, 'completion_tokens': 0.00079},
                'llama-3-8b': {'prompt_tokens': 0.00005, 'completion_tokens': 0.00008},
                'mixtral-8x7b-instruct': {'prompt_tokens': 0.00024, 'completion_tokens': 0.00024},
                'gemma-7b-instruct': {'prompt_tokens': 0.00007, 'completion_tokens': 0.00007},
                'gemma-2-9b': {'prompt_tokens': 0.00020, 'completion_tokens': 0.00020},
                'llama-3-groq-70b-preview': {'prompt_tokens': 0.00089, 'completion_tokens': 0.00089},
                'llama-3-groq-8b-preview': {'prompt_tokens': 0.00019, 'completion_tokens': 0.00019},
                'llama-guard-3-8b': {'prompt_tokens': 0.00020, 'completion_tokens': 0.00020},
                'llama-3.2-11b-vision': {'prompt_tokens': 0.00018, 'completion_tokens': 0.00018},
                'llama-3.2-90b-vision': {'prompt_tokens': 0.00090, 'completion_tokens': 0.00090},
                'gemini-2.5-flash-preview-04-17': {'prompt_tokens': 0.0, 'completion_tokens': 0.0},
                'gemini-2.5-pro-preview-03-25': {'prompt_tokens': 0.0, 'completion_tokens': 0.0},  
                'gemini-2.0-flash': {'prompt_tokens': 0.0001, 'completion_tokens': 0.0004},        
                'gemini-2.0-flash-lite': {'prompt_tokens': 0.000075, 'completion_tokens': 0.0003}, 
                'gemini-1.5-flash': {'prompt_tokens': 0.000075, 'completion_tokens': 0.0003},      
                'gemini-1.5-flash-8b': {'prompt_tokens': 0.000025, 'completion_tokens': 0.0001},   
                'gemini-1.5-pro': {'prompt_tokens': 0.00025, 'completion_tokens': 0.00075}         
            }
        self.log_and_call_manager = log_manager.LogAndCallManager(self.token_cost_dict)
        self.chain_id = None

        # Messages lists
        self.pre_eval_messages = [{"role": "system", "content": self.expert_selector_system}]
        self.select_analyst_messages = [{"role": "system", "content": self.analyst_selector_system}]
        self.eval_messages = [{"role": "system", "content": self.planner_system.format(utils.get_readable_date())}]
        self.code_messages = [{"role": "system", "content": self.code_generator_system_df}]

        self.datamapper_messages = [{"role": "system", "content": self.data_mapper_describe_columns_system}]

    ######################
    ### Util Functions ###
    ######################

    def initialize_database(self, db_path):
        """Initialize database connection with proper error handling."""
        try:
            import sqlite3
            self.conn = sqlite3.connect(db_path)
            self.cur = self.conn.cursor()

            # Test the connection
            self.cur.execute("SELECT 1")
            self.cur.fetchone()

            self.output_manager.display_system_messages(f"Database connection established: {db_path}")
            return True

        except Exception as e:
            self.output_manager.display_error(f"Failed to initialize database: {str(e)}")
            return False

    def reset_messages_and_logs(self):
        self.pre_eval_messages = [{"role": "system", "content": self.expert_selector_system}]
        self.select_analyst_messages = [{"role": "system", "content": self.analyst_selector_system}]
        self.eval_messages = [{"role": "system", "content": self.planner_system.format(utils.get_readable_date())}]
        self.code_messages = [{"role": "system", "content": self.code_generator_system_df}]
        self.code_exec_results = None

        self.log_and_call_manager.clear_run_logs()

    def messages_maintenace(self, messages):
        # Remove tool_calls messages from the messages list
        for i in range(len(messages) - 1, -1, -1):  # Start from the last item to index 0
            msg = messages[i]
            if "tool_calls" in msg or msg.get("role") == "tool":
                messages.pop(i)
        # Remove the oldest conversation from the messages list
        if len(messages) > self.MAX_CONVERSATIONS:
            messages.pop(1)
            messages.pop(1)
            self.output_manager.display_system_messages("Truncating messages")
    
    ######################
    ### Eval Functions ###
    ######################
    
    def select_expert(self, pre_eval_messages, file_type):
        '''Call the Expert Selector'''
        agent = 'Expert Selector'
        using_model, provider = models.get_model_name(agent)

        self.output_manager.display_tool_start(agent, using_model)

        # Append file type to last message
        pre_eval_messages[-1]['content'] += f"\nFile type: {file_type}"

        llm_response = self.llm_stream(self.log_and_call_manager, 
                                    pre_eval_messages, 
                                    agent=agent,
                                    chain_id=self.chain_id)
                                    
        expert, requires_dataset, confidence = self._extract_expert(llm_response)
        return expert, requires_dataset, confidence
    def _extract_sql_query(self, response: str) -> str:
        """Extract and clean SQL queries from the LLM response.
        
        Args:
            response (str): The LLM response containing SQL code blocks
            
        Returns:
            str: Extracted SQL query with comments and whitespace cleaned
        """
        # Match any standalone SQL code without markdown tags
        sql_pattern = re.compile(r'^[^`]+$', re.MULTILINE)
        query_matches = sql_pattern.findall(response)
        
        if query_matches:
            # Concatenate and clean queries
            query = " ".join(query_matches)
            query = re.sub(r'--.*$', '', query, flags=re.MULTILINE)  # Remove comments
            query = '\n'.join(line for line in query.split('\n') if line.strip())  # Remove empty lines
            return query.strip()
        return None

    def select_analyst(self, select_analyst_messages):
        '''Call the Analyst Selector'''
        agent = 'Analyst Selector'
        # Call OpenAI API to evaluate the task
        llm_response = self.llm_stream(self.log_and_call_manager,select_analyst_messages, agent=agent, chain_id=self.chain_id)
        analyst, query_unknown, query_condition = self._extract_analyst(llm_response)

        return analyst, query_unknown, query_condition
    
    def task_eval(self, eval_messages, agent):
        '''Call the Task Evaluator'''
        using_model,provider = models.get_model_name(agent)

        self.output_manager.display_tool_start(agent,using_model)

        # Call OpenAI API to evaluate the task
        llm_response = self.llm_stream(self.log_and_call_manager,eval_messages, agent=agent, chain_id=self.chain_id)

        self.output_manager.display_task_eval(llm_response)

        if agent == 'Planner':
            response = self._extract_plan(llm_response)
        else:
            response = llm_response
            
        return response
    
    def taskmaster(self, question, df_columns):
        plan = None
        analyst = None
        query_unknown = None
        query_condition = None
        requires_dataset = None
        confidence = None
        agent = None
        file_type = '.db' if hasattr(self, 'conn') else '.csv'
        print(f"Detected file type: {file_type}")

        # Modify expert selection for .db files
        if file_type == '.db':
            expert = 'SQL Analyst'
            requires_dataset = True
            confidence = 9
        else:
            self.pre_eval_messages.append({"role": "user", "content": self.expert_selector_user.format(question)})
            expert, requires_dataset, confidence = self.select_expert(self.pre_eval_messages, file_type)
            self.pre_eval_messages.append({"role": "assistant", "content": f"expert:{expert},requires_dataset:{requires_dataset},confidence:{confidence}"})

        if expert == 'SQL Analyst':
            agent = 'SQL Generator'
            schema = self.get_db_schema()
            # if schema:
            #     self.eval_messages.append({"role": "user", "content": f"Database Schema:\n{schema}\n\nQuery: {question}"})
            if not schema:
                return None, "Could not retrieve database schema", None, None, True, 0
            
            # Prepare messages for SQL generation
            self.code_messages = [{"role": "system", "content": self.code_generator_system_sql.format(schema=schema)}]
            self.code_messages.append({
                "role": "user", 
                "content": self.code_generator_user_sql.format(
                    question=question,
                    schema=schema,
                    results=self.code_exec_results or "No previous results"
                )
            })
            
            # Generate SQL query
            code = self.generate_code('SQL Analyst', question, None, self.code_messages, self.default_example_output_sql)
            
            # Execute SQL query
            answer, results = self.execute_sql(code, None, question)
            return 'SQL Analyst', answer, None, None, True, 9
        

        elif expert == 'Data Cleaning Expert':
            agent = 'Data Cleaning Expert'
            # Use our specialized flow for data cleaning
            answer, results, code = self.process_data_cleaning(question, df_columns)
            return agent, answer, None, None, True, 9  # High confidence

        elif expert == 'Data Analyst':
            self.select_analyst_messages.append({"role": "user", "content": self.analyst_selector_user.format(None if self.df is None else df_columns, question)})
            analyst, query_unknown, query_condition = self.select_analyst(self.select_analyst_messages)
            
            # Handle case where analyst couldn't be properly determined
            if not analyst:
                analyst = 'Data Analyst DF'  # Default to DF since we have a dataframe
                
            self.select_analyst_messages.append({"role": "assistant", "content": f"analyst:{analyst},unknown:{query_unknown},condition:{query_condition}"})

            if analyst == 'Data Analyst DF' or analyst == 'Data Analyst':  # Added 'Data Analyst'
                agent = 'Planner'
                example_plan = self.default_example_plan_df
                if self.df_ontology:
                    self.query_metrics = utils.inspect_dataframe(self.df, self.log_and_call_manager, self.chain_id, query_condition)
                    self.query_metrics = self._extract_plan(self.query_metrics)
                    dataframe_description = f"{self.df.head(5)}\n\nREQUIRED METRICS AND JOINS:\n```yaml\n{self.query_metrics}\n```"
                else:
                    dataframe_description = utils.inspect_dataframe(self.df)
                self.eval_messages.append({"role": "user", "content": self.planner_user_df.format(question, None if self.df is None else dataframe_description, example_plan)})
                self.code_messages[0] = {"role": "system", "content": self.code_generator_system_df}
            
            elif analyst == 'Data Analyst Generic':
                agent = 'Planner'
                example_plan = self.default_example_plan_gen
                self.eval_messages.append({"role": "user", "content": self.planner_user_gen.format(question, example_plan)})
                self.code_messages[0] = {"role": "system", "content": self.code_generator_system_gen}

        else:
            agent = 'Research Specialist'
            self.eval_messages.append({"role": "user", "content": self.theorist_system.format(utils.get_readable_date(),question)})

        task_eval = self.task_eval(self.eval_messages, agent)
        self.eval_messages.append({"role": "assistant", "content": task_eval})
        self.messages_maintenace(self.eval_messages)

        if expert in ['Research Specialist', 'SQL Analyst']:
            self.log_and_call_manager.print_summary_to_terminal()
        elif expert == 'Data Analyst':
            plan = task_eval

        return analyst, plan, query_unknown, query_condition, requires_dataset, confidence
    #####################
    ### Main Function ###
    #####################
    def datamapper(self, question):
        """
        Enhanced datamapper method using instructor for structured JSON output
        Returns data in the exact JSON schemas specified by the user
        """
        if self.df is None:
            return None, None

        try:
            # Initialize DataMapper with instructor
            mapper = DataMapper(self.df.head(1),self)

            column_descriptions = mapper.get_column_descriptions_structured()

            structured_mappings = mapper.get_structured_mappings(question)

            filtered_df = mapper.get_filtered_dataframe(question)

            relevant_columns = [match["matched_column"] for match in structured_mappings["matches"] 
                              if match["matched_column"] != "Nothing Compatible"]
            print(f"Relevant columns identified: {relevant_columns}")

            target_fields = [match["target_field"] for match in structured_mappings["matches"]
                            if match["matched_column"] != "Nothing Compatible"]
            print(f"Target fields for analysis: {target_fields}")

            # Create comprehensive mapping result
            mapping_result = {
                'query': question,
                'column_descriptions': column_descriptions,
                'structured_mappings': structured_mappings,
                'relevant_columns': relevant_columns,
                'target_fields': target_fields,
                'simple_format': mapper.get_column_mappings(question, format_type="simple")
            }

            print(f"\n Column Mappings (Simple): {mapping_result['simple_format']}")
            self.datamapper_messages.append({"role": "assistant", "content": json.dumps(mapping_result)})

            return mapping_result, filtered_df
        
        except Exception as e:
            print(f"❌ Error in datamapper with instructor: {e}")
            import traceback
            traceback.print_exc()

            # Fallback: return basic info if datamapper fails
            print("🔄 Falling back to basic column information...")
            try:
                fallback_result = {
                    'query': question,
                    'error': str(e),
                    'fallback_columns': self.df.columns.tolist(),
                    'dataframe_shape': self.df.shape
                }
                self.datamapper_messages.append({"role": "assistant", "content": json.dumps(fallback_result)})
                return fallback_result, self.df
            except:
                self.datamapper_messages.append({"role": "assistant", "content": "Nothing returned"})
                return None, None

        
    def enhance_query(self,question):
            # Use enhanced datamapper with instructor
            mappings, filtered_df = self.datamapper(question)

            if mappings is None or filtered_df is None:
                print("❌ DataMapper failed, proceeding without column mapping")
                enhanced_query = question
            else:
                # Use the structured mappings to enhance the query
                relevant_columns = mappings.get('relevant_columns', [])
                target_fields = mappings.get('target_fields', [])

                # Create enhanced query with structured information
                enhanced_query = f"""
                Query: {question}

                Relevant columns:
                {relevant_columns}
                Target Fields:
                {target_fields}
                Format:
                {mappings.get('detailed_format', 'General analysis')}
                """

            print("ENHANCED QUERY:", enhanced_query)
            question = enhanced_query
            return question
    #####################
    ### Conversation Function ###
    #####################
    def pd_agent_converse(self, question=None):
        if question is not None:
            loop = False
            question = self.enhance_query(question=question)
        else:
            loop = True

        chain_id = int(time.time())
        self.chain_id = chain_id
        self.reset_messages_and_logs()
        print("QUESTION", question)

        try:
            while True:
                if loop:
                    question = self.output_manager.display_user_input_prompt()

                    if question.strip().lower() == 'exit':
                        self.log_and_call_manager.consolidate_logs()    
                        break
                    question = self.enhance_query(question)
                # Check file type to determine path
                file_type = '.db' if hasattr(self, 'conn') else '.csv'

                if self.exploratory:
                    if file_type == '.db':
                        schema = self.get_db_schema()
                        analyst = 'SQL Analyst'
                        example_code = self.default_example_output_sql
                        plan = self.taskmaster(question, schema)
                    else:
                        analyst, plan, query_unknown, query_condition, requires_dataset, confidence = self.taskmaster(
                            question, '' if self.df is None else self.df.columns.tolist()
                        )
                        example_code = self.default_example_output_df if analyst == 'Data Analyst DF' else self.default_example_output_gen

                    if not loop and not analyst:
                        self.log_and_call_manager.consolidate_logs()
                        return
                    elif not analyst:
                        continue
                else:
                    analyst = 'SQL Analyst' if file_type == '.db' else 'Data Analyst DF'
                    plan = question
                    example_code = self.default_example_output_sql if file_type == '.db' else self.default_example_output_df

                # Generate and execute code
                code = self.generate_code(analyst, question, plan, self.code_messages, example_code)


                if file_type == '.db':
                    answer, results = self.execute_sql(code, plan, question)
                else:
                    answer, results, code = self.execute_code(analyst, code, plan, question, self.code_messages)

                # Display results
                self.output_manager.display_results(
                    self.df if file_type == '.csv' else None,
                    answer, code, None, False
                )

                self.log_and_call_manager.print_summary_to_terminal()

                if not loop:
                    self.log_and_call_manager.consolidate_logs()
                    return 
        except Exception as e:
            print(f"❌ Error in pd_agent_converse: {e}")
            traceback.print_exc()
            return
        
    ######################
    ### Code Functions ###
    ######################
            
    def debug_code(self,analyst,code,question):
        agent = 'Code Debugger'
        # Initialize the messages list with a system message containing the task prompt
        debug_messages = [{"role": "user", "content": self.code_debugger_system.format(code,question)}]
        
        using_model,provider = models.get_model_name(agent)

        self.output_manager.display_tool_start(agent,using_model)

        # Call the OpenAI API
        llm_response = self.llm_stream(self.log_and_call_manager, debug_messages, agent=agent, chain_id=self.chain_id)
        
        # Extract the code from the API response
        res = self._extract_code(llm_response,analyst,provider)       
        if res[1] is None:
            debugged_code = res[0]
        else:
            debugged_code , self.output_plot = res[0], res[1]
        self.output_manager.display_tool_end(agent)

        return debugged_code
    def execute_code(self, analyst, code, plan, original_question, code_messages):
        agent = 'Code Executor'
        print("Executing code...")
        # Initialize error correction counter
        error_corrections = 0

        # Create a copy of the original self.df
        if self.df is not None:
            original_df = self.df.copy()

        # Redirect standard output to a StringIO buffer
        with redirect_stdout(io.StringIO()) as output:
            # Try to execute the code and handle errors
            while error_corrections < self.MAX_ERROR_CORRECTIONS:
                try:
                    # Remove the oldest conversation from the messages list
                    self.messages_maintenace(code_messages)

                    # Execute the code
                    if code is not None:
                        local_vars = {'df': self.df,'output_plot':self.output_plot} # Create a local variable to store the dataframe
                        exec(code, local_vars) # Execute the code
                        self.df = local_vars['df'] # Update the dataframe with the local variable
                        print("HELLO:", self.df.head(4))
                        # Remove examples from the messages list to minimize the number of tokens used
                        code_messages = self._remove_examples(code_messages)
                    break
                except Exception as error:
                    # Capture the full traceback
                    exc_type, exc_value, tb = sys.exc_info()
                    full_traceback = traceback.format_exc()
                    # Filter the traceback
                    exec_traceback = self.filter_exec_traceback(full_traceback, exc_type.__name__, str(exc_value)) 

                    # Increment the error corrections counter
                    error_corrections += 1

                    # Reset df to the original state before trying again
                    if self.df is not None:
                        self.df = original_df.copy()

                    code, code_messages = self.correct_code_errors(exec_traceback, error_corrections, code_messages, analyst)
              
        # Get the output from the executed code
        results = output.getvalue()
        
        # Store the results in a class variable so it can be appended to the subsequent messages list
        self.code_exec_results = results

        summary = self.summarise_solution(original_question, plan, results)

        # Generate Mermaid diagram if enabled
       
        # Reset the StringIO buffer
        output.truncate(0)
        output.seek(0)

        return summary, results, code

    def generate_code(self, analyst, question, plan, code_messages, example_code):
        """Generate code based on analyst type and input parameters."""
        agent = 'Code Generator'
        using_model, provider = models.get_model_name(agent)
        
        if analyst == 'SQL Analyst':
            schema = self.get_db_schema()
            if hasattr(self, 'code_generator_system_sql'):
                system_message = self.code_generator_system_sql.format(schema=schema)
            else:
                # Fallback to prompt from module if attribute not set
                system_message = prompts.code_generator_system_sql.format(schema=schema)
            
            code_messages[0] = {"role": "system", "content": system_message}
            
            # Similarly handle user message
            if hasattr(self, 'code_generator_user_sql'):
                user_content = self.code_generator_user_sql
            else:
                user_content = prompts.code_generator_user_sql
                
            code_messages.append({
                "role": "user", 
                "content": user_content.format(
                    schema=schema,
                    question=question,
                    results=self.code_exec_results or "No previous results"
                )
            })
        elif analyst == 'Data Cleaning Expert':
            # Set the system prompt to the specialized cleaning prompt
            if hasattr(self, 'code_generator_system_cleaning'):
                code_messages[0] = {"role": "system", "content": self.code_generator_system_cleaning}
            else:
                # Fallback to prompt from module if attribute not set
                code_messages[0] = {"role": "system", "content": prompts.code_generator_system_cleaning}
            
            # Check if a user message already exists (from process_data_cleaning)
            if not any(msg.get("role") == "user" for msg in code_messages):
                # Gather comprehensive dataframe information for better code generation
                if self.df is not None:
                    # Get data types and missing value information
                    missing_counts = self.df.isnull().sum()
                    missing_percentages = (self.df.isnull().sum() / len(self.df) * 100).round(2)
                    missing_info = pd.DataFrame({
                        'Missing Count': missing_counts,
                        'Missing Percentage': missing_percentages
                    })
                    
                    # Create a comprehensive df_info with sample data and relevant stats
                    df_info = (
                        f"DataFrame Shape: {self.df.shape[0]} rows, {self.df.shape[1]} columns\n\n"
                        f"Data Types:\n{self.df.dtypes.to_string()}\n\n"
                        f"Missing Values:\n{missing_info.to_string()}\n\n"
                        f"Sample Data (first 3 rows):\n{self.df.head(3)}"
                    )
                else:
                    df_info = "No DataFrame information available"
                
                # Add user query with context formatted for clarity
                code_messages.append({
                    "role": "user",
                    "content": f"""
                    TASK: {question}

                    CLEANING PLAN:
                    {plan or "No plan provided"}

                    DATAFRAME INFO:
                    {df_info}

                    PREVIOUS RESULTS:
                    {self.code_exec_results or "No previous results"}

                    EXAMPLE CODE:
                    {example_code}
                    """
                            })
        # Handle DataFrame analysis path
        else:
            # Set DataFrame system message
            code_messages[0] = {"role": "system", "content": self.code_generator_system_df}
            
            if analyst == 'Data Analyst DF':
                # Prepare DataFrame information
                df_info = (
                    f"{self.df.head(3)}\n\nREQUIRED METRICS AND JOINS:\n{self.query_metrics}" 
                    if self.df_ontology else 
                    self.df.dtypes.to_string(max_rows=None)
                )
                
                # Add user query with DataFrame context
                code_messages.append({
                    "role": "user",
                    "content": self.code_generator_user_df.format(
                        task=question,
                        plan=plan or "No plan provided",
                        df_info=df_info,
                        results=self.code_exec_results or "No previous results",
                        example=example_code
                    )
                })

        # Generate code using LLM
        self.output_manager.display_tool_start(agent, using_model)
        llm_response = self.llm_stream(
            self.log_and_call_manager,
            code_messages,
            agent=agent,
            chain_id=self.chain_id
        )
        
        # Add response to message history
        code_messages.append({"role": "assistant", "content": llm_response})
        
        # Extract appropriate code from response
        if analyst == 'SQL Analyst':
            code = self._extract_sql_query(llm_response)
        else:
            code,self.output_plot= self._extract_code(llm_response, analyst, provider, extract_dict=True)
            
                
            
        if self.debug:
            print(f"Generated Code: {code}")
            
            print(f"Output Plot: {self.output_plot}")
            
        return code
    
    def filter_exec_traceback(self, full_traceback, exception_type, exception_value):
        # Split the full traceback into lines and filter those that originate from "<string>"
        filtered_tb_lines = [line for line in full_traceback.split('\n') if '<string>' in line]

        # Combine the filtered lines and append the exception type and message
        filtered_traceback = '\n'.join(filtered_tb_lines)
        if filtered_traceback:  # Add a newline only if there's a traceback to show
            filtered_traceback += '\n'
        filtered_traceback += f"{exception_type}: {exception_value}"

        return filtered_traceback
    
    def correct_code_errors(self, error, error_corrections, code_messages, analyst):
        agent = 'Error Corrector'

        model,provider = models.get_model_name(agent)

        #If error correction is greater than 2 remove the first error correction
        if error_corrections > 2:
            del code_messages[-4] 
            del code_messages[-3]
        
        # Append the error message to the messages list
        code_messages.append({"role": "user", "content": self.error_corector_system.format(error)})

        # Display the error message
        self.output_manager.display_error(error)

        llm_response = self.llm_call(self.log_and_call_manager,code_messages,agent=agent, chain_id=self.chain_id)
        code_messages.append({"role": "assistant", "content": llm_response})
        code = self._extract_code(llm_response,analyst,provider)
        
        return code, code_messages

    def rank_code(self,results, code, question):
        agent = 'Code Ranker'
        # Initialize the messages list with a user message containing the task prompt
        rank_messages = [{"role": "user", "content": self.code_ranker_system.format(code,results,question)}]

        using_model,provider = models.get_model_name(agent)

        self.output_manager.display_tool_start(agent,using_model)

        # Call the OpenAI API 
        llm_response = self.llm_call(self.log_and_call_manager,rank_messages,agent=agent, chain_id=self.chain_id)

        # Extract the rank from the API response
        rank = self._extract_rank(llm_response)       

        return rank
    
    ############################
    ## Summarise the solution ##
    ############################

    def summarise_solution(self, original_question, plan, results):
        agent = 'Solution Summarizer'

        # Initialize the messages list with a user message containing the task prompt
        insights_messages = [{"role": "user", "content": self.solution_summarizer_system.format(original_question, plan, results)}]
        # Call the OpenAI API
        summary = self.llm_call(self.log_and_call_manager,insights_messages,agent=agent, chain_id=self.chain_id)

        return summary
    def handle_sql_database(self, db_path):
        """Initialize SQL connection and extract schema"""
        import sqlite3
        self.conn = sqlite3.connect(db_path)
        self.cur = self.conn.cursor()
        
    # def execute_sql(self, query: str, plan: str, question: str):
    #     """Execute SQL queries and format results with proper schema handling.
        
    #     Args:
    #         query (str): SQL query to be executed
    #         plan (str): Task plan or context
    #         question (str): Original user question
            
    #     Returns:
    #         tuple: A summary of results and the executed query
    #     """
    #     try:
    #         if not query:
    #             return None, "No valid SQL query provided."
            
    #         results = []
    #         # Split and clean queries (ignore comments and empty lines)
    #         queries = [q.strip() for q in query.split(';') if q.strip()]
            
    #         for q in queries:
    #             try:
    #                 # Execute query
    #                 self.cur.execute(q)
    #                 result = self.cur.fetchall()
                    
    #                 if "pragma" in q.lower():
    #                     # Format PRAGMA schema results
    #                     columns = [desc[0] for desc in self.cur.description]
    #                     df = pd.DataFrame(result, columns=columns)
    #                     results.append(f"\nSchema for {q.split('(')[-1].split(')')[0]} table:\n{df.to_string()}")
    #                 elif result:
    #                     # Format normal query results
    #                     columns = [desc[0] for desc in self.cur.description]
    #                     df = pd.DataFrame(result, columns=columns)
    #                     results.append(f"\nResults for query: {q}\n{df.to_string()}")
    #                 else:
    #                     results.append(f"Query executed successfully but returned no results: {q}")
    #             except Exception as e:
    #                 results.append(f"Error executing query: {q}\n{str(e)}")
            
    #         # Combine all results
    #         summary = "\n".join(results)

    #         # Generate Mermaid diagram if enabled
            
    #         return summary, query

    #     except Exception as e:
    #         self.output_manager.display_error(f"SQL Execution Error: {str(e)}")
    #         return None, None

    def execute_sql(self, query: str, plan: str, question: str):
        """Execute SQL queries with improved error handling and result formatting."""
        try:
            if not query:
                return "No valid SQL query provided.", None

            # Ensure we have a valid database connection
            if not hasattr(self, 'conn') or not hasattr(self, 'cur'):
                return "Database connection not properly initialized.", None

            # Test the connection
            try:
                self.cur.execute("SELECT 1")
            except Exception as e:
                return f"Database connection error: {str(e)}", None

            results = []
            errors = []

            # Clean and prepare the query
            query = query.strip()

            # Handle single query or multiple queries
            if ';' in query:
                # Multiple queries - split carefully
                queries = []
                current_query = ""
                in_quotes = False
                quote_char = None

                for char in query:
                    if char in ['"', "'"] and not in_quotes:
                        in_quotes = True
                        quote_char = char
                    elif char == quote_char and in_quotes:
                        in_quotes = False
                        quote_char = None
                    elif char == ';' and not in_quotes:
                        if current_query.strip():
                            queries.append(current_query.strip())
                        current_query = ""
                        continue
                    current_query += char

                # Add the last query if it exists
                if current_query.strip():
                    queries.append(current_query.strip())
            else:
                queries = [query]

            # Execute each query
            for i, q in enumerate(queries):
                if not q.strip():
                    continue

                try:
                    # Execute the query
                    self.cur.execute(q)

                    # Get results
                    result = self.cur.fetchall()
                    column_names = [desc[0] for desc in self.cur.description] if self.cur.description else []

                    # Format results based on query type
                    if q.strip().upper().startswith('PRAGMA'):
                        # Handle PRAGMA queries (schema information)
                        if result and column_names:
                            df = pd.DataFrame(result, columns=column_names)
                            table_name = q.split('(')[-1].split(')')[0] if '(' in q else "table"
                            results.append(f"\n=== Schema for {table_name} ===\n{df.to_string(index=False)}")
                        else:
                            results.append(f"\n=== Schema Query Result ===\nNo schema information found")

                    elif result:
                        # Handle regular queries with results
                        if column_names:
                            df = pd.DataFrame(result, columns=column_names)
                            results.append(f"\n=== Query {i+1} Results ===\n{df.to_string(index=False)}")

                            # Add summary statistics for numeric columns
                            numeric_cols = df.select_dtypes(include=[np.number]).columns
                            if len(numeric_cols) > 0:
                                results.append(f"\n=== Summary Statistics ===\n{df[numeric_cols].describe().to_string()}")
                        else:
                            results.append(f"\n=== Query {i+1} Results ===\n{len(result)} rows affected")
                    else:
                        # Query executed successfully but no results
                        if q.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP')):
                            results.append(f"\n=== Query {i+1} ===\nOperation completed successfully")
                        else:
                            results.append(f"\n=== Query {i+1} ===\nQuery executed successfully (no results returned)")

                except Exception as e:
                    error_msg = f"Error in query {i+1}: {str(e)}\nQuery: {q}"
                    errors.append(error_msg)
                    self.output_manager.display_error(error_msg)

            # Combine results and errors
            final_result = []

            if results:
                final_result.extend(results)

            if errors:
                final_result.append("\n=== Errors ===")
                final_result.extend(errors)

            if not results and not errors:
                final_result.append("No results or errors to display")

            summary = "\n".join(final_result)

            # Generate a summary answer
            if results and not errors:
                answer = f"Query executed successfully. {summary}"
            elif results and errors:
                answer = f"Query partially executed with some errors. {summary}"
            else:
                answer = f"Query failed to execute. {summary}"

            return answer, query

        except Exception as e:
            error_msg = f"Critical SQL execution error: {str(e)}"
            self.output_manager.display_error(error_msg)
            return error_msg, None

    def get_db_schema(self):
        """Extract and format database schema."""
        try:
            # Get list of tables
            self.cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = self.cur.fetchall()
            
            schema = []
            for table in tables:
                table_name = table[0]
                self.cur.execute(f"PRAGMA table_info({table_name});")
                columns = self.cur.fetchall()
                
                table_schema = [f"Table: {table_name}"]
                table_schema.extend([f"  - {col[1]} ({col[2]})" for col in columns])
                schema.append("\n".join(table_schema))
                
            return "\n\n".join(schema)
        except Exception as e:
            print(f"Error getting schema: {str(e)}")
            return None
    def categorize_dataset(self, df_info=None):
        """Identify the real-world category and domain of the dataset."""
        import json
        import re
        
        agent = 'Dataset Categorizer'
        using_model, provider = models.get_model_name(agent)
        
        self.output_manager.display_tool_start(agent, using_model)
        
        if hasattr(self, 'conn'):  # For SQL databases
            schema = self.get_db_schema()
            dataset_info = f"SQL Database Schema:\n{schema}"
        else:  # For DataFrames
            dataset_info = df_info if df_info else utils.inspect_dataframe(self.df)
        
        messages = [{"role": "system", "content": self.dataset_categorizer_system},
                    {"role": "user", "content": f"Analyze this dataset and determine its category:\n\n{dataset_info}"}]
        
        response = self.llm_call(self.log_and_call_manager, messages, agent=agent, chain_id=self.chain_id)
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                category_info = json.loads(json_match.group())
                self.dataset_category = category_info
                return category_info
            except json.JSONDecodeError:
                return {"domain": "Unknown", "category": "Unknown", "use_cases": [], "description": "Could not determine dataset category"}
        
        return {"domain": "Unknown", "category": "Unknown", "use_cases": [], "description": "Could not determine dataset category"}

    def generate_questions(self, num_questions=5):
        """Generate insightful questions based on the dataset category."""
        import json
        import re
        
        agent = 'Question Generator'
        using_model, provider = models.get_model_name(agent)
        
        self.output_manager.display_tool_start(agent, using_model)
        
        if not self.dataset_category:
            self.dataset_category = self.categorize_dataset()
        
        category_info = json.dumps(self.dataset_category, indent=2)
        
        # Format the prompt with the requested number of questions
        prompt = self.question_generator_system.format(num_questions=num_questions)
        
        messages = [{"role": "system", "content": prompt},
                    {"role": "user", "content": f"Generate {num_questions} insightful questions for this dataset:\n\n{category_info}"}]
        
        response = self.llm_call(self.log_and_call_manager, messages, agent=agent, chain_id=self.chain_id)
        
        # Extract JSON from response
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            try:
                questions = json.loads(json_match.group())
                self.report_questions = questions
                return questions
            except json.JSONDecodeError:
                return [f"Could not generate questions: {response}"]
        
        return [f"Could not generate questions: {response}"]

    def process_report_questions(self):
        """
        Process each generated question, execute the analysis, and store answers.
        Automatically captures and saves any visualizations created during analysis.
        """
        import time
        
        if not self.report_questions:
            self.report_questions = self.generate_questions()
        
        answers = []
        
        for i, question in enumerate(self.report_questions):
            self.output_manager.display_system_messages(f"Processing question: {question}")
            
            # Save original chain ID to restore after processing each question
            original_chain_id = self.chain_id
            
            # Create a new chain ID for each question to keep logs separate
            self.chain_id = int(time.time())
            self.reset_messages_and_logs()
            
            # Use existing pipeline to process each question
            file_type = '.db' if hasattr(self, 'conn') else '.csv'
            
            if file_type == '.db':
                schema = self.get_db_schema()
                analyst = 'SQL Analyst'
                plan = None
                
                # Generate SQL code
                # code = self.generate_code(analyst, question, plan, self.code_messages, self.default_example_output_sql)
                code = self.generate_code(analyst, question, plan, self.code_messages, self.default_example_output_sql)
                
                # Execute SQL
                answer, results = self.execute_sql(code, plan, question)
            else:
                analyst, plan, query_unknown, query_condition, requires_dataset, confidence = self.taskmaster(
                    question, '' if self.df is None else self.df.columns.tolist()
                )
                
                example_code = self.default_example_output_df if analyst == 'Data Analyst DF' else self.default_example_output_gen
                
                # Generate code in a child thread
                code = self.generate_code(analyst, question, plan, self.code_messages, example_code)
           
                # Execute code
                print("Executing code for question:", question)
                answer, results, code = self.execute_code(analyst, code, plan, question, self.code_messages)
                print("HERE IS THE PLOTT",self.output_plot)
            answers.append({
                "question": question,
                "answer": answer,
                "code": code,
                "results": results
            })
            
            # Restore original chain ID
            self.chain_id = original_chain_id
        
        self.report_answers = answers
        return answers

    def compile_report(self):
        """Compile questions and answers into a professional markdown report."""
        import json
        
        agent = 'Report Generator'
        # using_model, provider = models.get_model_name(agent)
        
        # self.output_manager.display_tool_start(agent, using_model)
        
        # if not self.report_answers:
        #     self.process_report_questions()
        
        # # Prepare input for the report generator
        # category_info = json.dumps(self.dataset_category, indent=2)
        
        # # Format answers for the report including visualization paths
        # answers_formatted = []
        # for item in self.report_answers:
        #     answers_formatted.append({
        #         "question": item["question"],
        #         "answer": item["answer"],
        #         # Only include code if debugging is enabled
        #         "code": item["code"] if self.debug else None
        #     })
        
        # answers_info = json.dumps(answers_formatted, indent=2)
        
        # messages = [{"role": "system", "content": self.report_generator_system},
        #             {"role": "user", "content": f"Generate a professional report based on this dataset analysis:\n\nDataset Category:\n{category_info}\n\nQuestions and Answers:\n{answers_info}"}]
        
        # report_markdown = self.llm_call(self.log_and_call_manager, messages, agent=agent, chain_id=self.chain_id)
        
        # # Save the report to a markdown file - with UTF-8 encoding
        # report_filename = f"data_analysis_report_{self.chain_id}.md"
        # with open(report_filename, 'w', encoding='utf-8') as f:
        #     f.write(report_markdown)
        
        # self.output_manager.display_system_messages(f"Report saved to {report_filename}")
        
        # # Try to convert to PDF if required libraries are available
        # try:
        #     from weasyprint import HTML
        #     import markdown
            
        #     html = markdown.markdown(report_markdown, extensions=['tables', 'fenced_code'])
        #     pdf_filename = f"data_analysis_report_{self.chain_id}.pdf"
        #     HTML(string=html).write_pdf(pdf_filename)
        #     self.output_manager.display_system_messages(f"PDF report saved to {pdf_filename}")
        # except ImportError:
        #     self.output_manager.display_system_messages("PDF conversion requires markdown and weasyprint libraries. Install them with: pip install markdown weasyprint")
        # except Exception as e:
        #     self.output_manager.display_system_messages(f"Error converting to PDF: {str(e)}")
        
        # return report_markdown
        pass

    def generate_data_report(self, num_questions=5):
        """Generate a comprehensive data analysis report with the specified number of questions."""
        import time
        
        # Initialize the process
        chain_id = int(time.time())
        self.chain_id = chain_id
        self.reset_messages_and_logs()
        
        self.output_manager.display_system_messages("Starting comprehensive data report generation...")
        
        # Step 1: Categorize the dataset
        self.output_manager.display_system_messages("Step 1/4: Categorizing dataset...")
        self.dataset_category = self.categorize_dataset()
        
        # Step 2: Generate insightful questions
        self.output_manager.display_system_messages(f"Step 2/4: Generating {num_questions} insightful questions...")
        self.report_questions = self.generate_questions(num_questions)
        
        # Step 3: Process each question and collect answers
        self.output_manager.display_system_messages("Step 3/4: Processing questions and generating answers...")
        self.report_answers = self.process_report_questions()
        
        # Step 4: Compile the report
        self.output_manager.display_system_messages("Step 4/4: Compiling professional report...")
        report = self.compile_report()  # IMPORTANT: Use compile_report, not generate_report
        
        self.output_manager.display_system_messages("Report generation complete!")
        self.log_and_call_manager.consolidate_logs()
        
        return report
        
# Add to insightai.py class
    def process_data_cleaning(self, question, df_columns):
        """
        Specialized agent flow for data cleaning and ML suggestion tasks
        """
        # Get actual dataframe information to prevent hallucination
        df_info = ""
        if self.df is not None:
            # Get data types
            df_info += f"Data Types:\n{self.df.dtypes.to_string()}\n\n"
            # Get missing value counts
            missing_counts = self.df.isnull().sum()
            missing_percentages = (self.df.isnull().sum() / len(self.df) * 100).round(2)
            missing_info = pd.DataFrame({
                'Missing Count': missing_counts,
                'Missing Percentage': missing_percentages
            })
            df_info += f"Missing Values:\n{missing_info.to_string()}\n\n"
            # Add sample data
            df_info += f"Sample Data (first 3 rows):\n{self.df.head(3)}"
        
        # 1. Run the data quality analyzer with actual data information
        self.output_manager.display_system_messages("Starting data quality analysis...")
        quality_analyzer_prompt = self.data_quality_analyzer_system.format(data=df_info)
        quality_messages = [{"role": "system", "content": quality_analyzer_prompt}]
        quality_messages.append({"role": "user", "content": f"Analyze this dataset information:\n{df_info}\n\nQuestion: {question}"})
        
        quality_analysis = self.llm_stream(
            self.log_and_call_manager,
            quality_messages,
            agent="Data Quality Analyzer",
            chain_id=self.chain_id
        )
        
        # Save the quality analysis
        quality_messages.append({"role": "assistant", "content": quality_analysis})
        
        # 2. Create the cleaning plan
        self.output_manager.display_system_messages("Creating data cleaning plan...")
        cleaning_planner_prompt = self.data_cleaning_planner_system.format(data=quality_analysis)
        cleaning_plan_messages = [{"role": "system", "content": cleaning_planner_prompt}]
        cleaning_plan_messages.append({"role": "user", "content": f"Based on this quality analysis, create a cleaning plan:\n{quality_analysis}\n\nQuestion: {question}"})
        
        cleaning_plan = self.llm_stream(
            self.log_and_call_manager,
            cleaning_plan_messages,
            agent="Data Cleaning Planner",
            chain_id=self.chain_id
        )
        
        # Save the cleaning plan
        cleaning_plan_messages.append({"role": "assistant", "content": cleaning_plan})
        
        # 3. Generate cleaning code
        self.output_manager.display_system_messages("Generating data cleaning code...")
        
        # Modify code messages for cleaning
        self.code_messages[0] = {"role": "system", "content": self.code_generator_system_cleaning}
        
        # Add cleaning context to code generation
        self.code_messages.append({
            "role": "user",
            "content": f"""
            TASK: {question}
            
            DATA INFORMATION:
            {df_info}
            
            DATA QUALITY ANALYSIS:
            {quality_analysis}
            
            CLEANING PLAN:
            {cleaning_plan}
            
            Please generate code that implements this cleaning plan and prepares the data for machine learning.
            """
        })
        
        # Generate the cleaning code
        cleaning_code = self.generate_code(
            "Data Cleaning Expert", 
            question, 
            cleaning_plan, 
            self.code_messages, 
            self.default_example_output_df
        )
        
        # 4. Execute the cleaning code
        self.output_manager.display_system_messages("Executing data cleaning code...")
        cleaning_result, execution_output, final_code = self.execute_code(
            "Data Cleaning Expert",
            cleaning_code,
            cleaning_plan,
            question,
            self.code_messages
        )
        
        # 5. ML Model Suggestion
        self.output_manager.display_system_messages("Generating ML model suggestions...")
        ml_suggestion_prompt = self.ml_model_suggester_system.format(data=f"{df_info}\n\n{quality_analysis}\n\n{cleaning_plan}\n\n{execution_output}")
        ml_suggestion_messages = [{"role": "system", "content": ml_suggestion_prompt}]
        ml_suggestion_messages.append({
            "role": "user", 
            "content": f"""
            ORIGINAL QUESTION: {question}
            
            DATA INFORMATION:
            {df_info}
            
            DATA QUALITY ANALYSIS:
            {quality_analysis}
            
            CLEANING IMPLEMENTED:
            {cleaning_plan}
            
            CLEANING RESULTS:
            {execution_output}
            
            Based on this information, please recommend suitable machine learning models and approaches.
            """
        })
        
        ml_suggestions = self.llm_stream(
            self.log_and_call_manager,
            ml_suggestion_messages,
            agent="ML Model Suggester",
            chain_id=self.chain_id
        )
        
        # 6. Final summary combining cleaning results and ML suggestions
        final_summary = self.summarise_solution_cleaning(
            question, 
            cleaning_plan, 
            execution_output, 
            ml_suggestions
        )
        
        return final_summary, execution_output, final_code
    
# Add to insightai.py class
    def summarise_solution_cleaning(self, original_question, cleaning_plan, execution_output, ml_suggestions):
        """Specialized summarizer for cleaning and ML suggestions"""
        agent = 'Solution Summarizer'

        # Initialize the messages list with a user message containing the task prompt
        insights_messages = [{
            "role": "user", 
            "content": f"""
            The user asked: "{original_question}"
            
            You implemented a data cleaning plan:
            {cleaning_plan}
            
            The code execution produced these results:
            {execution_output}
            
            ML model suggestions were provided:
            {ml_suggestions}
            
            Please provide a comprehensive summary that includes:
            1. A clear breakdown of the data quality issues that were identified
            2. The cleaning techniques applied and their effectiveness 
            3. Before/after metrics showing improvement
            4. Machine learning model recommendations based on the cleaned data
            5. Next steps the user could take for their ML project
            
            Make your summary clear, concise, and highlight key improvements and recommendations.
            """
        }]
        
        # Call the LLM
        summary = self.llm_call(
            self.log_and_call_manager,
            insights_messages,
            agent=agent, 
            chain_id=self.chain_id
        )

        return summary
    def generate_mermaid_diagram(self, summary, question, file_type):
        """
        Generate a Mermaid flowchart diagram based on the analysis flow and results.
        
        Args:
            summary (str): The solution summary generated by the solution summarizer
            question (str): The original question asked by the user
            file_type (str): The type of file analyzed (.csv or .db)
            
        Returns:
            str: Mermaid diagram code
        """
        agent = 'Diagram Generator'
        # using_model, provider = models.get_model_name('Solution Summarizer')  # Reuse Solution Summarizer's model
        
        # self.output_manager.display_tool_start(agent, using_model)
        
        # # Call the LLM to generate the diagram
        # messages = [{"role": "system", "content": self.diagram_generator_system},
        #             {"role": "user", "content": f"Original Question: {question}\n\nAnalysis Summary: {summary}\n\nFile Type: {file_type}"}]
        
        # mermaid_code = self.llm_call(self.log_and_call_manager, messages, agent=agent, chain_id=self.chain_id)
        
        # # Clean up the response to ensure it's valid Mermaid code
        # # Remove any potential markdown backticks
        # mermaid_code = mermaid_code.replace("```mermaid", "").replace("```", "").strip()
        
        # # Ensure the diagram starts with flowchart TD
        # if not mermaid_code.startswith("flowchart TD") and not mermaid_code.startswith("graph TD"):
        #     mermaid_code = "flowchart TD\n" + mermaid_code
        
        # # Save the diagram to a file in the visualization directory
        # visualization_dir = os.getenv('VISUALIZATION_DIR', 'visualization')
        # os.makedirs(visualization_dir, exist_ok=True)
        
        # diagram_filename = f"analysis_flow_{self.chain_id}.mmd"
        # diagram_path = os.path.join(visualization_dir, diagram_filename)
        
        # with open(diagram_path, 'w', encoding='utf-8') as f:
        #     f.write(mermaid_code)
        
        # self.output_manager.display_system_messages(f"Mermaid diagram saved to {diagram_path}")
        
        # return mermaid_code 
        pass