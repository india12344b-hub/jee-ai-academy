export async function onRequestPost({request,env}) {
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!env.GROQ_API_KEY)return reply({error:'Missing GROQ_API_KEY. Add it in Cloudflare Pages → Settings → Variables and Secrets, then redeploy.'},503);
 try {
  const body=await request.json();
  if(!Array.isArray(body.messages)||body.messages.length>20)return reply({error:'Invalid messages.'},400);
  const messages=body.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-14).map(m=>({role:m.role,content:m.content.slice(0,5000)}));
  if(!messages.length||messages[messages.length-1].role!=='user')return reply({error:'Question missing.'},400);
  const system=String(body.system||'You are a helpful JEE tutor.').slice(0,5000);
  const context=String(body.context||'').slice(0,14000);
  const upstream=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-oss-120b',messages:[{role:'system',content:system+'\n\nTextbook context:\n'+context},...messages],temperature:0.35,max_completion_tokens:2200})});
  const data=await upstream.json().catch(()=>({}));
  if(!upstream.ok)return reply({error:data.error?.message||`Groq error ${upstream.status}`},upstream.status===429?429:502);
  return reply({answer:data.choices?.[0]?.message?.content||'No answer returned.'});
 } catch(e) {return reply({error:'Server error: '+e.message},500)}
}