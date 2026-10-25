# ShadowBuilder AI

> **Evidence-Backed Competitor Intelligence and Engineering Agent**
> 
> Researches public competitor product information, identifies potential feature opportunities, generates a feature specification (PRD), and produces a tested code patch for a controlled application under strict sandbox isolation.

---

## 1. System Architecture

ShadowBuilder AI demonstrates an end-to-end autonomous agent workflow connecting product research directly to tested engineering output:

```
[ Public Competitor URL ]
           │
           ▼
     ┌───────────┐
     │   SCOUT   │  Safely extracts public HTML, blocks SSRF, attributes sources & verbatim quotes
     └─────┬─────┘
           │
           ▼
     ┌───────────┐
     │STRATEGIST │  Ranks opportunities using transparent formula; drafts structured PRD
     └─────┬─────┘
           │
           ▼
     ┌───────────┐
     │ ENGINEER  │  Synthesizes scoped code patch for allowlisted demo target files
     └─────┬─────┘
           │
           ▼
     ┌───────────┐
     │  TESTER   │  Executes fixed 'pytest tests/' in isolated disposable workspace
     └─────┬─────┘
           │
      ┌────┴────────────────────────┐
      ▼ (PASS)                      ▼ (FAIL + Retries < 2)
┌──────────────┐               ┌──────────┐
│   RESULTS    │               │ REPAIR   │  (Feeds real failure logs to Engineer; max 2 repairs)
│ (.patch artifact)            └────┬─────┘
└──────────────┘                    │
      ▲                             │
      └─────────────────────────────┘ (After repair or max retries reached)
```

### Logical Agents:
1. **Scout Agent**: Fetches public URLs safely (SSRF defense, link-local / cloud metadata IP blocking, redirect validation, response size limits), extracts features with source attribution and verbatim quotes, and honestly notes absent customer reviews.
2. **Strategist Agent**: Evaluates 3–5 feature candidates using a transparent mathematical formula:
   $$\text{Score} = 0.30 \times \text{Impact} + 0.30 \times \text{Evidence} + 0.25 \times \text{Confidence} + 0.15 \times (6 - \text{Effort})$$
   Distinguishes verified facts from speculative hypotheses, and produces a structured PRD (goals, non-goals, user stories, acceptance criteria, edge cases, test plan).
3. **Engineer Agent**: Synthesizes a minimal, clean code patch restricted to allowlisted files (`src/`, `tests/`) in the controlled target application.
4. **Sandboxed Test Runner**: Clones a clean copy of the controlled repository into a run-specific disposable directory (`temp_workspaces/<run_id>/demo-target`), applies the validated patch, and executes fixed, predefined test commands (`pytest tests/`). Strips secrets and machine paths.
5. **Bounded Repair Loop**: If tests fail, the Engineer receives actual test failure logs (traceback, exit code) and can repair up to two times before reporting a truthful verdict.

---

## 2. Quickstart & Windows PowerShell Commands

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ & npm (Tested on Node.js v24)
- Git

### Step 1: Clone or Open Workspace
```powershell
cd c:\Users\tanis\OneDrive\Desktop\AgenticAI
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
*(By default, ShadowBuilder AI runs in labeled Fixture Mode without requiring any external paid API keys. To enable live Gemini AI inference, see Section 5 below).*

### Step 3: Start the Backend (Terminal 1)
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
# Or invoke Python directly:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Verify backend health:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" | ConvertTo-Json
```

### Step 4: Start the Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 3. Controlled Target Application (`demo-target`)

The controlled target application is **Acme Metrics Service**:
- Located in `demo-target/`
- Core service modules: `src/metrics.py`, `src/exporter.py`
- Test suite: `tests/test_metrics.py`, `tests/test_exporter.py`
- Test command: `pytest tests/`

When a run is triggered:
- The target repo is cloned into an isolated temporary workspace `temp_workspaces/<run_id>/demo-target`.
- Patch modifications are validated against path traversal (`..` or `/` rejected) and file extension allowlists (`.py`, `.json`, `.md`).
- Tests execute with isolated environment variables (API keys redacted).
- Successful patches produce a downloadable `.patch` file stored in `artifacts/runs/<run_id>.patch`.

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns service status and safe configuration presence |
| `POST` | `/api/runs` | Validates target URL and queues agent orchestration run |
| `GET` | `/api/runs` | Lists recent run history |
| `GET` | `/api/runs/{run_id}` | Returns current run details and status |
| `GET` | `/api/runs/{run_id}/events` | Streams real-time workflow events via SSE |
| `GET` | `/api/runs/{run_id}/result` | Returns structured final findings, PRD, patch, and test output |
| `GET` | `/api/runs/{run_id}/patch` | Downloads the generated `.patch` file artifact |

---

## 5. Connecting a Real LLM Key (Gemini Free Tier)

ShadowBuilder AI includes native support for Google Gemini and OpenAI.

1. **Obtain a Free Key**: Open [Google AI Studio](https://aistudio.google.com/app/apikey) and click **Create API Key** (no credit card required).
2. **Configure Locally**: Open your local `.env` file and set:
   ```dotenv
   LLM_PROVIDER=gemini
   LLM_API_KEY=your_actual_key_here
   LLM_MODEL=gemini-2.5-flash
   ```
3. **Restart the Backend Server**: The dashboard Settings tab will update to indicate real model integration is active.
4. **Security Notice**: Never paste your API key in chat, and never commit `.env` to version control.

---

## 6. Three-Minute Judge Demo Procedure

1. **0:00–0:30 (Problem & Architecture)**:
   - Open [http://localhost:3000](http://localhost:3000). Show the dark developer SaaS dashboard, connected backend health indicator, and the 5-node LangGraph agent pipeline.
2. **0:30–1:15 (Scout & Strategist)**:
   - Click the preset `PostHog (Live)` or `Example Domain`.
   - Click **Start Agent Analysis**.
   - Watch the live SSE event stream as the Scout Agent validates the URL against SSRF, extracts public page headings and features, and attributes verbatim excerpts with source links.
   - Switch to the **Ranked Opportunities & PRD** tab to review the 3 prioritized candidates, transparent formula breakdown, and structured PRD.
3. **1:15–2:15 (Engineer & Isolated Test Runner)**:
   - Watch the Engineer Agent synthesize a constrained patch for `src/exporter.py` and `tests/test_exporter.py`.
   - Switch to the **Sandbox Test Terminal** tab to inspect actual `pytest tests/` stdout, exit code `0`, and duration.
4. **2:15–3:00 (Proof & Patch Download)**:
   - Switch to the **Code Patch & Diff** tab to inspect the syntax-styled additions and deletions.
   - Click **Download .patch** to download the verified patch file.
   - Switch to **Run History** to show all runs persisted in SQLite.
