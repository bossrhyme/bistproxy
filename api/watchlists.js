// ─────────────────────────────────────────────
// /api/watchlists — Watchlist CRUD
// ─────────────────────────────────────────────
const { getUser } = require('./_auth');
const { kvGet, kvSet } = require('./_kv');

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(data);
}

function makeDefaultList() {
  return [{
    id: 'wl_default',
    name: 'Favorilerim',
    icon: '⭐',
    createdAt: Date.now(),
    items: []
  }];
}

async function getWatchlists(userId) {
  const lists = await kvGet('wl:' + userId);
  if (!lists || !Array.isArray(lists) || lists.length === 0) {
    return makeDefaultList();
  }
  return lists;
}

async function saveWatchlists(userId, lists) {
  await kvSet('wl:' + userId, lists);
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  const user = await getUser(req);
  if (!user) {
    json(res, 401, { error: 'Unauthorized' });
    return;
  }

  const method  = req.method;
  const urlPath = req.url ? req.url.split('?')[0] : '';
  const isItem  = urlPath.endsWith('/item');

  // ── GET /api/watchlists ─────────────────────
  if (method === 'GET') {
    const lists = await getWatchlists(user.id);
    // If default was created, persist it
    const existing = await kvGet('wl:' + user.id);
    if (!existing || !Array.isArray(existing) || existing.length === 0) {
      await saveWatchlists(user.id, lists);
    }
    json(res, 200, { watchlists: lists });
    return;
  }

  // ── POST /api/watchlists/item ───────────────
  if (method === 'POST' && isItem) {
    const body = await readBody(req);
    const { listId, symbol, exchange, note } = body;
    if (!listId || !symbol || !exchange) {
      json(res, 400, { error: 'listId, symbol, exchange required' });
      return;
    }
    const lists = await getWatchlists(user.id);
    const list  = lists.find(l => l.id === listId);
    if (!list) { json(res, 404, { error: 'List not found' }); return; }
    // Avoid duplicates
    if (!list.items.find(i => i.symbol === symbol && i.exchange === exchange)) {
      list.items.push({ symbol, exchange, addedAt: Date.now(), note: note || '' });
    }
    await saveWatchlists(user.id, lists);
    json(res, 200, { watchlists: lists });
    return;
  }

  // ── DELETE /api/watchlists/item ─────────────
  if (method === 'DELETE' && isItem) {
    const body = await readBody(req);
    const { listId, symbol } = body;
    if (!listId || !symbol) {
      json(res, 400, { error: 'listId, symbol required' });
      return;
    }
    const lists = await getWatchlists(user.id);
    const list  = lists.find(l => l.id === listId);
    if (!list) { json(res, 404, { error: 'List not found' }); return; }
    list.items = list.items.filter(i => i.symbol !== symbol);
    await saveWatchlists(user.id, lists);
    json(res, 200, { watchlists: lists });
    return;
  }

  // ── POST /api/watchlists — create new list ──
  if (method === 'POST') {
    const body = await readBody(req);
    const { name, icon } = body;
    if (!name || !name.trim()) {
      json(res, 400, { error: 'name required' });
      return;
    }
    const lists = await getWatchlists(user.id);
    lists.push({
      id:        'wl_' + Date.now(),
      name:      name.trim(),
      icon:      icon || '⭐',
      createdAt: Date.now(),
      items:     []
    });
    await saveWatchlists(user.id, lists);
    json(res, 200, { watchlists: lists });
    return;
  }

  // ── PUT /api/watchlists — update list ───────
  if (method === 'PUT') {
    const body = await readBody(req);
    const { id, name, icon, items } = body;
    if (!id) { json(res, 400, { error: 'id required' }); return; }
    const lists = await getWatchlists(user.id);
    const idx   = lists.findIndex(l => l.id === id);
    if (idx === -1) { json(res, 404, { error: 'List not found' }); return; }
    if (name  !== undefined) lists[idx].name  = name.trim();
    if (icon  !== undefined) lists[idx].icon  = icon;
    if (items !== undefined) lists[idx].items = items;
    await saveWatchlists(user.id, lists);
    json(res, 200, { watchlists: lists });
    return;
  }

  // ── DELETE /api/watchlists — delete list ────
  if (method === 'DELETE') {
    const body = await readBody(req);
    const { id } = body;
    if (!id) { json(res, 400, { error: 'id required' }); return; }
    const lists = await getWatchlists(user.id);
    if (lists.length <= 1) {
      json(res, 400, { error: 'Cannot delete last list' });
      return;
    }
    const filtered = lists.filter(l => l.id !== id);
    if (filtered.length === lists.length) {
      json(res, 404, { error: 'List not found' });
      return;
    }
    await saveWatchlists(user.id, filtered);
    json(res, 200, { watchlists: filtered });
    return;
  }

  json(res, 405, { error: 'Method not allowed' });
};
