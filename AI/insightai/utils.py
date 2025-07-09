from datetime import datetime, timezone
import yaml
import numpy as np
import pandas as pd 


def ordinal(n):
    return f"{n}{'th' if 11<=n<=13 else {1:'st',2:'nd',3:'rd'}.get(n%10, 'th')}"

def get_readable_date(date_obj=None, tz=None):
    if date_obj is None:
        date_obj = datetime.now().replace(tzinfo=timezone.utc)

    if tz:
        date_obj = date_obj.replace(tzinfo=tz)

    return date_obj.strftime(f"%a {ordinal(date_obj.day)} of %b %Y")

def inspect_dataframe(df, log_and_call_manager=None,chain_id=None,query=None):
    agent = "Dataframe Inspector"
    if log_and_call_manager:
        try:
            # Attempt package-relative import
            from . import models, prompts, df_ontology, output_manager
        except ImportError:
            # Fall back to script-style import
            import models, prompts, df_ontology, output_manager

        output_handler = output_manager.OutputManager()

        using_model,provider = models.get_model_name(agent)

        output_handler.display_tool_start(agent,using_model)

        # Get the ontology
        ontology = df_ontology.ontology

        prompt = prompts.dataframe_inspector_system.format(ontology, query)
            
        messages = [{"role": "user", "content": prompt}]

        llm_response = models.llm_stream(log_and_call_manager,messages, agent=agent, chain_id=chain_id)

        return llm_response
    
    else:
        # Create a dictionary to store column statistics
        stats_dict = {}
        # Iterate over each column in the dataframe
        for column in df.columns:
            # Gather common statistics
            col_stats = {
                'dtype': str(df[column].dtype),
                'count_of_values': int(df[column].count()),
                'count_of_nulls': int(df[column].isna().sum()),
            }

            # Replace the numpy check with pandas type check
            if pd.api.types.is_numeric_dtype(df[column]):
                col_stats['mean'] = float(df[column].mean())

            # Special handling for datetime columns and period types
            elif pd.api.types.is_datetime64_dtype(df[column]) or hasattr(df[column].dtype, 'freq'):
                try:
                    non_null_values = df[column].dropna()
                    if len(non_null_values) > 1:
                        if pd.api.types.is_datetime64_dtype(df[column]):
                            col_stats['first_date'] = str(non_null_values.iloc[0])
                            col_stats['last_date'] = str(non_null_values.iloc[-1])
                        else:  # Period type
                            col_stats['first_period'] = str(non_null_values.iloc[0])
                            col_stats['last_period'] = str(non_null_values.iloc[-1])
                            col_stats['period_frequency'] = str(df[column].dtype.freq)
                except Exception as e:
                    col_stats['error'] = str(e)

            # Handle all other columns
            else:
                non_null_values = df[column].dropna()
                if not non_null_values.empty:
                    col_stats['first_value'] = str(non_null_values.iloc[0])
                    col_stats['last_value'] = str(non_null_values.iloc[-1])

            # Add the stats to the main dictionary
            stats_dict[column] = col_stats
            
        # Convert dictionary to YAML format
        return yaml.dump(stats_dict, sort_keys=False, default_flow_style=False)

def inspect_sql_schema(conn):
    tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    schema = {}
    for table in tables:
        columns = conn.execute(f"PRAGMA table_info({table[0]})").fetchall()
        schema[table[0]] = [{
            'name': col[1],
            'type': col[2],
            'nullable': not col[3],
            'pk': col[5]
        } for col in columns]
    return schema