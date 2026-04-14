---
description: Run the full 4-step triage pipeline end-to-end (Robust Version)
---

# Run Pipeline Workflow

This workflow executes the full Customer Support Triage pipeline, programmatically verifying state persistence across all 4 stages.

## Steps

1. Start server if not running safely.

2. Execute the trigger payload to the Express Webhook:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"Test User","email":"test@example.com","customerMessage":"My system is broken and it is urgent!"}'
```

3. Extract the generated `TKT-XXXXXX` ID from the returned JSON response.
   - **Internal Assertion:** The Agent must track this exact ID explicitly in memory.

4. Assert the exact `TKT-XXXXXX` ID successfully passed through every pipeline phase via backend logs:
   - **Webhook Trigger Phase:** Check log for incoming payload.
   - **Data Processing Phase:** Check log asserting exactly `"Processing completed. Ticket ID: TKT-XXXXXX"`.
   - **External CRM Phase:** Check log asserting exactly `"Successfully pushed to External API (CRM). ID: TKT-XXXXXX"`.
   - **AI Phase:** Confirm AI returned valid JSON completion.

5. Visual/External Verification:
   - Provide the user with the Google Sheets link and instruct them to verify that the specific sequence ID perfectly hit the remote database.
