# Customer Support Triage System — HW1

**SE445 | İbrahim Ege ÇETİNKAYA | March 2026**

A fully functional Customer Support Triage pipeline built with Node.js + Express.  
It follows the required 4-step pattern: **Webhook → Processing → External API (Google Sheets) → AI Completion**.

---

## Pipeline Overview

```
Trigger (HTTP Webhook / Web Form)
        ↓
processTicketData()   — assigns TKT-000001, 000002 … IDs, normalises fields
        ↓
sendAutoReplyEmail()  — acknowledges receipt instantly (via Nodemailer)
        ↓
Google Sheets API     — appends ticket row via googleapis + Service Account
        ↓
analyzeWithAI()       — returns sentiment, urgency & suggested response
        ↓
Workflow Branching    — Routes into specific Connectors based on Urgency/Sentiment
      ↙       ↘
  Slack/Teams    Escalation Email / General Email (via Nodemailer)
        ↓
HTTP 200 response     — returns ticketId, AI analysis, routing details to caller
```

**Live Spreadsheet:** https://docs.google.com/spreadsheets/d/1E-9ap6-Un5IRfNPsB_Ll1GwpCBfVFp_iru5QbPsUQEk

---

## Setup

1. **Install Node.js** (v14+)
2. Place your Google Service Account key file as `credentials.json` in the project root (this file is gitignored — never commit it)
3. Update `.env` with your `GROQ_API_KEY` and Google App Passwords for Nodemailer (`EMAIL_USER` and `EMAIL_PASS`).
4. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open the support form in your browser:
   ```
   http://localhost:3000/support
   ```

---

## Testing

### Via the Web Form
Navigate to `http://localhost:3000/support` and fill in the form.

### Via cURL (macOS/Linux)
```bash
curl -X POST http://localhost:3000/api/triage \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Alice","email":"alice@example.com","customerMessage":"The system is broken and it is urgent!"}'
```

### Via PowerShell (Windows)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"Alice","email":"alice@example.com","customerMessage":"The system is broken and it is urgent!"}'
```

---

## Project Structure

```
HW1/
├── index.js              ← Full 4-step pipeline logic
├── package.json
├── credentials.json      ← Google Service Account key (gitignored)
├── .env                  ← API keys (gitignored)
├── ticket_counter.txt    ← Local state for sequential IDs (gitignored)
├── public/
│   └── index.html        ← Glassmorphism Web UI
├── screenshots/          ← Evidence screenshots for the report
└── HW1_Report.md         ← Full project report
```
