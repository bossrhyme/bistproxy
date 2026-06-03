// ─────────────────────────────────────────────
// /api/user — auth + watchlists (consolidated to stay within Hobby plan 12-function limit)
// Routes:
//   GET  /api/auth/google      → redirect to Google OAuth
//   GET  /api/auth/callback    → handle OAuth callback
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

async function handleGoogleLogin(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) { jsonRes(res, 500, { error: 'GOOGLE_CLIENT_ID not configured' }); return; }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const redirectUri = proto + '://' + host + '/api/auth/callback';
  const state = crypto.randomBytes(16).toString('hex');

  res.setHeader('Set-Cookie', 'df_oauth_state=' + state + '; Path=/; Max-Age=600; SameSite=Lax; Secure');
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri,
    response_type: 'code', scope: 'openid email profile',
    state, access_type: 'online', prompt: 'select_account'
  });
  redirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
}

async function handleCallback(req, res) {
  const qs    = new URLSearchParams((req.url || '').split('?')[1] || '');
  const code  = qs.get('code');
  const state = qs.get('state');
  const error = qs.get('error');

  if (error) { redirect(res, '/?auth_error=' + encodeURIComponent(error)); return; }

  const storedState = parseCookie(req, 'df_oauth_state');
  if (!state || state !== storedState) { redirect(res, '/?auth_error=csrf'); return; }
  if (!code) { redirect(res, '/?auth_error=no_code'); return; }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const redirectUri = proto + '://' + host + '/api/auth/callback';

  let tokenData;
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri,
        grant_type: 'authorization_code' }).toString()
    });
    tokenData = await r.json();
  } catch(e) { redirect(res, '/?auth_error=token_exchange'); return; }

  if (!tokenData.access_token) { redirect(res, '/?auth_error=no_access_token'); return; }

  let userInfo;
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: 'Bearer ' + tokenData.access_token } });
    userInfo = await r.json();
  } catch(e) { redirect(res, '/?auth_error=userinfo'); return; }

  const userId = userInfo.sub;
  if (!userId) { redirect(res, '/?auth_error=no_sub'); return; }

  const existing = await kvGet('usr:' + userId);
  const user = { id: userId, email: userInfo.email || '', name: userInfo.name || userInfo.email || '',
    picture: userInfo.picture || '', createdAt: existing ? existing.createdAt : Date.now() };
  await kvSet('usr:' + userId, user);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const ttl = 30 * 24 * 60 * 60;
  await kvSet('sess:' + sessionToken, { userId, expiresAt: Date.now() + ttl * 1000 }, ttl);

  res.setHeader('Set-Cookie', [
    'df_oauth_state=; Path=/; Max-Age=0; SameSite=Lax; Secure',
    'df_sess=' + sessionToken + '; Path=/; Max-Age=' + ttl + '; HttpOnly; Secure; SameSite=Lax'
  ]);
  redirect(res, '/profil');
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

async function handleEmailAuth(req, res) {
  if (req.method !== 'POST') { jsonRes(res, 405, { error: 'Method not allowed' }); return; }
  const body  = await readBody(req);
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    jsonRes(res, 400, { error: 'Geçerli bir e-posta adresi girin' }); return;
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) { jsonRes(res, 500, { error: 'E-posta servisi yapılandırılmamış' }); return; }

  const token = crypto.randomBytes(32).toString('hex');
  await kvSet('magic:' + token, { email, expiresAt: Date.now() + 15 * 60 * 1000 }, 900);

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const magicLink = proto + '://' + host + '/api/auth/verify?token=' + token;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'DeepFin <onboarding@resend.dev>',
        to: [email],
        subject: 'DeepFin Giriş Linki',
        html: '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">' +
          '<h2 style="margin:0 0 8px;font-size:18px;">DeepFin\'e Giriş</h2>' +
          '<p style="color:#666;font-size:14px;margin:0 0 24px;line-height:1.5;">Giriş yapmak için aşağıdaki bağlantıya tıklayın. Link 15 dakika geçerlidir.</p>' +
          '<a href="' + magicLink + '" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Giriş Yap</a>' +
          '<p style="color:#999;font-size:12px;margin:24px 0 0;">Bu bağlantıyı siz istemediyseniz dikkate almayın.</p>' +
          '</div>'
      })
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); console.error('Resend error:', e); jsonRes(res, 500, { error: 'E-posta gönderilemedi' }); return; }
  } catch(e) { jsonRes(res, 500, { error: 'E-posta gönderilemedi' }); return; }

  jsonRes(res, 200, { ok: true });
}

async function handleEmailVerify(req, res) {
  const qs    = new URLSearchParams((req.url || '').split('?')[1] || '');
  const token = qs.get('token');
  if (!token) { redirect(res, '/?auth_error=no_token'); return; }

  const magic = await kvGet('magic:' + token);
  if (!magic || !magic.email || magic.expiresAt < Date.now()) {
    redirect(res, '/profil?auth_error=link_expired'); return;
  }
  await kvDel('magic:' + token);

  const email  = magic.email;
  const userId = 'em_' + email;
  const existing = await kvGet('usr:' + userId);
  const user = {
    id: userId, email,
    name: existing ? existing.name : email.split('@')[0],
    picture: '',
    createdAt: existing ? existing.createdAt : Date.now()
  };
  await kvSet('usr:' + userId, user);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const ttl = 30 * 24 * 60 * 60;
  await kvSet('sess:' + sessionToken, { userId, expiresAt: Date.now() + ttl * 1000 }, ttl);
  res.setHeader('Set-Cookie', 'df_sess=' + sessionToken + '; Path=/; Max-Age=' + ttl + '; HttpOnly; Secure; SameSite=Lax');
  redirect(res, '/profil');
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

  if (path === '/api/auth/google')   return handleGoogleLogin(req, res);
  if (path === '/api/auth/callback') return handleCallback(req, res);
  if (path === '/api/auth/me')       return handleMe(req, res);
  if (path === '/api/auth/logout')   return handleLogout(req, res);
  if (path === '/api/auth/email')    return handleEmailAuth(req, res);
  if (path === '/api/auth/verify')   return handleEmailVerify(req, res);
  if (path.startsWith('/api/watchlists')) return handleWatchlists(req, res);

  jsonRes(res, 404, { error: 'Not found' });
};
