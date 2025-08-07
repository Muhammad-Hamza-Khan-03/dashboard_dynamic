import json
import pandas as pd
import re
from typing import Dict, Any

try:
    from .func_calls import mapper_description_schema, matcher_schema
except ImportError:
    from func_calls import mapper_description_schema, matcher_schema

try:
    from . import models
except ImportError:
    import models

class DataMapper:
    """
    A class that analyzes column_descriptions.json and maps user queries to relevant columns using LLM.
    """
    def __init__(self, insight_ai, descriptions: dict):
        self.insight_ai = insight_ai
        self.column_descriptions = descriptions
        self.messages = [{"role": "system", "content": self.insight_ai.data_mapper_match_columns_system}]

    def match_columns(self, user_query: str):
        """Match user query to relevant columns using provided descriptions and LLM."""
        # Prepare column descriptions as a flat string
        description_text = "\n".join([
            f"- {col}: {desc['description']} (Sample: {desc.get('sample_values', [''])[0]})"
            for col, desc in self.column_descriptions.items()
        ])
        user_prompt = self.insight_ai.data_mapper_match_columns_user.format(
            query=user_query,
            column_descriptions=description_text
        )
        self.messages.append({"role": "user", "content": user_prompt})
        try:
            llm_response = self.insight_ai.llm_call(
                self.insight_ai.log_and_call_manager,
                self.messages,
                agent="DataMapper",
                chain_id=self.insight_ai.chain_id
            )
            print("LLM RESPONSE: ", llm_response)
            # Extract JSON block from LLM response
            try:
                if isinstance(llm_response, str):
                    # Use regex to find JSON block between ```json and ```
                    json_match = re.search(r'```json\n([\s\S]*?)\n```', llm_response)
                    if json_match:
                        json_str = json_match.group(1)
                        response_json = json.loads(json_str)
                    else:
                        print("❌ No JSON block found in LLM response")
                        return {}
                else:
                    response_json = llm_response 
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing error: {e}")
                return {}
            except Exception as e:
                print(f"❌ Error processing LLM response: {e}")
                return {}

            # Validate response against matcher_schema if available
            if 'matcher_schema' in globals():
                try:
                    matches = response_json.get("matches", [])
                    if not isinstance(matches, list):
                        print("❌ LLM response 'matches' is not a list")
                        return {}
                    for match in matches:
                        if not all(key in match for key in ["target_field", "matched_column"]):
                            print(f"❌ Invalid match structure: {match}")
                            return {}
                except Exception as e:
                    print(f"❌ Schema validation error: {e}")
                    return {}
            else:
                matches = response_json.get("matches", [])

            result = {}
            # Normalize column names for case-insensitive matching
            normalized_columns = {col.lower(): col for col in self.column_descriptions}
            for match in matches:
                col = match.get("matched_column")
                if not col:
                    print(f"❌ Missing matched_column in match: {match}")
                    continue
                # Normalize the column name from LLM response
                col_normalized = col.strip().lower()
                if col_normalized in normalized_columns:
                    actual_col = normalized_columns[col_normalized]
                    result[actual_col] = {
                        "description": self.column_descriptions[actual_col]["description"],
                        "sample_values": self.column_descriptions[actual_col].get("sample_values", [])
                    }
                else:
                    print(f"❌ Column {col} not found in column_descriptions")
            print("MATCHED COLUMNS: ", result)
            return result
        except Exception as e:
            print(f"❌ Error generating column matches: {e}")
            return {}

    def get_matched_columns(self, user_query: str):
        """Get matched columns and their descriptions and sample values."""
        return self.match_columns(user_query)

    def get_column_mappings(self, user_query: str, format_type: str = "simple") -> str:
        """
        Main method to get column mappings for a user query.
        
        Args:
            user_query: The user's question or query
            format_type: Format of returned mappings ("simple", "detailed", "list", "structured")
            
        Returns:
            String representation of column mappings or structured data
        """
        # Get column descriptions if not already available
        if not self.column_descriptions:
            self.describe_columns()
        
        # Match query to columns
        match_result = self.match_columns(user_query)
        
        if not match_result:
            return "No column mappings found"
        
        # Filter out non-compatible matches
        valid_matches = [m for m in match_result.keys()]
        
        if not valid_matches:
            return "No compatible columns found for the query"
        
        # Format mappings based on requested format
        if format_type == "simple":
            # Just column names separated by commas
            return ", ".join(valid_matches)
        
        elif format_type == "detailed":
            # Column names with their target fields
            mappings = []
            for col in valid_matches:
                desc = match_result[col]["description"]
                mappings.append(f"{col} (Sample: {match_result[col].get('sample_values', [''])[0]})")
            return ", ".join(mappings)
        
        elif format_type == "list":
            # Return as list of column names
            return valid_matches
        
        elif format_type == "structured":
            # Return the full structured result
            return match_result
        
        else:
            # Default to simple format
            return ", ".join(valid_matches)
    
    def get_filtered_dataframe(self, user_query: str) -> pd.DataFrame:
        """Get a DataFrame filtered to relevant columns."""
        matched_columns = self.get_matched_columns(user_query)
        
        if not matched_columns:
            print("❌ No matched columns found")
            return self.df
        
        try:
            filtered_df = self.df[list(matched_columns.keys())]
            return filtered_df
        except KeyError as e:
            print(f"❌ Error filtering DataFrame: {e}")
            return self.df

    def get_structured_mappings(self, user_query: str) -> Dict[str, Any]:
        """
        Get structured column mappings with full metadata.

        Args:
            user_query: The user's question or query

        Returns:
            Dictionary containing structured mapping results
        """
        return self.get_column_mappings(user_query, format_type="structured")
    
    def get_column_descriptions_structured(self) -> Dict[str, Any]:
        """
        Get structured column descriptions.
        
        Returns:
            Dictionary containing structured column descriptions
        """
        if not self.column_descriptions:
            return self.describe_columns()
        else:
            return {"descriptions": self.column_descriptions}