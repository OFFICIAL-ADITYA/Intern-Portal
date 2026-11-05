import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "document.pdf")
TXT_PATH = os.path.join(BASE_DIR, "document.txt")
INDEX_SAVE_DIR = os.path.join(BASE_DIR, "faiss_index")


def create_faiss_index():
    if os.path.exists(PDF_PATH):
        doc_path = PDF_PATH
        print(f"Loading PDF document: {doc_path}...")
        loader = PyPDFLoader(doc_path)
    elif os.path.exists(TXT_PATH):
        doc_path = TXT_PATH
        print(f"Loading Text document: {doc_path}...")
        loader = TextLoader(doc_path, encoding="utf-8")
    else:
        raise FileNotFoundError(
            f"Neither document.pdf nor document.txt found in {BASE_DIR}"
        )

    docs = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800, chunk_overlap=150
    )
    chunks = text_splitter.split_documents(docs)
    print(f"Total Chunks Created: {len(chunks)}")

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vector_store = FAISS.from_documents(chunks, embeddings)
    vector_store.save_local(INDEX_SAVE_DIR)
    print(f"FAISS Index successfully saved to '{INDEX_SAVE_DIR}/'")
    return vector_store


if __name__ == "__main__":
    create_faiss_index()
