---
description: Ensure the AI triage system is robust by submitting varying tickets and edge-cases (Robust Version)
---

# Test Ticket Workflow

This workflow tests the AI triage system by submitting varying payloads and ensures that edge cases fail gracefully.

## Steps

1. Assert the server is running on port 3000. Start it if it is not.

2. **Negative Edge Case Testing (Bad Payload)**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"EmptyUser","email":""}' -SkipHttpErrorCheck -StatusCodeVariable "code"
Write-Host "Returned Code: $code"
```
   - **Assertion:** Verify it gracefully blocks the request without crashing, returning specifically `400 Bad Request`.

3. **High Urgency Test**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"Alice","email":"alice@test.com","customerMessage":"This is urgent! My account is broken and I cannot access anything. I need help immediately!"}'
```
   - **Assertion 1:** Validate `urgency: "High"`, `sentiment: "Negative"`.
   - **Assertion 2:** Apply a strict RegEx test to the response `crmId`. It MUST exactly match `^TKT-\d{6}$`.

4. **Low Urgency Test**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"Bob","email":"bob@test.com","customerMessage":"Hello, I have a general question about your pricing plans. Thank you."}'
```
   - **Assertion:** Validate `urgency: "Low"`.

5. **Visual UI Assurance**:
   - Spawns a headless `browser_subagent` to fill the Web UI form at `http://localhost:3000/support`.
   - Requires the agent to read the rendered success DOM to confirm `TKT-` appears.

