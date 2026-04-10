"""
embedder.py
-----------
Responsible for:
  - Initialising the embedding model
  - Creating (or loading) a persistent ChromaDB vector store
  - Ingesting document chunks into the vector store in safe batches
  - Exposing a helper to retrieve the vector store for querying

OPTIMIZATION CHANGES (v2):
  Embedding model upgraded from general-purpose to biomedical domain:
    Before : all-MiniLM-L6-v2          (general English, 384 dims)
    After  : pritamdeka/S-PubMedBert-MS-MARCO
             (trained on PubMed + MS-MARCO passage ranking, 768 dims)

  Why this matters for MedQuAD:
    Medical terminology like "myocardial infarction", "hyperglycaemia",
    "troponin T", "HbA1c" is underrepresented in general-English models.
    A PubMed-trained model has seen these terms in context and produces
    much tighter clusters for medically related concepts.

  ⚠️  If you have an existing chroma_db built with all-MiniLM-L6-v2,
      you MUST run with force_rebuild=True after changing this model.
      Mixed-dimension collections are not supported by ChromaDB.

  To keep the old model, change EMBEDDING_MODEL_NAME back to
  "all-MiniLM-L6-v2" — everything else stays the same.

DB: ChromaDB (local, file-based persistence)
"""

import logging
import os
from typing import List

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# ── Logger setup ──────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
# v2: upgraded from all-MiniLM-L6-v2 to a PubMed-trained passage ranker.
# First run downloads ~440 MB to ~/.cache/huggingface/. Cached after that.
EMBEDDING_MODEL_NAME = "pritamdeka/S-PubMedBert-MS-MARCO"
CHROMA_PERSIST_DIR   = "./chroma_db"
CHROMA_COLLECTION    = "medquad_collection"
BATCH_SIZE           = 500   # chunks per ingestion batch (memory safe)


def get_embedding_function() -> HuggingFaceEmbeddings:
    """
    Initialise and return the sentence-transformers embedding model.

    The first call downloads the model weights (~90 MB) to
    ~/.cache/huggingface/. Subsequent calls load from cache — fast.

    Returns
    -------
    HuggingFaceEmbeddings
        LangChain-compatible embedding wrapper around the HF model.
    """
    logger.info(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": "cpu"},   # change to "cuda" if GPU available
        encode_kwargs={"normalize_embeddings": True},
    )
    logger.info("Embedding model loaded.")
    return embeddings


def build_vector_store(
    chunks: List[Document],
    persist_dir: str = CHROMA_PERSIST_DIR,
) -> Chroma:
    """
    Embed all chunks and persist them in a local ChromaDB collection.

    If the persist_dir already exists, the function WILL overwrite it.
    For incremental updates, use `load_vector_store` instead.

    ChromaDB stores:
        - Embedding vectors
        - Raw page_content text
        - Metadata dict  (source, focus_area, row_index)

    Ingestion is done in BATCH_SIZE batches to avoid memory spikes on
    large datasets.

    Parameters
    ----------
    chunks      : List[Document]  – chunked docs from chunker.py
    persist_dir : str             – directory to persist ChromaDB data

    Returns
    -------
    Chroma  – ready-to-query vector store instance
    """
    os.makedirs(persist_dir, exist_ok=True)
    logger.info(
    f"Building vector store with {len(chunks)} chunks -> {persist_dir}"
    )

    embeddings = get_embedding_function()

    # ── Batch ingestion ────────────────────────────────────────────────────
    # First batch: create the store
    logger.info(f"Ingesting batch 1 / {max(1, (len(chunks)-1)//BATCH_SIZE + 1)} …")
    vector_store = Chroma.from_documents(
        documents=chunks[:BATCH_SIZE],
        embedding=embeddings,
        persist_directory=persist_dir,
        collection_name=CHROMA_COLLECTION,
    )

    # Subsequent batches: add to existing store
    for i in range(BATCH_SIZE, len(chunks), BATCH_SIZE):
        batch_num = i // BATCH_SIZE + 1
        batch     = chunks[i : i + BATCH_SIZE]
        logger.info(
            f"Ingesting batch {batch_num} "
            f"(chunks {i}–{min(i+BATCH_SIZE, len(chunks))}) …"
        )
        vector_store.add_documents(batch)

    # Persist to disk so we can reload without re-embedding
    vector_store.persist()
    logger.info(f"✅ Vector store persisted to {persist_dir}")
    return vector_store


def load_vector_store(persist_dir: str = CHROMA_PERSIST_DIR) -> Chroma:
    """
    Load an *existing* ChromaDB vector store from disk.

    Use this on every run after the initial `build_vector_store` call
    to avoid re-embedding the entire dataset.

    Parameters
    ----------
    persist_dir : str – directory where ChromaDB was previously persisted

    Returns
    -------
    Chroma – ready-to-query vector store instance
    """
    logger.info(f"Loading existing vector store from: {persist_dir}")
    embeddings   = get_embedding_function()
    vector_store = Chroma(
        persist_directory=persist_dir,
        embedding_function=embeddings,
        collection_name=CHROMA_COLLECTION,
    )
    count = vector_store._collection.count()
    logger.info(f"Vector store loaded — {count} vectors in collection.")
    return vector_store


def get_or_build_vector_store(
    chunks: List[Document] | None = None,
    persist_dir: str = CHROMA_PERSIST_DIR,
    force_rebuild: bool = False,
) -> Chroma:
    """
    Convenience function: load from disk if available, else build fresh.

    Parameters
    ----------
    chunks        : optional list of chunks required when building
    persist_dir   : ChromaDB directory
    force_rebuild : if True, always rebuild even if the DB exists

    Returns
    -------
    Chroma – ready-to-query vector store
    """
    db_exists = (
        os.path.isdir(persist_dir)
        and any(f.endswith(".sqlite3") for f in os.listdir(persist_dir))
    )

    if db_exists and not force_rebuild:
        return load_vector_store(persist_dir)
    else:
        if chunks is None:
            raise ValueError(
                "chunks must be provided when building the vector store for the first time."
            )
        return build_vector_store(chunks, persist_dir)


# ── Quick smoke-test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    from loader  import load_csv_as_documents
    from chunker import chunk_documents

    docs   = load_csv_as_documents("medquad.csv")
    chunks = chunk_documents(docs)

    vs = build_vector_store(chunks)

    # Quick sanity query
    results = vs.similarity_search("What are symptoms of diabetes?", k=2)
    print("\n── Top-2 similarity results for 'diabetes symptoms' ────────────")
    for r in results:
        print("\n•", r.page_content[:200])
        print("  Metadata:", r.metadata)
