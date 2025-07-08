import os
import time
import google.generativeai as genai

try:
    # Attempt package-relative import
    from . import output_manager
except ImportError:
    # Fall back to script-style import
    import output_manager

output_manager = output_manager.OutputManager()

def init():
    """Initialize Gemini client with API key."""
    API_KEY = os.environ.get('GEMINI_API_KEY')
    if API_KEY is None:
        output_manager.print_wrapper("Warning: GEMINI_API_KEY environment variable not found.")
        return None
        
    genai.configure(api_key=API_KEY)
    return genai

def convert_openai_to_gemini(messages):
    """Convert OpenAI message format to Gemini format."""
    gemini_messages = []
    system_content = None
    
    for item in messages:
        if item['role'] == 'system':
            system_content = item['content']
            continue
            
        new_item = {}
        if item['role'] == 'assistant':
            new_item['role'] = 'model'
        else:
            new_item['role'] = item['role']
            
        new_item['parts'] = [item['content']]
        gemini_messages.append(new_item)
    
    return gemini_messages, system_content

def llm_call(messages: str, model_name: str, temperature: str, max_tokens: str):  
    """Make a non-streaming call to Gemini API."""
    client = init()
    if client is None:
        raise EnvironmentError("Failed to initialize Gemini client")

    try:
        gemini_messages, system_instruction = convert_openai_to_gemini(messages)
        
        generation_config = {
            "temperature": temperature,
            "top_p": 1,
            "top_k": 1,
            "max_output_tokens": max_tokens,
        }
        
        model = client.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            system_instruction=system_instruction
        )
        
        start_time = time.time()
        response = model.generate_content(gemini_messages)
        end_time = time.time()
        
        elapsed_time = end_time - start_time
        content = response.text.strip()
        
        # Count tokens used
        prompt_tokens = model.count_tokens(str(gemini_messages)).total_tokens
        completion_tokens = model.count_tokens(content).total_tokens
        total_tokens = prompt_tokens + completion_tokens
        tokens_per_second = completion_tokens / elapsed_time if elapsed_time > 0 else 0

        return (
            content, messages, prompt_tokens, 
            completion_tokens, total_tokens, 
            elapsed_time, tokens_per_second
        )
        
    except Exception as e:
        output_manager.print_wrapper(f"Error during Gemini API call: {str(e)}")
        raise

def llm_stream(log_and_call_manager, chain_id: str, messages: str, model_name: str, 
               temperature: str, max_tokens: str, tools: str = None):  
    """Make a streaming call to Gemini API."""
    collected_messages = []
    
    client = init()
    if client is None:
        raise EnvironmentError("Failed to initialize Gemini client")

    try:
        gemini_messages, system_instruction = convert_openai_to_gemini(messages)
        
        generation_config = {
            "temperature": temperature,
            "top_p": 1,
            "top_k": 1,
            "max_output_tokens": max_tokens,
        }
        
        model = client.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            system_instruction=system_instruction
        )
        
        start_time = time.time()
        response = model.generate_content(gemini_messages, stream=True)
        
        for chunk in response:
            if chunk.text:
                chunk_message = chunk.text
                collected_messages.append(chunk_message)
                output_manager.print_wrapper(chunk_message, end='', flush=True)
                
        end_time = time.time()
        elapsed_time = end_time - start_time
        output_manager.print_wrapper("")
        
        full_reply_content = ''.join(collected_messages)
        
        # Count tokens used
        prompt_tokens = model.count_tokens(str(gemini_messages)).total_tokens
        completion_tokens = model.count_tokens(full_reply_content).total_tokens
        total_tokens = prompt_tokens + completion_tokens
        
        tokens_per_second = completion_tokens / elapsed_time if elapsed_time > 0 else 0
        
        return (
            full_reply_content, messages, prompt_tokens, 
            completion_tokens, total_tokens, 
            elapsed_time, tokens_per_second
        )
        
    except Exception as e:
        output_manager.print_wrapper(f"\nError during Gemini API call: {str(e)}")
        raise