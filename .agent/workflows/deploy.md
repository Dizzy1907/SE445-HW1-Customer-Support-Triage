---
description: Deploy and push the project to GitHub (Robust CI/CD Version)
---

# Deploy Workflow

This CI/CD workflow pushes the finalized project to the GitHub repository, strictly enforcing automated tests before code is formally deployed.

## Steps

1. **Mandatory Pre-Flight Checks**:
   - Execute the `/test-ticket` workflow IN FULL.
   - If ANY assertion in the test workflow fails (e.g. edge-case failure, RegEx ID mismatch), **ABORT DEPLOYMENT IMMEDIATELY** and notify the user.

2. Check the current git status:
```bash
git status
```

3. Stage all project files safely:
```bash
git add .
```

4. Verify that sensitive files are completely omitted from the staged files:
   - `credentials.json`
   - `.env`
   - `ticket_counter.txt`
   - `node_modules/`

5. **Dynamic Commit**:
   - Pause and ask the user, *"Deployment passed tests. What commit message would you like to use?"*
   - Execute the commit using their chosen message.

6. Push to the remote repository:
```bash
git push origin main
```

7. Assurance: Verify the repository is accessible at the GitHub URL and up to date.
