// api/bist-scan.js — Twelve Data tabanlı BIST tarayıcı
// /api/bist-scan  → tüm BIST hisseleri toplu fiyat + temel veri
// /api/preset-snapshot → günlük kapanış snapshot (cron: 30 15 * * *)
const { protect, trackViolation } = require('./_protect');

const TD_BASE = 'https://api.twelvedata.com';
const TD_KEY  = () => process.env.TWELVEDATA_API_KEY || '40e35e9a3ec345adacbd3f8fc0d9246d';

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

// ── KV helpers ────────────────────────────────────────────────
async function kvGet(key) {
  try {
    const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}
async function kvSet(key, value, ttlSec = 600) {
  try {
    const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return;
    await fetch(`${url}/set/${encodeURIComponent(key)}?ex=${ttlSec}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  } catch { /* silent */ }
}
async function kvIncr(key, ttlSec) {
  try {
    const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return 0;
    const r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['TTL', key]])
    });
    const arr = await r.json();
    const count = arr[0]?.result || 0;
    if ((arr[1]?.result || -1) < 0) {
      fetch(url + '/pipeline', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify([['EXPIRE', key, ttlSec]])
      }).catch(() => {});
    }
    return count;
  } catch { return 0; }
}

function getClientIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown').slice(0, 45);
}

// ── Twelve Data yardımcıları ──────────────────────────────────
async function tdFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url  = `${TD_BASE}${path}${sep}apikey=${TD_KEY()}`;
  const res  = await fetch(url, {
    headers: { 'User-Agent': 'DeepFin/1.0' },
    signal:  AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`TD HTTP ${res.status}`);
  return res.json();
}

// BIST sembol listesi — 24 saat cache
async function getSymbolList() {
  const cacheKey = 'td_bist_symbols_v1';
  const cached   = await kvGet(cacheKey);
  if (cached) return cached;

  const data = await tdFetch('/stocks?country=Turkey&exchange=BIST&type=Common Stock');
  const list = (data.data || []).map(s => s.symbol).filter(Boolean);
  if (!list.length) throw new Error('TD sembol listesi boş');

  await kvSet(cacheKey, list, 86400); // 24 saat
  return list;
}

// Batch quote: chunk başına max 120 sembol, paralel istekler
async function batchQuote(symbols) {
  const CHUNK = 120;
  const chunks = [];
  for (let i = 0; i < symbols.length; i += CHUNK) chunks.push(symbols.slice(i, i + CHUNK));

  const results = await Promise.allSettled(
    chunks.map(chunk => {
      const joined = chunk.map(s => `${s}:BIST`).join(',');
      return tdFetch(`/quote?symbol=${joined}`);
    })
  );

  const all = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const data = r.value;
    if (!data || data.code) continue;
    // Tek sembol → obje doğrudan; çoklu → { THYAO: {...}, AKBNK: {...} }
    const rows = data.symbol ? [data] : Object.values(data);
    all.push(...rows);
  }
  return all;
}

function normalizeQuote(q) {
  if (!q || q.code) return null;
  const f = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
  return {
    symbol:      (q.symbol || '').replace(/:BIST$/, ''),
    name:        q.name || null,
    price:       f(q.close),
    change_pct:  f(q.percent_change),
    volume:      f(q.volume),
    market_cap:  f(q.market_cap),
    pe_ratio:    f(q.pe),
    week52_high: f(q.fifty_two_week?.high),
    week52_low:  f(q.fifty_two_week?.low),
    currency:    q.currency || 'TRY',
  };
}

// ── Günlük snapshot handler (cron) ───────────────────────────
async function handleSnapshot(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET bekleniyor' });

  const url    = new URL(req.url, 'http://localhost');
  const secret = process.env.CRON_SECRET || '';
  if (secret) {
    const auth = req.headers.authorization || '';
    const key  = url.searchParams.get('key') || '';
    if (auth !== 'Bearer ' + secret && key !== secret) {
      return res.status(401).json({ ok: false, error: 'Yetkisiz' });
    }
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ ok: false, error: 'KV yapılandırılmamış' });
  }

  const force   = url.searchParams.get('force') === '1';
  const now     = new Date();
  const day     = now.getUTCDay();
  if (!force && (day === 0 || day === 6)) return res.status(200).json({ ok: true, skipped: 'hafta sonu' });

  const dateStr = now.toISOString().slice(0, 10);
  const snapKey = 'dfsnap:bist:' + dateStr;

  if (!force) {
    const existing = await kvGet(snapKey);
    if (existing) return res.status(200).json({ ok: true, skipped: 'mevcut', date: dateStr, count: existing.count });
  }

  try {
    const symbols = await getSymbolList();
    const raw     = await batchQuote(symbols);
    const rows    = raw.map(normalizeQuote).filter(Boolean);

    const snapshot = { d: dateStr, source: 'twelvedata', count: rows.length, rows };
    const SNAP_TTL = 400 * 86400;
    await kvSet(snapKey, snapshot, SNAP_TTL);

    // Tarih indeksi
    const SNAP_INDEX_KEY = 'dfsnap:index:bist';
    const index = (await kvGet(SNAP_INDEX_KEY)) || [];
    if (!index.includes(dateStr)) {
      index.push(dateStr);
      index.sort();
      while (index.length > 400) index.shift();
      await kvSet(SNAP_INDEX_KEY, index, SNAP_TTL);
    }

    return res.status(200).json({ ok: true, date: dateStr, count: rows.length });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message });
  }
}

// ── Ana tarama handler ────────────────────────────────────────
module.exports = async function handler(req, res) {
  const urlPath = (req.url || '').split('?')[0];
  if (urlPath === '/api/preset-snapshot') return handleSnapshot(req, res);

  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (await protect(req, res)) return;

  const ip = getClientIP(req);
  const rlCount = await kvIncr('rl:bist-scan:' + ip, 60);
  if (rlCount > 30) { trackViolation(ip).catch(() => {}); return res.status(429).json({ error: 'Çok fazla istek, lütfen bekleyin.' }); }

  const cacheKey = 'td_bist_scan_v1';
  const cached   = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    const symbols = await getSymbolList();
    const raw     = await batchQuote(symbols);
    const data    = raw.map(normalizeQuote).filter(Boolean);

    const response = {
      source:    'twelvedata',
      count:     data.length,
      data,
      cached_at: new Date().toISOString(),
    };

    await kvSet(cacheKey, response, 600); // 10 dk cache
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(response);

  } catch (err) {
    console.error('[bist-scan] TD hata:', err.message);
    return res.status(500).json({ error: err.message, source: 'twelvedata' });
  }
};
