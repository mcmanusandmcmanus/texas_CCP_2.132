# City of Arlington, TX - Racial Profiling Report

Mobile-friendly static report plus PDF export for the Arlington Police Department (2019-2024) using the provided DPS dataset.

## Quick start
- Ensure Python 3 is available.
- Build the Arlington summary JSON (filters to Arlington Police rows only):  
  `python scripts/build_arlington_summary.py`
- Serve the static web app (example):  
  `python -m http.server 8000 --directory webapp` and open http://localhost:8000
- Click **Download PDF** for a browser-generated PDF, or **Printer-friendly view** to print/save as PDF with clean styling.

## What's inside
- `data/tx_data_racial_profiling_2019to2024.csv` - full DPS source.
- `scripts/build_arlington_summary.py` - extracts Arlington Police stats into JSON.
- `webapp/data/arlington_summary.json` - generated summary consumed by the UI.
- `webapp/index.html`, `webapp/styles.css`, `webapp/app.js` - static UI with charts (Chart.js), PDF capture (html2canvas + jsPDF), and auto-generated narrative text.

## LLM notes (optional)
If you want an LLM-written narrative, add a small fetch call in `webapp/app.js` that posts the `arlington_summary.json` payload to your API of choice (OpenAI, Hugging Face Inference, LangChain backend, etc.). Keep keys out of version control; this repo ships with only offline, deterministic narrative generation.
