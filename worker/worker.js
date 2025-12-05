// worker.js - Cloudflare Worker
// Bind KV namespaces: USERS_KV, SESSIONS_KV, MESSAGES_KV, FEEDBACK_KV, GAMES_KV
addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(req) {
  if (req.method !== "POST") return json({ok:false,error:"POST only"}, 405);
  const url = new URL(req.url);
  const path = url.pathname;
  let body = {};
  try { body = await req.json(); } catch(e){ }
  try {
    if (path === "/api/register") return register(body);
    if (path === "/api/login") return login(body);
    if (path === "/api/send") return send(body);
    if (path === "/api/inbox") return inbox(body);
    if (path === "/api/message") return getMessage(body);
    if (path === "/api/feedback") return feedback(body);
    if (path === "/api/ai") return aiReply(body);
    // games
    if (path === "/api/games/create") return createRoom(body);
    if (path === "/api/games/join") return joinRoom(body);
    if (path === "/api/games/action") return gameAction(body);
    if (path === "/api/games/state") return gameState(body);
    if (path === "/api/games/list") return listRooms();
  } catch(e) {
    return json({ok:false,error:String(e)});
  }
  return json({ok:false,error:"Not found"},404);
}

/* helpers */
function json(o, status=200){ return new Response(JSON.stringify(o), {status, headers:{'content-type':'application/json'}}); }
async function hash(s) {
  const enc = new TextEncoder();
  const data = enc.encode(s);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
}
function randId(len=16){
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => (b%36).toString(36)).join('');
}

/* auth */
async function register({username,password}) {
  if (!username || !password) return json({ok:false,error:"missing"});
  const ukey = "user::"+username;
  const exists = await USERS_KV.get(ukey);
  if (exists) return json({ok:false,error:"username taken"});
  const pass = await hash(password);
  await USERS_KV.put(ukey, JSON.stringify({username, pass}));
  // auto-login: create token
  const token = randId(24);
  await SESSIONS_KV.put("sess::"+token, username, {expirationTtl: 60*60*24*7});
  return json({ok:true,user:{username, token}});
}

async function login({username,password}) {
  if (!username || !password) return json({ok:false,error:"missing"});
  const ukey = "user::"+username;
  const raw = await USERS_KV.get(ukey);
  if (!raw) return json({ok:false,error:"no user"});
  const user = JSON.parse(raw);
  const pass = await hash(password);
  if (pass !== user.pass) return json({ok:false,error:"wrong"});
  const token = randId(24);
  await SESSIONS_KV.put("sess::"+token, username, {expirationTtl: 60*60*24*7});
  return json({ok:true,user:{username, token}});
}

async function validateToken(username, token) {
  if (!username || !token) return false;
  const got = await SESSIONS_KV.get("sess::"+token);
  return got === username;
}

/* messaging */
async function send({from,to,subject,body,token}) {
  if (!await validateToken(from, token)) return json({ok:false,error:"auth"});
  // check recipient exists
  const ru = await USERS_KV.get("user::"+to);
  if (!ru) return json({ok:false,error:"no recipient"});
  const id = "msg::"+randId(12);
  const msg = {id, from, to, subject, body, created:Date.now()};
  // store with list per user: we'll store single messages keyed by id and index list in user's inbox key
  await MESSAGES_KV.put(id, JSON.stringify(msg));
  const inboxKey = "inbox::"+to;
  const prev = await MESSAGES_KV.get(inboxKey);
  let arr = prev ? JSON.parse(prev) : [];
  arr.unshift(id);
  await MESSAGES_KV.put(inboxKey, JSON.stringify(arr));
  return json({ok:true, id});
}

async function inbox({username,token}) {
  if (!await validateToken(username, token)) return json({ok:false,error:"auth"});
  const inboxKey = "inbox::"+username;
  const raw = await MESSAGES_KV.get(inboxKey);
  const ids = raw ? JSON.parse(raw) : [];
  const messages = [];
  for (const id of ids.slice(0,100)) {
    const r = await MESSAGES_KV.get(id);
    if (r) {
      const m = JSON.parse(r);
      messages.push({id:m.id, from:m.from, subject:m.subject, created:m.created});
    }
  }
  return json({ok:true,messages});
}

async function getMessage({username,token,id}) {
  if (!await validateToken(username, token)) return json({ok:false,error:"auth"});
  const raw = await MESSAGES_KV.get(id);
  if (!raw) return json({ok:false,error:"not found"});
  const m = JSON.parse(raw);
  if (m.to !== username) return json({ok:false,error:"not yours"});
  // do NOT set/read-receipt — intentionally not tracked
  return json({ok:true,message:m});
}

/* feedback */
async function feedback({username,text}) {
  const id = "fb::"+randId(10);
  await FEEDBACK_KV.put(id, JSON.stringify({id, username, text, created:Date.now()}));
  return json({ok:true});
}

/* AI fallback - simple canned + server-side hints */
async function aiReply({q}) {
  q = (q||"").toLowerCase();
  if (q.includes("games") || q.includes("secret")) {
    return json({ok:true, reply:"There is a hidden games page at /games.html. Ask the bot 'games secret' in the main AI chat for a hint."});
  }
  if (q.includes("how") && q.includes("send")) {
    return json({ok:true, reply:"Use the Send page: type username, subject and body. CrowMail intentionally doesn't show read receipts."});
  }
  // generic fallback
  return json({ok:true, reply:"Sorry — I'm a small helper bot. Try asking about sending messages, feedback, or games."});
}

/* GAMES - simple tic-tac-toe room system */
async function createRoom({name, username, token}) {
  if (!await validateToken(username, token)) return json({ok:false,error:"auth"});
  const id = "room::"+randId(8);
  const room = { id, name: name || "Room", players:[username], board:Array(9).fill(null), turn:username, winner:null, created:Date.now() };
  await GAMES_KV.put(id, JSON.stringify(room));
  await addRoomIndex(id);
  return json({ok:true, roomId:id, room});
}

async function joinRoom({roomId, username, token}) {
  if (!await validateToken(username, token)) return json({ok:false,error:"auth"});
  const raw = await GAMES_KV.get(roomId);
  if (!raw) return json({ok:false,error:"room not found"});
  const room = JSON.parse(raw);
  if (!room.players.includes(username)) {
    if (room.players.length >= 2) return json({ok:false,error:"room full"});
    room.players.push(username);
  }
  await GAMES_KV.put(roomId, JSON.stringify(room));
  return json({ok:true, room});
}

async function gameAction({roomId, username, token, action}) {
  // action: {type:"move", idx: number, player:username}
  const raw = await GAMES_KV.get(roomId);
  if (!raw) return json({ok:false,error:"no room"});
  const room = JSON.parse(raw);
  if (room.winner) return json({ok:false,error:"game over", room});
  if (action.type !== "move") return json({ok:false,error:"unknown action"});
  if (room.turn !== username) return json({ok:false,error:"not your turn"});
  const idx = action.idx;
  if (idx < 0 || idx > 8) return json({ok:false,error:"bad idx"});
  if (room.board[idx]) return json({ok:false,error:"cell taken"});
  // decide mark: first player = X, second = O
  const mark = room.players[0] === username ? "X" : "O";
  room.board[idx] = mark;
  // switch turn
  room.turn = room.players.find(p => p !== username) || username;
  // check winner
  const w = checkWin(room.board);
  if (w) room.winner = w;
  await GAMES_KV.put(roomId, JSON.stringify(room));
  return json({ok:true, room});
}

async function gameState({roomId}) {
  const raw = await GAMES_KV.get(roomId);
  if (!raw) return json({ok:false,error:"no room"});
  return json({ok:true, room:JSON.parse(raw)});
}

async function listRooms() {
  const idx = await GAMES_KV.get("index");
  const arr = idx ? JSON.parse(idx) : [];
  const rooms = [];
  for (const id of arr.slice().reverse()) {
    const r = await GAMES_KV.get(id);
    if (r) rooms.push(JSON.parse(r));
  }
  return json({ok:true, rooms});
}

async function addRoomIndex(id) {
  const raw = await GAMES_KV.get("index");
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(id);
  await GAMES_KV.put("index", JSON.stringify(arr));
}

/* tic tac toe win check */
function checkWin(b) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const w of wins) {
    const [a,b1,c] = w;
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  if (b.every(x=>x)) return "tie";
  return null;
}
