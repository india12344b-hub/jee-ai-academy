# JEE AI Academy

## Deploy the React app on Cloudflare Pages (not a plain static Worker)

1. Push the contents of this project folder to your GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
3. Set the **Root directory** to the repository root (`/` or leave it blank).
4. Set **Build command** to `npm run build`.
5. Set **Build output directory** to `dist`. The repository's `wrangler.toml` also declares `./dist` as the Pages output directory.
6. In the Pages project's **Settings → Variables and Secrets**, add `GROQ_API_KEY` as a secret.
7. Redeploy and open the new `*.pages.dev` URL.

Do not run `wrangler deploy` for this Pages setup. The Vite app entry point is the root `index.html`; `src/main.jsx` is bundled into `dist` during the build. The `/api/chat` endpoint is handled by `functions/api/chat.js`. Keep the Cloudflare Pages root directory at the repository root; `public` is not the app root.

Never commit your Groq API key to GitHub.

## Study features

- Assistant answers use Markdown and KaTeX for inline math and display derivations. Answers wrapped in clear formula-style parentheses are also recognized without interpreting ordinary prose or code as math.
- Choose English or Hinglish under **Spoken explanation**. Written answers stay in English; Hinglish speech is generated only when the user presses Play. Speech-language preference and saved notes stay in this browser.
- Long assistant answers (more than 200 words) can be downloaded as locally generated PDFs. Use **My Notes** to save, reopen, or remove answers.


## Teaching refinements in this build

- Topic-first lessons: enter a chapter/topic before sending a question.
- Lesson responses with Markdown headings are displayed as independently expandable sections; the first section starts open.
- The teacher system prompt prioritizes provided source context and requires supplementary knowledge to be labelled **Beyond Your Material**.
- The interface label is **Verbal Explanation** and keeps the existing browser speech playback, pause/resume, and optional Hinglish conversion.
- Markdown tables are styled for lesson explanations; the whiteboard panel offers a one-click prompt to request a revision/comparison table.
- PDF text extraction and TXT/MD/CSV/JSON text file extraction run in the browser.
- Image/video files are recognized in the UI, but OCR/image understanding and video transcription/frame extraction are **not connected yet**. Video URLs are stored as context but are not downloaded or transcribed. The UI tells the student about these limitations rather than claiming the teacher has read/watched them.
- The current whiteboard table workflow renders tables inside lesson answers; a fully editable canvas, synchronized avatar animation, OCR, and video transcription are follow-on implementation tasks.
