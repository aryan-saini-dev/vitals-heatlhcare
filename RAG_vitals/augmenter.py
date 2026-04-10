"""
augmenter.py
------------
Responsible for:
  - Taking retrieved document chunks (from retriever.py)
  - Assembling them into a clearly formatted context block
  - Combining that context with the user's query
  - Returning the final augmented prompt string ready for the LLM

Keeping augmentation separate from retrieval and LLM logic makes it
easy to change prompt structure without touching other modules.
"""

import logging
from typing import List

from langchain_core.documents import Document

# ── Logger setup ──────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


def format_context(chunks: List[Document]) -> str:
    """
    Merge retrieved chunks into a single, clearly delimited context string.

    Format per chunk:
        --- Source [N]: <focus_area> (<source>) ---
        <page_content>

    Parameters
    ----------
    chunks : List[Document]
        Retrieved chunks from retriever.retrieve_relevant_chunks()

    Returns
    -------
    str
        Multi-line context block ready to be inserted into the LLM prompt.
    """
    if not chunks:
        logger.warning("No chunks provided to format_context — context will be empty.")
        return "No relevant context found in the knowledge base."

    parts: List[str] = []
    for i, doc in enumerate(chunks, 1):
        focus  = doc.metadata.get("focus_area", "Unknown")
        source = doc.metadata.get("source",     "Unknown")
        header = f"--- Source [{i}]: {focus} ({source}) ---"
        parts.append(f"{header}\n{doc.page_content.strip()}")

    context = "\n\n".join(parts)
    logger.debug(f"Formatted context ({len(context)} chars).")
    return context


def build_augmented_prompt(
    query: str,
    chunks: List[Document],
) -> str:
    """
    Combine retrieved context and the user query into the final LLM prompt.

    The prompt instructs Gemini to:
        1. Identify a possible disease (Diabetes or Cardiac Arrest)
        2. Assign a risk level   (LOW / MEDIUM / HIGH)
        3. Provide clear reasoning
        4. Suggest a next action

    Output is requested as STRICT JSON to reduce hallucination and make
    the response machine-parseable.

    Parameters
    ----------
    query  : str             – the user's natural-language question
    chunks : List[Document]  – top-k retrieved chunks from retriever.py

    Returns
    -------
    str
        Complete prompt string ready to send to the Gemini API.
    """
    # ── Confidence gate: if no chunks were retrieved, refuse to hallucinate ──
    if not chunks:
        logger.warning("No chunks available — returning safe fallback prompt.")
        return (
            f"You are a medical AI assistant.\n"
            f"The knowledge base returned no relevant context for the query below.\n\n"
            f"User Query: {query}\n\n"
            f'Return this exact JSON without modification:\n'
            f'{{"disease":"UNKNOWN","risk":"UNKNOWN",'
            f'"reasoning":"Insufficient context in the knowledge base to answer this query safely.",'
            f'"action":"Please consult a qualified medical professional."}}'
        )

    context = format_context(chunks)

    # OPTIMIZATION v2 — Anti-hallucination improvements:
    #  1. Explicit grounding rule — ONLY the context, no prior knowledge
    #  2. Hard refusal clause when context is insufficient
    #  3. Chain-of-thought reasoning step before final JSON
    #  4. Mandatory source citation (Source [N]) in reasoning field
    prompt = (
        f"You are a medical AI assistant. Your answers must be grounded EXCLUSIVELY "
        f"in the provided context.\n\n"
        f"STRICT RULES:\n"
        f"- Use ONLY information from the context below. "
        f"Do NOT use any prior medical knowledge.\n"
        f"- If the context does not contain enough information, you MUST return the "
        f"INSUFFICIENT_CONTEXT response shown below.\n"
        f"- In your reasoning, cite which Source number (e.g. 'Source [1]') "
        f"supports each claim.\n"
        f"- Do NOT guess, infer beyond the context, or fill gaps with general knowledge.\n\n"
        f"If context is insufficient, return exactly:\n"
        f'{{"disease":"UNKNOWN","risk":"UNKNOWN",'
        f'"reasoning":"Insufficient context to determine diagnosis safely.",'
        f'"action":"Consult a qualified medical professional immediately."}}\n\n'
        f"--- CONTEXT START ---\n"
        f"{context}\n"
        f"--- CONTEXT END ---\n\n"
        f"User Query: {query}\n\n"
        f"Think step by step before answering:\n"
        f"1. Which symptoms in the query are explicitly mentioned in the context?\n"
        f"2. Which Source number contains the most relevant information?\n"
        f"3. What disease does that context point to?\n"
        f"4. What is the severity evidence in the context?\n\n"
        f"After reasoning, return STRICT JSON only "
        f"(no markdown, no code fences, no extra text):\n"
        f"{{\n"
        f'  "disease":   "<Diabetes | Cardiac Arrest | UNKNOWN>",\n'
        f'  "risk":      "<LOW | MEDIUM | HIGH | UNKNOWN>",\n'
        f'  "reasoning": "<step-by-step reasoning citing Source [N] for each claim>",\n'
        f'  "action":    "<recommended next step for the patient>"\n'
        f"}}"
    )

    logger.info("Augmented prompt built successfully.")
    logger.debug(f"Prompt preview:\n{prompt[:300]}…")
    return prompt


# ── Quick smoke-test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    # Create minimal fake chunks for testing
    from langchain.schema import Document
    fake_chunks = [
        Document(
            page_content=(
                "Patient Query: What are symptoms of diabetes?\n"
                "Medical Answer: Common symptoms include increased thirst, "
                "frequent urination, fatigue, and blurred vision.\n"
                "Category: Diabetes"
            ),
            metadata={"source": "NIDDK", "focus_area": "Diabetes"},
        )
    ]

    query  = "I have blurred vision and feel very tired all the time."
    prompt = build_augmented_prompt(query, fake_chunks)

    print("\n✅ Augmented Prompt:")
    print("─" * 60)
    print(prompt)
