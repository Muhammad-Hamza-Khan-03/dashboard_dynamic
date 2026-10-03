# Dashboard Dynamic — Data Analysis & Dashboard Workspace

An exploratory application combining a **Next.js / React** interface with a **Flask** data backend. It connects dataset tools, a configurable dashboard canvas, and AI-assisted analysis.

[Case study](https://hamza-khan-portfolio.hamzakhan102003.chatgpt.site/projects/dashboard-dynamic/) · [Author portfolio](https://hamza-khan-portfolio.hamzakhan102003.chatgpt.site/) · [LinkedIn](https://www.linkedin.com/in/muhammadhamzakhan/)

## What the code contains

- Dataset upload and management, with column and row editing routes.
- Statistics tools and background task handling.
- A draggable dashboard canvas with chart, table, text, and statistic-card nodes.
- Dashboard save and retrieval routes.
- AI-assisted question processing through InsightAI and model providers.
- Report and visualisation generation paths.

These describe the repository implementation. No live deployment, usability benchmark, or response-time result is asserted.

## Architecture

| Layer | Implementation |
|---|---|
| User interface | Next.js, React, TypeScript, Tailwind, and component libraries |
| Dashboard composition | React Flow / XYFlow, chart nodes, table nodes, and layout controls |
| Visualisation | Recharts and other charting dependencies |
| Data processing | Flask, Pandas/NumPy-related processing, statistics utilities |
| AI integration | InsightAI, OpenAI/Groq configuration, and question-processing routes |
| Persistence | SQLite-backed datasets, analysis history, and dashboard storage in the backend |

Prisma appears among the frontend development dependencies; it is not used here as evidence that the application's backend storage is Prisma-based.

## Start reading

| Path | Purpose |
|---|---|
| `src/app/(dashboard)/upload/` | Dataset upload, editing, and analysis tools |
| `src/app/(dashboard)/DataWorkspace/` | Data analysis workspace components |
| `src/app/(dashboard)/board/` | Dashboard nodes, layout, theme, storage, and export interfaces |
| `src/app/api/ai/dashboard/` | AI dashboard route |
| `backend.py` | Flask routes and application startup |
| `flask_utils/` | Upload, statistics, document, and worker utilities |
| `pdf_layout.py` | Report layout helpers |

## Local development

```bash
git clone https://github.com/Muhammad-Hamza-Khan-03/dashboard_dynamic.git
cd dashboard_dynamic
npm install
npm run dev
```

The frontend development server runs at http://localhost:3000.

For the Python backend, create a separate environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python backend.py
```

The backend's main entrypoint uses port 5000. Review frontend API URLs so that requests reach the local backend.

Clerk authentication and AI provider integrations require your own development configuration. The backend reads `OPENAI_API_KEY` and `GROQ_API_KEY`. Keep real keys out of Git, screenshots, and frontend-delivered code.

Document processing may also require external tools such as wkhtmltopdf and NLP resources; the startup routine checks or initialises those dependencies.

## Validation and project status

```bash
npm run lint
npm run build
```

These are available project commands, not a claim that this snapshot has just passed them. The codebase is an exploration with multiple integrations; verify dependencies, authentication, and each workflow before deployment.

This repository demonstrates how data processing, AI analysis, and interactive dashboard composition can be connected. Current runtime support and deployment status should be validated separately.

## Security maintenance

- Python dependencies are listed in `requirements.txt`.
- Review advisories and apply targeted dependency updates.
- The repository's existing maintenance notes identify `pdfminer.six` as updated following an advisory.

## Contact

[Portfolio](https://hamza-khan-portfolio.hamzakhan102003.chatgpt.site/) · [LinkedIn](https://www.linkedin.com/in/muhammadhamzakhan/) · [Email](mailto:hamzakhan102003@gmail.com)
