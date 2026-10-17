# JEE AI Academy — Cloudflare Pages + Groq

Free-tier JEE tutoring prototype: PDF text extraction in browser, GPT-OSS 120B via Groq, math rendering, browser speech dictation and text-to-speech.

## Deploy
1. Extract this ZIP and upload its contents to a new GitHub repository. Never upload an API key.
2. Create a key at https://console.groq.com/keys .
3. In Cloudflare dashboard, Workers & Pages → Create → Pages → Connect to Git; select your repository.
4. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
5. In Pages Settings → Variables and Secrets, add `GROQ_API_KEY` as a secret, then deploy/redeploy.
6. Open the pages.dev site, upload a PDF, select a page, and ask a question.

## Notes
- Scanned PDFs, complex equation layouts and diagrams may not extract accurately; this version has no OCR/diagram vision.
- PDF text is extracted in the browser; selected page excerpts are sent to Groq when asking a question.
- Browser speech recognition varies by browser and may rely on a third-party service. This is turn-based voice, not full-duplex live voice.
- Groq free tier has request and token quotas; 1,000 long lessons/day is not guaranteed.
- No accounts, persistent progress tracking, or public-site abuse protection in v1. Do not share an unrestricted public link; protect it with Cloudflare Access or authentication first.
- Upload only PDFs you have the right to use.

## Local UI
`npm install` then `npm run dev`. The chat API requires Cloudflare Pages Functions. To test the full app locally, build and use Wrangler Pages dev with a `.dev.vars` file containing `GROQ_API_KEY=...`. Never commit `.dev.vars`.
