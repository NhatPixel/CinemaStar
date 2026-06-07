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

app = FastAPI(
    title="Chatbot Agent Service",
    description="Agent service: select API → build call body → answer.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
