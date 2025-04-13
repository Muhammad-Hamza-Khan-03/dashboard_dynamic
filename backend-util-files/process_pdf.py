import os
import uuid
import base64
import nltk
from IPython.display import display, Markdown # type: ignore
from dotenv import load_dotenv
# Change this import to use the generic partition function
from unstructured.partition.auto import partition
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.storage import InMemoryStore
from langchain_core.documents import Document
from langchain.retrievers.multi_vector import MultiVectorRetriever
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.messages import HumanMessage

# Load environment variables
load_dotenv()

os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")
os.environ["LANGCHAIN_TRACING_V2"] = "true"

# NLTK resources
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')

def get_model(model_name):
    if model_name.startswith("gpt"):
        return ChatOpenAI(model=model_name)
    return ChatGroq(model=model_name)

def display_base64_image(base64_code):
    from IPython.display import Image, display # type: ignore
    image_data = base64.b64decode(base64_code)
    display(Image(data=image_data))

# Rename function to process_document for generality
def process_document(file_path, model_name, verbose=False):
    output_path = "./content/images"
    os.makedirs(output_path, exist_ok=True)

    # Use partition instead of partition_pdf
    chunks = partition(
        filename=file_path,
        infer_table_structure=True,
        strategy="hi_res",
        extract_image_block_types=["Image"],
        image_output_dir_path=output_path,
        extract_image_block_to_payload=True,
        chunking_strategy="by_title",
        max_characters=10000,
        combine_text_under_n_chars=2000,
        new_after_n_chars=6000,
    )

    if verbose:
        print("\n[INFO] Chunk types:", set([str(type(el)) for el in chunks]))
        print("[INFO] Total chunks:", len(chunks))
        if len(chunks) > 1:
            print("\n[INFO] Sample chunk:", chunks[1])

    texts, tables, images = [], [], []

    for chunk in chunks:
        if "CompositeElement" in str(type(chunk)):
            texts.append(chunk)
            for el in chunk.metadata.orig_elements:
                if "Table" in str(type(el)):
                    tables.append(el)
                    if verbose:
                        print("\n[TABLE FOUND]\n", el.metadata.text_as_html)
                elif "Image" in str(type(el)):
                    images.append(el.metadata.image_base64)

    if verbose:
        print("\n[INFO] Total text chunks:", len(texts))
        print("[INFO] Total tables:", len(tables))
        print("[INFO] Total images:", len(images))
        if images:
            print("\n[INFO] Sample image metadata:")
            display_base64_image(images[0])

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

    text_summaries = summarize_chain.batch(texts, {"max_concurrency": 3})
    tables_html = [table.metadata.text_as_html for table in tables]
    table_summaries = summarize_chain.batch(tables_html, {"max_concurrency": 3})

    if verbose:
        print("\n[TEXT SUMMARIES]\n", text_summaries)
        print("\n[TABLE SUMMARIES]\n", table_summaries)

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
    image_chain = image_prompt | get_model("gpt-4o-mini") | StrOutputParser()
    image_summaries = image_chain.batch(images) if images else []

    if verbose:
        print("\n[IMAGE SUMMARIES]\n", image_summaries)

    vectorstore = Chroma(collection_name="multi_modal_rag", embedding_function=OpenAIEmbeddings())
    store = InMemoryStore()
    id_key = "doc_id"
    retriever = MultiVectorRetriever(vectorstore=vectorstore, docstore=store, id_key=id_key)

    def store_chunks(summaries, elements):
        ids = [str(uuid.uuid4()) for _ in summaries]
        docs = [Document(page_content=summaries[i], metadata={id_key: ids[i]}) for i in range(len(summaries))]
        retriever.vectorstore.add_documents(docs)
        retriever.docstore.mset(list(zip(ids, elements)))

    store_chunks(text_summaries, texts)
    store_chunks(table_summaries, tables)
    if image_summaries:
        store_chunks(image_summaries, images)

    def parse_docs(docs):
        b64, text = [], []
        for doc in docs:
            try:
                base64.b64decode(doc)
                b64.append(doc)
            except:
                text.append(doc)
        return {"images": b64, "texts": text}

    def build_prompt(kwargs):
        docs_by_type = kwargs["context"]
        user_question = kwargs["question"]
        context_text = "".join([text.text for text in docs_by_type["texts"]])
        prompt_content = [{"type": "text", "text": f"""
        Answer the question based only on the following context, which can include text, tables, and the below image.
        Context: {context_text}
        Question: {user_question}
        """}]

        for image in docs_by_type["images"]:
            prompt_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image}"},
            })

        return ChatPromptTemplate.from_messages([HumanMessage(content=prompt_content)])

    qa_chain = (
        {"context": retriever | RunnableLambda(parse_docs), "question": RunnablePassthrough()}
        | RunnableLambda(build_prompt)
        | get_model(model_name)
        | StrOutputParser()
    )

    final_question = "List all the weeks and the tasks mentioned in the document."
    response = qa_chain.invoke(final_question)
    print("\n\n[FINAL ANSWER]\n", response)

    if verbose:
        chunks = retriever.invoke("Summarize the entire document contents.")
        for i, chunk in enumerate(chunks):
            print(f"\n--- Chunk {i} ---\n", str(chunk))

if __name__ == "__main__":
    import argparse

    # Update parser description to reflect supported file types
    parser = argparse.ArgumentParser(description="Process a document (PDF, DOCX, PPTX, TXT) with a model.")
    # Update help message for the file argument
    parser.add_argument("--file", required=True, help="Path to the document file (PDF, DOCX, PPTX, TXT)")
    parser.add_argument("--model", required=True, help="Model name to use (e.g., gpt-4o-mini or deepseek-r1-distill-llama-70b)")
    parser.add_argument("--verbose", action="store_true", help="Show all intermediate outputs")
    args = parser.parse_args()

    process_document(args.file, args.model, args.verbose)