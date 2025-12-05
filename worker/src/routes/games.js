export async function handleGameRoutes(req, env) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.endsWith('/create') && req.method === 'POST') {
    const { type, player1 } = await req.json();
    const db = env.CROW_DB;
    // For TicTacToe: store as JSON board
    const res = await db.prepare(`INSERT INTO games (type, state_json, player_x, player_o, created_at) VALUES (?, ?, ?, ?, ?)`)
               .bind(type, JSON.stringify({ board: Array(9).fill(null), turn: 'x' }), player1, null, Date.now()).run();
    return new Response(JSON.stringify({ ok: true, id: res.lastRowId }), { headers: { 'Content-Type':'application/json' }});
  }

  // join, move, status endpoints omitted here — add as needed

  return new Response('Not found', { status: 404 });
}
