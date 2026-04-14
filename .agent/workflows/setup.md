---
description: Set up the Customer Support Triage System from scratch (Robust Version)
---

# Setup Workflow

This workflow initializes the Customer Support Triage System project while handling common environmental errors autonomously.

## Steps

1. Install all Node.js dependencies:
```bash
npm install
```

2. Verify that `credentials.json` exists in the project root.
   - If missing, pause and instruct the user to create one from Google Cloud Console.

3. Verify environment variables safely:
   - If `.env` is missing but `.env.example` exists, automatically copy `.env.example` to `.env`.
   - Pause and securely prompt the user to paste their Groq API key into `.env` before proceeding.

4. Ensure port 3000 is safely available:
```powershell
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($process) { Stop-Process -Id $process.OwningProcess -Force; Write-Host "Killed rogue process on port 3000" }
```

5. Start the development server autonomously:
```bash
npm start
```

6. Open the browser and navigate to `http://localhost:3000/support` to verify the UI loads correctly.

