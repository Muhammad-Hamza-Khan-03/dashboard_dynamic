import pandas as pd
import json
from groq import Groq
import os
from typing import List, Dict, Any
import instructor
from pydantic import BaseModel, Field

# Pydantic models for instructor
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
    
    def __init__(self, df: pd.DataFrame, llm_config: dict = None):
        """
        Initialize DataMapper with DataFrame and LLM configuration.
        
        Args:
            df: pandas DataFrame to analyze
            llm_config: LLM configuration dictionary (optional)
        """
        self.df = df
        self.llm_config = llm_config or self._get_default_config()
        self.client = self._init_instructor_client()
        self.column_descriptions = None
        self.model = "deepseek-r1-distill-llama-70b"
        
        # Define JSON schemas for reference
        self.description_schema = {
            "type": "object",
            "properties": {
                "descriptions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "column_name": {
                                "type": "string",
                                "description": "The name of the column"
                            },
                            "description": {
                                "type": "string",
                                "description": "A concise explanation of what the column represents"
                            }
                        },
                        "required": ["column_name", "description"]
                    }
                }
            },
            "required": ["descriptions"]
        }
        
        self.match_schema = {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The original user query."
                },
                "matches": {
                    "type": "array",
                    "description": "List of target fields with matched dataset column names.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "target_field": {
                                "type": "string",
                                "description": "The inferred field user is asking for."
                            },
                            "matched_column": {
                                "type": "string",
                                "description": "Best matching column from the actual dataset."
                            }
                        },
                        "required": ["target_field", "matched_column"]
                    }
                }
            },
            "required": ["query", "matches"]
        }
        
    def _get_default_config(self):
        """Get default LLM configuration for DataMapper"""
        return {
            "agent": "DataMapper",
            "details": {
                "model": "deepseek-r1-distill-llama-70b",
                "provider": "groq",
                "max_tokens": 2000,
                "temperature": 0.1
            }
        }
        
    def _init_instructor_client(self):
        """Initialize Groq client with instructor patching"""
        try:
            # Get API key
            api_key = os.getenv('GROQ_API_KEY')
            if not api_key:
                try:
                    api_key = os.getenv('GROQ_API_KEY')
                except ImportError:
                    pass
            
            if not api_key:
                raise ValueError("GROQ_API_KEY not found in environment variables")
                
            # Create Groq client and patch with instructor
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
        
        system_prompt = """
        You are a data analysis expert. When given a pandas DataFrame's column information,
        carefully analyze each column and provide a comprehensive yet concise description.
        
        Focus on:
        - What type of data the column contains
        - What the column represents in business/domain context
        - Any patterns or characteristics you can infer
        
        
        Provide descriptions that would help someone understand what each column is used for.
        """
        
        user_prompt = f"""
        Analyze this DataFrame:
        Column names: {column_names}
        Data types: {dtypes_info}
        Sample data (first few rows): {sample_data}
        DataFrame shape: {self.df.shape}
        
        Provide a description for each column.
        """
        
        try:
            # Use instructor to get structured response
            response = self.client.chat.completions.create(
                model=self.model,
                response_model=ColumnDescriptionsResponse,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
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
            return result_dict
            
        except Exception as e:
            print(f"❌ Error generating column descriptions with instructor: {e}")
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
            return {"query": user_query, "matches": []}
        
        system_prompt = """
        You are a dataset matching expert.
        You will be given:
              - A user query
              - A set of dataset column descriptions

        Your task:
        - Infer the fields needed to answer the query
        - Match those to the best actual dataset column(s)
        - If no suitable match exists, set 'matched_column' to "Nothing Compatible"
        - Focus on columns that would be most relevant for analysis or filtering
        - Consider synonyms and related concepts when matching
        - If the user asks general question from the dataset,include all the columns
        """
        
        # Convert column descriptions for the prompt
        description_text = "\n".join([
            f"- {d['column_name']}: {d['description']}" 
            for d in col_descs
        ])
        
        user_prompt = f"""
        User Query: "{user_query}"
        
        Available Dataset Columns:
        {description_text}
        
        Find the best matching columns for this query.
        """
        
        try:
            # Use instructor to get structured response
            response = self.client.chat.completions.create(
                model=self.model,
                response_model=QueryMatches,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
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
            return result_dict
            
        except Exception as e:
            print(f"❌ Error generating column matches with instructor: {e}")
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
            return "No column mappings found"
        
        # Filter out non-compatible matches
        valid_matches = [m for m in match_result["matches"] if m["matched_column"] != "Nothing Compatible"]
        
        if not valid_matches:
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
            return self.df
        
        try:
            return self.df[column_list]
        except KeyError as e:
            print(f"❌ Error filtering DataFrame: {e}")
            print("Available columns:", self.df.columns.tolist())
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


# Updated LLM Configuration - Add this to your existing llm_config
def get_updated_llm_config():
    """
    Returns updated LLM configuration with DataMapper agent added.
    Add this configuration to your existing llm_config list.
    """
    datamapper_config = {
        "agent": "DataMapper", 
        "details": {
            "model": "deepseek-r1-distill-llama-70b", 
            "provider": "groq", 
            "max_tokens": 2000, 
            "temperature": 0.1
        }
    }
    return datamapper_config