# 🏥 Medical RAG System

A production-ready **Retrieval-Augmented Generation (RAG)** pipeline for medical question answering, built on the **MedQuAD** dataset.

```
User Query → ChromaDB Retriever → Context → Google Gemini LLM → Structured JSON Answer
```

---

## 📁 Project Structure

```
rag_system/
├── loader.py         # CSV ingestion → LangChain Documents
├── chunker.py        # RecursiveCharacterTextSplitter (500 / 50)
├── embedder.py       # sentence-transformers + ChromaDB persistence
├── retriever.py      # Semantic similarity search (top-k=3)
├── augmenter.py      # Context formatting + prompt construction
├── llm.py            # Google Gemini API integration + JSON parsing
├── rag_pipeline.py   # Orchestrator — wires all modules together
├── cli.py            # Interactive CLI with coloured output
├── config.py         # Centralised configuration (env vars)
├── requirements.txt  # Python dependencies
├── .env.example      # Environment variable template
├── medquad.csv       # ← Place your dataset here
├── chroma_db/        # Auto-created: persisted vector store
└── logs/             # Auto-created: pipeline logs
```

---

## ⚙️ Tech Stack

| Component         | Library / Service                    |
|-------------------|--------------------------------------|
| Framework         | LangChain                            |
| Vector Database   | ChromaDB (local, persistent)         |
| Embeddings        | `sentence-transformers/all-MiniLM-L6-v2` |
| LLM               | Google Gemini 1.5 Flash              |
| Data              | pandas                               |

---

## 🚀 Quick Start

### 1. Clone / download the project

```bash
git clone <your-repo>
cd rag_system
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate      # Linux / macOS
venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set your Gemini API key

Get a free key at https://aistudio.google.com/app/apikey

```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your-key-here
```

Or export directly:

```bash
export GEMINI_API_KEY="your-key-here"
```

### 5. Place your dataset

```bash
cp /path/to/medquad.csv ./medquad.csv
```

### 6. Run the CLI

```bash
python cli.py
```

On **first run**, the system will:
1. Load and chunk all 16,000+ MedQuAD rows
2. Embed them with `all-MiniLM-L6-v2`
3. Persist vectors to `./chroma_db/`

Subsequent runs load the index from disk instantly.

---

## 💬 CLI Usage

```
╔══════════════════════════════════════════════════════════╗
║        🏥  Medical RAG Assistant  (MedQuAD)             ║
╚══════════════════════════════════════════════════════════╝

You ❯ I have excessive thirst, frequent urination, and fatigue.

──────────────────────────────────────────────────────────
🔍 Query:  I have excessive thirst, frequent urination, and fatigue.
──────────────────────────────────────────────────────────
🦠 Disease   : Diabetes
⚠️  Risk Level: HIGH
🧠 Reasoning : The symptoms align with classic Type 2 Diabetes presentation…
✅ Action    : Consult an endocrinologist immediately; request fasting glucose test.
──────────────────────────────────────────────────────────
```

### CLI flags

```bash
python cli.py --rebuild          # Force re-embed the dataset
python cli.py --top-k 5          # Retrieve 5 chunks per query (default: 3)
python cli.py --csv mydata.csv   # Use a different CSV file
python cli.py --debug            # Enable DEBUG logging
```

---

## 🐍 Programmatic Usage

```python
from rag_pipeline import MedicalRAGPipeline

# Build index once
pipeline = MedicalRAGPipeline(csv_path="medquad.csv")
pipeline.build_index()

# Query
result = pipeline.query("chest pain radiating to left arm, sweating")
print(result)
# {
#   "disease":   "Cardiac Arrest",
#   "risk":      "HIGH",
#   "reasoning": "...",
#   "action":    "Call emergency services immediately."
# }
```

---

## 🔁 Data Flow

```
medquad.csv
    ↓ loader.py
List[Document]  (formatted: "Patient Query: … / Medical Answer: … / Category: …")
    ↓ chunker.py
List[Document]  (chunks ≤500 chars, 50 char overlap)
    ↓ embedder.py
ChromaDB        (384-dim vectors + metadata, persisted to ./chroma_db)
    ↓
User Query
    ↓ retriever.py
Top-3 Chunks    (cosine similarity search)
    ↓ augmenter.py
Prompt          ("Context: … / User Query: … / Tasks: …")
    ↓ llm.py (Gemini 1.5 Flash)
JSON Response   { disease, risk, reasoning, action }
```

---

## 🛡️ Design Principles

- **Modular** — each file has one clear responsibility
- **Anti-hallucination** — Gemini receives only retrieved context; prompt instructs it not to fabricate
- **Persistent** — ChromaDB persists to disk; no re-embedding on every run
- **Configurable** — all tunable parameters in `config.py` / `.env`
- **Production-ready** — logging, error handling, graceful fallbacks throughout

---

## 📋 Output Schema

Every query returns a JSON dict:

```json
{
  "disease":   "Diabetes | Cardiac Arrest",
  "risk":      "LOW | MEDIUM | HIGH",
  "reasoning": "Explanation grounded in the retrieved medical context",
  "action":    "Recommended next step for the patient"
}
```
