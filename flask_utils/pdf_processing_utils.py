# Add these utility functions
import io
import os
import traceback
import zlib
import uuid
import base64
from flask import app
import nltk
import sqlite3
import threading
import queue
from contextlib import contextmanager
from unstructured.partition.auto import partition
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import Chroma
from langchain.storage import InMemoryStore
from langchain_core.documents import Document
from langchain.retrievers.multi_vector import MultiVectorRetriever
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.messages import HumanMessage
import logging

background_logger = logging.getLogger('document_processing')
background_logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
background_logger.addHandler(handler)


def compress_content(content):
    """Compress text content using zlib."""
    if content is None:
        return None
    if isinstance(content, str):
        content = content.encode('utf-8')
    return zlib.compress(content)

def decompress_content(compressed_content):
    """Decompress zlib compressed content."""
    if compressed_content is None:
        return None
    decompressed = zlib.decompress(compressed_content)
    return decompressed.decode('utf-8')

def get_model(model_name):
    """Get the appropriate LLM model."""
    if model_name.startswith("gpt"):
        return ChatOpenAI(model=model_name)
    return ChatGroq(model=model_name)


def process_document_file(connection_pool, file_id, user_id, model_name="meta-llama/llama-4-maverick-17b-128e-instruct", verbose=False):
    """Process a document file and store chunks in the database."""
    process_id = str(uuid.uuid4())
    
    # Start background thread for processing with the added parameters
    thread = threading.Thread(
        target=_process_document_background,
        args=(connection_pool, process_id, file_id, user_id, model_name, verbose)
    )
    thread.daemon = True
    thread.start()
    
    return process_id


def _process_document_background(connection_pool, process_id, file_id, user_id, model_name, verbose=False):
    """
    Background worker for document processing with improved image handling and verbose output.
    
    This function handles the complete document processing pipeline:
    1. Extract content from documents (text, tables, images)
    2. Summarize each content piece
    3. Store processed content in the database
    4. Generate a final document summary with explicit image information
    5. Track and save verbose output if enabled
    
    Args:
        connection_pool: Database connection pool
        process_id: Unique identifier for this processing task
        file_id: ID of the file to process
        user_id: ID of the user who owns the file
        model_name: Name of the LLM model to use for processing
        verbose: Whether to collect and save verbose output
    """
    # Create buffer for verbose output if enabled
    verbose_output_buffer = io.StringIO() if verbose else None
    
    try:
        with connection_pool.get_connection() as conn:
            c = conn.cursor()
            
            # Set status to processing
            c.execute("""
                INSERT INTO document_processing (process_id, file_id, status, message)
                VALUES (?, ?, 'processing', 'Starting document processing')
            """, (process_id, file_id))
            conn.commit()
            
            # Get file information
            c.execute("""
                SELECT f.filename, f.file_type, f.unique_key
                FROM user_files f
                WHERE f.file_id = ? AND f.user_id = ?
            """, (file_id, user_id))
            
            file_info = c.fetchone()
            if not file_info:
                c.execute("""
                    UPDATE document_processing SET status = 'failed', message = 'File not found'
                    WHERE process_id = ?
                """, (process_id,))
                conn.commit()
                return
                
            filename, file_type, unique_key = file_info
            
            # Get file content for unstructured files
            if file_type in ['pdf', 'docx', 'doc', 'txt']:
                c.execute("""
                    SELECT file_path,content FROM unstructured_file_storage
                    WHERE file_id = ? AND unique_key = ?
                """, (file_id, unique_key))
                
                content_result = c.fetchone()
                if not content_result:
                    c.execute("""
                        UPDATE document_processing SET status = 'failed', message = 'File content not found'
                        WHERE process_id = ?
                    """, (process_id,))
                    conn.commit()
                    return
                if content_result:
                    app.logger.info("Content from pdf file: \n",content)
                    file_path,content = content_result

                else:
                    content = " "
                # Save content to temporary file
                # temp_dir = os.path.join('static', 'temp')
                # os.makedirs(temp_dir, exist_ok=True)
                # temp_file_path = os.path.join(temp_dir, f"{unique_key}.{file_type}")
                
                # with open(temp_file_path, 'wb') as temp_file:
                #     temp_file.write(content if isinstance(content, bytes) else content.encode('utf-8'))
                
                # Update status
                c.execute("""
                    UPDATE document_processing 
                    SET progress = 0.1, message = 'Partitioning document'
                    WHERE process_id = ?
                """, (process_id,))
                conn.commit()
                
                # Create temporary directory for images
                image_dir = os.path.join('static', 'document_images', unique_key)
                os.makedirs(image_dir, exist_ok=True)
                
                # Process the document using partition with better image handling
                if not (file_path or os.path.exists(file_path)):
                    c.execute("""
                        UPDATE document_processing SET status = 'failed', message = 'File not found'
                        WHERE process_id = ?
                    """, (process_id,))
                    conn.commit()
                    return
                    
                try:
                    chunks = partition(
                        filename=file_path,
                        infer_table_structure=True,
                        strategy="hi_res",
                        extract_image_block_types=["Image"],
                        image_output_dir_path=image_dir,
                        extract_image_block_to_payload=True,
                        chunking_strategy="by_title",
                        max_characters=10000,
                        combine_text_under_n_chars=2000,
                        new_after_n_chars=6000,
                    )
                    
                    # Save basic info in verbose mode
                    if verbose and verbose_output_buffer:
                        verbose_output_buffer.write(f"[INFO] Chunk types: {set([str(type(el)) for el in chunks])}\n\n")
                        verbose_output_buffer.write(f"[INFO] Total chunks: {len(chunks)}\n\n")
                        if len(chunks) > 1:
                            verbose_output_buffer.write(f"[INFO] Sample chunk: {chunks[1]}\n\n")
                        
                        # Update verbose output in database
                        c.execute("""
                            UPDATE document_processing 
                            SET verbose_output = ?
                            WHERE process_id = ?
                        """, (verbose_output_buffer.getvalue(), process_id))
                        conn.commit()
                        
                except Exception as e:
                    background_logger.error(f"Error partitioning document: {str(e)}")
                    c.execute("""
                        UPDATE document_processing SET status = 'failed', message = ?
                        WHERE process_id = ?
                    """, (f"Error partitioning document: {str(e)}", process_id))
                    conn.commit()
                    return
                
                # Update status
                c.execute("""
                    UPDATE document_processing 
                    SET progress = 0.3, message = 'Extracting content'
                    WHERE process_id = ?
                """, (process_id,))
                conn.commit()
                
                # Separate text, tables, and images with better handling
                texts, tables, images = [], [], []
                
                for chunk in chunks:
                    if "CompositeElement" in str(type(chunk)):
                        texts.append(chunk)
                        for el in chunk.metadata.orig_elements:
                            if "Table" in str(type(el)):
                                tables.append(el)
                            elif "Image" in str(type(el)):
                                # Make sure to capture the image
                                if hasattr(el.metadata, 'image_base64') and el.metadata.image_base64:
                                    images.append(el.metadata.image_base64)
                
                # Log extraction info in verbose mode                    
                if verbose and verbose_output_buffer:
                    verbose_output_buffer.write(f"[INFO] Total text chunks: {len(texts)}\n")
                    verbose_output_buffer.write(f"[INFO] Total tables: {len(tables)}\n")
                    verbose_output_buffer.write(f"[INFO] Total images: {len(images)}\n\n")
                    
                    if images:
                        verbose_output_buffer.write("[INFO] Sample image metadata:\n")
                        verbose_output_buffer.write("<IPython.core.display.Image object>\n\n")
                    
                    # Update verbose output in database
                    c.execute("""
                        UPDATE document_processing 
                        SET verbose_output = ?
                        WHERE process_id = ?
                    """, (verbose_output_buffer.getvalue(), process_id))
                    conn.commit()
                
                # Update status
                c.execute("""
                    UPDATE document_processing 
                    SET progress = 0.5, message = 'Summarizing content'
                    WHERE process_id = ?
                """, (process_id,))
                conn.commit()
                
                # Prepare for summarization
                prompt_text = """
                You are an assistant tasked with summarizing tables and text.
                Give a concise summary of the table or text.

                Respond only with the summary, no additional comment.
                Do not start your message by saying \"Here is a summary\" or anything like that.
                Just give the summary as it is.

                Table or text chunk: {element}
                """
                prompt = ChatPromptTemplate.from_template(prompt_text)
                model = get_model(model_name)
                summarize_chain = {"element": lambda x: x} | prompt | model | StrOutputParser()

                # Summarize text chunks in batches
                batch_size = 5
                text_summaries = []
                
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i+batch_size]
                    batch_summaries = summarize_chain.batch(batch, {"max_concurrency": 3})
                    text_summaries.extend(batch_summaries)
                    
                    # Update progress
                    progress = 0.5 + (0.2 * (i + len(batch)) / max(len(texts), 1))
                    c.execute("""
                        UPDATE document_processing 
                        SET progress = ?, message = 'Summarizing text'
                        WHERE process_id = ?
                    """, (progress, process_id))
                    conn.commit()
                
                # Log text summaries in verbose mode
                if verbose and verbose_output_buffer and text_summaries:
                    verbose_output_buffer.write("[TEXT SUMMARIES]\n ")
                    verbose_output_buffer.write(f"{text_summaries}\n\n")
                    
                    # Update verbose output in database
                    c.execute("""
                        UPDATE document_processing 
                        SET verbose_output = ?
                        WHERE process_id = ?
                    """, (verbose_output_buffer.getvalue(), process_id))
                    conn.commit()
                
                # Summarize table chunks
                tables_html = [table.metadata.text_as_html for table in tables]
                table_summaries = []
                
                for i in range(0, len(tables_html), batch_size):
                    batch = tables_html[i:i+batch_size]
                    if batch:  # Only process if there's something in the batch
                        batch_summaries = summarize_chain.batch(batch, {"max_concurrency": 3})
                        table_summaries.extend(batch_summaries)
                
                # Log table summaries in verbose mode
                if verbose and verbose_output_buffer:
                    verbose_output_buffer.write("[TABLE SUMMARIES]\n ")
                    verbose_output_buffer.write(f"{table_summaries}\n\n")
                    
                    # Update verbose output in database
                    c.execute("""
                        UPDATE document_processing 
                        SET verbose_output = ?
                        WHERE process_id = ?
                    """, (verbose_output_buffer.getvalue(), process_id))
                    conn.commit()
                
                # Process images with improved handling
                image_summaries = []
                if images:
                    image_prompt_template = """
                    You are an assistant tasked with describing document images in detail.
                    Describe the layout, figures, graphs, diagrams, or any other visible content.
                    Be clear, accurate, and objective.
                    """
                    
                    image_messages = [
                        (
                            "user",
                            [
                                {"type": "text", "text": image_prompt_template},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": "data:image/jpeg;base64,{image}"},
                                },
                            ],
                        )
                    ]
                    
                    image_prompt = ChatPromptTemplate.from_messages(image_messages)
                    image_chain = image_prompt | get_model(model_name) | StrOutputParser()
                    
                    # Process images in smaller batches
                    for i in range(0, len(images), batch_size):
                        batch = images[i:i+batch_size]
                        if batch:  # Only process if there's something in the batch
                            try:
                                batch_summaries = image_chain.batch(batch)
                                image_summaries.extend(batch_summaries)
                            except Exception as img_err:
                                background_logger.error(f"Error summarizing image batch: {str(img_err)}")
                                # Add placeholder summaries if error occurs
                                image_summaries.extend(["Image content (summary failed)"] * len(batch))
                            
                            # Update progress
                            progress = 0.7 + (0.2 * (i + len(batch)) / max(len(images), 1))
                            c.execute("""
                                UPDATE document_processing 
                                SET progress = ?, message = 'Summarizing images'
                                WHERE process_id = ?
                            """, (progress, process_id))
                            conn.commit()
                
                # Log image summaries in verbose mode
                if verbose and verbose_output_buffer and image_summaries:
                    verbose_output_buffer.write("[IMAGE SUMMARIES]\n ")
                    verbose_output_buffer.write(f"{image_summaries}\n\n")
                    
                    # Update verbose output in database
                    c.execute("""
                        UPDATE document_processing 
                        SET verbose_output = ?
                        WHERE process_id = ?
                    """, (verbose_output_buffer.getvalue(), process_id))
                    conn.commit()
                
                # Update status
                c.execute("""
                    UPDATE document_processing 
                    SET progress = 0.9, message = 'Storing processed content'
                    WHERE process_id = ?
                """, (process_id,))
                conn.commit()
                
                # Store text chunks and summaries in batches
                chunk_batch = []
                for i, (text_chunk, summary) in enumerate(zip(texts, text_summaries)):
                    doc_id = str(uuid.uuid4())
                    content = text_chunk.text
                    compressed_content = compress_content(content)
                    
                    chunk_batch.append((
                        str(uuid.uuid4()),  # chunk_id
                        file_id,
                        doc_id,
                        'text',
                        None,  # content (stored compressed)
                        compressed_content,
                        None,  # embedding
                        summary
                    ))
                    
                    # Insert in batches
                    if len(chunk_batch) >= 50 or i == len(texts) - 1:
                        c.executemany("""
                            INSERT INTO document_chunks 
                            (chunk_id, file_id, doc_id, chunk_type, content, content_compressed, embedding, summary)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, chunk_batch)
                        conn.commit()
                        chunk_batch = []
                
                # Store table chunks and summaries
                chunk_batch = []
                for i, (table_chunk, summary) in enumerate(zip(tables, table_summaries)):
                    doc_id = str(uuid.uuid4())
                    content = table_chunk.metadata.text_as_html
                    compressed_content = compress_content(content)
                    
                    chunk_batch.append((
                        str(uuid.uuid4()),  # chunk_id
                        file_id,
                        doc_id,
                        'table',
                        None,  # content (stored compressed)
                        compressed_content,
                        None,  # embedding
                        summary
                    ))
                    
                    # Insert in batches
                    if len(chunk_batch) >= 50 or i == len(tables) - 1:
                        c.executemany("""
                            INSERT INTO document_chunks 
                            (chunk_id, file_id, doc_id, chunk_type, content, content_compressed, embedding, summary)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, chunk_batch)
                        conn.commit()
                        chunk_batch = []
                
                # Store image chunks and summaries with better handling
                image_batch = []
                for i, (image_data, summary) in enumerate(zip(images, image_summaries)):
                    image_id = str(uuid.uuid4())
                    doc_id = str(uuid.uuid4())
                    
                    # Convert base64 to binary
                    try:
                        binary_data = base64.b64decode(image_data)
                    except Exception as img_err:
                        background_logger.error(f"Error decoding image: {str(img_err)}")
                        continue
                    
                    if binary_data:
                        image_batch.append((
                            image_id,
                            file_id,
                            doc_id,
                            binary_data,
                            summary
                        ))
                    
                    # Insert in batches
                    if len(image_batch) >= 20 or i == len(images) - 1:
                        c.executemany("""
                            INSERT INTO document_images 
                            (image_id, file_id, doc_id, image_data, summary)
                            VALUES (?, ?, ?, ?, ?)
                        """, image_batch)
                        conn.commit()
                        image_batch = []
                
                # Generate final document summary
                try:
                    # Create the document summaries table if it doesn't exist
                    c.execute('''
                        CREATE TABLE IF NOT EXISTS document_summaries (
                            summary_id TEXT PRIMARY KEY,
                            file_id INTEGER,
                            process_id TEXT,
                            summary TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (file_id) REFERENCES user_files(file_id) ON DELETE CASCADE,
                            FOREIGN KEY (process_id) REFERENCES document_processing(process_id)
                        )
                    ''')
                    conn.commit()
                    
                    # Gather all summaries for context
                    all_text_summaries = text_summaries[:10] if len(text_summaries) > 10 else text_summaries
                    all_table_summaries = table_summaries[:5] if len(table_summaries) > 5 else table_summaries
                    all_image_summaries = image_summaries[:5] if len(image_summaries) > 5 else image_summaries
                    
                    # Create a context that explicitly mentions images
                    text_context = "\n\n".join(all_text_summaries)
                    table_context = "\n\n".join(all_table_summaries)
                    image_context = "\n\n".join(all_image_summaries)
                    
                    # Create the final summary prompt with explicit image information
                    final_prompt = f"""
                    You are an assistant tasked with summarizing document contents.
                    Based on the following context extracted from a document, provide a comprehensive 
                    but concise summary of the key information, points, and findings.
                    
                    Document contains {len(texts)} text chunks, {len(tables)} tables, and {len(images)} images.
                    
                    Text Content:
                    {text_context}
                    
                    """
                    
                    if tables and table_context:
                        final_prompt += f"""
                        Table Content:
                        {table_context}
                        
                        """
                        
                    if images and image_context:
                        final_prompt += f"""
                        Image Descriptions ({len(images)} images found):
                        {image_context}
                        
                        """
                    
                    final_prompt += """
                    Format your response with a [FINAL ANSWER] tag as follows:
                    
                    [FINAL ANSWER]
                    Your detailed summary of the document's content including description of any images, tables and key information found...
                    """
                    
                    # Generate the final summary
                    final_model = get_model(model_name)
                    final_prompt_template = ChatPromptTemplate.from_template(final_prompt)
                    final_chain = final_prompt_template | final_model | StrOutputParser()
                    
                    final_summary = final_chain.invoke({})
                    
                    # Ensure it has the [FINAL ANSWER] tag
                    if "[FINAL ANSWER]" not in final_summary:
                        final_summary = f"[FINAL ANSWER]\n{final_summary}"
                    
                    # Store the final summary
                    c.execute("""
                        INSERT INTO document_summaries (
                            summary_id, file_id, process_id, summary
                        ) VALUES (?, ?, ?, ?)
                    """, (str(uuid.uuid4()), file_id, process_id, final_summary))
                    
                    conn.commit()
                    
                except Exception as summary_error:
                    background_logger.error(f"Error generating final summary: {str(summary_error)}")
                    background_logger.error(traceback.format_exc())
                    # Continue processing - summary is optional
                
                # Update status to completed
                c.execute("""
                    UPDATE document_processing 
                    SET status = 'completed', progress = 1.0, 
                        message = 'Document processing completed',
                        completed_at = CURRENT_TIMESTAMP
                    WHERE process_id = ?
                """, (process_id,))
                conn.commit()
                
                # Cleanup temporary files
                try:
                    os.remove(temp_file_path)
                except:
                    pass
            
            else:
                # Unsupported file type
                c.execute("""
                    UPDATE document_processing 
                    SET status = 'failed', message = 'Unsupported file type for document processing'
                    WHERE process_id = ?
                """, (process_id,))
                conn.commit()
                
    except Exception as e:
        background_logger.error(f"Error in document processing: {str(e)}")
        background_logger.error(traceback.format_exc())
        
        # Update status to failed - use a new connection
        try:
            with connection_pool.get_connection() as conn:
                c = conn.cursor()
                c.execute("""
                    UPDATE document_processing 
                    SET status = 'failed', message = ?
                    WHERE process_id = ?
                """, (str(e), process_id))
                conn.commit()
        except Exception as update_error:
            background_logger.error(f"Failed to update processing status: {str(update_error)}")
            
    finally:
        # Close verbose output buffer if it exists
        if verbose_output_buffer:
            verbose_output_buffer.close()

            
def initialize_nltk():
    """Initialize NLTK resources needed for document processing."""
    nltk_dir = os.path.join('static', 'nltk_data')
    os.makedirs(nltk_dir, exist_ok=True)
    
    # Set NLTK data path
    nltk.data.path.append(nltk_dir)
    
    # Download required resources
    try:
        nltk.download('punkt', download_dir=nltk_dir, quiet=True)
        nltk.download('averaged_perceptron_tagger', download_dir=nltk_dir, quiet=True)
        background_logger.info("NLTK resources initialized successfully")
    except Exception as e:
        background_logger.warning(f"Error initializing NLTK resources: {str(e)}")

# Add this function for smarter document querying with embeddings
def create_document_embeddings(connection_pool,file_id):
    """Create and store embeddings for document chunks."""
    try:
        # Initialize OpenAI embeddings
        embeddings = OpenAIEmbeddings()
        
        with connection_pool.get_connection() as conn:
            c = conn.cursor()
            
            # Get chunks without embeddings
            c.execute("""
                SELECT chunk_id, summary 
                FROM document_chunks
                WHERE file_id = ? AND embedding IS NULL
                LIMIT 50
            """, (file_id,))
            
            chunks = c.fetchall()
            
            if not chunks:
                return 0
                
            # Create batch for processing
            texts = [chunk[1] for chunk in chunks]
            chunk_ids = [chunk[0] for chunk in chunks]
            
            # Generate embeddings in batches
            batch_embeddings = embeddings.embed_documents(texts)
            
            # Store embeddings
            for i, chunk_id in enumerate(chunk_ids):
                embedding_bytes = compress_content(str(batch_embeddings[i]))
                
                c.execute("""
                    UPDATE document_chunks
                    SET embedding = ?
                    WHERE chunk_id = ?
                """, (embedding_bytes, chunk_id))
            
            conn.commit()
            return len(chunks)
            
    except Exception as e:
        app.logger.error(f"Error creating document embeddings: {str(e)}")
        return 0