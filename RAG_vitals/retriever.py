"""
retriever.py
------------
Responsible for:
  - Accepting a user query string
  - Running optimised retrieval against the ChromaDB vector store
  - Returning the top-k most relevant, deduplicated document chunks

OPTIMIZATION CHANGES (v2):
  1. MMR (Maximum Marginal Relevance) — replaces plain similarity_search.
     Fetches 15 candidates, re-ranks to top-3 balancing relevance + diversity
     so the LLM doesn't receive 3 near-identical chunks.

  2. Hybrid search (BM25 + dense) — combines keyword matching (BM25) with
     semantic vector search via EnsembleRetriever. Medical terms like
     "troponin" or "HbA1c" that dense search misses are caught by BM25.

  3. Cross-encoder re-ranking — a second-pass model reads (query, chunk)
     pairs jointly for much more accurate relevance scoring than cosine.

  4. Confidence threshold — if the top match is too dissimilar to the query,
     returns None rather than hallucinating from irrelevant context.
"""

import logging
from typing import List, Optional, Tuple

from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

# ── Logger setup ──────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Retrieval configuration ───────────────────────────────────────────────────
DEFAULT_TOP_K          = 3     # final chunks passed to LLM
MMR_FETCH_K            = 15    # candidates fetched before MMR re-ranking
MMR_LAMBDA             = 0.6   # 0=max diversity, 1=max relevance
SIMILARITY_THRESHOLD   = 0.30  # min similarity score to avoid low-conf retrieval
                               # ChromaDB returns L2 distance; we convert to
                               # similarity = 1 - (distance/2). Tune as needed.


# ─────────────────────────────────────────────────────────────────────────────
# PRIMARY RETRIEVAL — MMR (Maximum Marginal Relevance)
# ─────────────────────────────────────────────────────────────────────────────

def retrieve_relevant_chunks(
    query: str,
    vector_store: Chroma,
    top_k: int = DEFAULT_TOP_K,
) -> List[Document]:
    """
    Retrieve the top-k most relevant AND diverse chunks using MMR.

    MMR fetches MMR_FETCH_K=15 candidates by cosine similarity, then
    iteratively picks chunks that are relevant to the query but dissimilar
    to already-selected chunks. This prevents the LLM context from being
    filled with 3 near-identical paragraphs about the same symptom.

    Parameters
    ----------
    query        : str    – the user's natural-language question
    vector_store : Chroma – loaded vector store from embedder.py
    top_k        : int    – final number of chunks to return (default 3)

    Returns
    -------
    List[Document] – diverse top-k chunks, most relevant first.
    """
    if not query or not query.strip():
        raise ValueError("Query must be a non-empty string.")

    logger.info(f"MMR retrieval (top_k={top_k}, fetch_k={MMR_FETCH_K}) for: '{query[:80]}'")

    results: List[Document] = vector_store.max_marginal_relevance_search(
        query=query,
        k=top_k,
        fetch_k=MMR_FETCH_K,       # over-fetch then re-rank for diversity
        lambda_mult=MMR_LAMBDA,    # balance relevance vs diversity
    )

    logger.info(f"MMR returned {len(results)} diverse chunks.")
    for i, doc in enumerate(results, 1):
        logger.debug(
            f"  Chunk {i} | focus_area={doc.metadata.get('focus_area')} "
            f"| preview: {doc.page_content[:80]}…"
        )

    return results


# ─────────────────────────────────────────────────────────────────────────────
# HYBRID RETRIEVAL — BM25 keyword + dense vector (EnsembleRetriever)
# ─────────────────────────────────────────────────────────────────────────────

def retrieve_hybrid(
    query: str,
    vector_store: Chroma,
    all_chunks: List[Document],
    top_k: int = DEFAULT_TOP_K,
    bm25_weight: float = 0.4,
    dense_weight: float = 0.6,
) -> List[Document]:
    """
    Hybrid retrieval combining BM25 keyword search + dense vector search.

    BM25 excels at exact medical terms ("HbA1c", "troponin", drug names).
    Dense search excels at semantic/paraphrase matches.
    EnsembleRetriever merges both using Reciprocal Rank Fusion (RRF).

    Parameters
    ----------
    query        : str            – user's question
    vector_store : Chroma         – loaded vector store
    all_chunks   : List[Document] – all chunks (needed to build BM25 index)
    top_k        : int            – chunks to return
    bm25_weight  : float          – weight for keyword results  (default 0.4)
    dense_weight : float          – weight for semantic results (default 0.6)

    Returns
    -------
    List[Document]

    Note: BM25Retriever requires: pip install rank_bm25
    """
    try:
        from langchain_community.retrievers import BM25Retriever
        from langchain.retrievers            import EnsembleRetriever
    except ImportError:
        logger.warning(
            "rank_bm25 not installed — falling back to MMR retrieval. "
            "Install with: pip install rank_bm25"
        )
        return retrieve_relevant_chunks(query, vector_store, top_k)

    logger.info(f"Hybrid retrieval (BM25 + dense, top_k={top_k}) for: '{query[:80]}'")

    # BM25 over all ingested chunks
    bm25_retriever      = BM25Retriever.from_documents(all_chunks)
    bm25_retriever.k    = top_k

    # Dense vector retriever (MMR mode)
    dense_retriever = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={"k": top_k, "fetch_k": MMR_FETCH_K, "lambda_mult": MMR_LAMBDA},
    )

    # Fuse results with Reciprocal Rank Fusion
    ensemble = EnsembleRetriever(
        retrievers=[bm25_retriever, dense_retriever],
        weights=[bm25_weight, dense_weight],
    )

    results = ensemble.get_relevant_documents(query)[:top_k]
    logger.info(f"Hybrid retrieval returned {len(results)} chunks.")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# CROSS-ENCODER RE-RANKING
# ─────────────────────────────────────────────────────────────────────────────

def rerank_chunks(
    query: str,
    chunks: List[Document],
    top_n: int = DEFAULT_TOP_K,
) -> List[Document]:
    """
    Re-rank retrieved chunks using a cross-encoder model.

    A cross-encoder reads (query, chunk) together — much more accurate
    than cosine similarity, which compares embeddings independently.
    Use this as a second pass: retrieve 10 candidates, re-rank to top 3.

    Requires: pip install sentence-transformers

    Parameters
    ----------
    query  : str            – user's question
    chunks : List[Document] – candidate chunks from primary retrieval
    top_n  : int            – how many to return after re-ranking

    Returns
    -------
    List[Document] – top_n chunks sorted by cross-encoder score.
    """
    try:
        from sentence_transformers import CrossEncoder
    except ImportError:
        logger.warning(
            "sentence-transformers not found for reranking — "
            "returning original order. pip install sentence-transformers"
        )
        return chunks[:top_n]

    if not chunks:
        return chunks

    logger.info(f"Cross-encoder re-ranking {len(chunks)} candidates -> top {top_n}")

    # Lightweight cross-encoder fine-tuned on MS-MARCO passage ranking
    reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

    pairs  = [(query, doc.page_content) for doc in chunks]
    scores = reranker.predict(pairs)

    # Sort by score descending; zip preserves the original Document objects
    ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
    top    = [doc for _, doc in ranked[:top_n]]

    logger.info(
        f"Re-ranking scores (top {top_n}): "
        + ", ".join(f"{s:.3f}" for s, _ in ranked[:top_n])
    )
    return top


# ─────────────────────────────────────────────────────────────────────────────
# CONFIDENCE-THRESHOLD FILTER
# ─────────────────────────────────────────────────────────────────────────────

def retrieve_with_confidence(
    query: str,
    vector_store: Chroma,
    top_k: int   = DEFAULT_TOP_K,
    threshold: float = SIMILARITY_THRESHOLD,
) -> Tuple[Optional[List[Document]], Optional[str]]:
    """
    Retrieve chunks and filter by similarity confidence.

    ChromaDB returns L2 distances (lower = better). We convert to a
    [0, 1] similarity score. If the best match is below `threshold`,
    the query is outside the dataset's coverage and we return None
    instead of hallucinating an answer from irrelevant context.

    Parameters
    ----------
    query     : str   – user's question
    vector_store      – Chroma instance
    top_k     : int   – max chunks to return
    threshold : float – minimum similarity score (default 0.30)

    Returns
    -------
    (List[Document], None)      – if confident matches found
    (None, error_message: str)  – if no chunk clears the threshold
    """
    logger.info(f"Confidence-filtered retrieval (threshold={threshold}) for: '{query[:80]}'")

    raw = vector_store.similarity_search_with_score(query=query, k=top_k)

    # ChromaDB L2 distance → similarity: similarity = 1 - distance/2
    # (embeddings are normalised, so L2 ∈ [0,2] maps to similarity ∈ [0,1])
    confident = []
    for doc, distance in raw:
        similarity = max(0.0, 1.0 - distance / 2.0)
        logger.debug(
            f"  dist={distance:.4f} → sim={similarity:.4f} | "
            f"{doc.metadata.get('focus_area')} | {doc.page_content[:60]}…"
        )
        if similarity >= threshold:
            confident.append(doc)

    if not confident:
        msg = (
            f"No chunks met the confidence threshold ({threshold}). "
            "The query may be outside the dataset scope."
        )
        logger.warning(msg)
        return None, msg

    logger.info(f"Confidence filter kept {len(confident)}/{top_k} chunks.")
    return confident, None


# ─────────────────────────────────────────────────────────────────────────────
# LEGACY — plain similarity search (kept for backward compatibility)
# ─────────────────────────────────────────────────────────────────────────────

def retrieve_with_scores(
    query: str,
    vector_store: Chroma,
    top_k: int = DEFAULT_TOP_K,
) -> List[Tuple[Document, float]]:
    """Plain similarity search returning (doc, score) pairs. Use for debugging."""
    logger.info(f"Plain similarity search (top_k={top_k}) for: '{query[:80]}'")
    results = vector_store.similarity_search_with_score(query=query, k=top_k)
    for doc, score in results:
        logger.debug(
            f"  Score={score:.4f} | "
            f"focus_area={doc.metadata.get('focus_area')} | "
            f"preview: {doc.page_content[:60]}…"
        )
    return results


# ── Quick smoke-test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    from embedder import load_vector_store

    vs    = load_vector_store()
    query = "What are early signs of a heart attack?"

    # Test 1 — MMR
    print("\n── MMR Retrieval ───────────────────────────────────────────────")
    results = retrieve_relevant_chunks(query, vs, top_k=3)
    for i, doc in enumerate(results, 1):
        print(f"\n[Chunk {i}] {doc.metadata.get('focus_area')}")
        print(doc.page_content[:200])

    # Test 2 — Confidence filter
    print("\n── Confidence-Filtered Retrieval ───────────────────────────────")
    docs, err = retrieve_with_confidence(query, vs)
    if err:
        print("Low confidence:", err)
    else:
        print(f"Got {len(docs)} confident chunks.")

    # Test 3 — Re-ranking
    print("\n── Cross-Encoder Re-ranking ────────────────────────────────────")
    candidates = retrieve_relevant_chunks(query, vs, top_k=10)
    reranked   = rerank_chunks(query, candidates, top_n=3)
    for i, doc in enumerate(reranked, 1):
        print(f"\n[Re-ranked {i}] {doc.metadata.get('focus_area')}")
        print(doc.page_content[:200])
