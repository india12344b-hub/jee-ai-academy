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

const SYSTEM = `You are an expert JEE Main and Advanced tutor. Write the teaching answer in English and teach patiently, accurately, and one concept at a time. Explain intuition before formulas, show stepwise derivations, check units and assumptions, and use correct LaTeX. Format inline math with \\( ... \\) and important equations or multi-line derivations with \\[ ... \\] on their own lines. Use concise meaningful headings such as Concept, Step-by-Step Explanation, Worked Example, Key Formulas, JEE Exam Tip, or Practice Question when useful. If the student asks for a comparison or revision table, provide the actual Markdown table directly. Never output interface instructions, UI mockup cards, phrases like 'Teaching whiteboard', 'Ask teacher to create a table', or instructions telling the student to click a feature. Do not add irrelevant sections or invent facts. Prefer hints before full solutions unless requested. Ask one short comprehension question at a time. Use the supplied textbook excerpt as context, but never pretend to see pages not provided. If extra information is not in the supplied material, clearly label it 'Beyond Your Material'. When a diagram, equation layout, comparison table, graph, or visual derivation would materially improve understanding, briefly invite the student to open the optional whiteboard (for example: 'Please open the whiteboard; I’ll show this step visually.'). Do not emit UI instructions otherwise, and never claim that a diagram has been drawn unless the board content actually contains it.`;
const NOTES_STORAGE_KEY = 'jee-ai-academy-notes-v1';
const VOICE_STORAGE_KEY = 'jee-ai-academy-voice-language-v1';
const LESSONS_STORAGE_KEY = 'jee-ai-academy-lessons-v1';
const THEME_STORAGE_KEY = 'jee-ai-academy-theme-v1';
const BOARD_STORAGE_KEY = 'jee-ai-academy-whiteboard-v1';

function readSavedBoard() {
  try { return localStorage.getItem(BOARD_STORAGE_KEY) || ''; } catch { return ''; }
}
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

function readTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
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

function readSavedLessons() {
  try {
    const stored = JSON.parse(localStorage.getItem(LESSONS_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (lesson) =>
        lesson &&
        typeof lesson.id === 'string' &&
        typeof lesson.title === 'string' &&
        Array.isArray(lesson.messages),
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

function cleanTeachingAnswer(markdown = '') {
  // Remove UI-instruction sections accidentally returned by the model, while preserving the actual lesson.
  return String(markdown)
    .replace(/^#{1,6}\s*[^\n]*Teaching whiteboard[^\n]*\n[\s\S]*?(?=^#{1,6}\s|\n*$)/gim, '')
    .replace(/^\s*\+\s*Ask teacher to create a table\s*$/gim, '')
    .trim();
}

function extractMarkdownTable(markdown = '') {
  const lines = cleanTeachingAnswer(markdown).split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (lines[i].includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const table = [lines[i], lines[i + 1]];
      for (let j = i + 2; j < lines.length && lines[j].includes('|'); j += 1) table.push(lines[j]);
      return table.join('\n');
    }
  }
  return '';
}

function App() {
  const [pdf, setPdf] = useState('');
  const [pages, setPages] = useState([]);
  const [page, setPage] = useState(1);
  const [reading, setReading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState(readVoiceLanguage);
  const [theme, setTheme] = useState(readTheme);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [speechLoadingId, setSpeechLoadingId] = useState(null);
  const [speechTexts, setSpeechTexts] = useState({});
  const [notes, setNotes] = useState(readSavedNotes);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [notesError, setNotesError] = useState('');
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [lessons, setLessons] = useState(readSavedLessons);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeView, setActiveView] = useState('home');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [fullScreenStudy, setFullScreenStudy] = useState(false);
  const [fullScreenMessageOpen, setFullScreenMessageOpen] = useState(false);
  const [boardMinimized, setBoardMinimized] = useState(false);
  const [boardMaximized, setBoardMaximized] = useState(false);
  const [boardContent, setBoardContent] = useState(readSavedBoard);
  const [boardPosition, setBoardPosition] = useState(() => ({ left: Math.max(16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 520), top: Math.max(80, (typeof window !== 'undefined' ? window.innerHeight : 800) - 490), width: 480, height: 410 }));
  const boardDrag = useRef(null);
  const bottom = useRef(null);
  const recognition = useRef(null);
  const playback = useRef(null);
  const speechRequest = useRef(0);
  const pdfInput = useRef(null);
  const latestTeacherMessage = [...messages].reverse().find((message) => message.role === 'assistant');

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    try { localStorage.setItem(BOARD_STORAGE_KEY, boardContent); } catch { /* Board remains usable if storage is unavailable. */ }
  }, [boardContent]);

  useEffect(() => {
    if (!latestTeacherMessage) return;
    const nextBoardContent = cleanTeachingAnswer(latestTeacherMessage.content).trim();
    if (nextBoardContent) setBoardContent(nextBoardContent);
  }, [latestTeacherMessage?.id]);

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

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      setError('Could not save the theme preference in this browser.');
    }
  }, [theme]);

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
      setActiveLessonId(null);
      setMessages([]);
      setActiveView('pdf');
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

  async function send(question = input, startFresh = false) {
    if (!question.trim() || loading) return;
    stopSpeech();
    setError('');
    setSavedNoteId(null);
    const userMessage = { id: createId(), role: 'user', content: question.trim() };
    const previousMessages = startFresh ? [] : messages;
    const lessonId = startFresh ? createId() : activeLessonId || createId();
    const nextMessages = [...previousMessages, userMessage];
    setMessages(nextMessages);
    setActiveLessonId(lessonId);
    setActiveView('lesson');
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
      const lessonMessages = [...nextMessages, assistantMessage];
      setMessages(lessonMessages);
      setLessons((currentLessons) => {
        const existingLesson = currentLessons.find((lesson) => lesson.id === lessonId);
        const firstQuestion =
          existingLesson?.title || lessonMessages.find((message) => message.role === 'user')?.content;
        const updatedLesson = {
          id: lessonId,
          title: titleForNote(firstQuestion, assistantMessage.content),
          subject: existingLesson?.subject || selectedSubject || 'JEE',
          updatedAt: new Date().toISOString(),
          messages: lessonMessages,
        };
        const updatedLessons = [
          updatedLesson,
          ...currentLessons.filter((lesson) => lesson.id !== lessonId),
        ].slice(0, 24);
        try {
          localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(updatedLessons));
        } catch {
          setError('Lesson is available until you leave this page, but could not be saved to recent lessons.');
        }
        return updatedLessons;
      });
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

  function openLesson(lesson) {
    stopSpeech();
    setMessages(lesson.messages);
    setActiveLessonId(lesson.id);
    setSelectedSubject(lesson.subject === 'JEE' ? '' : lesson.subject);
    setActiveView('lesson');
    setError('');
  }

  function startNewLesson(subject = '') {
    stopSpeech();
    setMessages([]);
    setActiveLessonId(null);
    setSelectedSubject(subject);
    setInput('');
    setError('');
    setActiveView('lesson');
  }

  function openHome() {
    stopSpeech();
    setActiveView('home');
    setError('');
  }

  function downloadBoardNotes() {
    const content = boardContent.trim() || 'No whiteboard notes yet.';
    const blob = new Blob([`JEE AI Academy — Whiteboard Notes\n\n${content}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'JEE-AI-Academy-Whiteboard-Notes.md';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function openBoard() {
    setBoardOpen(true);
    setBoardMinimized(false);
    setBoardMaximized(false);
  }

  function startBoardDrag(event) {
    if (event.target.closest('button')) return;
    boardDrag.current = { x: event.clientX, y: event.clientY, left: boardPosition.left, top: boardPosition.top };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveBoardDrag(event) {
    if (!boardDrag.current || boardMaximized) return;
    const drag = boardDrag.current;
    setBoardPosition((current) => ({ ...current, left: Math.max(0, Math.min(window.innerWidth - 160, drag.left + event.clientX - drag.x)), top: Math.max(64, Math.min(window.innerHeight - 100, drag.top + event.clientY - drag.y)) }));
  }

  const selectedNote = notes.find((note) => note.id === selectedNoteId);
  const savedMessageIds = new Set(notes.map((note) => note.messageId));
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId);
  const recentLessons = lessons.slice(0, 3);
  const showHome = activeView === 'home';

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${fullScreenStudy && activeView === 'lesson' ? 'full-screen-study' : ''}`} data-theme={theme}>
      <header className="topbar">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          ☰
        </button>
        <button className="brand" onClick={openHome} aria-label="JEE AI Academy home">
          <span className="brand-mark">J</span>
          <span>JEE <b>AI Academy</b></span>
        </button>
        <div className="header-actions">
          <span className="tag">PERSONAL JEE COACH</span>
          <button
            className="profile-button theme-toggle"
            onClick={() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="profile-button" onClick={() => setActiveView('settings')} aria-label="Open settings">
            Student
          </button>
        </div>
      </header>
      <div className="workspace-shell">
        <aside className="sidebar">
          <button className="new-lesson-button" onClick={() => startNewLesson()}>
            <span>＋</span> New lesson
          </button>
          <nav className="primary-nav" aria-label="Main navigation">
            <button className={showHome ? 'active' : ''} onClick={openHome}><span>⌂</span> Home</button>
            <button onClick={() => setNotesOpen(true)}><span>▤</span> My Notes <small>{notes.length}</small></button>
            <button className={activeView === 'pdf' ? 'active' : ''} onClick={() => setActiveView('pdf')}><span>▧</span> PDF Library</button>
            <button className={activeView === 'practice' ? 'active' : ''} onClick={() => setActiveView('practice')}><span>✳</span> Practice</button>
            <button className={activeView === 'recent' ? 'active' : ''} onClick={() => setActiveView('recent')}><span>◷</span> Recent Lessons</button>
            <button className={activeView === 'settings' ? 'active' : ''} onClick={() => setActiveView('settings')}><span>⚙</span> Settings</button>
          </nav>
          <div className="sidebar-divider" />
          <section className="textbook-card" aria-label="PDF textbook">
            <div className="section-eyebrow">YOUR LIBRARY</div>
            <h2>Study material</h2>
            <button className="upload" onClick={() => pdfInput.current?.click()} disabled={reading}>
              {reading ? 'Reading PDF…' : '＋ Upload PDF'}
            </button>
            <input
              ref={pdfInput}
              id="pdf-upload-input"
              className="hidden-pdf-input"
              type="file"
              accept="application/pdf"
              onChange={upload}
              disabled={reading}
            />
            {pdf ? (
              <>
                <p className="filename">{pdf}</p>
                <p className="muted">{pages.length} pages · text extracted in browser</p>
                <label className="field">
                  Page
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
                <div className="preview">{pages[page - 1]?.slice(0, 900) || 'No extractable text on this page.'}</div>
              </>
            ) : <p className="muted">Add a textbook to discuss its pages with your teacher.</p>}
          </section>
          <div className="sidebar-footer">
            <span className="online-dot" /> AI tutor ready
          </div>
        </aside>
        <main className="main-panel">
          {showHome ? (
            <div className="dashboard-content">
              <div className="welcome-row home-chat-welcome">
                <div>
                  <div className="section-eyebrow">YOUR PERSONAL JEE CLASSROOM</div>
                  <h1>Message your AI Teacher</h1>
                  <p>Ask any JEE question, share a problem, or request a step-by-step explanation.</p>
                </div>
              </div>
              <section className="ask-panel home-first-ask-panel">
                <div className="ask-panel-title">
                  <div><span className="teacher-avatar">✦</span><div><h2>Start with a message</h2><p>Your teacher will explain one concept at a time. You can ask follow-up questions whenever you need.</p></div></div>
                  <span className="english-note">Written lessons in English</span>
                </div>
                <div className="ask-composer">
                  <textarea
                    placeholder={selectedSubject ? `Ask a ${selectedSubject} question…` : 'What concept or problem are you working on?'}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        send(input, true);
                      }
                    }}
                    aria-label="Ask your AI Teacher"
                  />
                  <div className="ask-composer-actions">
                    <div className="ask-quick-actions">
                      <button onClick={() => pdfInput.current?.click()}>＋ Upload PDF</button>
                      <button onClick={() => { startNewLesson(selectedSubject); setInput('Give me a JEE practice question with a guided solution on '); }}>✳ Practice Questions</button>
                      <button onClick={() => { startNewLesson(selectedSubject); setInput('Create a concise formula sheet for '); }}>∑ Formula Sheets</button>
                    </div>
                    <div className="ask-submit">
                      <button className={listening ? 'recording' : 'mic-button'} onClick={listen} aria-label={listening ? 'Stop voice dictation' : 'Start voice dictation'}>
                        {listening ? '■' : '◉'}
                      </button>
                      <button className="send-button" disabled={loading || !input.trim()} onClick={() => send(input, true)}>
                        {loading ? 'Thinking…' : 'Start learning'} <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
                {error && <div className="error dashboard-error" role="alert">{error}</div>}
              </section>
              <div className="dashboard-lower-grid">
                <section className="dashboard-section continue-section">
                  <div className="section-heading"><div><div className="section-eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Continue learning</h2></div>
                    {recentLessons.length > 0 && <button className="text-link" onClick={() => setActiveView('recent')}>View all →</button>}
                  </div>
                  {recentLessons[0] ? (
                    <button className="continue-card" onClick={() => openLesson(recentLessons[0])}>
                      <span className="continue-icon">↗</span><span className="continue-copy"><small>{recentLessons[0].subject} · LAST STUDIED {new Date(recentLessons[0].updatedAt).toLocaleDateString()}</small><strong>{recentLessons[0].title}</strong><span>Resume lesson <b>→</b></span></span>
                    </button>
                  ) : (
                    <button className="continue-card empty-continue" onClick={() => startNewLesson()}>
                      <span className="continue-icon">✦</span><span className="continue-copy"><small>YOUR NEXT BREAKTHROUGH STARTS HERE</small><strong>Start your first lesson</strong><span>Message your AI Teacher to begin <b>→</b></span></span>
                    </button>
                  )}
                </section>
                <section className="dashboard-section recent-section">
                  <div className="section-heading"><div><div className="section-eyebrow">YOUR STUDY HISTORY</div><h2>Recent lessons</h2></div>
                    <button className="text-link" onClick={() => setActiveView('recent')}>See all →</button>
                  </div>
                  {recentLessons.length ? recentLessons.slice(0, 2).map((lesson) => (
                    <button className="recent-lesson-row" key={lesson.id} onClick={() => openLesson(lesson)}>
                      <span className="recent-subject-icon">{lesson.subject === 'Physics' ? 'Φ' : lesson.subject === 'Chemistry' ? '⌬' : '∑'}</span>
                      <span><strong>{lesson.title}</strong><small>{lesson.subject} · {new Date(lesson.updatedAt).toLocaleDateString()}</small></span><b>↗</b>
                    </button>
                  )) : <p className="empty-copy">Your lessons will appear here as you study.</p>}
                </section>
              </div>
              <section className="dashboard-section notes-preview-section">
                <div className="section-heading"><div><div className="section-eyebrow">SAVED FOR LATER</div><h2>My Notes</h2></div>
                  <button className="text-link" onClick={() => setNotesOpen(true)}>Open notes →</button>
                </div>
                {notes.length ? <div className="notes-preview-grid">{notes.slice(0, 3).map((note) => (
                  <button className="note-preview-card" key={note.id} onClick={() => { setSelectedNoteId(note.id); setNotesOpen(true); }}>
                    <span>▤</span><strong>{note.title}</strong><small>{safeDate(note.createdAt)}</small>
                  </button>
                ))}</div> : <p className="empty-copy">Save a teacher’s explanation to build your personal revision library.</p>}
              </section>
            </div>
          ) : activeView === 'lesson' ? (
            <div className={`lesson-page ${fullScreenStudy ? 'lesson-page-full-screen' : ''}`}>
              {fullScreenStudy && <div className="fullscreen-study-bar"><button className="fullscreen-exit-button" onClick={() => { setFullScreenStudy(false); setFullScreenMessageOpen(false); }}>↙ Exit full screen</button><span className="fullscreen-lesson-label">{selectedSubject || activeLesson?.subject || 'JEE'} · Lesson</span><button className="fullscreen-voice-button" onClick={() => { setFullScreenMessageOpen(true); listen(); }} title="Interrupt the explanation and ask by voice">🎙 Ask by voice</button><button className="fullscreen-message-open-button" onClick={() => setFullScreenMessageOpen(true)}>✎ Message</button><button className="board-open-button" onClick={openBoard}>▤ Open whiteboard</button></div>}
              <div className="lesson-topline">
                <button className="breadcrumb-button" onClick={openHome}>← Home</button><span>/</span><span>{selectedSubject || activeLesson?.subject || 'JEE Lesson'}</span>
                <button className="new-lesson-inline" onClick={() => startNewLesson(selectedSubject)}>＋ New lesson</button>
              </div>
              <div className="lesson-heading lesson-heading-compact">
                <div className="lesson-title-row"><div><div className="section-eyebrow">{selectedSubject || activeLesson?.subject || 'PERSONAL TUTORING'} · CONCEPT LESSON</div><h1>{selectedSubject ? `${selectedSubject} · Verbal Explanation` : 'Verbal Explanation'}</h1></div><div className="lesson-heading-actions"><button className="board-open-button" onClick={openBoard}>▤ Open whiteboard</button><button className="fullscreen-toggle-button" onClick={() => { setFullScreenStudy(true); setFullScreenMessageOpen(false); }} title="Focus on the teacher's explanation">⛶ Full screen</button></div></div>
                <p>One concept at a time · Your teacher will invite you to open the board when a diagram, formula or table helps.</p>
              </div>
              <div className="lesson-toolbar lesson-toolbar-compact">
                <button
                  className="teacher-explain-button"
                  onClick={() => latestTeacherMessage && playAnswer({ ...latestTeacherMessage, content: cleanTeachingAnswer(latestTeacherMessage.content) })}
                  disabled={!latestTeacherMessage || loading || speechLoadingId === latestTeacherMessage?.id}
                  title="Start the teacher's verbal explanation"
                >
                  {speechLoadingId === latestTeacherMessage?.id ? 'Preparing…' : activeSpeechId === latestTeacherMessage?.id ? (speechPaused ? '▶ Resume' : '⏸ Pause') : '▶ Teacher Explanation'}
                </button>
                {activeSpeechId === latestTeacherMessage?.id && <button className="message-action toolbar-stop" onClick={stopSpeech}>■ Stop</button>}
                <label className="voice-language compact-voice-language">
                  <span>Voice</span>
                  <select value={voiceLanguage} onChange={(event) => { stopSpeech(); setVoiceLanguage(event.target.value); }} aria-label="Verbal explanation language">
                    <option value="english">English</option><option value="hinglish">Hinglish</option>
                  </select>
                </label>
                <span className="written-language-note">Text · {voiceLanguage === 'hinglish' ? 'Hinglish' : 'English'} voice</span>
              </div>
              <div className="lesson-scroll">
                {messages.map((message) => {
                  if (message.role === 'user') {
                    return <div key={message.id} className="question-marker"><span>YOUR QUESTION</span><p>{message.content}</p></div>;
                  }
                  const saved = savedMessageIds.has(message.id);
                  const wordCount = markdownWordCount(message.content);
                  return (
                    <article key={message.id} className="lesson-answer">
                      <div className="lesson-answer-label"><span className="teacher-avatar">✦</span><div><strong>Your AI Teacher</strong><small>JEE-focused explanation</small></div></div>
                      <Markdown>{cleanTeachingAnswer(message.content)}</Markdown>
                      <div className="message-actions">
                        {activeSpeechId === message.id ? (
                          <>
                            <button className="message-action" onClick={speechPaused ? resumeSpeech : pauseSpeech} aria-label={speechPaused ? 'Resume reading answer' : 'Pause reading answer'}>
                              {speechPaused ? '▶ Resume' : '⏸ Pause'}
                            </button>
                            <button className="message-action" onClick={stopSpeech}>■ Stop</button>
                          </>
                        ) : (
                          <button className="message-action" onClick={() => playAnswer(message)} disabled={speechLoadingId === message.id}>
                            {speechLoadingId === message.id ? 'Preparing speech…' : `▶ Verbal Explanation · ${voiceLanguage === 'hinglish' ? 'Hinglish' : 'English'}`}
                          </button>
                        )}
                        {wordCount > 200 && <button className="message-action" onClick={() => downloadPdf(message)}>↓ Download PDF</button>}
                        <button className="message-action" onClick={() => saveNote(message)} disabled={saved} aria-label={saved ? 'Answer saved to My Notes' : 'Save answer to My Notes'}>
                          {saved || savedNoteId === message.id ? '✓ Saved to My Notes' : '☆ Save to My Notes'}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {loading && <div className="teaching-state"><span className="loading-indicator" /> Organizing a clear, step-by-step lesson…</div>}
                {!messages.length && !loading && <div className="lesson-empty-state"><span className="teacher-avatar">✦</span><h2>What would you like to understand?</h2><p>Ask a question to begin. Your lesson and follow-ups stay together here.</p></div>}
                <div ref={bottom} />
              </div>
              {error && <div className="error lesson-error" role="alert">{error}</div>}
              {boardOpen && !boardMinimized && (
                <section
                  className={`floating-whiteboard ${boardMaximized ? 'board-maximized' : ''}`}
                  style={boardMaximized ? undefined : { left: `${boardPosition.left}px`, top: `${boardPosition.top}px`, width: `${boardPosition.width}px`, height: `${boardPosition.height}px` }}
                  aria-label="Floating whiteboard"
                >
                  <div className="floating-board-head" onPointerDown={startBoardDrag} onPointerMove={moveBoardDrag} onPointerUp={() => { boardDrag.current = null; }} onPointerCancel={() => { boardDrag.current = null; }}>
                    <span className="board-drag-grip">⠿</span><div className="floating-board-title"><strong>Whiteboard</strong><small>Notes stay saved when you close this board</small></div>
                    <button title="Save whiteboard notes to your device" onClick={downloadBoardNotes}>↓ Save to Device</button>
                    <button title="Minimize board" onClick={() => { setBoardMinimized(true); setBoardOpen(false); }}>−</button>
                    <button title={boardMaximized ? 'Restore board size' : 'Maximize board'} onClick={() => setBoardMaximized((value) => !value)}>{boardMaximized ? '❐' : '□'}</button>
                    <button title="Close board (notes are retained)" onClick={() => { setBoardOpen(false); setBoardMaximized(false); }}>×</button>
                  </div>
                  <div className="floating-board-content">
                    {boardContent.trim() ? <Markdown>{boardContent}</Markdown> : <div className="board-empty-state"><strong>Your board is ready</strong><p>When a diagram, equation or table will help, your teacher will ask you to open this board.</p></div>}
                  </div>
                  <div className="board-resize-hint">Drag the title bar to move · Resize from the corner</div>
                </section>
              )}
              {!boardOpen && <button className="board-reopen-fab" onClick={openBoard} title="Open whiteboard">▤ <span>{boardMinimized ? 'Restore whiteboard' : 'Open whiteboard'}</span></button>}
              {fullScreenStudy && !fullScreenMessageOpen ? (
                <button className="fullscreen-message-collapsed" onClick={() => setFullScreenMessageOpen(true)}>＋ Click to message your teacher</button>
              ) : (
                <div className={`followup-composer ${fullScreenStudy ? 'fullscreen-followup-open' : ''}`}>
                  {fullScreenStudy && <button className="collapse-message-button" onClick={() => setFullScreenMessageOpen(false)} aria-label="Collapse message composer">⌄ Hide message box</button>}
                  <label htmlFor="followup-input">Ask a follow-up question</label>
                  <div className="followup-row">
                    <button className={listening ? 'recording' : 'mic-button'} onClick={listen} aria-label={listening ? 'Stop voice dictation' : 'Start voice dictation'}>{listening ? '■' : '◉'}</button>
                    <textarea id="followup-input" placeholder="Ask for another example, a simpler explanation, or a derivation…" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); if (fullScreenStudy) setFullScreenMessageOpen(false); } }} />
                    <button className="send-button" disabled={loading || !input.trim()} onClick={() => { send(); if (fullScreenStudy) setFullScreenMessageOpen(false); }}>Ask <span>→</span></button>
                  </div>
                  {!fullScreenStudy && <small>AI can make mistakes. Verify important formulas and solutions.</small>}
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-content secondary-view">
              <div className="welcome-row"><div><div className="section-eyebrow">JEE AI ACADEMY</div><h1>{activeView === 'recent' ? 'Recent lessons' : activeView === 'pdf' ? 'PDF Library' : activeView === 'practice' ? 'Practice with purpose' : 'Learning preferences'}</h1><p>{activeView === 'settings' ? 'Make your learning workspace feel right for you.' : 'A focused space to keep your preparation moving.'}</p></div></div>
              {activeView === 'recent' && <section className="dashboard-section full-section">{lessons.length ? lessons.map((lesson) => <button className="recent-lesson-row" key={lesson.id} onClick={() => openLesson(lesson)}><span className="recent-subject-icon">{lesson.subject === 'Physics' ? 'Φ' : lesson.subject === 'Chemistry' ? '⌬' : '∑'}</span><span><strong>{lesson.title}</strong><small>{lesson.subject} · {new Date(lesson.updatedAt).toLocaleString()}</small></span><b>Open lesson →</b></button>) : <p className="empty-copy">No lessons yet. Send your first message to the AI Teacher to begin.</p>}</section>}
              {activeView === 'pdf' && <section className="dashboard-section full-section pdf-library-card"><div className="library-icon">▧</div><div><h2>{pdf || 'Add a textbook or study guide'}</h2><p>{pdf ? `${pages.length} pages extracted. Your teacher can now reference the selected page in explanations.` : 'Upload a PDF to discuss its content with your AI Teacher. Text extraction happens in your browser.'}</p></div><button className="send-button" onClick={() => pdfInput.current?.click()} disabled={reading}>{reading ? 'Reading PDF…' : pdf ? 'Choose another PDF' : '＋ Upload a PDF'}</button>{pdf && <div className="library-page-control"><label htmlFor="library-page">Selected page</label><input id="library-page" type="number" min="1" max={pages.length} value={page} onChange={(event) => setPage(Math.max(1, Math.min(pages.length, Number(event.target.value) || 1)))} /><p className="preview">{pages[page - 1]?.slice(0, 900) || 'No extractable text on this page.'}</p></div>}</section>}
              {activeView === 'practice' && <section className="dashboard-section full-section practice-card"><div className="practice-mark">✳</div><h2>Turn practice into progress</h2><p>Ask for a JEE-level problem, a hint-first walkthrough, or a timed mini set on any topic.</p><button className="send-button" onClick={() => { setInput('Give me a JEE practice question with a guided solution on '); setActiveView('lesson'); }}>Create a practice lesson <span>→</span></button></section>}
              {activeView === 'settings' && <section className="dashboard-section full-section settings-card"><h2>Appearance</h2><p>Choose the theme for your learning workspace.</p><label className="voice-language"><span>Theme</span><select value={theme} onChange={(event) => setTheme(event.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select></label><h2 className="settings-subheading">Spoken lesson language</h2><p>Choose the language your teacher uses when you press Listen. Written answers always stay in English.</p><label className="voice-language"><span>Voice language</span><select value={voiceLanguage} onChange={(event) => { stopSpeech(); setVoiceLanguage(event.target.value); }}><option value="english">English</option><option value="hinglish">Hinglish</option></select></label></section>}
            </div>
          )}
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
