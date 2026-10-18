import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import * as pdfjs from 'pdfjs-dist';
import { downloadAnswerPdf } from './answerPdf.js';
import { markdownWordCount, mathMarkdownToSpeech, normalizeMathMarkdown } from './math.js';
import 'katex/dist/katex.min.css';
import './style.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const SYSTEM = `You are an expert JEE Main and Advanced tutor. Always write the complete teaching answer in English, regardless of the student's selected spoken-language preference. Teach patiently and accurately. Explain intuition before formulas, show stepwise derivations, check units and assumptions, and use correct LaTeX. Format inline math with \\( ... \\) and important equations or multi-line derivations with \\[ ... \\] on their own lines. Prefer hints before full solutions unless requested. Ask one short comprehension question at a time. Use the supplied textbook excerpt as context, but never pretend to see pages not provided.`;
const NOTES_STORAGE_KEY = 'jee-ai-academy-notes-v1';
const VOICE_STORAGE_KEY = 'jee-ai-academy-voice-language-v1';
const speechMathCommands = [
  'frac',
  'sqrt',
  'text',
  'mathrm',
  'mathbf',
  'operatorname',
  'cdot',
  'times',
  'div',
  'pm',
  'leq',
  'geq',
  'neq',
  'approx',
  'rightarrow',
  'infty',
];

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readVoiceLanguage() {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) === 'hinglish' ? 'hinglish' : 'english';
  } catch {
    return 'english';
  }
}

function readSavedNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (note) =>
        note &&
        typeof note.id === 'string' &&
        typeof note.answer === 'string' &&
        typeof note.createdAt === 'string',
    );
  } catch {
    return [];
  }
}

function titleForNote(question, answer) {
  const source = question || answer.split('\n').find((line) => line.trim()) || 'JEE AI lesson';
  return source
    .replace(/^#+\s*/, '')
    .replace(/[*_`]/g, '')
    .trim()
    .slice(0, 90);
}

function safeDate(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : parsed.toLocaleString();
}

function answerForSpeech(markdown) {
  let text = mathMarkdownToSpeech(markdown);
  for (const command of speechMathCommands) {
    text = text.replace(new RegExp(`\\\\${command}\\b`, 'g'), ' ');
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, 12000);
}

async function requestChat(payload) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    if (response.status === 404) {
      throw new Error(
        'Chat endpoint not found (HTTP 404). Confirm Cloudflare Pages deployed the current chat Function.',
      );
    }
    throw new Error(
      responseText.trim()
        ? `Chat service returned an invalid response (HTTP ${response.status}).`
        : `Chat service returned an empty response (HTTP ${response.status}). Please try again.`,
    );
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
      >
        {normalizeMathMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}

function App() {
  const [pdf, setPdf] = useState('');
  const [pages, setPages] = useState([]);
  const [page, setPage] = useState(1);
  const [reading, setReading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: createId(),
      role: 'assistant',
      content: 'Welcome, Captain! Upload a JEE textbook PDF, choose a page, and ask me to teach a topic. 🎓',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState(readVoiceLanguage);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [speechLoadingId, setSpeechLoadingId] = useState(null);
  const [speechTexts, setSpeechTexts] = useState({});
  const [notes, setNotes] = useState(readSavedNotes);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [notesError, setNotesError] = useState('');
  const [savedNoteId, setSavedNoteId] = useState(null);
  const bottom = useRef(null);
  const recognition = useRef(null);
  const playback = useRef(null);
  const speechRequest = useRef(0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(
    () => () => {
      playback.current = null;
      window.speechSynthesis?.cancel();
      recognition.current?.stop();
    },
    [],
  );

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, voiceLanguage);
    } catch {
      setError('Could not save the voice-language preference in this browser.');
    }
  }, [voiceLanguage]);

  function stopSpeech() {
    speechRequest.current += 1;
    if (playback.current) playback.current.cancelled = true;
    playback.current = null;
    window.speechSynthesis?.cancel();
    setActiveSpeechId(null);
    setSpeechPaused(false);
    setSpeechLoadingId(null);
  }

  function pauseSpeech() {
    if (!activeSpeechId) return;
    window.speechSynthesis.pause();
    setSpeechPaused(true);
  }

  function resumeSpeech() {
    if (!activeSpeechId) return;
    window.speechSynthesis.resume();
    setSpeechPaused(false);
  }

  function startSpeech(text, messageId, language) {
    stopSpeech();
    const synthesis = window.speechSynthesis;
    if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('Speech playback is not supported in this browser.');
      return;
    }

    const voices = synthesis.getVoices();
    const isHinglish = language === 'hinglish';
    const voice =
      (isHinglish
        ? voices.find((candidate) => candidate.lang.toLowerCase().startsWith('hi-in')) ||
          voices.find((candidate) => candidate.lang.toLowerCase().startsWith('hi'))
        : voices.find((candidate) => candidate.lang.toLowerCase().startsWith('en-in'))) ||
      voices.find((candidate) => candidate.lang.toLowerCase().startsWith('en'));
    const session = { id: messageId, cancelled: false };
    const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) || [text];
    const chunks = sentences.flatMap((sentence) => {
      const parts = [];
      let remaining = sentence.trim();
      while (remaining.length > 220) {
        let splitAt = remaining.lastIndexOf(' ', 220);
        if (splitAt < 1) splitAt = 220;
        parts.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
      }
      if (remaining) parts.push(remaining);
      return parts;
    });
    let chunkIndex = 0;
    playback.current = session;
    setActiveSpeechId(messageId);
    setSpeechPaused(false);

    const speakNext = () => {
      if (playback.current !== session || session.cancelled) return;
      const chunk = chunks[chunkIndex++]?.trim();
      if (!chunk) {
        playback.current = null;
        setActiveSpeechId(null);
        setSpeechPaused(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = isHinglish ? (voice?.lang || 'hi-IN') : (voice?.lang || 'en-IN');
      utterance.rate = 0.95;
      if (voice) utterance.voice = voice;
      utterance.onend = speakNext;
      utterance.onerror = (event) => {
        if (playback.current !== session || session.cancelled || event.error === 'canceled') return;
        playback.current = null;
        setActiveSpeechId(null);
        setError('Speech playback failed. Please try another available voice.');
      };
      synthesis.speak(utterance);
    };

    speakNext();
  }

  async function playAnswer(message) {
    stopSpeech();
    const requestId = speechRequest.current;
    setError('');
    let speechText = answerForSpeech(message.content);
    if (voiceLanguage === 'hinglish') {
      speechText = speechTexts[message.id];
      if (!speechText) {
        setSpeechLoadingId(message.id);
        try {
          const hasHindiVoice = window.speechSynthesis
            ?.getVoices()
            .some((voice) => voice.lang.toLowerCase().startsWith('hi'));
          const result = await requestChat({
            system: `Convert the supplied English JEE teaching answer into a natural spoken Hinglish explanation for speech only. Preserve every important concept, qualification, and step. Use Hindi/Hinglish grammar and natural conversational tone, while keeping standard JEE technical terms and formula names in English. ${
              hasHindiVoice
                ? 'Write Hindi words in Devanagari and retain technical terms in English.'
                : 'Write Hindi words in simple Roman-script Hinglish so an English-India speech voice can pronounce them.'
            } Output only the spoken explanation, with no headings, labels, or notes.`,
            context: `English answer to convert for speech only:\n${message.content.slice(0, 12000)}`,
            messages: [{ role: 'user', content: 'Create the spoken Hinglish explanation now.' }],
          });
          speechText = String(result.answer || '').trim();
          if (!speechText) throw new Error('The Hinglish speech version was empty. Try again.');
          setSpeechTexts((current) => ({ ...current, [message.id]: speechText }));
        } catch (speechError) {
          if (requestId !== speechRequest.current) return;
          setError(`Could not prepare Hinglish speech: ${speechError.message}`);
          setSpeechLoadingId(null);
          return;
        }
        if (requestId !== speechRequest.current) return;
      }
      setSpeechLoadingId(null);
    }
    startSpeech(speechText, message.id, voiceLanguage);
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF.');
      return;
    }
    setReading(true);
    setError('');
    try {
      const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const extractedPages = [];
      for (let index = 1; index <= document.numPages; index += 1) {
        const pdfPage = await document.getPage(index);
        const content = await pdfPage.getTextContent();
        extractedPages.push(content.items.map((item) => item.str).join(' '));
      }
      setPages(extractedPages);
      setPage(1);
      setPdf(file.name);
      setMessages([
        {
          id: createId(),
          role: 'assistant',
          content: `Loaded **${file.name}** (${extractedPages.length} pages). Choose a page and ask me to explain it. Scanned PDFs may need OCR.`,
        },
      ]);
    } catch (uploadError) {
      setError(`Could not read PDF: ${uploadError.message}`);
    } finally {
      setReading(false);
    }
  }

  function listen() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is unavailable. Try Chrome or type your question.');
      return;
    }
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    stopSpeech();
    const voiceInput = new SpeechRecognition();
    recognition.current = voiceInput;
    voiceInput.lang = voiceLanguage === 'hinglish' ? 'hi-IN' : 'en-IN';
    voiceInput.interimResults = false;
    voiceInput.onresult = (event) => {
      setInput((current) =>
        `${current}${current ? ' ' : ''}${event.results[0][0].transcript}`,
      );
    };
    voiceInput.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    voiceInput.onerror = (event) => {
      setError(`Microphone error: ${event.error}`);
      recognition.current = null;
      setListening(false);
    };
    try {
      voiceInput.start();
      setListening(true);
    } catch (listenError) {
      recognition.current = null;
      setListening(false);
      setError(listenError.message);
    }
  }

  async function send(question = input) {
    if (!question.trim() || loading) return;
    stopSpeech();
    setError('');
    setSavedNoteId(null);
    const userMessage = { id: createId(), role: 'user', content: question.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const textbookContext = pages.length
        ? `Textbook: ${pdf}\nSelected page ${page}/${pages.length}\n${pages
            .slice(Math.max(0, page - 2), Math.min(pages.length, page + 1))
            .map((text, index) => `[Page ${Math.max(0, page - 2) + index + 1}] ${text}`)
            .join('\n')
            .slice(0, 13000)}`
        : 'No PDF uploaded.';
      const result = await requestChat({
        system: SYSTEM,
        context: textbookContext,
        messages: nextMessages.slice(-14),
      });
      const assistantMessage = {
        id: createId(),
        role: 'assistant',
        content: result.answer || 'No answer received.',
        question: userMessage.content,
      };
      setMessages([...nextMessages, assistantMessage]);
    } catch (chatError) {
      setError(chatError.message);
    } finally {
      setLoading(false);
    }
  }

  function saveNote(message) {
    if (notes.some((note) => note.messageId === message.id)) {
      setSavedNoteId(message.id);
      return;
    }
    const note = {
      id: createId(),
      messageId: message.id,
      title: titleForNote(message.question, message.content),
      question: message.question || '',
      answer: message.content,
      createdAt: new Date().toISOString(),
    };
    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    setSavedNoteId(message.id);
    setNotesError('');
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
    } catch {
      setNotesError('Could not save notes in this browser. Check available local storage space.');
    }
  }

  function deleteNote(noteId) {
    const updatedNotes = notes.filter((note) => note.id !== noteId);
    setNotes(updatedNotes);
    setSelectedNoteId((current) => (current === noteId ? null : current));
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
      setNotesError('');
    } catch {
      setNotesError('Could not update saved notes in this browser.');
    }
  }

  function clearNotes() {
    if (!notes.length || !window.confirm('Delete all saved notes? This cannot be undone.')) return;
    setNotes([]);
    setSelectedNoteId(null);
    try {
      localStorage.removeItem(NOTES_STORAGE_KEY);
      setNotesError('');
    } catch {
      setNotesError('Could not clear saved notes in this browser.');
    }
  }

  function downloadPdf(message) {
    try {
      downloadAnswerPdf({ answer: message.content, question: message.question });
    } catch {
      setError('Could not create the answer PDF. Please try again.');
    }
  }

  const selectedNote = notes.find((note) => note.id === selectedNoteId);
  const savedMessageIds = new Set(notes.map((note) => note.messageId));

  return (
    <div className="app">
      <header>
        <div className="brand">
          🎓 JEE <span>AI Academy</span>
        </div>
        <div className="header-actions">
          <button className="secondary notes-open" onClick={() => setNotesOpen(true)}>
            My Notes <span className="notes-count">{notes.length}</span>
          </button>
          <span className="tag">GPT-OSS 120B · Groq</span>
        </div>
      </header>
      <div className="layout">
        <aside>
          <h2>📚 Textbook</h2>
          <label className="upload">
            {reading ? 'Reading PDF...' : '＋ Upload PDF'}
            <input type="file" accept="application/pdf" onChange={upload} disabled={reading} />
          </label>
          {pdf && (
            <>
              <p className="filename">{pdf}</p>
              <p className="muted">{pages.length} pages · text extracted in browser</p>
              <label className="field">
                Page{' '}
                <input
                  type="number"
                  min="1"
                  max={pages.length}
                  value={page}
                  onChange={(event) =>
                    setPage(Math.max(1, Math.min(pages.length, Number(event.target.value) || 1)))
                  }
                />
              </label>
              <input
                type="range"
                min="1"
                max={pages.length}
                value={page}
                onChange={(event) => setPage(Number(event.target.value))}
                aria-label="Select textbook page"
              />
              <div className="preview">
                {pages[page - 1]?.slice(0, 900) || 'No extractable text on this page.'}
              </div>
            </>
          )}
          <div className="help">
            <b>How to study</b>
            <p>Choose a page and ask “Teach this concept from basics for JEE Advanced.”</p>
            <p>Only relevant excerpts are sent to the AI.</p>
          </div>
        </aside>
        <main>
          <div className="chat-head">
            <div>
              <h1>AI JEE Teacher</h1>
              <p>Concepts · Derivations · Doubts · Practice</p>
            </div>
            <button
              className="secondary"
              onClick={() => {
                stopSpeech();
                setMessages([
                  { id: createId(), role: 'assistant', content: 'New lesson started. What shall we learn?' },
                ]);
                setError('');
              }}
            >
              New lesson
            </button>
          </div>
          <div className="messages">
            {messages.map((message) => {
              const saved = savedMessageIds.has(message.id);
              const wordCount = message.role === 'assistant' ? markdownWordCount(message.content) : 0;
              return (
                <article key={message.id} className={`message ${message.role}`}>
                  <div className="who">{message.role === 'assistant' ? '🎓 Teacher' : '👤 You'}</div>
                  <Markdown>{message.content}</Markdown>
                  {message.role === 'assistant' && (
                    <div className="message-actions">
                      {activeSpeechId === message.id ? (
                        <>
                          <button
                            className="message-action"
                            onClick={speechPaused ? resumeSpeech : pauseSpeech}
                            aria-label={speechPaused ? 'Resume reading answer' : 'Pause reading answer'}
                          >
                            {speechPaused ? '▶ Resume' : '⏸ Pause'}
                          </button>
                          <button className="message-action" onClick={stopSpeech}>
                            ■ Stop
                          </button>
                        </>
                      ) : (
                        <button
                          className="message-action"
                          onClick={() => playAnswer(message)}
                          disabled={speechLoadingId === message.id}
                        >
                          {speechLoadingId === message.id
                            ? 'Preparing speech...'
                            : `▶ Play ${voiceLanguage === 'hinglish' ? 'Hinglish' : 'English'}`}
                        </button>
                      )}
                      {wordCount > 200 && (
                        <button
                          className="message-action"
                          onClick={() => downloadPdf(message)}
                        >
                          ⬇ Download PDF
                        </button>
                      )}
                      <button
                        className="message-action"
                        onClick={() => saveNote(message)}
                        disabled={saved}
                        aria-label={saved ? 'Answer saved to My Notes' : 'Save answer to My Notes'}
                      >
                        {saved || savedNoteId === message.id ? '✓ Saved' : '☆ Save to My Notes'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {loading && <div className="message assistant">Thinking through your JEE doubt…</div>}
            <div ref={bottom} />
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="composer">
            <label className="voice-language">
              <span>Spoken explanation</span>
              <select
                value={voiceLanguage}
                onChange={(event) => {
                  stopSpeech();
                  setVoiceLanguage(event.target.value);
                }}
              >
                <option value="english">English</option>
                <option value="hinglish">Hinglish</option>
              </select>
              <span className="muted">Written answers always stay in English.</span>
            </label>
            <div className="sendrow">
              <button
                className={listening ? 'recording' : 'secondary'}
                onClick={listen}
                aria-label={listening ? 'Stop voice dictation' : 'Start voice dictation'}
              >
                {listening ? '⏹ Stop' : '🎙️ Speak'}
              </button>
              <textarea
                placeholder="Ask your doubt or request a derivation..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                aria-label="Ask a JEE question"
              />
              <button disabled={loading || !input.trim()} onClick={() => send()}>
                Send ➤
              </button>
            </div>
            <small>AI can make mistakes. Verify important formulas and solutions.</small>
          </div>
        </main>
      </div>
      {notesOpen && (
        <div
          className="notes-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setNotesOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setNotesOpen(false);
          }}
        >
          <section
            className="notes-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-title"
            tabIndex={-1}
          >
            <div className="notes-panel-head">
              <div>
                <h2 id="notes-title">My Notes</h2>
                <p className="muted">{notes.length} saved {notes.length === 1 ? 'answer' : 'answers'}</p>
              </div>
              <button className="secondary" onClick={() => setNotesOpen(false)} aria-label="Close My Notes">
                Close
              </button>
            </div>
            {notesError && <div className="error" role="alert">{notesError}</div>}
            {!notes.length ? (
              <p className="notes-empty">No saved notes yet. Use “Save to My Notes” on a teacher answer.</p>
            ) : (
              <>
                <div className="notes-list" aria-label="Saved notes">
                  {notes.map((note) => (
                    <div className="note-list-item" key={note.id}>
                      <button
                        className={`note-select ${selectedNoteId === note.id ? 'selected' : ''}`}
                        onClick={() => setSelectedNoteId(note.id)}
                      >
                        <strong>{note.title}</strong>
                        <small>{safeDate(note.createdAt)}</small>
                      </button>
                      <button
                        className="note-delete"
                        onClick={() => deleteNote(note.id)}
                        aria-label={`Delete note ${note.title}`}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                <button className="clear-notes" onClick={clearNotes}>
                  Clear all notes
                </button>
                {selectedNote && (
                  <article className="note-detail">
                    <h3>{selectedNote.title}</h3>
                    <p className="muted">Saved {safeDate(selectedNote.createdAt)}</p>
                    {selectedNote.question && (
                      <div className="note-question">
                        <strong>Question</strong>
                        <p>{selectedNote.question}</p>
                      </div>
                    )}
                    <h4>Answer</h4>
                    <Markdown>{selectedNote.answer}</Markdown>
                  </article>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
