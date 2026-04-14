---
description: Test the system by submitting tickets with different urgency levels
---

# Test Ticket Workflow

This workflow tests the AI triage system by submitting tickets with varying urgency and sentiment to verify correct classification.

## Steps

1. Ensure the server is running:
```bash
npm start
```

2. Submit a **high urgency** ticket:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"Alice","email":"alice@test.com","customerMessage":"This is urgent! My account is broken and I cannot access anything. I need help immediately!"}'
```
   - Expected: `urgency: "High"`, `sentiment: "Negative"`

3. Submit a **low urgency** ticket:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/triage" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"customerName":"Bob","email":"bob@test.com","customerMessage":"Hello, I have a general question about your pricing plans. Thank you."}'
```
   - Expected: `urgency: "Low"`, `sentiment: "Neutral"`

4. Submit a ticket via the **Web UI** at `http://localhost:3000/support`:
   - Fill in all fields and click Submit
   - Verify the success message shows a valid `TKT-XXXXXX` ID

5. Check that all 3 tickets appear in the Google Sheet with correct data.
