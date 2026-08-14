/**
 * Nimbus SSO — demo backend
 * Zero external dependencies: only Node.js built-ins (http, crypto, fs, path).
 * Run with:  node server.js
 * Then open: http://localhost:3000
 *
 * This is a learning/demo backend, not production-hardened. See README.md
 * for what you'd need to add before using this for anything real.
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---- tiny "database" (JSON file) ----------------------------------------
function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')).users;
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  // timing-safe compare
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- in-memory sessions ---------------------------------------------------
// token -> { username, expires }
const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60; // 1 hour

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, expires: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSession(token) {
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expires) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').filter(Boolean).map(p => {
      const [k, ...v] = p.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
}

// ---- basic rate limiting on login (per IP, in-memory) ---------------------
const loginAttempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;

function tooManyAttempts(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now > rec.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

// ---- helpers ---------------------------------------------------------------
function sendJSON(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // basic guard
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---- request handler ---------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ip = req.socket.remoteAddress || 'unknown';

  // POST /api/login
  if (url.pathname === '/api/login' && req.method === 'POST') {
    if (tooManyAttempts(ip)) {
      return sendJSON(res, 429, { ok: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
    }
    let payload;
    try { payload = JSON.parse(await readBody(req)); }
    catch { return sendJSON(res, 400, { ok: false, error: 'Payload tidak valid.' }); }

    const { username, password } = payload || {};
    if (!username || !password) {
      return sendJSON(res, 400, { ok: false, error: 'Username dan password wajib diisi.' });
    }

    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (!user || !verifyPassword(password, user.salt, user.hash)) {
      return sendJSON(res, 401, { ok: false, error: 'Username atau password salah.' });
    }

    const token = createSession(user.username);
    return sendJSON(res, 200, { ok: true, displayName: user.displayName }, {
      'Set-Cookie': `nimbus_session=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax`,
    });
  }

  // POST /api/logout
  if (url.pathname === '/api/logout' && req.method === 'POST') {
    const { nimbus_session } = parseCookies(req);
    if (nimbus_session) sessions.delete(nimbus_session);
    return sendJSON(res, 200, { ok: true }, {
      'Set-Cookie': 'nimbus_session=; HttpOnly; Path=/; Max-Age=0',
    });
  }

  // GET /api/me
  if (url.pathname === '/api/me' && req.method === 'GET') {
    const { nimbus_session } = parseCookies(req);
    const session = nimbus_session && getSession(nimbus_session);
    if (!session) return sendJSON(res, 401, { ok: false });
    const user = loadUsers().find(u => u.username === session.username);
    return sendJSON(res, 200, { ok: true, username: session.username, displayName: user?.displayName });
  }

  // everything else -> static files (public/)
  if (req.method === 'GET') {
    return serveStatic(req, res, url.pathname);
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`Nimbus SSO demo running at http://localhost:${PORT}`);
  console.log(`Demo login  ->  username: demo   password: Demo#1234`);
});
