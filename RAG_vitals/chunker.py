"""
chunker.py
----------
Responsible for:
  - Receiving a list of LangChain Documents (from loader.py)
  - Splitting each document into larger, overlapping chunks using
    RecursiveCharacterTextSplitter
  - Deduplicating near-identical chunks before indexing
  - Preserving metadata across all child chunks
  - Returning the enriched list of chunk Documents

OPTIMIZATION CHANGES (v2):
  - chunk_size  : 500  → 1000  (richer medical context per chunk)
  - chunk_overlap: 50  → 150   (better sentence boundary continuity)
  - Added deduplicate_chunks() to remove near-identical chunks that
    would waste the LLM's context window and inflate the index.
"""

import logging
from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ── Logger setup ──────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Default splitter configuration (v2 — optimised) ──────────────────────────
DEFAULT_CHUNK_SIZE    = 1000   # ↑ from 500: each chunk now holds a full Q&A
DEFAULT_CHUNK_OVERLAP = 150    # ↑ from 50: sentences no longer split at boundary


def chunk_documents(
    documents: List[Document],
    chunk_size: int    = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Document]:
    """
    Split a list of LangChain Documents into larger, overlapping chunks.

    Larger chunks (1000 chars) mean each retrieved piece contains a full
    medical Q&A rather than half a sentence, giving the LLM enough context
    to reason without hallucinating missing details.

    Parameters
    ----------
    documents     : List[Document]  – raw documents from loader.py
    chunk_size    : int             – max characters per chunk (default 1000)
    chunk_overlap : int             – overlap between chunks   (default  150)

    Returns
    -------
    List[Document]
        Deduplicated chunks, each carrying the same metadata as its parent.
    """
    logger.info(
        f"Chunking {len(documents)} documents "
        f"(chunk_size={chunk_size}, overlap={chunk_overlap}) …"
    )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        # Respect medical sentence structure: paragraph → sentence → word
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    chunks: List[Document] = splitter.split_documents(documents)
    logger.info(f"Produced {len(chunks)} chunks before deduplication.")

    # ── Deduplicate near-identical chunks ─────────────────────────────────
    chunks = deduplicate_chunks(chunks)

    # ── Log size distribution ──────────────────────────────────────────────
    if chunks:
        sizes = [len(c.page_content) for c in chunks]
        logger.info(
            f"Final chunks: {len(chunks)} | "
            f"min={min(sizes)}, max={max(sizes)}, avg={sum(sizes)//len(sizes)} chars"
        )

    return chunks


def deduplicate_chunks(chunks: List[Document]) -> List[Document]:
    """
    Remove near-duplicate chunks using the first 120 characters as a
    content fingerprint.

    Why 120 chars? Enough to identify identical medical Q&A openings
    without being fooled by minor trailing differences. This prevents
    the LLM receiving 3 copies of the same sentence in its context window.

    Parameters
    ----------
    chunks : List[Document]

    Returns
    -------
    List[Document] – unique chunks only, order preserved
    """
    seen:   set         = set()
    unique: List[Document] = []

    for chunk in chunks:
        # Normalise whitespace before fingerprinting
        fingerprint = " ".join(chunk.page_content[:120].split())
        if fingerprint not in seen:
            seen.add(fingerprint)
            unique.append(chunk)

    removed = len(chunks) - len(unique)
    if removed:
        logger.info(f"Deduplication removed {removed} near-identical chunks.")

    return unique


# ── Quick smoke-test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    from loader import load_csv_as_documents

    docs   = load_csv_as_documents("medquad.csv")
    chunks = chunk_documents(docs)

    print(f"\n✅ Total chunks (after dedup) : {len(chunks)}")
    print("\n── Sample Chunk ────────────────────────────────────────────────")
    print("Content:\n", chunks[0].page_content)
    print("\nMetadata:", chunks[0].metadata)
