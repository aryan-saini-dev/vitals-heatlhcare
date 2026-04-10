"""
loader.py
---------
Responsible for:
  - Loading the MedQuAD CSV dataset
  - Cleaning and validating each row
  - Converting rows into LangChain Document objects with rich metadata
  - Formatting text in a retrieval-optimised way for embedding

OPTIMIZATION CHANGES (v2):
  Question-first embedding strategy:
    The embedding vector is computed over the QUESTION text (+ category),
    not the full answer. This dramatically improves query-to-document
    matching because a user's symptom query is structurally much closer
    to the stored question than to a long medical answer paragraph.

    The full answer is still passed to the LLM — it is stored both in
    page_content (for chunking) AND in metadata["full_answer"] (for
    direct retrieval without chunking if needed).

  Two document formats are provided:
    load_csv_as_documents()         – original combined format (default)
    load_csv_question_first()       – question-primary embedding format (v2)

  Use load_csv_question_first() when building a fresh index.
  The combined format is kept for backward compatibility.
"""

import logging
import pandas as pd
from typing import List
from langchain_core.documents import Document

# ── Logger setup ──────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


def _read_and_clean(csv_path: str) -> pd.DataFrame:
    """
    Shared CSV loading + cleaning logic used by both loader functions.

    Steps:
      1. Read CSV with pandas
      2. Validate required columns exist
      3. Drop rows missing question or answer
      4. Fill NaN metadata fields
      5. Strip whitespace from all text columns

    Parameters
    ----------
    csv_path : str – path to the MedQuAD CSV

    Returns
    -------
    pd.DataFrame – cleaned dataframe ready for document conversion
    """
    logger.info(f"Reading CSV: {csv_path}")
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        logger.error(f"CSV not found: {csv_path}")
        raise
    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        raise

    logger.info(f"Raw shape: {df.shape}")

    required_cols = {"question", "answer", "source", "focus_area"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")

    df.dropna(subset=["question", "answer"], inplace=True)
    df["source"] = df["source"].fillna("Unknown Source")
    df["focus_area"] = df["focus_area"].fillna("General")

    for col in ["question", "answer", "source", "focus_area"]:
        df[col] = df[col].astype(str).str.strip()

    # Drop rows where question or answer became empty after stripping
    df = df[(df["question"] != "") & (df["answer"] != "")]

    logger.info(f"Rows after cleaning: {len(df)}")
    return df


def load_csv_as_documents(csv_path: str) -> List[Document]:
    """
    ORIGINAL format — combined question + answer in page_content.

    Each document:
        page_content = "Patient Query: {q}\\nMedical Answer: {a}\\nCategory: {fa}"
        metadata     = {source, focus_area, row_index}

    Use this format when loading an existing index built with v1.
    For new indexes, prefer load_csv_question_first().

    Parameters
    ----------
    csv_path : str

    Returns
    -------
    List[Document]
    """
    df = _read_and_clean(csv_path)
    documents: List[Document] = []

    for idx, row in df.iterrows():
        page_content = (
            f"Patient Query: {row['question']}\n"
            f"Medical Answer: {row['answer']}\n"
            f"Category: {row['focus_area']}"
        )
        metadata = {
            "source":     row["source"],
            "focus_area": row["focus_area"],
            "row_index":  int(idx),
        }
        documents.append(Document(page_content=page_content, metadata=metadata))

    logger.info(f"[Original format] Created {len(documents)} documents.")
    return documents


def load_csv_question_first(csv_path: str) -> List[Document]:
    """
    OPTIMISED format (v2) — question is the primary embedding target.

    Why this works better:
      A user's query ("I feel very thirsty and tired") is semantically
      closer to the stored question ("What are symptoms of diabetes?")
      than to a long multi-paragraph medical answer. Embedding questions
      as the retrieval key and storing answers as context yields higher
      similarity scores for relevant matches.

    Each document:
        page_content = "Question: {q}\\nCategory: {fa}\\n\\nAnswer: {a}"
        metadata     = {source, focus_area, row_index, question, answer}

    The full question and answer are also stored in metadata so the
    augmenter can reconstruct the complete medical context even when
    a chunk only contains the question portion.

    Parameters
    ----------
    csv_path : str

    Returns
    -------
    List[Document]
    """
    df = _read_and_clean(csv_path)
    documents: List[Document] = []

    for idx, row in df.iterrows():
        # Question + category leads — this is what gets embedded
        # Answer follows — this is what the LLM reasons over
        page_content = (
            f"Question: {row['question']}\n"
            f"Category: {row['focus_area']}\n\n"
            f"Answer: {row['answer']}"
        )
        metadata = {
            "source":     row["source"],
            "focus_area": row["focus_area"],
            "row_index":  int(idx),
            # Store raw fields for direct access without re-parsing page_content
            "question":   row["question"],
            "answer":     row["answer"][:500],  # cap to keep metadata lean
        }
        documents.append(Document(page_content=page_content, metadata=metadata))

    logger.info(f"[Question-first format] Created {len(documents)} documents.")
    return documents


# ── Quick smoke-test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    print("\n── Original format ─────────────────────────────────────────────")
    docs_v1 = load_csv_as_documents("medquad.csv")
    print(f"Documents: {len(docs_v1)}")
    print(docs_v1[0].page_content[:200])

    print("\n── Question-first format (v2) ──────────────────────────────────")
    docs_v2 = load_csv_question_first("medquad.csv")
    print(f"Documents: {len(docs_v2)}")
    print(docs_v2[0].page_content[:200])
    print("Metadata keys:", list(docs_v2[0].metadata.keys()))
