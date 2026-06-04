// ─────────────────────────────────────────────
// /api/user — auth + watchlists
// Routes:
//   POST /api/auth/register    → register with email + password
//   POST /api/auth/login       → login with email + password
//   GET  /api/auth/me          → get current user
//   ANY  /api/auth/logout      → clear session
//   *    /api/watchlists       → watchlist CRUD
//   *    /api/watchlists/item  → add/remove item
// ─────────────────────────────────────────────
const crypto = require('crypto');
const { kvGet, kvSet, kvDel } = require('./_kv');
const { getUser, parseCookie } = require('./_auth');

// ── helpers ──────────────────────────────────
function jsonRes(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(data);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch(e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// ── password helpers ─────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const hashBuf   = Buffer.from(hash, 'hex');
  const derived   = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(hashBuf, derived);
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const ttl   = 30 * 24 * 60 * 60;
  await kvSet('sess:' + token, { userId, expiresAt: Date.now() + ttl * 1000 }, ttl);
  return { token, ttl };
}

// ── watchlist helpers ─────────────────────────
function makeDefaultList() {
  return [{ id: 'wl_default', name: 'Favorilerim', icon: '⭐', createdAt: Date.now(), items: [] }];
}

async function getWatchlists(userId) {
  const lists = await kvGet('wl:' + userId);
  if (!lists || !Array.isArray(lists) || lists.length === 0) return makeDefaultList();
  return lists;
}

async function saveWatchlists(userId, lists) {
  await kvSet('wl:' + userId, lists);
}

// ── route handlers ────────────────────────────

async function handleRegister(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  const body     = await readBody(req);
  const email    = (body.email    || '').trim().toLowerCase();
  const password = (body.password || '');
  const name     = (body.name     || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    jsonRes(res, 400, { error: 'Geçerli bir e-posta adresi girin' }); return;
  }
  if (!password || password.length < 8) {
    jsonRes(res, 400, { error: 'Şifre en az 8 karakter olmalı' }); return;
  }
  if (password.length > 100) {
    jsonRes(res, 400, { error: 'Şifre çok uzun' }); return;
  }

  const userId  = 'em_' + email;
  const existing = await kvGet('usr:' + userId);
  if (existing) { jsonRes(res, 409, { error: 'Bu e-posta zaten kayıtlı' }); return; }

  const passwordHash = hashPassword(password);
  const user = {
    id: userId, email,
    name: name || email.split('@')[0],
    picture: '',
    createdAt: Date.now(),
    passwordHash
  };
  await kvSet('usr:' + userId, user);

  const { token, ttl } = await createSession(userId);
  res.setHeader('Set-Cookie', 'df_sess=' + token + '; Path=/; Max-Age=' + ttl + '; HttpOnly; Secure; SameSite=Lax');
  jsonRes(res, 200, { user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  const body     = await readBody(req);
  const email    = (body.email    || '').trim().toLowerCase();
  const password = (body.password || '');

  if (!email || !password) { jsonRes(res, 400, { error: 'E-posta ve şifre gerekli' }); return; }

  const userId = 'em_' + email;
  const user   = await kvGet('usr:' + userId);
  if (!user || !user.passwordHash) { jsonRes(res, 401, { error: 'E-posta veya şifre hatalı' }); return; }

  let ok = false;
  try { ok = verifyPassword(password, user.passwordHash); } catch(e) {}
  if (!ok) { jsonRes(res, 401, { error: 'E-posta veya şifre hatalı' }); return; }

  const { token, ttl } = await createSession(userId);
  res.setHeader('Set-Cookie', 'df_sess=' + token + '; Path=/; Max-Age=' + ttl + '; HttpOnly; Secure; SameSite=Lax');
  jsonRes(res, 200, { user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
}

async function handleMe(req, res) {
  const user = await getUser(req);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (user) {
    res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
  } else {
    res.status(200).json({ user: null });
  }
}

async function handleLogout(req, res) {
  const token = parseCookie(req, 'df_sess');
  if (token) await kvDel('sess:' + token);
  res.setHeader('Set-Cookie', 'df_sess=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  redirect(res, '/');
}

async function handleWatchlists(req, res) {
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }

  const method  = req.method;
  const urlPath = (req.url || '').split('?')[0];
  const isItem  = urlPath.endsWith('/item');

  if (method === 'GET') {
    const lists = await getWatchlists(user.id);
    const existing = await kvGet('wl:' + user.id);
    if (!existing || !Array.isArray(existing) || existing.length === 0) await saveWatchlists(user.id, lists);
    jsonRes(res, 200, { watchlists: lists }); return;
  }

  if (method === 'POST' && isItem) {
    const { listId, symbol, exchange, note } = await readBody(req);
    if (!listId || !symbol || !exchange) { jsonRes(res, 400, { error: 'listId, symbol, exchange required' }); return; }
    const lists = await getWatchlists(user.id);
    const list  = lists.find(l => l.id === listId);
    if (!list) { jsonRes(res, 404, { error: 'List not found' }); return; }
    if (!list.items.find(i => i.symbol === symbol && i.exchange === exchange)) {
      list.items.push({ symbol, exchange, addedAt: Date.now(), note: note || '' });
    }
    await saveWatchlists(user.id, lists);
    jsonRes(res, 200, { watchlists: lists }); return;
  }

  if (method === 'DELETE' && isItem) {
    const { listId, symbol } = await readBody(req);
    if (!listId || !symbol) { jsonRes(res, 400, { error: 'listId, symbol required' }); return; }
    const lists = await getWatchlists(user.id);
    const list  = lists.find(l => l.id === listId);
    if (!list) { jsonRes(res, 404, { error: 'List not found' }); return; }
    list.items = list.items.filter(i => i.symbol !== symbol);
    await saveWatchlists(user.id, lists);
    jsonRes(res, 200, { watchlists: lists }); return;
  }

  if (method === 'POST') {
    const { name, icon } = await readBody(req);
    if (!name || !name.trim()) { jsonRes(res, 400, { error: 'name required' }); return; }
    const lists = await getWatchlists(user.id);
    lists.push({ id: 'wl_' + Date.now(), name: name.trim(), icon: icon || '⭐', createdAt: Date.now(), items: [] });
    await saveWatchlists(user.id, lists);
    jsonRes(res, 200, { watchlists: lists }); return;
  }

  if (method === 'PUT') {
    const { id, name, icon, items } = await readBody(req);
    if (!id) { jsonRes(res, 400, { error: 'id required' }); return; }
    const lists = await getWatchlists(user.id);
    const idx   = lists.findIndex(l => l.id === id);
    if (idx === -1) { jsonRes(res, 404, { error: 'List not found' }); return; }
    if (name  !== undefined) lists[idx].name  = name.trim();
    if (icon  !== undefined) lists[idx].icon  = icon;
    if (items !== undefined) lists[idx].items = items;
    await saveWatchlists(user.id, lists);
    jsonRes(res, 200, { watchlists: lists }); return;
  }

  if (method === 'DELETE') {
    const { id } = await readBody(req);
    if (!id) { jsonRes(res, 400, { error: 'id required' }); return; }
    const lists = await getWatchlists(user.id);
    if (lists.length <= 1) { jsonRes(res, 400, { error: 'Cannot delete last list' }); return; }
    const filtered = lists.filter(l => l.id !== id);
    if (filtered.length === lists.length) { jsonRes(res, 404, { error: 'List not found' }); return; }
    await saveWatchlists(user.id, filtered);
    jsonRes(res, 200, { watchlists: filtered }); return;
  }

  jsonRes(res, 405, { error: 'Method not allowed' });
}

// ── main router ───────────────────────────────
module.exports = async function handler(req, res) {
  const path = (req.url || '').split('?')[0];

  if (path === '/api/auth/register') return handleRegister(req, res);
  if (path === '/api/auth/login')    return handleLogin(req, res);
  if (path === '/api/auth/me')       return handleMe(req, res);
  if (path === '/api/auth/logout')   return handleLogout(req, res);
  if (path.startsWith('/api/watchlists')) return handleWatchlists(req, res);

  jsonRes(res, 404, { error: 'Not found' });
};
