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
    from .output_manager import OutputManager
    from .DataMapper import DataMapper
except ImportError:
    # Fall back to script-style import
        import models, prompts, func_calls, reg_ex, log_manager, utils,output_manager
        from output_manager import OutputManager
        from DataMapper import DataMapper
   
class InsightAI:
    def __init__(self, df: pd.DataFrame = None,
             max_conversations: int = 4,
             debug: bool = False, 
             exploratory: bool = True,
             df_ontology: bool = False,
             column_descriptions_path: str = 'column_descriptions.json'
             ):  
        

        self.output_manager = output_manager.OutputManager()
        

        self.df = df if df is not None else None

        self.output_plot = None  # Initialize plot output variable
        
        # Output
        self.dataset_category = None


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

        self.column_descriptions_path = column_descriptions_path
        self.column_descriptions = self._load_column_descriptions()

        self.inferred_file_key = self._infer_file_key(df) if df is not None else None
        
        # Prompts
        # Define list of templates
        templates = [
            "default_example_output_df",
            "default_example_output_gen",
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

    def _load_column_descriptions(self):
        """Load column descriptions from the specified JSON file."""
        try:
            with open(self.column_descriptions_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading column descriptions from {self.column_descriptions_path}: {e}")
            return {}

    def _infer_file_key(self, df: pd.DataFrame):
        """Infer the file key by matching DataFrame columns with column_descriptions.json."""
        if not self.column_descriptions or df is None:
            return None
        df_columns = set(df.columns)
        best_match = None
        max_matching_columns = 0
        for file_key, desc in self.column_descriptions.items():
            desc_columns = set(desc.keys())
            matching_columns = len(df_columns.intersection(desc_columns))
            if matching_columns > max_matching_columns:
                max_matching_columns = matching_columns
                best_match = file_key
        return best_match if max_matching_columns > 0 else None
        
    def datamapper(self, question):
        """Map user query to DataFrame columns using inferred file key."""
        if self.df is None:
            return None, None
        try:
            mapper = DataMapper(self.df, self, descriptions=self.column_descriptions)
            matched_columns = mapper.get_matched_columns(self.inferred_file_key, question)
            filtered_df = mapper.get_filtered_dataframe(self.inferred_file_key, question) if matched_columns else self.df
            return matched_columns, filtered_df
        except Exception as e:
            print(f"❌ Error in datamapper: {e}")
            return None, None
            
    

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
        agent = 'Expert Selector'
        using_model, provider = models.get_model_name(agent)
        self.output_manager.display_tool_start(agent, using_model)
        pre_eval_messages[-1]['content'] += f"\nFile type: {file_type}"
        llm_response = self.llm_stream(self.log_and_call_manager, 
                                      pre_eval_messages, 
                                      agent=agent,
                                      chain_id=self.chain_id)
        expert, requires_dataset, confidence = self._extract_expert(llm_response)
        return expert, requires_dataset, confidence
    
    
    def select_analyst(self, select_analyst_messages):
        agent = 'Analyst Selector'
        llm_response = self.llm_stream(self.log_and_call_manager, select_analyst_messages, agent=agent, chain_id=self.chain_id)
        analyst, query_unknown, query_condition = self._extract_analyst(llm_response)
        return analyst, query_unknown, query_condition

    
    def task_eval(self, eval_messages, agent):
        using_model, provider = models.get_model_name(agent)
        self.output_manager.display_tool_start(agent, using_model)
        llm_response = self.llm_stream(self.log_and_call_manager, eval_messages, agent=agent, chain_id=self.chain_id)
        self.output_manager.display_task_eval(llm_response)
        return self._extract_plan(llm_response) if agent == 'Planner' else llm_response
    
    def taskmaster(self, question, df_columns=None,matched_columns=None):
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
        
        self.pre_eval_messages.append({"role": "user", "content": self.expert_selector_user.format(question)})
        expert, requires_dataset, confidence = self.select_expert(self.pre_eval_messages, file_type)
        self.pre_eval_messages.append({"role": "assistant", "content": f"expert:{expert},requires_dataset:{requires_dataset},confidence:{confidence}"})


        if expert == 'Data Cleaning Expert':
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

            if analyst == 'Data Analyst DF' or analyst == 'Data Analyst':
                agent = 'Planner'
                example_plan = self.default_example_plan_df
                if self.df is not None:
                        df_info = "Column Name: Type\n"
                        df_info += self.df.dtypes.to_string() + "\n"
                        df_info += "\nFirst row:\n"
                        df_info += self.df.iloc[0].to_string()
                        if self.df_ontology and self.inferred_file_key in self.column_descriptions:
                            # Add ontology info if enabled and available
                            self.query_metrics = utils.inspect_dataframe(self.df, self.log_and_call_manager, self.chain_id, query_condition)
                            self.query_metrics = self._extract_plan(self.query_metrics)
                            df_info += f"\n\nREQUIRED METRICS AND JOINS:\n```yaml\n{self.query_metrics}\n```"
                else:
                    df_info = "No DataFrame provided"
                    
                matched_columns_str = "\n".join([f"        - {col}: {desc}" for col, desc in matched_columns.items()]) if matched_columns else "No matched columns"
                print("MATCHED COLUMNS: ", matched_columns)
                self.eval_messages.append({
                    "role": "user",
                    "content": self.planner_user_df.format(
                        task=question,
                        df_info=df_info,
                        matched_columns=matched_columns_str
                    )
                })
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

        if expert in ['Research Specialist']:
            self.log_and_call_manager.print_summary_to_terminal()
        elif expert == 'Data Analyst':
            plan = task_eval

        return analyst, plan, query_unknown, query_condition, requires_dataset, confidence
    #####################
    ### Main Function ###
    #####################
        
    #####################
    ### Conversation Function ###
    #####################
    def pd_agent_converse(self, question=None):
        if question is not None:
            loop = False
            matched_columns, _ = self.datamapper(question)
        else:
            loop = True

        chain_id = int(time.time())
        self.chain_id = chain_id
        self.reset_messages_and_logs()

        
        try:
            while True:
                if loop:
                    question = self.output_manager.display_user_input_prompt()

                    if question.strip().lower() == 'exit':
                        self.log_and_call_manager.consolidate_logs()    
                        break
                    matched_columns, _ = self.datamapper(question)
                # Check file type to determine path
                file_type = '.db' if hasattr(self, 'conn') else '.csv'

                if self.exploratory:
                    analyst, plan, query_unknown, query_condition, requires_dataset, confidence = self.taskmaster(
                        question, self.df.columns.tolist() if self.df is not None else [], matched_columns
                    )
                    example_code = self.default_example_output_df if analyst == 'Data Analyst DF' else self.default_example_output_gen

                    if not loop and not analyst:
                        self.log_and_call_manager.consolidate_logs()
                        return
                    elif not analyst:
                        continue
                else:
                    analyst = 'Data Analyst DF'
                    plan = question
                    example_code = self.default_example_output_df

                # Generate and execute code
                code = self.generate_code(analyst, question, plan, self.code_messages, example_code)


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
        error_corrections = 0
        if self.df is not None:
            original_df = self.df.copy()
        with redirect_stdout(io.StringIO()) as output:
            while error_corrections < self.MAX_ERROR_CORRECTIONS:
                try:
                    self.messages_maintenace(code_messages)
                    if code is not None:
                        local_vars = {'df': self.df, 'output_plot': self.output_plot}
                        exec(code, local_vars)
                        self.df = local_vars['df']
                        code_messages = self._remove_examples(code_messages)
                    break
                except Exception as error:
                    exc_type, exc_value, tb = sys.exc_info()
                    full_traceback = traceback.format_exc()
                    exec_traceback = self.filter_exec_traceback(full_traceback, exc_type.__name__, str(exc_value))
                    error_corrections += 1
                    if self.df is not None:
                        self.df = original_df.copy()
                    code, code_messages = self.correct_code_errors(exec_traceback, error_corrections, code_messages, analyst)
            results = output.getvalue()
            self.code_exec_results = results
            summary = self.summarise_solution(original_question, plan, results)
            output.truncate(0)
            output.seek(0)
        return summary, results, code
    
    def generate_code(self, analyst, question, plan, code_messages, example_code):
        """Generate code based on analyst type and input parameters."""
        agent = 'Code Generator'
        using_model, provider = models.get_model_name(agent)
        
        if analyst == 'Data Cleaning Expert':
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
        
        code,self.output_plot= self._extract_code(llm_response, analyst, provider, extract_dict=True)
            
                
            
        if self.debug:
            print(f"Generated Code: {code}")
            
            print(f"Output Plot: {self.output_plot}")
            
        return code
    
    def filter_exec_traceback(self, full_traceback, exception_type, exception_value):
        filtered_tb_lines = [line for line in full_traceback.split('\n') if '<string>' in line]
        filtered_traceback = '\n'.join(filtered_tb_lines)
        if filtered_traceback:
            filtered_traceback += '\n'
        filtered_traceback += f"{exception_type}: {exception_value}"
        return filtered_traceback
    
    def correct_code_errors(self, error, error_corrections, code_messages, analyst):
        agent = 'Error Corrector'
        model, provider = models.get_model_name(agent)
        if error_corrections > 2:
            del code_messages[-4]
            del code_messages[-3]
        code_messages.append({"role": "user", "content": self.error_corector_system.format(error)})
        self.output_manager.display_error(error)
        llm_response = self.llm_call(self.log_and_call_manager, code_messages, agent=agent, chain_id=self.chain_id)
        code_messages.append({"role": "assistant", "content": llm_response})
        code = self._extract_code(llm_response, analyst, provider)
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
    