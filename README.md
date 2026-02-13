# Tepex

Single-page temporary email app powered by Mail.tm.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Deploy on Vercel

This repo is preconfigured for Vercel:
- `api/index.js` exports the Express app as a serverless function.
- `vercel.json` rewrites all routes through that function.

Steps:
1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Deploy (no special build command needed).

After deploy, verify:
- `https://<your-domain>/api/health`
