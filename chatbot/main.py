from __future__ import annotations

import os
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from chatbot.api import router


def _parse_cors_origins(raw: str | None) -> list[str]:
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://cinema-star-ten.vercel.app"
    ]
    if not raw:
        return default_origins

    origins = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
    return origins or default_origins

app = FastAPI(
    title="Chatbot Agent Service",
    description="Agent service: select API → build call body → answer.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(os.getenv("CHATBOT_CORS_ORIGINS")),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


def main() -> None:
    import uvicorn

    host = os.getenv("CHATBOT_HOST", "0.0.0.0")
    port = int(os.getenv("CHATBOT_PORT", "8000"))

    # Một process duy nhất — Ctrl+C rồi chạy lại sau khi sửa code.
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
