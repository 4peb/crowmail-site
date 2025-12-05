import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = /* we'll read from env when used */;
const encoder = new TextEncoder();

async function hashPassword(password, salt) {
  const data = encoder.encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleAuthRoutes(req, env) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.endsWith('/register') && req.method === 'POST') {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) return new Response('Bad request', { status: 400 });

    const salt = crypto.getRandomValues(new Uint8Array(16)).join('');
    const pwdHash = await hashPassword(password, salt);

    // Insert user into D1
    const db = env.CROW_DB;
    await db.prepare(`INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)`)
            .bind(username, pwdHash, salt, Date.now()).run();

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type':'application/json' }});
  }

  if (path.endsWith('/login') && req.method === 'POST') {
    const body = await req.json();
    const { username, password } = body;
    const db = env.CROW_DB;
    const userRow = await db.prepare(`SELECT id, username, password_hash, salt FROM users WHERE username = ?`).bind(username).all();
    if (!userRow.results || userRow.results.length === 0) return new Response('Unauthorized', { status: 401 });

    const user = userRow.results[0];
    const attemptHash = await hashPassword(password, user.salt);
    if (attemptHash !== user.password_hash) return new Response('Unauthorized', { status: 401 });

    // create JWT
    const alg = 'HS256';
    const jwtSecret = await env.JWT_SECRET; // set binding to secret in dashboard or via wrangler
    const jwt = await new SignJWT({ sub: String(user.id), username: user.username })
      .setProtectedHeader({ alg })
      .setIssuer(env.JWT_ISSUER || 'crowmail')
      .setExpirationTime('7d')
      .sign(cryptoKeyFromSecret(jwtSecret));

    return new Response(JSON.stringify({ token: jwt }), { headers: { 'Content-Type':'application/json' }});
  }

  return new Response('Not found', { status: 404 });
}

/** helper to make CryptoKey for jose using env secret */
async function cryptoKeyFromSecret(secret) {
  const enc = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey('raw', enc, { name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
}
