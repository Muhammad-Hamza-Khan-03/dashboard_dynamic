import json
import re

def _normalize_indentation(code_segment: str) -> str:
    """Normalize the indentation of a code segment by finding and removing common leading whitespace."""
    lines = code_segment.strip().split('\n')
    min_indent = min(len(re.match(r'^\s*', line).group()) for line in lines if line.strip())
    return '\n'.join(line[min_indent:] for line in lines)

def _extract_code(response: str, analyst: str, provider: str, extract_dict: bool = False):
    """Extract and clean code from LLM response based on analyst type."""
    # Handle different response formats
    response = re.sub(re.escape("<|im_sep|>"), "```", response)
    
    output_plot_match = None

    if extract_dict:
        pattern = rf"output_plot\s*=\s*({{.*?}})"
        match = re.search(pattern, response, re.DOTALL)
        if match:
            output_plot_match = match.group(1).strip()
        
    # Handle SQL analyst differently from other analysts
    if analyst == 'SQL Analyst':
        sql_segments = re.findall(r'```sql\s*(.*?)\s*```', response, re.DOTALL)
        if sql_segments:
            # Take the last SQL block if multiple exist
            sql = sql_segments[-1].strip()
            # Remove SQL comments at start of lines
            sql = re.sub(r'^\s*--.*$', '', sql, flags=re.MULTILINE)
            # Remove empty lines
            sql = '\n'.join(line for line in sql.split('\n') if line.strip())
            # For SQL analysts, always return consistent format
            if extract_dict:
                return sql, output_plot_match
            return sql
        # If no SQL found, return consistent format
        if extract_dict:
            return None, output_plot_match
        return None

    # Define security blacklist for Python code
    blacklist = [
        'subprocess', 'sys', 'eval', 'exec', 'socket', 'urllib',
        'shutil', 'pickle', 'ctypes', 'multiprocessing', 'tempfile', 
        'glob', 'pty', 'commands', 'cgi', 'cgitb', 
        'xml.etree.ElementTree', 'builtins'
    ]
    
    # Extract Python code blocks
    code_segments = re.findall(r'```(?:python\s*)?(.*?)\s*```', response, re.DOTALL)
    if not code_segments:
        code_segments = re.findall(r'\[PYTHON\](.*?)\[/PYTHON\]', response, re.DOTALL)

    if not code_segments:
        # No code found - return consistent format
        if extract_dict:
            return None, output_plot_match
        return None

    # Process code segments
    normalized_segments = [_normalize_indentation(segment) for segment in code_segments]
    code = '\n'.join(normalized_segments).lstrip()

    # Remove DataFrame initialization
    code = re.sub(r"df\s*=\s*pd\.read_csv\((.*?)\)", "", code)
    
    # Handle local model specifics
    if analyst == "Data Analyst DF" and provider == "local":
        if re.search(r"data=pd\.", code):
            code = re.sub(r"\bdata\b", "df", code)
        code = re.sub(
            r"(?<![a-zA-Z0-9_-])df\s*=\s*pd\.DataFrame\((.*?)\)", 
            "# The dataframe df has already been defined", 
            code
        )

    # Replace blacklisted items
    pattern = r"^(.*\b(" + "|".join(blacklist) + r")\b.*)$"
    code = re.sub(pattern, r"# not allowed \1", code, flags=re.MULTILINE)
    
    # Always return consistent format based on extract_dict parameter
    if extract_dict:
        return code.strip(), output_plot_match
    return code.strip()
def _extract_sql_query(response: str) -> str:
    """Extract SQL queries from LLM response.
    Only extracts content within SQL code blocks and cleans it up.
    """
    query_matches = re.findall(r'```sql\s*(.*?)\s*```', response, re.DOTALL)
    if query_matches:
        # Get last SQL block and clean it
        query = query_matches[-1]
        # Remove comments and extra whitespace
        query = re.sub(r'--.*$', '', query, flags=re.MULTILINE)
        # Remove empty lines
        query = '\n'.join(line for line in query.split('\n') if line.strip())
        return query.strip()
    return None

def _extract_rank(response: str) -> str:
    """Extract ranking value from between rank tags."""
    match = re.search(r"<rank>(.*)</rank>", response)
    return match.group(1).strip() if match else ""

def _extract_expert(response: str) -> str:
    """Extract expert type and metadata from JSON response."""
    # Updated pattern to include SQL Analyst
    pattern = r'Data Analyst|Research Specialist|SQL Analyst|Data Analyst DF|Data Analyst Generic'
    json_segment = re.findall(r'```(?:json\s*)?(.*?)\s*```', response, re.DOTALL)

    if json_segment:
        # Convert Python booleans to JSON booleans
        json_segment = re.sub(
            r'\b(True|False)\b', 
            lambda match: match.group(0).lower(), 
            json_segment[0]
        )
        data = json.loads(json_segment)
        return data['expert'], data['requires_dataset'], data['confidence']
    if 'Data Analyst' in response:
        return 'Data Analyst DF', None, None
    # Fallback to pattern matching
    match = re.search(pattern, response)
    return (match.group(), None, None) if match else (None, None, None)

def _extract_analyst(response: str) -> str:
    """Extract analyst type and query details from JSON response."""
    pattern = r'Data Analyst DF|Data Analyst Generic|SQL Analyst'
    json_segment = re.findall(r'```(?:json\s*)?(.*?)\s*```', response, re.DOTALL)

    if json_segment and json_segment[0].strip():  # Add check for empty string
        try:
            data = json.loads(json_segment[0])
            return data['analyst'], data.get('unknown'), data.get('condition')
        except json.JSONDecodeError:
            # Fallback parsing if JSON is malformed
            print(f"Warning: Could not parse JSON: {json_segment[0]}")
            
    # More robust fallback pattern matching
    match = re.search(pattern, response)
    return (match.group(), None, None) if match else (None, None, None)

def _extract_plan(response: str) -> str:
    """Extract plan from YAML code blocks."""
    yaml_segment = re.findall(r'```(?:yaml\s*)?(.*?)\s*```', response, re.DOTALL)
    return yaml_segment[-1] if yaml_segment else ""

def _remove_examples(messages: str) -> str:
    """Remove example blocks from messages to reduce token usage."""
    pattern = 'Example Output:\s*```(?:python|sql).*?```\s*'
    for message in messages:
        if message.get('role') == 'user' and 'content' in message:
            message['content'] = re.sub(pattern, '', message['content'], flags=re.DOTALL)
    return messages