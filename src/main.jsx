import React,{useState,useEffect,useRef} from 'react';
import{createRoot}from'react-dom/client';
import ReactMarkdown from'react-markdown';
import remarkMath from'remark-math';
import rehypeKatex from'rehype-katex';
import * as pdfjs from 'pdfjs-dist';
import 'katex/dist/katex.min.css';
import './style.css';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
const SYSTEM=`You are an expert JEE Main and Advanced tutor. Teach patiently and accurately. Explain intuition before formulas, show stepwise derivations, check units and assumptions, and use correct LaTeX. Prefer hints before full solutions unless requested. Ask one short comprehension question at a time. Use Hinglish if the student does. Use the supplied textbook excerpt as context, but never pretend to see pages not provided.`;
function App(){
 const [pdf,setPdf]=useState(''),[pages,setPages]=useState([]),[page,setPage]=useState(1),[reading,setReading]=useState(false);
 const [messages,setMessages]=useState([{role:'assistant',content:'Welcome, Captain! Upload a JEE textbook PDF, choose a page, and ask me to teach a topic. 🎓'}]);
 const [input,setInput]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[autoSpeak,setAutoSpeak]=useState(false),[speaking,setSpeaking]=useState(false),[listening,setListening]=useState(false);
 const bottom=useRef(null),recognition=useRef(null);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[messages,loading]);
 useEffect(()=>()=>{window.speechSynthesis?.cancel();recognition.current?.stop()},[]);
 async function upload(e){const f=e.target.files?.[0];if(!f)return;if(f.type!=='application/pdf'){setError('Please choose a PDF.');return}setReading(true);setError('');try{const doc=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;const out=[];for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);const t=await p.getTextContent();out.push(t.items.map(x=>x.str).join(' '))}setPages(out);setPage(1);setPdf(f.name);setMessages([{role:'assistant',content:`Loaded **${f.name}** (${out.length} pages). Choose a page and ask me to explain it. Scanned PDFs may need OCR.`}])}catch(err){setError('Could not read PDF: '+err.message)}finally{setReading(false)}}
 function stopSpeech(){window.speechSynthesis?.cancel();setSpeaking(false)}
 function speak(s){if(!('speechSynthesis'in window)){setError('Speech playback is not supported in this browser.');return}stopSpeech();const u=new SpeechSynthesisUtterance(s.replace(/[#*`_]/g,'').slice(0,4500));u.lang='en-IN';u.rate=.95;u.onend=()=>setSpeaking(false);u.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(u);setSpeaking(true)}
 function listen(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setError('Speech recognition is unavailable. Try Chrome or type your question.');return}if(listening){recognition.current?.stop();return}stopSpeech();const r=new SR();recognition.current=r;r.lang='en-IN';r.interimResults=false;r.onresult=e=>setInput(v=>(v?v+' ':'')+e.results[0][0].transcript);r.onend=()=>setListening(false);r.onerror=e=>{setError('Microphone error: '+e.error);setListening(false)};try{r.start();setListening(true)}catch(e){setError(e.message)}}
 async function send(q=input){
  if(!q.trim()||loading)return;
  stopSpeech();
  setError('');
  const ms=[...messages,{role:'user',content:q.trim()}];
  setMessages(ms);
  setInput('');
  setLoading(true);
  try{
   const context=pages.length?`Textbook: ${pdf}\nSelected page ${page}/${pages.length}\n${pages.slice(Math.max(0,page-2),Math.min(pages.length,page+1)).map((t,i)=>`[Page ${Math.max(0,page-2)+i+1}] ${t}`).join('\n').slice(0,13000)}`:'No PDF uploaded.';
   const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:SYSTEM,context,messages:ms.slice(-14)})});
   const responseText=await r.text();
   let d;
   try{
    d=JSON.parse(responseText);
   }catch{
    if(r.status===404)throw Error('Chat endpoint not found (HTTP 404). Confirm Cloudflare Pages deployed the current functions/api/chat.js Function.');
    throw Error(responseText.trim()?`Chat service returned an invalid response (HTTP ${r.status}).`:`Chat service returned an empty response (HTTP ${r.status}). Please try again.`);
   }
   if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);
   const a=d.answer||'No answer received.';
   setMessages([...ms,{role:'assistant',content:a}]);
   if(autoSpeak)speak(a);
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 return <div className="app"><header><div className="brand">🎓 JEE <span>AI Academy</span></div><span className="tag">GPT-OSS 120B · Groq</span></header><div className="layout"><aside><h2>📚 Textbook</h2><label className="upload">{reading?'Reading PDF...':'＋ Upload PDF'}<input type="file" accept="application/pdf" onChange={upload} disabled={reading}/></label>{pdf&&<><p className="filename">{pdf}</p><p className="muted">{pages.length} pages · text extracted in browser</p><label className="field">Page <input type="number" min="1" max={pages.length} value={page} onChange={e=>setPage(Math.max(1,Math.min(pages.length,Number(e.target.value)||1)))}/></label><input type="range" min="1" max={pages.length} value={page} onChange={e=>setPage(+e.target.value)}/><div className="preview">{pages[page-1]?.slice(0,900)||'No extractable text on this page.'}</div></>}<div className="help"><b>How to study</b><p>Choose a page and ask “Teach this concept from basics for JEE Advanced.”</p><p>Only relevant excerpts are sent to the AI.</p></div></aside><main><div className="chat-head"><div><h1>AI JEE Teacher</h1><p>Concepts · Derivations · Doubts · Practice</p></div><button className="secondary" onClick={()=>{setMessages([{role:'assistant',content:'New lesson started. What shall we learn?'}]);setError('')}}>New lesson</button></div><div className="messages">{messages.map((m,i)=><div key={i} className={'message '+m.role}><div className="who">{m.role==='assistant'?'🎓 Teacher':'👤 You'}</div><div className="markdown"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.content}</ReactMarkdown></div>{m.role==='assistant'&&<button className="listen-answer" onClick={()=>speak(m.content)}>🔊 Read aloud</button>}</div>)}{loading&&<div className="message assistant">Thinking through your JEE doubt…</div>}<div ref={bottom}/></div>{error&&<div className="error" role="alert">{error}</div>}<div className="composer"><label className="toggle"><input type="checkbox" checked={autoSpeak} onChange={e=>setAutoSpeak(e.target.checked)}/> Speak replies automatically</label><div className="sendrow"><button className={listening?'recording':'secondary'} onClick={listen}>{listening?'⏹ Stop':'🎙️ Speak'}</button><textarea placeholder="Ask your doubt or request a derivation..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/><button disabled={loading||!input.trim()} onClick={()=>send()}>Send ➤</button></div>{speaking&&<button className="secondary" onClick={stopSpeech}>■ Stop voice</button>}<small>AI can make mistakes. Verify important formulas and solutions.</small></div></main></div></div>
}
createRoot(document.getElementById('root')).render(<App/>);