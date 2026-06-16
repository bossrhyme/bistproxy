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
const { kvGet, kvSet, kvDel, kvIncr, kvPipeline, kvKeys, kvMGet } = require('./_kv');
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

const MAX_BODY = 64 * 1024; // 64 KB
async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > MAX_BODY) { data = ''; req.destroy(); resolve({}); }
    });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch(e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function getIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket.remoteAddress || 'unknown').slice(0, 45);
}

const ALLOWED_ORIGINS = new Set([
  'https://www.deepfin.com',
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
]);
// Vercel preview deployments: bistproxy-git-<branch>-<team>.vercel.app
const VERCEL_PREVIEW_RE = /^https:\/\/bistproxy(-[a-z0-9-]+)?\.vercel\.app$/i;
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try { return VERCEL_PREVIEW_RE.test(origin); } catch(e) { return false; }
}
function checkOrigin(req) {
  const method = req.method;
  if (method === 'OPTIONS') return true;
  const origin  = req.headers['origin']  || '';
  const referer = req.headers['referer'] || '';
  // GET/HEAD: require X-Requested-With or known origin to block simple CSRF
  if (method === 'GET' || method === 'HEAD') {
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
    if (!origin && !referer) return true; // server-to-server
    if (origin) return isAllowedOrigin(origin);
    try { return isAllowedOrigin(new URL(referer).origin); } catch(e) { return false; }
  }
  // POST/PUT/DELETE: strict origin check (default-deny).
  // Referrer-Policy: strict-origin-when-cross-origin → same-origin istekler tam Referer gönderir,
  // dolayısıyla meşru tarayıcı istekleri origin VEYA referer taşır. İkisi de yoksa reddet.
  if (!origin && !referer) return false;
  if (origin) return isAllowedOrigin(origin);
  try { return isAllowedOrigin(new URL(referer).origin); } catch(e) { return false; }
}

// KV-backed rate limiter. Returns true if request is allowed.
async function rlCheck(key, max, windowSec) {
  const safeKey = 'rl:' + key.replace(/[^a-z0-9.:@_-]/gi, '').slice(0, 60);
  try {
    const res = await kvPipeline([['INCR', safeKey], ['TTL', safeKey]]);
    const count = (res[0] && res[0].result) || 0;
    const ttl   = (res[1] && res[1].result) || -1;
    if (ttl < 0) await kvPipeline([['EXPIRE', safeKey, windowSec]]);
    return count <= max;
  } catch(e) { console.error('[rlCheck] KV error:', e.message); return false; } // fail closed
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

async function createSession(userId, remember) {
  const token = crypto.randomBytes(32).toString('hex');
  const ttl   = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
  await kvSet('sess:' + token, { userId, createdAt: Date.now(), expiresAt: Date.now() + ttl * 1000 }, ttl);
  return { token, ttl, remember: !!remember };
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

function safeUser(u) {
  return { id: u.id, email: u.email, name: u.name, username: u.username || '', picture: u.picture || '',
           dob: u.dob || null, investorType: u.investorType || null, points: u.points || 0,
           lastLoginDate: u.lastLoginDate || null, loginStreak: u.loginStreak || 0 };
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  if (!await rlCheck('reg:' + getIP(req), 5, 3600)) {
    jsonRes(res, 429, { error: 'Çok fazla deneme. 1 saat sonra tekrar deneyin.' }); return;
  }
  const body         = await readBody(req);
  const email        = (body.email        || '').trim().toLowerCase();
  const password     = (body.password     || '');
  const username     = (body.username     || '').trim();
  const investorType = (body.investorType || '').trim() || null;
  const name         = (body.name         || username || '').trim();
  const rawDob       = (body.dob          || '').trim();
  let   dob          = null;
  if (rawDob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
      jsonRes(res, 400, { error: 'Doğum tarihi YYYY-AA-GG formatında olmalı' }); return;
    }
    const dobDate = new Date(rawDob);
    if (isNaN(dobDate.getTime())) {
      jsonRes(res, 400, { error: 'Geçerli bir doğum tarihi girin' }); return;
    }
    const nowY = new Date().getFullYear();
    const dobY = dobDate.getFullYear();
    if (dobY < 1900 || dobY > nowY - 5) {
      jsonRes(res, 400, { error: 'Geçerli bir doğum tarihi girin' }); return;
    }
    dob = rawDob;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    jsonRes(res, 400, { error: 'Geçerli bir e-posta adresi girin' }); return;
  }
  if (!password || password.length < 6) {
    jsonRes(res, 400, { error: 'Şifre en az 6 karakter olmalı' }); return;
  }
  if (password.length > 20) { jsonRes(res, 400, { error: 'Şifre en fazla 20 karakter olabilir' }); return; }
  if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    jsonRes(res, 400, { error: 'Kullanıcı adı 3-20 karakter, sadece harf/rakam/alt çizgi olabilir' }); return;
  }

  const userId   = 'em_' + email;
  const unKey    = 'usr_un:' + username.toLowerCase();
  const [existing, takenUn] = await Promise.all([kvGet('usr:' + userId), kvGet(unKey)]);
  if (existing) { jsonRes(res, 409, { error: 'Bu e-posta zaten kayıtlı' }); return; }
  if (takenUn)  { jsonRes(res, 409, { error: 'Bu kullanıcı adı zaten alınmış' }); return; }

  const passwordHash = hashPassword(password);
  const user = {
    id: userId, email, username,
    name: name || username,
    dob,
    picture: '', createdAt: Date.now(), passwordHash,
    investorType, points: 0, lastLoginDate: null, loginStreak: 0
  };
  await Promise.all([kvSet('usr:' + userId, user), kvSet(unKey, userId)]);
  fetch(process.env.KV_REST_API_URL + '/incr/df_total_users', {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
  }).catch(() => {});
  const { token, ttl } = await createSession(userId, true);
  res.setHeader('Set-Cookie', 'df_sess=' + token + '; Path=/; Max-Age=' + ttl + '; HttpOnly; Secure; SameSite=Lax');
  jsonRes(res, 200, { user: safeUser(user) });
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  if (!await rlCheck('login:' + getIP(req), 10, 900)) {
    jsonRes(res, 429, { error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' }); return;
  }
  const body       = await readBody(req);
  const email      = (body.email      || '').trim().toLowerCase();
  const password   = (body.password   || '');
  const rememberMe = !!body.rememberMe;

  if (!email || !password) { jsonRes(res, 400, { error: 'E-posta ve şifre gerekli' }); return; }

  const userId = 'em_' + email;
  const user   = await kvGet('usr:' + userId);
  if (!user || !user.passwordHash) { jsonRes(res, 401, { error: 'E-posta veya şifre hatalı' }); return; }

  let ok = false;
  try { ok = verifyPassword(password, user.passwordHash); } catch(e) { console.error('[login] verifyPassword error:', e.message); }
  if (!ok) { jsonRes(res, 401, { error: 'E-posta veya şifre hatalı' }); return; }

  const { token, ttl } = await createSession(userId, rememberMe);
  const cookieMaxAge = rememberMe ? '; Max-Age=' + ttl : '';
  res.setHeader('Set-Cookie', 'df_sess=' + token + '; Path=/' + cookieMaxAge + '; HttpOnly; Secure; SameSite=Lax');
  jsonRes(res, 200, { user: safeUser(user) });
}

async function handleMe(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = await getUser(req);
    if (user) {
      const full = await kvGet('usr:' + user.id);
      res.status(200).json({ user: safeUser(full || user) });
    } else {
      res.status(200).json({ user: null });
    }
  } catch (e) {
    res.status(200).json({ user: null });
  }
}

async function handleDailyCheckin(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  const full = await kvGet('usr:' + user.id);
  if (!full) { jsonRes(res, 404, { error: 'User not found' }); return; }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (full.lastLoginDate === today) {
    jsonRes(res, 200, { ok: true, pointsAdded: 0, milestoneBonus: 0, points: full.points || 0, streak: full.loginStreak || 0, badges: full.badges || [], alreadyChecked: true });
    return;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = full.lastLoginDate === yesterday ? (full.loginStreak || 0) + 1 : 1;

  const MILESTONE_BONUS = { 7: 300, 14: 400, 21: 500, 28: 600 };
  const MILESTONE_BADGE = { 7: 'streak_7', 14: 'streak_14', 21: 'streak_21', 28: 'streak_28' };
  const milestoneBonus = MILESTONE_BONUS[streak] || 0;
  const totalAdded = 100 + milestoneBonus;

  full.points        = (full.points || 0) + totalAdded;
  full.lastLoginDate = today;
  full.loginStreak   = streak;

  if (milestoneBonus > 0) {
    const badgeKey = MILESTONE_BADGE[streak];
    if (!full.badges) full.badges = [];
    if (!full.badges.includes(badgeKey)) full.badges.push(badgeKey);
  }

  await kvSet('usr:' + user.id, full);
  jsonRes(res, 200, { ok: true, pointsAdded: totalAdded, milestoneBonus, points: full.points, streak, badges: full.badges || [], alreadyChecked: false });
}

async function handleLogout(req, res) {
  const token = parseCookie(req, 'df_sess');
  if (token) { try { await kvDel('sess:' + token); } catch(e) {} }
  res.setHeader('Set-Cookie', 'df_sess=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  redirect(res, '/');
}

async function handleWatchlists(req, res) {
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  res.setHeader('Cache-Control', 'no-store, must-revalidate');

  const method  = req.method;
  const urlPath = (req.url || '').split('?')[0];
  const isItem  = urlPath.endsWith('/item');

  if (method === 'GET') {
    const lists = await getWatchlists(user.id);
    const existing = await kvGet('wl:' + user.id);
    if (!existing || !Array.isArray(existing) || existing.length === 0) await saveWatchlists(user.id, lists);
    jsonRes(res, 200, { watchlists: lists }); return;
  }

  const VALID_EX = new Set(['bist','nasdaq','sp500','nyse','dax','lse','nikkei','krx','crypto',
    'dublin','lisbon','brussels','amsterdam','france','moex','oslo','milan','tsx','twse',
    'b3','hkex','china','saudi','sweden','india','uae','switzerland','australia','southafrica']);

  if (method === 'POST' && isItem) {
    const { listId, symbol, exchange, note } = await readBody(req);
    if (!listId || !symbol || !exchange) { jsonRes(res, 400, { error: 'listId, symbol, exchange required' }); return; }
    if (typeof symbol !== 'string' || !/^[A-Z0-9._-]{1,20}$/i.test(symbol)) { jsonRes(res, 400, { error: 'Geçersiz sembol' }); return; }
    if (typeof exchange !== 'string' || !VALID_EX.has(exchange.toLowerCase())) { jsonRes(res, 400, { error: 'Geçersiz borsa' }); return; }
    if (typeof note === 'string' && note.length > 200) { jsonRes(res, 400, { error: 'Not en fazla 200 karakter olabilir' }); return; }
    const lists = await getWatchlists(user.id);
    const list  = lists.find(l => l.id === listId);
    if (!list) { jsonRes(res, 404, { error: 'List not found' }); return; }
    const safeSymbol = symbol.toUpperCase().replace(/[^A-Z0-9._-]/g, '').slice(0, 20);
    const safeExchange = exchange.toLowerCase();
    if (!list.items.find(i => i.symbol === safeSymbol && i.exchange === safeExchange)) {
      list.items.push({ symbol: safeSymbol, exchange: safeExchange, addedAt: Date.now(), note: note || '' });
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
    if (name.trim().length > 40) { jsonRes(res, 400, { error: 'Liste adı en fazla 40 karakter olabilir' }); return; }
    const lists = await getWatchlists(user.id);
    if (lists.length >= 20) { jsonRes(res, 400, { error: 'En fazla 20 liste oluşturabilirsiniz' }); return; }
    const safeIcon = typeof icon === 'string' ? icon.slice(0, 8) : '⭐';
    lists.push({ id: 'wl_' + Date.now(), name: name.trim(), icon: safeIcon, createdAt: Date.now(), items: [] });
    await saveWatchlists(user.id, lists);
    jsonRes(res, 200, { watchlists: lists }); return;
  }

  if (method === 'PUT') {
    const { id, name, icon, items } = await readBody(req);
    if (!id) { jsonRes(res, 400, { error: 'id required' }); return; }
    const lists = await getWatchlists(user.id);
    const idx   = lists.findIndex(l => l.id === id);
    if (idx === -1) { jsonRes(res, 404, { error: 'List not found' }); return; }
    if (name !== undefined) {
      if (!name.trim() || name.trim().length > 40) { jsonRes(res, 400, { error: 'Liste adı 1-40 karakter olmalı' }); return; }
      lists[idx].name = name.trim();
    }
    if (icon !== undefined) lists[idx].icon = typeof icon === 'string' ? icon.slice(0, 8) : '⭐';
    if (items !== undefined) {
      if (!Array.isArray(items)) { jsonRes(res, 400, { error: 'Geçersiz items' }); return; }
      lists[idx].items = items.map(item => ({
        symbol:   (typeof item.symbol === 'string' ? item.symbol.toUpperCase().replace(/[^A-Z0-9._-]/g, '').slice(0, 20) : ''),
        exchange: (typeof item.exchange === 'string' && VALID_EX.has(item.exchange.toLowerCase())) ? item.exchange.toLowerCase() : 'bist',
        addedAt:  typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
        note:     typeof item.note === 'string' ? item.note.slice(0, 200) : '',
      })).filter(item => item.symbol);
    }
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

// ── portfolio helpers ─────────────────────────
function makeDefaultPortfolio(legacyPositions) {
  return [{ id: 'pf_default', name: 'Portföyüm', icon: '📊', createdAt: Date.now(), positions: legacyPositions || [] }];
}

async function getPortfolios(userId) {
  const data = await kvGet('pf:' + userId);
  if (!data) return makeDefaultPortfolio();
  // Migration: old format was a flat positions array
  if (Array.isArray(data) && (data.length === 0 || (data[0] && data[0].symbol))) {
    return makeDefaultPortfolio(data);
  }
  return Array.isArray(data) && data.length ? data : makeDefaultPortfolio();
}

async function savePortfolios(userId, portfolios) {
  await kvSet('pf:' + userId, portfolios);
}

async function handlePortfolio(req, res) {
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  const method  = req.method;
  const urlPath = (req.url || '').split('?')[0];
  const isItem  = urlPath.endsWith('/item');

  // GET — list portfolios
  if (method === 'GET') {
    const portfolios = await getPortfolios(user.id);
    jsonRes(res, 200, { portfolios }); return;
  }

  // POST /api/portfolio — create portfolio
  if (method === 'POST' && !isItem) {
    const { name, icon } = await readBody(req);
    if (!name || !name.trim()) { jsonRes(res, 400, { error: 'name required' }); return; }
    if (name.trim().length > 40) { jsonRes(res, 400, { error: 'Portföy adı en fazla 40 karakter olabilir' }); return; }
    const portfolios = await getPortfolios(user.id);
    if (portfolios.length >= 10) { jsonRes(res, 400, { error: 'En fazla 10 portföy oluşturabilirsiniz' }); return; }
    const safeIcon = typeof icon === 'string' ? icon.slice(0, 8) : '📊';
    portfolios.push({ id: 'pf_' + Date.now(), name: name.trim(), icon: safeIcon, createdAt: Date.now(), positions: [] });
    await savePortfolios(user.id, portfolios);
    jsonRes(res, 200, { portfolios }); return;
  }

  // PUT /api/portfolio — rename portfolio
  if (method === 'PUT' && !isItem) {
    const { id, name, icon } = await readBody(req);
    if (!id) { jsonRes(res, 400, { error: 'id required' }); return; }
    const portfolios = await getPortfolios(user.id);
    const pf = portfolios.find(p => p.id === id);
    if (!pf) { jsonRes(res, 404, { error: 'Portfolio not found' }); return; }
    if (name !== undefined) {
      if (!name.trim() || name.trim().length > 40) { jsonRes(res, 400, { error: 'Portföy adı 1-40 karakter olmalı' }); return; }
      pf.name = name.trim();
    }
    if (icon !== undefined) pf.icon = typeof icon === 'string' ? icon.slice(0, 8) : '📊';
    await savePortfolios(user.id, portfolios);
    jsonRes(res, 200, { portfolios }); return;
  }

  // DELETE /api/portfolio — delete portfolio
  if (method === 'DELETE' && !isItem) {
    const { id } = await readBody(req);
    if (!id) { jsonRes(res, 400, { error: 'id required' }); return; }
    const portfolios = await getPortfolios(user.id);
    if (portfolios.length <= 1) { jsonRes(res, 400, { error: 'Son portföy silinemez' }); return; }
    const filtered = portfolios.filter(p => p.id !== id);
    if (filtered.length === portfolios.length) { jsonRes(res, 404, { error: 'Portfolio not found' }); return; }
    await savePortfolios(user.id, filtered);
    jsonRes(res, 200, { portfolios: filtered }); return;
  }

  // POST /api/portfolio/item — add position
  if (method === 'POST' && isItem) {
    const { portfolioId, symbol, exchange, quantity, avgCost } = await readBody(req);
    if (!symbol || !exchange || quantity == null || avgCost == null) {
      jsonRes(res, 400, { error: 'portfolioId, symbol, exchange, quantity, avgCost required' }); return;
    }
    const qty  = parseFloat(quantity);
    const cost = parseFloat(avgCost);
    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
      jsonRes(res, 400, { error: 'Geçersiz adet veya maliyet' }); return;
    }
    const portfolios = await getPortfolios(user.id);
    const pf = portfolios.find(p => p.id === (portfolioId || portfolios[0].id));
    if (!pf) { jsonRes(res, 404, { error: 'Portfolio not found' }); return; }
    const sym = symbol.toString().toUpperCase();
    const existing = pf.positions.find(p => p.symbol === sym && p.exchange === exchange);
    if (existing) {
      const totalQty   = existing.quantity + qty;
      existing.avgCost  = (existing.avgCost * existing.quantity + cost * qty) / totalQty;
      existing.quantity = totalQty;
    } else {
      pf.positions.push({ id: 'pos_' + Date.now(), symbol: sym, exchange, quantity: qty, avgCost: cost, addedAt: Date.now() });
    }
    await savePortfolios(user.id, portfolios);
    jsonRes(res, 200, { portfolios }); return;
  }

  // PUT /api/portfolio/item — edit position
  if (method === 'PUT' && isItem) {
    const { portfolioId, id, quantity, avgCost } = await readBody(req);
    if (!id) { jsonRes(res, 400, { error: 'id required' }); return; }
    const portfolios = await getPortfolios(user.id);
    const pf = portfolios.find(p => p.id === (portfolioId || portfolios[0].id));
    if (!pf) { jsonRes(res, 404, { error: 'Portfolio not found' }); return; }
    const pos = pf.positions.find(p => p.id === id);
    if (!pos) { jsonRes(res, 404, { error: 'Position not found' }); return; }
    if (quantity != null) pos.quantity = parseFloat(quantity);
    if (avgCost  != null) pos.avgCost  = parseFloat(avgCost);
    await savePortfolios(user.id, portfolios);
    jsonRes(res, 200, { portfolios }); return;
  }

  // DELETE /api/portfolio/item — remove position
  if (method === 'DELETE' && isItem) {
    const { portfolioId, id } = await readBody(req);
    if (!id) { jsonRes(res, 400, { error: 'id required' }); return; }
    const portfolios = await getPortfolios(user.id);
    const pf = portfolios.find(p => p.id === (portfolioId || portfolios[0].id));
    if (!pf) { jsonRes(res, 404, { error: 'Portfolio not found' }); return; }
    pf.positions = pf.positions.filter(p => p.id !== id);
    await savePortfolios(user.id, portfolios);
    jsonRes(res, 200, { portfolios }); return;
  }

  jsonRes(res, 405, { error: 'Method not allowed' });
}

async function handleChangePassword(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  if (!await rlCheck('cpw:' + user.id, 5, 3600)) {
    jsonRes(res, 429, { error: 'Çok fazla deneme. 1 saat sonra tekrar deneyin.' }); return;
  }
  const { currentPassword, newPassword } = await readBody(req);
  if (!currentPassword || !newPassword)  { jsonRes(res, 400, { error: 'Mevcut ve yeni şifre gerekli' }); return; }
  if (newPassword.length < 6)            { jsonRes(res, 400, { error: 'Yeni şifre en az 6 karakter olmalı' }); return; }
  if (newPassword.length > 20)           { jsonRes(res, 400, { error: 'Yeni şifre en fazla 20 karakter olabilir' }); return; }
  const full = await kvGet('usr:' + user.id);
  if (!full || !full.passwordHash) { jsonRes(res, 400, { error: 'Şifre değiştirilemedi' }); return; }
  let ok = false;
  try { ok = verifyPassword(currentPassword, full.passwordHash); } catch(e) {}
  if (!ok) { jsonRes(res, 401, { error: 'Mevcut şifre hatalı' }); return; }
  full.passwordHash      = hashPassword(newPassword);
  full.passwordChangedAt = Date.now();
  await kvSet('usr:' + user.id, full);
  jsonRes(res, 200, { ok: true });
}

async function handleUpdateProfile(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  const { name } = await readBody(req);
  const newName = (name || '').trim();
  if (!newName || newName.length > 60) { jsonRes(res, 400, { error: 'Geçerli bir isim girin' }); return; }
  const full = await kvGet('usr:' + user.id);
  if (!full) { jsonRes(res, 404, { error: 'Kullanıcı bulunamadı' }); return; }
  full.name = newName;
  await kvSet('usr:' + user.id, full);
  jsonRes(res, 200, { ok: true, name: newName });
}

async function handleSetInvestorType(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  if (!checkOrigin(req)) { jsonRes(res, 403, { error: 'Geçersiz istek kaynağı' }); return; }
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  const { investorType } = await readBody(req);
  const VALID = ['growth','div','value','mom','def','small','spec','tech','bal'];
  if (!investorType || !VALID.includes(investorType)) {
    jsonRes(res, 400, { error: 'Geçersiz yatırımcı tipi' }); return;
  }
  const full = await kvGet('usr:' + user.id);
  if (!full) { jsonRes(res, 404, { error: 'Kullanıcı bulunamadı' }); return; }
  full.investorType = investorType;
  await kvSet('usr:' + user.id, full);
  jsonRes(res, 200, { ok: true, user: safeUser(full) });
}

// ── Track ──────────────────────────────────────
async function handleTrack(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, {}); return; }
  try {
    const body = await readBody(req);
    const type = (body.type || '').toLowerCase().replace(/[^a-z]/g, '');
    if (type === 'scan') {
      await kvIncr('df_total_scans');
      jsonRes(res, 200, { ok: true });
      return;
    }
    if (!['tech','goat','preset','wl'].includes(type)) { jsonRes(res, 400, {}); return; }
    const rawKey = (body.key || '').trim();
    const safeKey = type === 'wl'
      ? rawKey.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12)
      : rawKey.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    if (!safeKey) { jsonRes(res, 400, {}); return; }
    await kvIncr('rpt:' + type + ':' + safeKey);
    jsonRes(res, 200, { ok: true });
  } catch(e) {
    jsonRes(res, 200, { ok: false });
  }
}

function checkAdminKey(req) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false;
  const hKey = req.headers['x-admin-key'] || '';
  if (!hKey) return false;
  // HMAC karşılaştırması: anahtar uzunluğunu ele vermez, timing-safe
  try {
    const h1 = crypto.createHmac('sha256', adminKey).update('df-admin-v1').digest();
    const h2 = crypto.createHmac('sha256', hKey).update('df-admin-v1').digest();
    return crypto.timingSafeEqual(h1, h2);
  } catch(e) { return false; }
}

// ── Report ─────────────────────────────────────
async function handleReport(req, res) {
  if (!checkAdminKey(req)) { jsonRes(res, 403, { error: 'Yetkisiz' }); return; }
  try {
    const forceRefresh = (req.url || '').includes('force=1');
    const cached = forceRefresh ? null : await kvGet('rpt:cache:v2').catch(() => null);
    if (cached && cached._ts && Date.now() - cached._ts < 60000) {
      jsonRes(res, 200, cached); return;
    }
    const [scansRaw, usersRaw, userKeys, techKeys, goatKeys, presetKeys, wlKeys] = await Promise.all([
      kvGet('df_total_scans').catch(() => 0),
      kvGet('df_total_users').catch(() => 0),
      kvKeys('usr:em_*'),
      kvKeys('rpt:tech:*'),
      kvKeys('rpt:goat:*'),
      kvKeys('rpt:preset:*'),
      kvKeys('rpt:wl:*')
    ]);
    const actualUsers = userKeys.length;
    const allStratKeys = [...techKeys, ...goatKeys, ...presetKeys];
    const [stratVals, wlVals] = await Promise.all([
      kvMGet(allStratKeys),
      kvMGet(wlKeys)
    ]);
    const strategies = allStratKeys.map(function(k, i) {
      const parts = k.split(':');
      return { type: parts[1], key: parts[2], count: parseInt(stratVals[i], 10) || 0 };
    }).sort(function(a, b) { return b.count - a.count; });
    const watchlist = wlKeys.map(function(k, i) {
      return { symbol: k.split(':')[2], count: parseInt(wlVals[i], 10) || 0 };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 30);
    const report = {
      stats: { total_scans: parseInt(scansRaw, 10) || 0, total_users: Math.max(parseInt(usersRaw, 10) || 0, actualUsers) },
      strategies, watchlist, _ts: Date.now()
    };
    await kvSet('rpt:cache:v2', report, 60).catch(() => {});
    jsonRes(res, 200, report);
  } catch(e) {
    console.error("[user.js]", e.message); jsonRes(res, 500, { error: "Sunucu hatası" });
  }
}

// ── Admin Users ────────────────────────────────
async function handleAdminUsers(req, res) {
  if (!checkAdminKey(req)) { jsonRes(res, 403, { error: 'Yetkisiz' }); return; }
  try {
    const cached = await kvGet('rpt:users_cache').catch(() => null);
    if (cached && cached._ts && Date.now() - cached._ts < 300000) {
      jsonRes(res, 200, cached); return;
    }
    const userKeys = await kvKeys('usr:em_*');
    const userVals = await kvMGet(userKeys);
    const users = userVals.filter(Boolean).map(function(u) {
      let ageGroup = '—';
      if (u.dob) {
        const age = Math.floor((Date.now() - new Date(u.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
        ageGroup = age < 18 ? '<18' : age < 25 ? '18-24' : age < 35 ? '25-34' : age < 50 ? '35-49' : '50+';
      }
      return { username: u.username, name: u.name || '', email: u.email,
               investorType: u.investorType || '—', ageGroup, createdAt: u.createdAt || 0 };
    }).sort(function(a, b) { return b.createdAt - a.createdAt; });
    const ageDist = {}, invDist = {};
    users.forEach(function(u) {
      ageDist[u.ageGroup] = (ageDist[u.ageGroup] || 0) + 1;
      if (u.investorType && u.investorType !== '—')
        invDist[u.investorType] = (invDist[u.investorType] || 0) + 1;
    });
    const result = { users, ageDist, invDist, _ts: Date.now() };
    await kvSet('rpt:users_cache', result, 300).catch(() => {});
    jsonRes(res, 200, result);
  } catch(e) {
    console.error("[user.js]", e.message); jsonRes(res, 500, { error: "Sunucu hatası" });
  }
}

// ── Admin User Detail ──────────────────────────
async function handleAdminUserDetail(req, res) {
  if (!checkAdminKey(req)) { jsonRes(res, 403, { error: 'Yetkisiz' }); return; }
  const match = (req.url || '').match(/[?&]email=([^&]*)/);
  if (!match) { jsonRes(res, 400, { error: 'email gerekli' }); return; }
  const email = decodeURIComponent(match[1]).trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { jsonRes(res, 400, { error: 'Geçersiz email' }); return; }
  const userId = 'em_' + email;
  const [watchlists, portfolios] = await Promise.all([
    getWatchlists(userId).catch(() => []),
    getPortfolios(userId).catch(() => [])
  ]);
  jsonRes(res, 200, { watchlists, portfolios });
}

// ── Admin Bans ─────────────────────────────────
async function handleAdminBans(req, res) {
  if (!checkAdminKey(req)) { jsonRes(res, 403, { error: 'Yetkisiz' }); return; }
  if (req.method === 'GET') {
    try {
      const keys = await kvKeys('ban:ip:*');
      const ips = keys.map(k => k.replace('ban:ip:', ''));
      jsonRes(res, 200, { banned: ips, count: ips.length });
    } catch(e) { console.error("[user.js]", e.message); jsonRes(res, 500, { error: "Sunucu hatası" }); }
  } else if (req.method === 'POST') {
    const body = await readBody(req);
    const ip = (body.ip || '').trim().slice(0, 45);
    const action = body.action || 'ban';
    if (!ip) { jsonRes(res, 400, { error: 'ip gerekli' }); return; }
    if (!/^[a-fA-F0-9.:]{1,45}$/.test(ip)) { jsonRes(res, 400, { error: 'Geçersiz IP' }); return; }
    try {
      if (action === 'unban') {
        await kvDel('ban:ip:' + ip);
        await kvDel('viol:ip:' + ip);
        jsonRes(res, 200, { ok: true, action: 'unban', ip });
      } else {
        const ttl = Math.min(parseInt(body.ttl, 10) || 86400, 604800);
        await kvSet('ban:ip:' + ip, '1', ttl);
        jsonRes(res, 200, { ok: true, action: 'ban', ip, ttl });
      }
    } catch(e) { console.error("[user.js]", e.message); jsonRes(res, 500, { error: "Sunucu hatası" }); }
  } else {
    jsonRes(res, 405, { error: 'Method Not Allowed' });
  }
}

async function handleStats(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Content-Type', 'application/json');
  try {
    const [scansRaw, usersRaw, userKeys] = await Promise.all([
      kvGet('df_total_scans').catch(() => 0),
      kvGet('df_total_users').catch(() => 0),
      kvKeys('usr:em_*').catch(() => []),
    ]);
    const scans = parseInt(scansRaw, 10) || 0;
    const users = Math.max(parseInt(usersRaw, 10) || 0, userKeys.length);
    res.status(200).json({ scans, users });
  } catch (e) {
    res.status(200).json({ scans: 0, users: 0 });
  }
}

// ── Son Taramalar (site-geneli) — GET son 10 / POST ekle (KV LPUSH+LTRIM) ──
async function handleRecentScans(req, res) {
  const LIST_KEY = 'df_recent_scans_v2'; // v2: eski hatalı (filtresiz/607) kayıtları bırak, taze başla
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    try {
      const out = await kvPipeline([['LRANGE', LIST_KEY, '0', '9']]);
      const raw = (out[0] && out[0].result) || [];
      const scans = raw.map(function (s) { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      jsonRes(res, 200, { scans: scans });
    } catch (e) { jsonRes(res, 200, { scans: [] }); }
    return;
  }
  if (req.method === 'POST') {
    if (!checkOrigin(req)) { jsonRes(res, 403, { ok: false }); return; }
    const body = await readBody(req) || {};
    const clean = function (s, max) { return String(s == null ? '' : s).replace(/[\x00-\x1F<>]/g, '').slice(0, max).trim(); };
    const kind = clean(body.kind, 8), asset = clean(body.asset, 8), k = clean(body.k, 40);
    const label = clean(body.label, 48), ex = clean(body.ex, 16), exLabel = clean(body.exLabel, 24);
    const count = Math.max(0, Math.min(parseInt(body.count, 10) || 0, 1000000));
    const matched = Math.max(0, Math.min(parseInt(body.matched, 10) || 0, 1000000));
    if (['goat', 'preset', 'tech'].indexOf(kind) < 0 || ['borsa', 'kripto', 'fon'].indexOf(asset) < 0
        || !k || !label || !/^[a-zA-Z0-9_-]+$/.test(k)) {
      jsonRes(res, 400, { ok: false }); return;
    }
    const rec = JSON.stringify({ kind, asset, k, label, ex, exLabel, count, matched, ts: Date.now() });
    try {
      await kvPipeline([['LPUSH', LIST_KEY, rec], ['LTRIM', LIST_KEY, '0', '19']]);
      jsonRes(res, 200, { ok: true });
    } catch (e) { jsonRes(res, 200, { ok: false }); }
    return;
  }
  jsonRes(res, 405, { ok: false });
}

// ── main router ───────────────────────────────
module.exports = async function handler(req, res) {
  const path = (req.url || '').split('?')[0];

  try {
    if (path === '/api/stats')               return await handleStats(req, res);
    if (path === '/api/recent-scans')        return await handleRecentScans(req, res);
    if (path === '/api/track')               return await handleTrack(req, res);
    if (path === '/api/report')              return await handleReport(req, res);
    if (path === '/api/admin/users')         return await handleAdminUsers(req, res);
    if (path === '/api/admin/bans')          return await handleAdminBans(req, res);
    if (path === '/api/admin/user-detail')   return await handleAdminUserDetail(req, res);
    if (path === '/api/auth/register')        return await handleRegister(req, res);
    if (path === '/api/auth/login')           return await handleLogin(req, res);
    if (path === '/api/auth/me')              return await handleMe(req, res);
    if (path === '/api/auth/logout')          return await handleLogout(req, res);
    if (path === '/api/auth/change-password') return await handleChangePassword(req, res);
    if (path === '/api/auth/update-profile')  return await handleUpdateProfile(req, res);
    if (path === '/api/auth/daily-checkin')     return await handleDailyCheckin(req, res);
    if (path === '/api/auth/set-investor-type') return await handleSetInvestorType(req, res);
    if (path.startsWith('/api/portfolio'))    return await handlePortfolio(req, res);
    if (path.startsWith('/api/watchlists'))   return await handleWatchlists(req, res);

    jsonRes(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('[user.js] handler error:', path, e.message);
    const isKvErr = e.message && (e.message.includes('KV_REST_API') || e.message.includes('KV GET') || e.message.includes('KV SET'));
    if (isKvErr) {
      jsonRes(res, 503, { error: 'Veritabanı bağlantı hatası. Lütfen daha sonra tekrar deneyin.' });
    } else {
      jsonRes(res, 500, { error: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
    }
  }
};
