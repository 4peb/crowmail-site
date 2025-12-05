// main.js - client side
// --- CONFIG: set this to your Worker URL after deploying the worker ---
const API = "https://REPLACE_WITH_YOUR_WORKER.workers.dev";

// --- low-level API helper ---
async function api(path, data = {}) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(data)
  });
  try { return await res.json(); }
  catch(e) { return { ok:false, error:"Invalid JSON from API" }; }
}

// --- session helpers ---
function saveUser(u){ localStorage.setItem("crow_user", JSON.stringify(u)); }
function getUser(){ return JSON.parse(localStorage.getItem("crow_user") || "null"); }
function logout(){ localStorage.removeItem("crow_user"); location.href="/home.html"; }

// --- auth UI --- (call from pages)
async function register(username, password) {
  const r = await api("/api/register", {username, password});
  if (r.ok) { saveUser(r.user); return {ok:true}; }
  return r;
}
async function login(username, password) {
  const r = await api("/api/login", {username, password});
  if (r.ok) { saveUser(r.user); return {ok:true}; }
  return r;
}

// --- messaging ---
async function sendMessage(to, subject, body) {
  const u = getUser();
  if (!u) return {ok:false, error:"Not logged in"};
  return api("/api/send", {from:u.username, to, subject, body, token:u.token});
}
async function fetchInbox() {
  const u = getUser();
  if (!u) return {ok:false, error:"Not logged in"};
  return api("/api/inbox", {username:u.username, token:u.token});
}
async function fetchMessage(id) {
  const u = getUser();
  if (!u) return {ok:false, error:"Not logged in"};
  return api("/api/message", {username:u.username, token:u.token, id});
}

// --- feedback ---
async function sendFeedback(text) {
  const u = getUser();
  return api("/api/feedback", {username: u? u.username : "anon", text});
}

// --- fake AI bot (client-side canned answers & server fallback) ---
async function askBot(q) {
  q = (q||"").toLowerCase();
  // easter egg trigger for hidden /games page
  if (q.includes("games") || q.includes("play")) {
    return {ok:true, reply:"Psst — some users find a secret games page at /games.html. Try asking me in the chat for 'games secret' to get hints."};
  }
  if (q.includes("how") && q.includes("send")) {
    return {ok:true, reply:"Go to Send → type a username, subject, message and press Send. CrowMail doesn't show read receipts."};
  }
  // fallback: ask server for a mini AI reply (server returns simple canned response)
  return api("/api/ai", {q});
}

// --- games: lobby / rooms (tic-tac-toe) ---
async function createGame(name) {
  const u = getUser(); if(!u) return {ok:false, error:"login"};
  return api("/api/games/create", {name, username: u.username, token:u.token});
}
async function joinGame(roomId) {
  const u = getUser(); if(!u) return {ok:false, error:"login"};
  return api("/api/games/join", {roomId, username: u.username, token:u.token});
}
async function gameAction(roomId, action) {
  const u = getUser(); if(!u) return {ok:false, error:"login"};
  return api("/api/games/action", {roomId, username: u.username, token:u.token, action});
}
async function getGameState(roomId) {
  return api("/api/games/state", {roomId});
}
