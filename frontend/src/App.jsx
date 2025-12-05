import React, {useState} from 'react';
import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import SendPage from './components/SendPage';
import InboxPage from './components/InboxPage';
import ProfilePage from './components/ProfilePage';
import AIWidget from './components/AIWidget';

export default function App(){
  const [route, setRoute] = useState('/home');
  const navigate = (r)=> setRoute(r);

  return (
    <div>
      <NavBar navigate={navigate} />
      <div className="container">
        {route === '/home' && <HomePage navigate={navigate} />}
        {route === '/send' && <SendPage />}
        {route === '/inbox' && <InboxPage />}
        {route === '/profile' && <ProfilePage />}
      </div>
      <AIWidget navigate={navigate} />
    </div>
  );
}
