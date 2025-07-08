import importlib
import os
import time
import json
import re


def load_llm_config():
    
    default_llm_config = [
    {"agent": "Expert Selector", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Analyst Selector", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Theorist", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "SQL Analyst", "details": {"model": "deepseek-r1-distill-llama-70b", "provider": "groq", "max_tokens": 2000, "temperature": 0}},
    {"agent": "SQL Generator", "details": {"model": "deepseek-r1-distill-llama-70b", "provider": "groq", "max_tokens": 2000, "temperature": 0}},
    {"agent": "SQL Executor", "details": {"model": "deepseek-r1-distill-llama-70b", "provider": "groq", "max_tokens": 2000, "temperature": 0}},
    {"agent": "Dataframe Inspector", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Planner", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Code Generator", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Code Debugger", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Error Corrector", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Code Ranker", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    {"agent": "Solution Summarizer", "details": {"model": "deepseek-r1-distill-llama-70b", "provider":"groq","max_tokens": 4000, "temperature": 0}},
    ]

    # Try to get config from environment variable
    if os.environ.get('LLM_CONFIG'):
        try:
            return json.loads(os.environ.get('LLM_CONFIG'))
        except json.JSONDecodeError:
            return default_llm_config
            
    # Try to load from file
    elif os.path.exists("LLM_CONFIG.json"):
        try:
            with open("LLM_CONFIG.json", 'r') as f:
                return json.load(f)
        except Exception:
            return default_llm_config
            
    # Use default config
    return default_llm_config
def get_agent_details(agent, llm_config):
    """Get model details for a specific agent from config."""
    for item in llm_config:
        if item['agent'] == agent:
            details = item.get('details', {})
            return (
                details.get('model', 'llama-3.1-8b-instant'),  # Default model
                details.get('provider', 'groq'),     # Default provider
                details.get('max_tokens', 200),       # Default max tokens
                details.get('temperature', 0)          # Default temperature
            )
    return 'llama-3.1-8b-instant', 'groq', 200, 0
    # Return defaults if agent not found
    # return 'llama-3.1-8b-instant', 'openai', 2000, 0

def init(agent):
    """Initialize model parameters for an agent."""
    llm_config = load_llm_config()
    return get_agent_details(agent, llm_config)

def get_model_name(agent):
    """Get model name and provider for an agent."""
    model, provider, _, _ = init(agent)
    return model, provider

def try_import(module_name):
    """Import a module, trying package-relative import first."""
    try:
        return importlib.import_module(f'.{module_name}', 'insightai')
    except ImportError:
        return importlib.import_module(module_name)

def llm_call(log_and_call_manager, messages: str, agent: str = None, chain_id: str = None):
    """Make a non-streaming LLM call."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
    model, provider, max_tokens, temperature = init(agent)

    provider_function_map = {
        'groq': 'llm_call',
        'openai': 'llm_call',
        'gemini': 'llm_call',
    }

    if provider not in provider_function_map:
        raise ValueError(f"Unsupported provider: {provider}")

    provider_module = try_import(f'{provider}_models')
    function_name = provider_function_map[provider]
    
    result = getattr(provider_module, function_name)(
        messages, model, temperature, max_tokens
    )
    
    # Unpack results
    (content_received, local_llm_messages, prompt_tokens_used,
     completion_tokens_used, total_tokens_used, elapsed_time,
     tokens_per_second) = result

    if agent == 'SQL Generator':
        # Strip any markdown or explanatory text from SQL
        content_received = re.sub(r'```sql\s*|\s*```', '', content_received)
        content_received = re.sub(r'^.*?--', '--', content_received, flags=re.DOTALL)

    # Log results
    log_and_call_manager.write_to_log(
        agent, chain_id, timestamp, model, local_llm_messages,
        content_received, prompt_tokens_used, completion_tokens_used,
        total_tokens_used, elapsed_time, tokens_per_second
    )

    return content_received

def llm_stream(log_and_call_manager, messages: str, agent: str = None, 
               chain_id: str = None, tools: str = None):
    """Make a streaming LLM call."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
    model, provider, max_tokens, temperature = init(agent)

    provider_function_map = {
        'groq': 'llm_stream',
        'openai': 'llm_stream',
        'gemini': 'llm_stream',
    }

    if provider not in provider_function_map:
        raise ValueError(f"Unsupported provider: {provider}")

    provider_module = try_import(f'{provider}_models')
    function_name = provider_function_map[provider]
    
    result = getattr(provider_module, function_name)(
        log_and_call_manager, chain_id, messages,
        model, temperature, max_tokens, tools
    )
    
    # Unpack results
    (content_received, local_llm_messages, prompt_tokens_used,
     completion_tokens_used, total_tokens_used, elapsed_time,
     tokens_per_second) = result

    # Log results
    log_and_call_manager.write_to_log(
        agent, chain_id, timestamp, model, local_llm_messages,
        content_received, prompt_tokens_used, completion_tokens_used,
        total_tokens_used, elapsed_time, tokens_per_second
    )

    return content_received