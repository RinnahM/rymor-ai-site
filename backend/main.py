"""
FastAPI backend for the Rymor AI site (index.html).

Two responsibilities:
  1. POST /contact — validates the contact form and emails it to your inbox
                      via the Brevo transactional email API (HTTPS — works
                      on hosts like Render's free tier that block raw SMTP).
  2. POST /chat     — proxies the floating chat widget's messages to the
                       Gemini API using the persona prompt sent from the frontend.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Required environment variables (put these in a `.env` file, see .env.example):
    BREVO_API_KEY, SENDER_EMAIL, BUSINESS_EMAIL
    GEMINI_API_KEY
    ALLOWED_ORIGINS   (comma-separated list, e.g. http://localhost:5500,https://rymorai.com)
"""

import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# ── Config ──────────────────────────────────────────────────────────────
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL")  # must be a verified sender in Brevo
BUSINESS_EMAIL = os.environ.get("BUSINESS_EMAIL", "mayorrinnah09@gmail.com")

# Free tier (no billing required) — see https://ai.google.dev/gemini-api/docs/pricing
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500"
).split(",")

app = FastAPI(title="Rymor AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


# ── Schemas ─────────────────────────────────────────────────────────────
class ContactForm(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    company: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=1, max_length=5000)


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    persona: str  # CHAT_PERSONA_PROMPT from index.html
    messages: list[ChatTurn]


class ChatResponse(BaseModel):
    reply: str


# ── Routes ──────────────────────────────────────────────────────────────
@app.post("/contact")
async def submit_contact_form(form: ContactForm):
    """Receives the contact form and forwards it to BUSINESS_EMAIL via Brevo."""
    if not (BREVO_API_KEY and SENDER_EMAIL and BUSINESS_EMAIL):
        raise HTTPException(
            status_code=500,
            detail="Email is not configured on the server yet.",
        )

    body_lines = [
        f"Name: {form.name}",
        f"Email: {form.email}",
        f"Company: {form.company or '—'}",
        "",
        "What they want automated:",
        form.message,
    ]

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": BREVO_API_KEY,
                "content-type": "application/json",
                "accept": "application/json",
            },
            json={
                "sender": {"name": "Rymor AI Site", "email": SENDER_EMAIL},
                "to": [{"email": BUSINESS_EMAIL}],
                "replyTo": {"email": form.email, "name": form.name},
                "subject": f"New inquiry from {form.name} (Rymor AI site)",
                "textContent": "\n".join(body_lines),
            },
        )

    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail="Could not send the message right now.")

    return {"status": "sent"}


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """
    Proxies the widget's conversation to the Gemini API, using the persona
    prompt the frontend sent as the system instruction. Keeping the API key
    here (server-side) instead of in the frontend is what makes this safe
    to ship.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Chat is not configured on the server yet.")

    # Gemini uses "model" for the assistant's turns instead of "assistant".
    contents = [
        {
            "role": "model" if turn.role == "assistant" else "user",
            "parts": [{"text": turn.content}],
        }
        for turn in payload.messages
    ]

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
            params={"key": GEMINI_API_KEY},
            json={
                "systemInstruction": {"parts": [{"text": payload.persona}]},
                "contents": contents,
                "generationConfig": {"maxOutputTokens": 300},
            },
        )

    if response.status_code != 200:
        # TEMPORARY: surfaces Gemini's actual error while we debug the deploy.
        # Revert to a generic message once /chat is confirmed working.
        raise HTTPException(
            status_code=502,
            detail=f"Chat is temporarily unavailable. Upstream {response.status_code}: {response.text[:300]}",
        )

    data = response.json()
    candidates = data.get("candidates") or []
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    reply_text = "".join(part.get("text", "") for part in parts)
    return ChatResponse(reply=reply_text or "Could you say a bit more about that?")


@app.get("/health")
def health():
    return {"status": "ok"}
