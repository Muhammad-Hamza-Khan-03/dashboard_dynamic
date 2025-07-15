import pandas as pd
import json
from groq import Groq
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
    
    def __init__(self, df: pd.DataFrame, insight_ai: 'InsightAI'):
        """
        Initialize DataMapper with DataFrame and InsightAI instance for prompt and model access.
        
        Args:
            df: pandas DataFrame to analyze
            insight_ai: InsightAI instance containing prompt templates and model configurations
        """
        self.df = df
        self.insight_ai = insight_ai
        self.client = self._init_instructor_client()
        self.column_descriptions = None
        self.messages = [{"role": "system", "content": self.insight_ai.data_mapper_describe_columns_system}]
        
        # Define JSON schemas for reference
        self.description_schema = mapper_description_schema
        self.match_schema = matcher_schema
        
    def _init_instructor_client(self):
        """Initialize Groq client with instructor patching using models.py configuration."""
        try:
            # Get model configuration from models.py
            model, provider, max_tokens, temperature = models.get_agent_details("DataMapper", models.load_llm_config())
            
            if provider != "groq":
                raise ValueError(f"Unsupported provider for DataMapper: {provider}")
            
            # Initialize Groq client
            api_key = os.getenv('GROQ_API_KEY')
            if not api_key:
                raise ValueError("GROQ_API_KEY not found in environment variables")
                
            groq_client = Groq(api_key=api_key)
            instructor_client = instructor.from_groq(groq_client)
            
            print("✅ Instructor client initialized successfully")
            return instructor_client
            
        except Exception as e:
            print(f"❌ Error initializing instructor client: {e}")
            return None
    
    def describe_columns(self) -> Dict[str, Any]:
        """
        Analyze DataFrame columns and generate descriptions for each column.
        Uses instructor to ensure structured output.
        
        Returns:
            Dictionary with column descriptions following the description_schema
        """
        if not self.client:
            print("❌ Instructor client not initialized")
            return {"descriptions": []}
            
        # Get column names and sample data for analysis
        column_names = self.df.columns.tolist()
        first_row_data = self.df.iloc[0].tolist() if len(self.df) > 0 else []
        
        # Get data types
        dtypes_info = {col: str(dtype) for col, dtype in self.df.dtypes.items()}
        
        # Sample a few rows for better analysis
        sample_data = self.df.head(3).to_dict('records') if len(self.df) > 0 else []
        
        # Use prompt from InsightAI
        user_prompt = self.insight_ai.data_mapper_describe_columns_user.format(
            column_names=column_names,
            dtypes_info=dtypes_info,
            sample_data=sample_data,
            shape=self.df.shape
        )
        
        # Append user message to history
        self.messages.append({"role": "user", "content": user_prompt})
        
        try:
            # Use instructor to get structured response
            response = self.client.chat.completions.create(
                model=models.get_model_name("DataMapper")[0],
                response_model=ColumnDescriptionsResponse,
                messages=self.messages,
                temperature=0.1,
                max_tokens=2000,
            )
            
            # Convert Pydantic response to dictionary matching schema
            result_dict = {
                "descriptions": [
                    {
                        "column_name": desc.column_name,
                        "description": desc.description
                    }
                    for desc in response.descriptions
                ]
            }
            
            print("✅ Column Descriptions Generated with Instructor")
            self.column_descriptions = result_dict["descriptions"]
            self.messages.append({"role": "assistant", "content": json.dumps(result_dict)})
            return result_dict
            
        except Exception as e:
            print(f"❌ Error generating column descriptions with instructor: {e}")
            self.messages.append({"role": "assistant", "content": f"Error: {str(e)}"})
            return {"descriptions": []}
    
    def match_columns(self, user_query: str, col_descs: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Match user query to relevant DataFrame columns.
        Uses instructor to ensure structured output.
        
        Args:
            user_query: The user's question or query
            col_descs: List of column descriptions (optional, will generate if not provided)
            
        Returns:
            Dictionary with matched columns following the match_schema
        """
        if not self.client:
            print("❌ Instructor client not initialized")
            return {"query": user_query, "matches": []}
            
        # Use existing descriptions or generate new ones
        if col_descs is None:
            if self.column_descriptions is None:
                descriptions_result = self.describe_columns()
                col_descs = descriptions_result.get("descriptions", [])
            else:
                col_descs = self.column_descriptions
                
        if not col_descs:
            print("❌ No column descriptions available")
            self.messages.append({"role": "assistant", "content": "No column descriptions available"})
            return {"query": user_query, "matches": []}
        
        # Convert column descriptions for the prompt
        description_text = "\n".join([
            f"- {d['column_name']}: {d['description']}" 
            for d in col_descs
        ])
        
        # Use prompt from InsightAI
        user_prompt = self.insight_ai.data_mapper_match_columns_user.format(
            query=user_query,
            column_descriptions=description_text
        )
        
        # Append user message to history
        self.messages.append({"role": "user", "content": user_prompt})
        
        try:
            # Use instructor to get structured response
            response = self.client.chat.completions.create(
                model=models.get_model_name("DataMapper")[0],
                response_model=QueryMatches,
                messages=self.messages,
                temperature=0.0,
                max_tokens=1500,
            )
            
            # Convert Pydantic response to dictionary matching schema
            result_dict = {
                "query": response.query,
                "matches": [
                    {
                        "target_field": match.target_field,
                        "matched_column": match.matched_column
                    }
                    for match in response.matches
                ]
            }
            
            print("✅ Column Matches Generated with Instructor")
            self.messages.append({"role": "assistant", "content": json.dumps(result_dict)})
            return result_dict
            
        except Exception as e:
            print(f"❌ Error generating column matches with instructor: {e}")
            self.messages.append({"role": "assistant", "content": f"Error: {str(e)}"})
            return {"query": user_query, "matches": []}
    
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
        """
        Get a DataFrame filtered to only the columns relevant to the user query.
        
        Args:
            user_query: The user's question or query
            
        Returns:
            Filtered DataFrame with only relevant columns
        """
        column_list = self.get_column_mappings(user_query, format_type="list")
        
        if isinstance(column_list, str):
            print(f"❌ Could not get column mappings: {column_list}")
            self.messages.append({"role": "assistant", "content": f"Could not get column mappings: {column_list}"})
            return self.df
        
        try:
            filtered_df = self.df[column_list]
            self.messages.append({"role": "assistant", "content": f"Filtered DataFrame to columns: {column_list}"})
            return filtered_df
        except KeyError as e:
            print(f"❌ Error filtering DataFrame: {e}")
            print("Available columns:", self.df.columns.tolist())
            self.messages.append({"role": "assistant", "content": f"Error filtering DataFrame: {str(e)}"})
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