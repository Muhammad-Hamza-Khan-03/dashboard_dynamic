import os
import time
from groq import Groq
import tiktoken

try:
    from . import output_manager
except ImportError:
    import output_manager

output_manager = output_manager.OutputManager()

def init():
    """Initialize Groq client with API key."""
    API_KEY = os.environ.get('GROQ_API_KEY')
    if not API_KEY:
        output_manager.print_wrapper("Warning: GROQ_API_KEY environment variable not found.")
        return None
    
    client = Groq()
    client.api_key = API_KEY
    return client

def llm_call(messages: str, model: str, temperature: str, max_tokens: str):  
    """Make a non-streaming call to Groq API."""
    client = init()
    if client is None:
        raise EnvironmentError("Failed to initialize Groq client")

    try:
        start_time = time.time()
        response = client.chat.completions.create(
            model=model, 
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        end_time = time.time()
        elapsed_time = end_time - start_time

        if not response or not response.choices:
            raise ValueError("Empty response from Groq API")

        content = response.choices[0].message.content.strip()
        prompt_tokens = response.usage.prompt_tokens
        completion_tokens = response.usage.completion_tokens
        total_tokens = response.usage.total_tokens
        tokens_per_second = completion_tokens / elapsed_time if elapsed_time > 0 else 0

        return (
            content, messages, prompt_tokens, 
            completion_tokens, total_tokens, 
            elapsed_time, tokens_per_second
        )
        
    except Exception as e:
        output_manager.print_wrapper(f"Error during Groq API call: {str(e)}")
        raise

def llm_stream(log_and_call_manager, chain_id: str, messages: str, model: str, 
               temperature: str, max_tokens: str, tools: str = None):  
    """Make a streaming call to Groq API."""
    collected_chunks = []
    collected_messages = []
    full_reply_content = ""

    client = init()
    if client is None:
        raise EnvironmentError("Failed to initialize Groq client")

    try:
        # Start streaming request
        start_time = time.time()
        stream = client.chat.completions.create(
            model=model, 
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        # Process stream
        for chunk in stream:
            if not chunk or not chunk.choices:
                continue
                
            collected_chunks.append(chunk)
            choice = chunk.choices[0]
            
            # Handle delta content
            if hasattr(choice, 'delta') and hasattr(choice.delta, 'content'):
                content = choice.delta.content
                if content:
                    collected_messages.append(content)
                    output_manager.print_wrapper(content, end='', flush=True)

        end_time = time.time()
        elapsed_time = end_time - start_time
        output_manager.print_wrapper("")

        # Combine collected messages
        full_reply_content = ''.join(collected_messages)

        # Token counting
        completion_tokens_used = len(collected_chunks)
        encoding = tiktoken.encoding_for_model("gpt-4")
        
        # Count prompt tokens
        prompt_tokens_used = 3  # Base tokens
        for message in messages:
            prompt_tokens_used += 3  # Per message
            for key, value in message.items():
                if isinstance(value, str):
                    prompt_tokens_used += len(encoding.encode(value))
                if key == "name":
                    prompt_tokens_used += 1

        # Calculate totals
        total_tokens_used = prompt_tokens_used + completion_tokens_used
        tokens_per_second = (completion_tokens_used / elapsed_time) if elapsed_time > 0 else 0

        return (
            full_reply_content, messages, prompt_tokens_used,
            completion_tokens_used, total_tokens_used,
            elapsed_time, tokens_per_second
        )
        
    except Exception as e:
        output_manager.print_wrapper(f"Error during Groq API call: {str(e)}")
        raise