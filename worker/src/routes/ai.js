export async function handleAIRoutes(req, env) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.endsWith('/chat') && req.method === 'POST') {
    const { message } = await req.json();
    const reply = smallSiteAwareBot(message);
    return new Response(JSON.stringify({ reply }), { headers: { 'Content-Type':'application/json' }});
  }
  return new Response('Not found', { status: 404 });
}

function smallSiteAwareBot(msg) {
  const m = msg.toLowerCase();
  if (m.includes('games')) return "We have secret games! Ask me 'how do I find games' or visit /games if you already found the secret.";
  if (m.includes('what can i do')) return "CrowMail lets people send site-only messages. Use /send, /inbox, /profile. I can also play simple games.";
  if (m.includes('hi') || m.includes('hello')) return "Hey! I'm CrowBot. Ask me about sending messages or say 'show me games' to get a hint.";
  // Basic fallback conversational behavior:
  return `I heard you say "${msg}". I'm a small built-in assistant — if you want a smarter AI later, I can be configured to call an external model.`;
}
