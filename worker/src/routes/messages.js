export async function handleMessageRoutes(req, env) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.endsWith('/send') && req.method === 'POST') {
    const body = await req.json();
    const { to_username, subject, body: msgBody, from_username } = body;
    if (!to_username || !msgBody) return new Response('Bad request', { status: 400 });

    const db = env.CROW_DB;
    // store message; read_receipt intentionally absent (no views)
    const res = await db.prepare(`INSERT INTO messages (to_username, from_username, subject, body, created_at) VALUES (?, ?, ?, ?, ?)`)
                .bind(to_username, from_username || 'anonymous', subject || '', msgBody, Date.now()).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type':'application/json' }});
  }

  if (path.endsWith('/inbox') && req.method === 'GET') {
    const q = url.searchParams;
    const username = q.get('username');
    if (!username) return new Response('Bad request', { status: 400 });
    const db = env.CROW_DB;
    const rows = await db.prepare(`SELECT id, from_username, subject, created_at FROM messages WHERE to_username = ? ORDER BY created_at DESC LIMIT 200`)
                 .bind(username).all();
    return new Response(JSON.stringify({ messages: rows.results }), { headers: { 'Content-Type':'application/json' }});
  }

  if (path.match(/\/view\/\d+$/) && req.method === 'GET') {
    const id = path.split('/').pop();
    const db = env.CROW_DB;
    const rows = await db.prepare(`SELECT * FROM messages WHERE id = ?`).bind(id).all();
    if (!rows.results || rows.results.length === 0) return new Response('Not found', { status: 404 });
    // DO NOT set read flag visible to sender — we can have a `viewed` column but not expose it to senders.
    return new Response(JSON.stringify(rows.results[0]), { headers: { 'Content-Type':'application/json' }});
  }

  return new Response('Not found', { status: 404 });
}
