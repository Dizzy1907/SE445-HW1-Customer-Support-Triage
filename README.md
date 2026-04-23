# CRM Support Triage System — HW2: Agentic CRM Orchestration

**SE445 | İbrahim Ege ÇETİNKAYA | April 2026**

A high-performance, autonomous AI agent built for customer support triage. Unlike standard sequential pipelines, this system utilizes a **True Agentic Architecture** where an LLM (Llama 3.3) autonomously decides how to handle each ticket using a Tool-Calling loop.

---

## Agent Architecture: The Reason-Act (ReAct) Loop

This project follows a professional-grade multi-agent orchestration pattern:

```
Trigger (HTTP Webhook / Web Form)
        ↓
Agent Initialization (Context Injection)
        ↓
  ┌───[ Agent Reasoning Loop ]───┐
  │                              │
  │  LLM (Llama 3.3 70B)         │
  │  Analyzes ticket and picks:  │
  │                              │
  │  1. update_crm_sheet()       │ ← Tool Result
  │  2. send_auto_reply()        │ ← Tool Result
  │  3. [Routing Tool Decision]  │ ← Tool Result
  │                              │
  └──────────────────────────────┘
        ↓
HTTP 200 response (Final Agent Summary)
```

### Core Components
- **`agent.js`**: The "Brain." A pure, zero-dependency autonomous agent module containing the Tool Registry and Task Lifecycle.
- **`index.js`**: The "Runtime." Manages the multi-turn agent loop, state persistence, and dependency injection (IoC).
- **Groq Llama 3.3**: The "Reasoning Engine." Provides high-speed, reliable tool calling and sentiment/urgency analysis.
- **Google Sheets CRM**: The "Persistence Layer." Automatically synchronized with every processed ticket.

---

## Live Spreadsheet
**CRM View:** [Google Sheets CRM](https://docs.google.com/spreadsheets/d/1E-9ap6-Un5IRfNPsB_Ll1GwpCBfVFp_iru5QbPsUQEk)

---

## Setup & Deployment

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Configuration:**
   Place your Google Service Account key as `credentials.json` in the root. Update `.env` with:
   - `GROQ_API_KEY`: Your Groq Cloud API key.
   - `EMAIL_USER` / `EMAIL_PASS`: Gmail App Passwords for Nodemailer.
3. **Start the Agentic Runtime:**
   ```bash
   npm start
   ```
4. **Access the Support Portal:**
   Visit `http://localhost:3000/support` to submit tickets via the glassmorphism UI.

---

## Testing & Validation

The agent is continuously validated against a 51-point integration suite:

```bash
node test-pipeline.js
```

The suite verifies:
- **Autonomous Tool Selection**: Confirms the LLM calls CRM and Auto-Reply before routing.
- **Schema Integrity**: Validates that no malformed data reaches external APIs.
- **Data Persistence**: Cross-references the Agent's output with real rows in Google Sheets.
- **Dynamic Branching**: Ensures the LLM correctly identifies "Urgent" vs "Standard" vs "Negative" tickets.

---

## File Structure

- `agent.js`: **Pure Agent Module** (Logic & Tools)
- `index.js`: **Framework Runtime** (Orchestration & Context)
- `test-pipeline.js`: **Integration Test Suite**
- `HW2_Report.md`: **Final Academic Report**
- `public/`: Frontend Support Portal
