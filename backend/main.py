
import os
from typing import Annotated, Literal
from fastapi import FastAPI, HTTPException, Request
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel, Field, StringConstraints
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from backend/.env")

client = genai.Client(api_key=api_key)

app = FastAPI(title="AI Engineer Portfolio API")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)

# Allow requests from your local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Portfolio AI backend is running!"}


@app.get("/api/about")
def about():
    return {
        "role": "Aspiring AI Engineer",
        "degree": "BS Computer Science",
        "university": "SZABIST Islamabad",
        "interests": [
            "Machine Learning",
            "AI Applications",
            "AI Engineering"
        ]
    }


# Validate chat history
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=1000
        )
    ]


# Validate incoming chat requests
class ChatRequest(BaseModel):
    message: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=1000
        )
    ]
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=20
    )


@app.post("/api/chat")
@limiter.limit("10/minute")
def chat(request: Request, body: ChatRequest):
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[
                """
                You are the portfolio assistant for a Computer Science student
                pursuing AI Engineering.

                Use only these verified facts about the portfolio owner:
                - E-Commerce Sales Analytics: Sample Superstore analysis using
                  Python, Pandas, NumPy, Matplotlib, and Jupyter Notebook.
                - Matplotlib Sales Dashboard: Python and Matplotlib visualization.
                - AI Engineer Portfolio: HTML, CSS, JavaScript, FastAPI, and Gemini.

                The owner is learning Python, NumPy, Pandas, Matplotlib, statistics,
                introductory machine learning, HTML, CSS, JavaScript, FastAPI,
                and Gemini API integration.

                Never invent projects, experience, or qualifications.
                If you do not know a fact, say so.
                Keep answers friendly, concise, and professional.
                """,
                *[
                    f"{'Visitor' if item.role == 'user' else 'Assistant'}: {item.text}"
                    for item in body.history[-10:]
                ],
                f"Visitor: {body.message}",
            ],
        )

        return {"reply": response.text}

    except Exception as error:
        print("Gemini API error:", error)
    raise HTTPException(
        status_code=502,
        detail="The AI service is temporarily unavailable. Please try again."
    )