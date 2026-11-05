import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
import uvicorn
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI(title="UPTOSKILL Support Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INDEX_SAVE_DIR = os.path.join(BASE_DIR, "faiss_index")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

if not os.path.exists(INDEX_SAVE_DIR):
    from ingest import create_faiss_index
    print("FAISS index not found. Building index automatically...")
    create_faiss_index()

vector_store = FAISS.load_local(
    INDEX_SAVE_DIR, embeddings, allow_dangerous_deserialization=True
)

groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
has_valid_groq_key = bool(
    groq_api_key and groq_api_key not in ("insert", "insert your api key here")
)

PRIMARY_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
FALLBACK_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"]


def clean_text(text: str) -> str:
    if not text:
        return ""
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2011": "-",
        "\u00a0": " ",
        "\u202f": " ",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def create_groq_client(model_name: str):
    return ChatGroq(
        model_name=model_name,
        groq_api_key=groq_api_key,
        temperature=0.2,
    )


llm = None
active_model_name = PRIMARY_MODEL
if has_valid_groq_key:
    try:
        llm = create_groq_client(PRIMARY_MODEL)
        print(f"ChatGroq initialized successfully with model: {PRIMARY_MODEL}")
    except Exception as e:
        print(f"Warning: Failed to initialize ChatGroq ({PRIMARY_MODEL}): {e}")
        llm = None
else:
    print("GROQ_API_KEY not configured or placeholder detected. Semantic RAG fallback active.")

SYSTEM_PROMPT = """
You are a helpful, warm, and concise support assistant for the UPTOSKILL Internship Management Portal.
Important response guidelines:
- Keep answers compact, clear, and direct (1 to 3 short paragraphs maximum).
- Remember you are chatting inside a compact floating widget. Do not output massive unprompted tables or overwhelming multi-step guides unless specifically requested by the user.
- For simple greetings ("hi", "hello"), reply in 1-2 friendly sentences asking how you can help.
- When formatting, use clean standard markdown: **bold** key terms, short bullet points, and inline code.
- Certificate verification is performed by scanning the QR code on the certificate or visiting `/verify/:verifyId` on the portal.
- Keep the tone warm, polite, and professional. For issues requiring human intervention, advise emailing support@uptoskill.com.

Context:
{context}
"""

prompt_template = ChatPromptTemplate.from_messages(
    [("system", SYSTEM_PROMPT), ("human", "{question}")]
)


class ChatRequest(BaseModel):
    question: str


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "UPTOSKILL Support Chatbot",
        "groq_enabled": bool(llm is not None),
        "model": active_model_name if llm else None,
        "index_ready": True,
    }


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    global llm, active_model_name
    try:
        query = request.question.strip()
        if not query:
            return {"answer": "Please ask a question so I can assist you."}

        docs = vector_store.similarity_search(query, k=4)
        context = "\n\n".join([doc.page_content for doc in docs])

        formatted_prompt = prompt_template.format_messages(
            context=context, question=query
        )

        if llm:
            models_to_try = [active_model_name] + [
                m for m in FALLBACK_MODELS if m != active_model_name
            ]
            for model_candidate in models_to_try:
                try:
                    current_client = (
                        llm
                        if model_candidate == active_model_name
                        else create_groq_client(model_candidate)
                    )
                    response = current_client.invoke(formatted_prompt)
                    llm = current_client
                    active_model_name = model_candidate
                    return {"answer": clean_text(response.content)}
                except Exception as invoke_err:
                    err_str = str(invoke_err)
                    print(f"Model {model_candidate} error: {err_str}")
                    if (
                        "model_not_found" in err_str
                        or "does not exist" in err_str
                    ):
                        continue
                    else:
                        break

        # Fallback to direct semantic context if Groq fails or is not configured
        if not context.strip():
            return {
                "answer": (
                    "I couldn't find specific information regarding that in the documentation. "
                    "For additional support, please reach out to support@uptoskill.com."
                )
            }

        return {
            "answer": clean_text(
                f"Here is the relevant information from UPTOSKILL Knowledge Base:\n\n"
                f"{context.strip()}"
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
