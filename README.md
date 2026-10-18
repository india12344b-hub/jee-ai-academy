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
