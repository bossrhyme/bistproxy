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

function safeUser(u) {
  return { id: u.id, email: u.email, name: u.name, username: u.username || '', picture: u.picture || '',
           investorType: u.investorType || null, points: u.points || 0,
           lastLoginDate: u.lastLoginDate || null, loginStreak: u.loginStreak || 0 };
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  const body         = await readBody(req);
  const email        = (body.email        || '').trim().toLowerCase();
  const password     = (body.password     || '');
  const username     = (body.username     || '').trim();
  const investorType = (body.investorType || '').trim() || null;
  const name         = (body.name         || username || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    jsonRes(res, 400, { error: 'Geçerli bir e-posta adresi girin' }); return;
  }
  if (!password || password.length < 8) {
    jsonRes(res, 400, { error: 'Şifre en az 8 karakter olmalı' }); return;
  }
  if (password.length > 100) { jsonRes(res, 400, { error: 'Şifre çok uzun' }); return; }
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
    picture: '', createdAt: Date.now(), passwordHash,
    investorType, points: 0, lastLoginDate: null, loginStreak: 0
  };
  await Promise.all([kvSet('usr:' + userId, user), kvSet(unKey, userId)]);
  const { token, ttl } = await createSession(userId);
  res.setHeader('Set-Cookie', 'df_sess=' + token + '; Path=/; Max-Age=' + ttl + '; HttpOnly; Secure; SameSite=Lax');
  jsonRes(res, 200, { user: safeUser(user) });
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  const body     = await readBody(req);
  const email    = (body.email    || '').trim().toLowerCase();
  const password = (body.password || '');

  if (!email || !password) { jsonRes(res, 400, { error: 'E-posta ve şifre gerekli' }); return; }

  const userId = 'em_' + email;
  const user   = await kvGet('usr:' + userId);
  if (!user)              { jsonRes(res, 401, { error: 'Bu e-posta ile kayıtlı hesap bulunamadı' }); return; }
  if (!user.passwordHash) { jsonRes(res, 401, { error: 'Hesap verisi eksik, lütfen tekrar kayıt olun' }); return; }

  let ok = false;
  try { ok = verifyPassword(password, user.passwordHash); } catch(e) { console.error('[login] verifyPassword error:', e.message); }
  if (!ok) { jsonRes(res, 401, { error: 'Şifre hatalı' }); return; }

  const { token, ttl } = await createSession(userId);
  res.setHeader('Set-Cookie', 'df_sess=' + token + '; Path=/; Max-Age=' + ttl + '; HttpOnly; Secure; SameSite=Lax');
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
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  const full = await kvGet('usr:' + user.id);
  if (!full) { jsonRes(res, 404, { error: 'User not found' }); return; }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (full.lastLoginDate === today) {
    jsonRes(res, 200, { ok: true, pointsAdded: 0, points: full.points || 0, streak: full.loginStreak || 0, alreadyChecked: true });
    return;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = full.lastLoginDate === yesterday ? (full.loginStreak || 0) + 1 : 1;
  full.points       = (full.points || 0) + 100;
  full.lastLoginDate = today;
  full.loginStreak   = streak;
  await kvSet('usr:' + user.id, full);
  jsonRes(res, 200, { ok: true, pointsAdded: 100, points: full.points, streak, alreadyChecked: false });
}

async function handleLogout(req, res) {
  const token = parseCookie(req, 'df_sess');
  if (token) { try { await kvDel('sess:' + token); } catch(e) {} }
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
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
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
    const portfolios = await getPortfolios(user.id);
    portfolios.push({ id: 'pf_' + Date.now(), name: name.trim(), icon: icon || '📊', createdAt: Date.now(), positions: [] });
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
    if (name !== undefined) pf.name = name.trim();
    if (icon !== undefined) pf.icon = icon;
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
  const user = await getUser(req);
  if (!user) { jsonRes(res, 401, { error: 'Unauthorized' }); return; }
  const { currentPassword, newPassword } = await readBody(req);
  if (!currentPassword || !newPassword)  { jsonRes(res, 400, { error: 'Mevcut ve yeni şifre gerekli' }); return; }
  if (newPassword.length < 8)            { jsonRes(res, 400, { error: 'Yeni şifre en az 8 karakter olmalı' }); return; }
  const full = await kvGet('usr:' + user.id);
  if (!full || !full.passwordHash) { jsonRes(res, 400, { error: 'Şifre değiştirilemedi' }); return; }
  let ok = false;
  try { ok = verifyPassword(currentPassword, full.passwordHash); } catch(e) {}
  if (!ok) { jsonRes(res, 401, { error: 'Mevcut şifre hatalı' }); return; }
  full.passwordHash = hashPassword(newPassword);
  await kvSet('usr:' + user.id, full);
  jsonRes(res, 200, { ok: true });
}

async function handleUpdateProfile(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
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

// ── main router ───────────────────────────────
module.exports = async function handler(req, res) {
  const path = (req.url || '').split('?')[0];

  try {
    if (path === '/api/auth/register')        return await handleRegister(req, res);
    if (path === '/api/auth/login')           return await handleLogin(req, res);
    if (path === '/api/auth/me')              return await handleMe(req, res);
    if (path === '/api/auth/logout')          return await handleLogout(req, res);
    if (path === '/api/auth/change-password') return await handleChangePassword(req, res);
    if (path === '/api/auth/update-profile')  return await handleUpdateProfile(req, res);
    if (path === '/api/auth/daily-checkin')   return await handleDailyCheckin(req, res);
    if (path.startsWith('/api/portfolio'))    return await handlePortfolio(req, res);
    if (path.startsWith('/api/watchlists'))   return await handleWatchlists(req, res);

    jsonRes(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('[user.js] handler error:', path, e.message);
    const isKvErr = e.message && (e.message.includes('KV_REST_API') || e.message.includes('KV GET') || e.message.includes('KV SET'));
    if (isKvErr) {
      jsonRes(res, 503, {
        error: 'Veritabanı bağlantı hatası. Vercel → Storage → deepfin-cache KV\'yi bistproxy projesine bağlayın.',
        detail: e.message
      });
    } else {
      jsonRes(res, 500, { error: 'Sunucu hatası: ' + e.message });
    }
  }
};
