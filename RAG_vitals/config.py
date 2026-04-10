# config.py
# ---------
# Central configuration for the Medical RAG system.
# Values are read from environment variables (with sensible defaults).
#
# Recommended: copy .env.example to .env and fill in your API key.
# Then load it at startup with:  from dotenv import load_dotenv; load_dotenv()

import os
from pathlib import Path


# ── API Keys ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# ── File paths ────────────────────────────────────────────────────────────────
BASE_DIR        = Path(__file__).parent
CSV_PATH:   str = os.getenv("MEDQUAD_CSV",    str(BASE_DIR / "medquad.csv"))
CHROMA_DIR: str = os.getenv("CHROMA_DIR",     str(BASE_DIR / "chroma_db"))
LOG_DIR:    str = os.getenv("LOG_DIR",        str(BASE_DIR / "logs"))

# ── Embedding ─────────────────────────────────────────────────────────────────
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
EMBEDDING_DEVICE: str = os.getenv("EMBEDDING_DEVICE", "cpu")  # or "cuda"

# ── Chunking ──────────────────────────────────────────────────────────────────
CHUNK_SIZE:    int = int(os.getenv("CHUNK_SIZE",    "500"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))

# ── Retrieval ─────────────────────────────────────────────────────────────────
TOP_K: int = int(os.getenv("TOP_K", "3"))

# ── LLM ───────────────────────────────────────────────────────────────────────
GEMINI_MODEL:    str   = os.getenv("GEMINI_MODEL",    "gemini-1.5-flash-latest")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))
LLM_MAX_TOKENS:  int   = int(os.getenv("LLM_MAX_TOKENS",  "1024"))

# ── Validate critical config at import time ───────────────────────────────────
def validate() -> None:
    """
    Call once at startup to catch missing config early.
    Raises ValueError with a helpful message if GEMINI_API_KEY is missing.
    """
    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not set.\n"
            "  1. Copy .env.example to .env\n"
            "  2. Add your key: GEMINI_API_KEY=your-key-here\n"
            "  3. Or export it:  export GEMINI_API_KEY='your-key-here'"
        )

    Path(LOG_DIR).mkdir(parents=True, exist_ok=True)
    Path(CHROMA_DIR).mkdir(parents=True, exist_ok=True)
