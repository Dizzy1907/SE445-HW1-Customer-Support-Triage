---
description: Run the full 4-step triage pipeline end-to-end
---

# Run Pipeline Workflow

This workflow executes the full Customer Support Triage pipeline to process a support ticket through all 4 stages.

## Steps

1. Make sure the server is running:
```bash
npm start
```

2. Submit a test ticket via PowerShell to trigger the webhook:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"Test User","email":"test@example.com","customerMessage":"My system is broken and it is urgent!"}'
```

3. Verify the pipeline output includes all 4 steps:
   - **Step 1 — Webhook Trigger:** The POST request is received by Express
   - **Step 2 — Processing Function:** A `TKT-XXXXXX` ID is generated and data is normalized
   - **Step 3 — External API:** The ticket is appended to Google Sheets
   - **Step 4 — AI Completion:** Groq (Llama 3.1) analyzes sentiment and urgency

4. Confirm the ticket appears in the live Google Sheet:
   https://docs.google.com/spreadsheets/d/1E-9ap6-Un5IRfNPsB_Ll1GwpCBfVFp_iru5QbPsUQEk

5. Verify the JSON response contains `ticketId`, `sentiment`, `urgency`, and `suggestedResponse`.
