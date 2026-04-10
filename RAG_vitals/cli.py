"""
cli.py
------
Interactive command-line interface for the Medical RAG system.

OPTIMIZATION CHANGES (v2):
  ✅ New --no-rerank flag   – disable cross-encoder for faster queries
  ✅ New --threshold flag   – tune confidence cutoff (default 0.30)
  ✅ UNKNOWN risk rendering – grey output when confidence gate triggers
  ✅ Source citation display – reasoning shows Source [N] references
  ✅ Mode banner             – shows active optimizations at startup

Usage:
    python cli.py                          # full optimised pipeline
    python cli.py --no-rerank              # skip cross-encoder (faster)
    python cli.py --threshold 0.4          # stricter confidence gate
    python cli.py --rebuild                # force re-embed the dataset
    python cli.py --csv /path/to/data.csv  # different dataset
    python cli.py --debug                  # verbose logging
"""

import argparse
import json
import logging
import sys

from rag_pipeline import MedicalRAGPipeline

# ── ANSI colour codes ─────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
GREY   = "\033[90m"
DIM    = "\033[2m"

# Map risk levels to colours (UNKNOWN gets grey)
RISK_COLOURS = {
    "LOW":     GREEN,
    "MEDIUM":  YELLOW,
    "HIGH":    RED,
    "UNKNOWN": GREY,
}


def colour_risk(risk: str) -> str:
    col = RISK_COLOURS.get(risk.upper(), RESET)
    return f"{BOLD}{col}{risk}{RESET}"


def print_banner(use_reranking: bool, threshold: float) -> None:
    rerank_status = f"{GREEN}ON{RESET}"  if use_reranking else f"{YELLOW}OFF{RESET}"
    print(f"""
{CYAN}{BOLD}
╔══════════════════════════════════════════════════════════╗
║      🏥  Medical RAG Assistant v2  (MedQuAD)            ║
║  ChromaDB · PubMedBERT · MMR · Reranking · Gemini       ║
╚══════════════════════════════════════════════════════════╝
{RESET}
  Cross-encoder reranking : {rerank_status}
  Confidence threshold    : {BOLD}{threshold}{RESET}

{DIM}Type your symptoms or medical question.
Type  {RESET}{BOLD}exit{RESET}{DIM}  or  {RESET}{BOLD}quit{RESET}{DIM}  to stop.
Type  {RESET}{BOLD}help{RESET}{DIM}  to see example queries.{RESET}
""")


def print_result(query: str, result: dict) -> None:
    """Pretty-print the structured JSON response from the RAG pipeline."""
    disease   = result.get("disease",   "N/A")
    risk      = result.get("risk",      "N/A")
    reasoning = result.get("reasoning", "N/A")
    action    = result.get("action",    "N/A")

    # Wrap long reasoning at word boundaries for readability
    wrapped_reasoning = _wrap_text(reasoning, width=70, indent="   ")
    wrapped_action    = _wrap_text(action,    width=70, indent="   ")

    print(f"\n{'─'*60}")
    print(f"{BOLD}🔍 Query:{RESET}  {query}")
    print(f"{'─'*60}")
    print(f"{BOLD}🦠 Disease   :{RESET} {BOLD}{CYAN}{disease}{RESET}")
    print(f"{BOLD}⚠️  Risk Level:{RESET} {colour_risk(risk)}")
    print(f"{BOLD}🧠 Reasoning :{RESET}")
    print(wrapped_reasoning)
    print(f"{BOLD}✅ Action    :{RESET}")
    print(wrapped_action)
    print(f"{'─'*60}\n")


def _wrap_text(text: str, width: int = 70, indent: str = "   ") -> str:
    """Word-wrap text at `width` chars, prefixing each line with `indent`."""
    import textwrap
    wrapped = textwrap.fill(text, width=width)
    return "\n".join(indent + line for line in wrapped.splitlines())


def print_help() -> None:
    print(f"""
{BOLD}Example queries:{RESET}
  • "I have excessive thirst, frequent urination, and fatigue."
  • "Chest pain radiating to my left arm, sweating, and nausea."
  • "My blood sugar is 320 mg/dL, what should I do?"
  • "I feel dizzy and my heart is pounding rapidly."
  • "What are the early warning signs of a heart attack?"

{BOLD}Commands:{RESET}
  help    – show this message
  exit    – quit the application
""")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Medical RAG CLI v2 — optimised MedQuAD query interface"
    )
    parser.add_argument(
        "--csv", default="medquad.csv",
        help="Path to the MedQuAD CSV file (default: medquad.csv)",
    )
    parser.add_argument(
        "--rebuild", action="store_true",
        help="Force rebuild the ChromaDB index from scratch",
    )
    parser.add_argument(
        "--top-k", type=int, default=3,
        help="Final chunks passed to the LLM (default: 3)",
    )
    parser.add_argument(
        "--no-rerank", action="store_true",
        help="Disable cross-encoder re-ranking (faster but less precise)",
    )
    parser.add_argument(
        "--threshold", type=float, default=0.30,
        help="Minimum similarity score to accept a retrieved chunk (default: 0.30)",
    )
    parser.add_argument(
        "--debug", action="store_true",
        help="Enable DEBUG-level logging",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    log_level = logging.DEBUG if args.debug else logging.WARNING
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    )

    use_reranking = not args.no_rerank
    print_banner(use_reranking, args.threshold)

    # ── Initialise pipeline ────────────────────────────────────────────────
    print(f"{DIM}⏳ Initialising RAG pipeline …{RESET}")
    try:
        pipeline = MedicalRAGPipeline(
            csv_path=args.csv,
            top_k=args.top_k,
            confidence_threshold=args.threshold,
            use_reranking=use_reranking,
        )
        pipeline.build_index(force_rebuild=args.rebuild)
        print(f"{GREEN}✅ Pipeline ready!{RESET}\n")
    except Exception as e:
        print(f"{RED}❌ Failed to initialise pipeline: {e}{RESET}")
        sys.exit(1)

    # ── Query loop ─────────────────────────────────────────────────────────
    while True:
        try:
            user_input = input(f"{BOLD}{CYAN}You ❯ {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{DIM}Goodbye! 👋{RESET}\n")
            break

        if not user_input:
            continue

        cmd = user_input.lower()
        if cmd in {"exit", "quit", "q", "bye"}:
            print(f"\n{DIM}Goodbye! 👋{RESET}\n")
            break

        if cmd == "help":
            print_help()
            continue

        print(f"{DIM}🔄 Thinking …{RESET}")
        try:
            result = pipeline.query(user_input)
            print_result(user_input, result)
        except RuntimeError as e:
            print(f"{RED}❌ Error: {e}{RESET}\n")
        except Exception as e:
            print(f"{RED}❌ Unexpected error: {e}{RESET}\n")
            if args.debug:
                raise


if __name__ == "__main__":
    main()
