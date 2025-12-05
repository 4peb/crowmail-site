import React from 'react';
export default function NavBar({navigate}) {
  return (
    <div className="nav">
      <div style={{fontWeight:700, fontSize:18}}>CrowMail</div>
      <div style={{flex:1}} />
      <button className="btn" onClick={()=>navigate('/home')}>Home</button>
      <button className="btn" onClick={()=>navigate('/send')}>Send</button>
      <button className="btn" onClick={()=>navigate('/inbox')}>Inbox</button>
      <button className="btn" onClick={()=>navigate('/profile')}>Profile</button>
    </div>
  );
}
