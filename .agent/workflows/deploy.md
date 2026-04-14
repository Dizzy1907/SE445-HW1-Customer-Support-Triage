---
description: Deploy and push the project to GitHub
---

# Deploy Workflow

This workflow pushes the finalized project to the GitHub repository.

## Steps

1. Check the current git status:
```bash
git status
```

2. Stage all project files:
```bash
git add .
```

3. Verify that sensitive files are NOT staged (should be in `.gitignore`):
   - `credentials.json` — Google Service Account key
   - `.env` — Groq API key
   - `ticket_counter.txt` — Local server state
   - `node_modules/` — Dependencies

4. Commit with a descriptive message:
```bash
git commit -m "Update: Customer Support Triage System with Antigravity workflows"
```

5. Push to the remote repository:
```bash
git push origin main
```

6. Verify the repository is accessible at the GitHub URL and all files are visible.
