// JeanMobileSheet.jsx — Production Patch for WantokJobs
import React, { useState, useEffect } from 'react';

const JeanMobileSheet = () => {
  const [messages, setMessages] = useState([{ from: "system", text: "Welcome to Jean!" }]);
  const [error, setError] = useState(null);
  useEffect(() => {
    const es = new EventSource('/api/chat/stream');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages(msgs => [...msgs, { from: "jean", text: data.message }]);
      } catch (e) { setError('Failed to parse chat stream.'); }
    };
    es.onerror = () => { setError('Chat backend not reachable (SSE error).'); es.close(); };
    return () => es.close();
  }, []);
  return (
    <div style={{padding:20,background:'#f1f1fb',borderRadius:8,maxWidth:500,margin:'12px auto',boxShadow:'0 1px 8px #0001'}}>
      <h2 style={{textAlign:'center'}}>Jean AI Chat</h2>
      {messages.map((msg, i) => <div key={i} style={{margin:'6px 0',color:msg.from==='jean'?'#0a4167':'#333'}}><b>{msg.from}:</b> {msg.text}</div>)}
      {error && <div style={{color:'red',margin:'8px 0'}}>{error}</div>}
    </div>
  );
};
export default JeanMobileSheet;
