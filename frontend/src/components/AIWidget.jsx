import React, {useState} from 'react';

export default function AIWidget({navigate}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{from:'bot', text: 'Hi — ask me about games or say hello!'}]);
  const [input, setInput] = useState('');

  async function send(){
    if(!input) return;
    const your = input;
    setMsgs(m=>[...m,{from:'you', text:your}]);
    setInput('');
    // call local API
    const res = await fetch('/api/ai/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message: your})});
    const data = await res.json();
    setMsgs(m=>[...m, {from:'bot', text: data.reply}]);
    // simple easter egg: if bot hints at /games let user click
    if ((data.reply||'').toLowerCase().includes('games')) {
      // nothing automatic, but user can navigate by clicking nav
    }
  }

  return (
    <div className="ai-widget card" style={{width: open ? 340 : 64, height: open ? 420 : 64}}>
      <div className="ai-header" onClick={()=>setOpen(o=>!o)} style={{cursor:'pointer'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>CrowBot</div>
          <div style={{fontSize:12, opacity:0.9}}>Chat</div>
        </div>
      </div>
      {open && (
        <>
        <div className="ai-body">
          {msgs.map((m,i)=> <div key={i} style={{marginBottom:8}}><b>{m.from}</b>: {m.text}</div>)}
        </div>
        <div style={{padding:10, display:'flex', gap:8}}>
          <input style={{flex:1, padding:8, borderRadius:8, border:'1px solid #e6eefb'}} value={input} onChange={e=>setInput(e.target.value)} />
          <button className="btn" onClick={send}>Send</button>
        </div>
        <div style={{padding:8, fontSize:12, color:'#64748b'}}>Tip: ask "how do I find games" to get a hint (secret page: /games)</div>
        </>
      )}
    </div>
  );
}
