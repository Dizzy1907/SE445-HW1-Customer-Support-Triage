---
description: Set up the Customer Support Triage System from scratch
---

# Setup Workflow

This workflow initializes the Customer Support Triage System project.

## Steps

1. Install all Node.js dependencies:
```bash
npm install
```

2. Verify that `credentials.json` (Google Service Account key) exists in the project root. If missing, create one from Google Cloud Console → IAM & Admin → Service Accounts.

3. Verify that `.env` file exists with the Groq API key:
```
GROQ_API_KEY=your_groq_api_key_here
```

4. Ensure the Google Sheet is shared with the service account email from `credentials.json`.

5. Start the development server:
```bash
npm start
```

6. Open the browser and navigate to `http://localhost:3000/support` to verify the UI loads correctly.
