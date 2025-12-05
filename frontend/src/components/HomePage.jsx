import React from 'react';
export default function HomePage({navigate}) {
  return (
    <div>
      <div className="card" style={{padding:28}}>
        <h1>Welcome to CrowMail</h1>
        <p>Send private site-only messages to other usernames. No read receipts. Clean design, simple games, and a helpful AI bot.</p>
        <div style={{marginTop:18}}>
          <button className="btn" onClick={()=>navigate('/send')}>Send a Message</button>
          <button style={{marginLeft:10}} className="btn" onClick={()=>navigate('/inbox')}>Open Inbox</button>
        </div>
      </div>

      <div style={{height:20}} />
      <div className="card">
        <h3>About CrowMail</h3>
        <p>Messages are stored on this site only. You can reply inside the site. We won't show read indicators to senders.</p>
      </div>
    </div>
  );
}
