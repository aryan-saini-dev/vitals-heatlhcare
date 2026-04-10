"""
rag_pipeline.py
---------------
The central orchestrator of the RAG system.

Wires together:
    loader    → load CSV as Documents
    chunker   → split Documents into chunks
    embedder  → embed chunks + persist in ChromaDB
    retriever → semantic similarity search
    augmenter → build context-enriched prompt
    llm       → call Gemini and parse structured response

Execution flow:
    User Query
        ↓
    [Retriever]   – finds top-k relevant chunks from ChromaDB
        ↓
    [Augmenter]   – formats context + query into a prompt
        ↓
    [Gemini LLM]  – returns structured JSON answer
        ↓
    Final Answer  (disease / risk / reasoning / action)
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

import google.generativeai as genai

from augmenter import build_augmented_prompt
from chunker   import chunk_documents
from embedder  import get_or_build_vector_store, CHROMA_PERSIST_DIR
from llm       import init_gemini, generate_response
from loader    import load_csv_as_documents, load_csv_question_first
from retriever import (
    retrieve_relevant_chunks,
    retrieve_with_confidence,
    rerank_chunks,
    DEFAULT_TOP_K,
    SIMILARITY_THRESHOLD,
)

# ── Logger setup ──────────────────────────────────────────────────────────────
Path("logs").mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    handlers=[
        logging.StreamHandler(),                         # console
        logging.FileHandler("logs/rag_pipeline.log"),    # file
    ],
)
logger = logging.getLogger(__name__)


class MedicalRAGPipeline:
    """
    End-to-end RAG pipeline for medical question answering.

    Usage
    -----
    # First run (builds the vector store):
    pipeline = MedicalRAGPipeline(csv_path="medquad.csv")
    pipeline.build_index()        # one-time operation; persists to disk

    # Every subsequent run (loads from disk):
    pipeline = MedicalRAGPipeline(csv_path="medquad.csv")
    pipeline.load_index()

    # Query:
    result = pipeline.query("I have chest pain and shortness of breath.")
    print(result)
    """

    def __init__(
        self,
        csv_path:             str   = "medquad.csv",
        persist_dir:          str   = CHROMA_PERSIST_DIR,
        top_k:                int   = DEFAULT_TOP_K,
        confidence_threshold: float = SIMILARITY_THRESHOLD,
        use_reranking:        bool  = True,
    ):
        self.csv_path             = csv_path
        self.persist_dir          = persist_dir
        self.top_k                = top_k
        self.confidence_threshold = confidence_threshold
        self.use_reranking        = use_reranking
        self.vector_store         = None
        self.gemini_model: Optional[genai.GenerativeModel] = None

        logger.info(
            f"MedicalRAGPipeline v2 initialised "
            f"(csv={csv_path}, top_k={top_k}, "
            f"reranking={use_reranking}, threshold={confidence_threshold})"
        )

    # ── Index management ───────────────────────────────────────────────────

    def build_index(self, force_rebuild: bool = False) -> None:
        """
        Load the CSV, chunk it, embed it, and persist in ChromaDB.
        Safe to call multiple times — skips if the DB already exists
        unless force_rebuild=True.
        """
        db_exists = (
            Path(self.persist_dir).is_dir()
            and any(
                f.endswith(".sqlite3")
                for f in os.listdir(self.persist_dir)
            )
        )

        if db_exists and not force_rebuild:
            logger.info(
                "Vector store already exists. "
                "Calling load_index() instead. "
                "Pass force_rebuild=True to re-embed."
            )
            self.load_index()
            return

        logger.info("Building index from scratch …")

        # Step 1 – Load CSV (v2: question-first format for better query matching)
        docs   = load_csv_question_first(self.csv_path)

        # Step 2 – Chunk
        chunks = chunk_documents(docs)

        # Step 3 – Embed + persist
        self.vector_store = get_or_build_vector_store(
            chunks=chunks,
            persist_dir=self.persist_dir,
            force_rebuild=force_rebuild,
        )
        logger.info("Index built successfully.")

    def load_index(self) -> None:
        """
        Load an existing ChromaDB vector store from disk.
        Call this on every run after the initial build_index().
        """
        self.vector_store = get_or_build_vector_store(
            persist_dir=self.persist_dir,
        )
        logger.info("Index loaded from disk.")

    def _ensure_index(self) -> None:
        """Internal guard — ensures vector store is ready before querying."""
        if self.vector_store is None:
            raise RuntimeError(
                "Vector store is not initialised. "
                "Call build_index() or load_index() first."
            )

    # ── LLM management ────────────────────────────────────────────────────

    def _ensure_llm(self) -> None:
        """Internal guard — initialises Gemini client on first use."""
        if self.gemini_model is None:
            self.gemini_model = init_gemini()

    # ── Main query interface ───────────────────────────────────────────────

    def query(self, user_query: str) -> dict:
        """
        End-to-end RAG query: retrieve → augment → generate → return JSON.

        Parameters
        ----------
        user_query : str  – the patient's natural-language question / symptom

        Returns
        -------
        dict with keys:
            disease   – identified condition
            risk      – LOW / MEDIUM / HIGH
            reasoning – explanation grounded in the retrieved context
            action    – recommended next step for the patient
        """
        self._ensure_index()
        self._ensure_llm()

        logger.info(f"Processing query: '{user_query[:80]}'")

        # ── Step 1: Retrieve with confidence threshold (anti-hallucination) ─
        # Fetch extra candidates when reranking is enabled so we have more
        # to score; confidence filter drops out-of-scope queries entirely.
        fetch_k = self.top_k * 4 if self.use_reranking else self.top_k
        chunks, err = retrieve_with_confidence(
            query=user_query,
            vector_store=self.vector_store,
            top_k=fetch_k,
            threshold=self.confidence_threshold,
        )

        if err:
            # Query is outside dataset scope — return safe fallback
            logger.warning(f"Confidence gate triggered: {err}")
            return {
                "disease":   "UNKNOWN",
                "risk":      "UNKNOWN",
                "reasoning": err,
                "action":    "Please consult a qualified medical professional.",
            }

        # ── Step 2: Cross-encoder re-ranking (higher precision) ───────────
        if self.use_reranking and len(chunks) > self.top_k:
            chunks = rerank_chunks(user_query, chunks, top_n=self.top_k)
        else:
            chunks = chunks[: self.top_k]

        # ── Step 3: Augment — build context-enriched prompt ───────────────
        prompt = build_augmented_prompt(user_query, chunks)

        # ── Step 4: LLM — call Gemini and get structured JSON ─────────────
        result = generate_response(prompt, model=self.gemini_model)

        logger.info(f"Query complete. Disease={result.get('disease')}, Risk={result.get('risk')}")
        return result


# ── Convenience top-level function ────────────────────────────────────────────

def run_query(user_query: str, csv_path: str = "medquad.csv") -> dict:
    """
    One-liner to run a complete RAG query. Builds the index if needed.

    Parameters
    ----------
    user_query : str
    csv_path   : str

    Returns
    -------
    dict – structured JSON response
    """
    pipeline = MedicalRAGPipeline(csv_path=csv_path)
    pipeline.build_index()   # no-op if already built
    return pipeline.query(user_query)


# ── Direct run demo ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    DEMO_QUERY = "I have been experiencing excessive thirst, fatigue, and blurred vision."

    print("\n" + "═" * 60)
    print("  Medical RAG Pipeline — Demo Run")
    print("═" * 60)

    result = run_query(DEMO_QUERY, csv_path="medquad.csv")

    print(f"\n📋 Query   : {DEMO_QUERY}")
    print("\n🤖 Response:")
    print(json.dumps(result, indent=2))
