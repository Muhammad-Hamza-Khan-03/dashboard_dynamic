import pandas as pd
import json
from groq import Groq
from openai import OpenAI
import os
from typing import List, Dict, Any
import instructor
from pydantic import BaseModel, Field

try:
    from .func_calls import mapper_description_schema, matcher_schema
except ImportError:
    from func_calls import mapper_description_schema, matcher_schema

try:
    from . import models
except ImportError:
    import models

class ColumnDescription(BaseModel):
    column_name: str = Field(..., description="The name of the column")
    description: str = Field(..., description="A concise explanation of what the column represents")

class ColumnDescriptionsResponse(BaseModel):
    descriptions: List[ColumnDescription] = Field(..., description="List of column descriptions")

class Match(BaseModel):
    target_field: str = Field(..., description="The inferred field user is asking for")
    matched_column: str = Field(..., description="Best matching column from the actual dataset")

class QueryMatches(BaseModel):
    query: str = Field(..., description="The original user query")
    matches: List[Match] = Field(..., description="List of target fields with matched dataset column names")

class DataMapper:
    """
    A class that analyzes DataFrame columns and maps user queries to relevant columns.
    Uses instructor with Groq for structured JSON output.
    """
    
    def __init__(self, df: pd.DataFrame, insight_ai: 'InsightAI', descriptions: dict):
        self.df = df
        self.insight_ai = insight_ai
        self.client = self._init_instructor_client()
        self.column_descriptions = descriptions
        self.messages = [{"role": "system", "content": self.insight_ai.data_mapper_match_columns_system}]
        
        # Define JSON schemas for reference
        self.description_schema = mapper_description_schema
        self.match_schema = matcher_schema

    
            
    def _init_instructor_client(self):
        """Initialize the instructor client based on the provider (Groq or OpenAI)."""
        try:
            model, provider, max_tokens, temperature = models.get_agent_details("DataMapper", models.load_llm_config())
            
            if provider == 'groq':
                api_key = os.getenv('GROQ_API_KEY')
                if not api_key:
                    raise ValueError("GROQ_API_KEY not found in environment variables")
                groq_client = Groq(api_key=api_key)
                return instructor.from_groq(groq_client)
            
            elif provider == 'openai':
                api_key = os.getenv('OPENAI_API_KEY')
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not found in environment variables")
                openai_client = OpenAI(api_key=api_key)
                return instructor.from_openai(openai_client)
            
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except Exception as e:
            print(f"❌ Error initializing instructor client: {e}")
            return None
    
  
    def match_columns(self, user_query: str) -> Dict[str, Any]:
        """Match user query to relevant columns using provided descriptions."""
        if not self.client:
            print("❌ Instructor client not initialized")
            return {"query": user_query, "matches": []}
        
        # Prepare column descriptions as a flat string
        description_text = "\n".join([f"- {col}: {desc['description']}" for col, desc in self.column_descriptions.items()])
        
        # Ensure the prompt instructs the LLM to match only to provided columns
        user_prompt = self.insight_ai.data_mapper_match_columns_user.format(
            query=user_query,
            column_descriptions=description_text
        )
        
        self.messages.append({"role": "user", "content": user_prompt})
        
        try:
            response = self.client.chat.completions.create(
                model=models.get_model_name("DataMapper")[0],
                response_model=QueryMatches,
                messages=self.messages,
                temperature=0.0,
                max_tokens=1500,
            )
            
            result_dict = {
                "query": response.query,
                "matches": [
                    {"target_field": match.target_field, "matched_column": match.matched_column}
                    for match in response.matches
                    if match.matched_column in self.column_descriptions  # Only include valid columns
                ]
            }
            
            print("✅ Column Matches Generated with Instructor")
            self.messages.append({"role": "assistant", "content": json.dumps(result_dict)})
            return result_dict
        except Exception as e:
            print(f"❌ Error generating column matches: {e}")
            self.messages.append({"role": "assistant", "content": f"Error: {str(e)}"})
            return {"query": user_query, "matches": []}
        
    def get_matched_columns(self, user_query: str) -> Dict[str, str]:
        """Get matched columns and their descriptions."""
        match_result = self.match_columns(user_query)
        
        if not match_result or not match_result.get("matches"):
            return {}
        
        matched_columns = {}
        for match in match_result["matches"]:
            if match["matched_column"] in self.column_descriptions:
                desc = self.column_descriptions[match["matched_column"]]["description"]
                matched_columns[match["matched_column"]] = desc
        
        return matched_columns
    
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
        match_result = self.match_columns(user_query, self.column_descriptions)
        
        if not match_result or not match_result.get("matches"):
            self.messages.append({"role": "assistant", "content": "No column mappings found"})
            return "No column mappings found"
        
        # Filter out non-compatible matches
        valid_matches = [m for m in match_result["matches"] if m["matched_column"] != "Nothing Compatible"]
        
        if not valid_matches:
            self.messages.append({"role": "assistant", "content": "No compatible columns found for the query"})
            return "No compatible columns found for the query"
        
        # Format mappings based on requested format
        if format_type == "simple":
            # Just column names separated by commas
            return ", ".join([m["matched_column"] for m in valid_matches])
        
        elif format_type == "detailed":
            # Column names with their target fields
            mappings = []
            for match in valid_matches:
                desc = next((d["description"] for d in self.column_descriptions if d["column_name"] == match["matched_column"]), "")
                mappings.append(f"{match['matched_column']} ({match['target_field']})")
            return ", ".join(mappings)
        
        elif format_type == "list":
            # Return as list of column names
            return [m["matched_column"] for m in valid_matches]
        
        elif format_type == "structured":
            # Return the full structured result
            return match_result
        
        else:
            # Default to simple format
            return ", ".join([m["matched_column"] for m in valid_matches])
    
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