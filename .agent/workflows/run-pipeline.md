---
description: Execute the autonomous Agentic Triage mission
---

# Run Agentic Mission Workflow

This workflow triggers the autonomous CRM_Triage_Agent, which manages its own multi-turn mission loop using Llama 3.3.

## Steps

1. Start the CRM Support Triage Runtime:
   ```bash
   npm start
   ```

2. Trigger the agent mission via an HTTP POST payload:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
     -Headers @{"Content-Type"="application/json"} `
     -Body '{"name":"İbrahim","email":"ibrahim@example.com","message":"Production server is down and services are inaccessible. Urgent help needed!"}'
   ```

3. Monitor the Autonomous Reasoning Loop:
   The agent will now engage in a multi-turn conversation with the tools. Assert that the following sequence occurs in the server logs:
   - **Reasoning Phase:** Agent identifies the need to log the ticket and acknowledges the user.
   - **Action 1:** `update_crm_sheet` tool called autonomously.
   - **Action 2:** `send_auto_reply` tool called autonomously.
   - **Action 3:** Agent analyzes urgency and calls `notify_urgent_channels`.
   - **Finalization:** Agent provides a summary string of the completed mission.

4. Internal Verification:
   - Confirm the returned JSON contains a `TKT-XXXXXX` ID.
   - Confirm the `analysis` object contains Sentiment, Urgency, and a Suggested Response generated dynamically by the LLM.

5. External CRM Verification:
   Verify the live entry in the [Google Sheets CRM](https://docs.google.com/spreadsheets/d/1E-9ap6-Un5IRfNPsB_Ll1GwpCBfVFp_iru5QbPsUQEk).
