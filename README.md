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


## UX refinements (October 2026)

- Compact lesson header and voice controls to give explanations more room.
- Optional floating whiteboard that can be opened from the lesson, dragged by its title bar, resized from the corner, minimized, maximized, or closed.
- Whiteboard notes persist in browser local storage when hidden and can be downloaded to the student's device as a Markdown file using **Save to Device**.
- Teacher instructions invite students to open the optional board when a visual explanation would help.

The whiteboard currently displays the latest teacher response as retained notes; a separate model-generated drawing/action stream and a full synchronized avatar canvas remain future work.

## Full-screen focused lesson mode
- Use **Full screen** in the lesson heading to hide the site navigation and lesson setup controls.
- Focus mode displays teacher explanations and a persistent **Open whiteboard** control.
- The message composer collapses to **Click to message your teacher** and expands on demand.
- Use **Exit full screen** to return to the standard workspace.
- The floating whiteboard remains available above the lesson and can be minimized, resized, maximized, or closed without clearing saved board notes.


## Messaging-first and interactive lesson UX (October 2026)
- Removed subject-selection cards from the home screen and removed the Learn / Subjects navigation entry. Students can start by messaging the teacher directly.
- Improved contrast for the spoken-explanation controls and Save to My Notes actions in light and dark themes.
- In full-screen focus mode, students can interrupt narration with **Ask by voice** or open the message composer using **Message**. Sending a message or starting voice dictation stops the current narration so the student can interact naturally.
- Voice questions use browser speech recognition where supported; typed questions remain available as a fallback.


## Interactive teacher playback and board separation (October 2026)
- The lesson toolbar and full-screen focus bar both provide Teacher Explanation playback controls.
- While narration is playing, the Teaching Progress slider jumps backward/forward by sentence-sized speech chunks. Browser speech synthesis does not expose precise audio seeking, so this is chunk-level rewind rather than millisecond-accurate scrubbing.
- Follow-up prompts instruct the teacher to answer conversationally and clarify only the current doubt instead of regenerating the entire lesson.
- Whiteboard content uses a separate `:::whiteboard ... :::` response payload. The app strips this from the main answer and renders it only in the optional board, preventing the board from automatically duplicating the written explanation.
- The whiteboard storage key was versioned to avoid restoring legacy board content that previously duplicated the full lesson. New board notes remain in local browser storage when the board is minimized or closed.
- The teacher controls board content; there are no student-facing pen, eraser, or marker tools.

## Reference classroom UX (October 2026)
- Full-screen lesson mode keeps the branded top bar visible and replaces the previous plain text-only focus layout with a teacher rail, primary explanation canvas, and an optional floating whiteboard.
- The teacher rail includes the avatar artwork, playback controls, sentence-level teaching progress/rewind, voice question and typed-message entry points.
- When the whiteboard is open, the main explanation reserves room for it so the board does not cover the lesson text. The board remains independently movable/resizable and keeps its separate teacher-provided payload.
- The avatar artwork is bundled locally at `public/teacher-avatar.png`; no remote image service is required at runtime.
- This is a polished UI and interaction layout. A live animated avatar whose lip movement is synchronized with speech still requires a separate animation/speech synchronization implementation.
