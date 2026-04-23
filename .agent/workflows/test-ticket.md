---
description: Validate agent reasoning across varying ticket scenarios and edge cases
---

# Test Ticket Workflow

This workflow tests the CRM_Triage_Agent's ability to reason, call tools, and handle edge cases correctly.

## Steps

1. Assert the server is running on port 3000. Start it if it is not.

2. **Validation Test (Missing Field)**:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
     -Headers @{"Content-Type"="application/json"} `
     -Body '{"name":"EmptyUser","email":"test@test.com"}' -SkipHttpErrorCheck -StatusCodeVariable "code"
   Write-Host "Returned Code: $code"
   ```
   - **Assertion:** Verify it returns `400 Bad Request` because the required `message` field is missing.

3. **Autonomous Routing Test (High Urgency)**:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
     -Headers @{"Content-Type"="application/json"} `
     -Body '{"name":"Alice","email":"alice@test.com","message":"URGENT: I cannot access my account and my production site is down!"}'
   ```
   - **Assertion 1:** Verify the LLM identifies `urgency: "High"`.
   - **Assertion 2:** Verify the `routing` output indicates a notification was sent to urgent channels.
   - **Assertion 3:** Confirm the response `crmId` matches the regex `^TKT-\d{6}$`.

4. **Autonomous Routing Test (Routine Inquiry)**:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
     -Headers @{"Content-Type"="application/json"} `
     -Body '{"name":"Bob","email":"bob@test.com","message":"Hello, where can I find your pricing documentation?"}'
   ```
   - **Assertion:** Verify the LLM chooses the `send_standard_email` route and correctly logs the ticket to the CRM.

5. **Schema Guard Verification**:
   Check the server logs to ensure that for every tool call (CRM, Email, Slack), the **Schema Guard** validated the tool arguments before the tool was allowed to execute.
