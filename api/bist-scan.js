// api/bist-scan.js — EODHD Bulk EOD tabanlı BIST tarayıcı
// /api/bist-scan        → tüm BIST hisseleri tek istekte (EOD)
// /api/preset-snapshot  → günlük kapanış snapshot (cron: 30 15 * * *)
//
// EODHD bulk endpoint: GET /api/eod-bulk-last-day/IS → tüm borsa tek response
// Kredi maliyeti: 100 API kredisi / istek (sembol başına değil)
const { protect, trackViolation } = require('./_protect');

const EOD_BASE = 'https://eodhd.com/api';
// TEST ONLY — production'da EODHD_API_KEY env var kullan
const EOD_KEY  = () => process.env.EODHD_API_KEY || '6a37fc16640424.99227602';

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
async function kvSet(key, value, ttlSec = 3600) {
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

// ── EODHD Bulk EOD ────────────────────────────────────────────
// Tüm BIST hisseleri tek istekte — 100 kredi/istek (sembol sayısından bağımsız)
async function fetchBistBulk() {
  const url = `${EOD_BASE}/eod-bulk-last-day/IS?api_token=${EOD_KEY()}&fmt=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DeepFin/1.0' },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`EODHD HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('EODHD beklenmedik format: ' + JSON.stringify(data).slice(0, 100));
  return data;
}

// EODHD bulk EOD response → normalize
// Örnek satır: { code:"THYAO.IS", name:"...", date:"2025-06-20",
//   open:283, high:290, low:280, close:287, adjusted_close:287, volume:12345678 }
function normalizeRow(row) {
  const f = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
  return {
    symbol:  (row.code || '').replace(/\.IS$/i, ''),
    name:    row.name || null,
    price:   f(row.close),
    open:    f(row.open),
    high:    f(row.high),
    low:     f(row.low),
    volume:  f(row.volume),
    date:    row.date || null,
    source:  'eodhd',
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
    const raw  = await fetchBistBulk();
    const rows = raw.map(normalizeRow).filter(r => r.symbol);

    const snapshot = { d: dateStr, source: 'eodhd', count: rows.length, rows };
    const SNAP_TTL = 400 * 86400;
    await kvSet(snapKey, snapshot, SNAP_TTL);

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

  const cacheKey = 'eod_bist_scan_v1';
  const cached   = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    const raw  = await fetchBistBulk();
    const data = raw.map(normalizeRow).filter(r => r.symbol);

    const response = {
      source:    'eodhd',
      count:     data.length,
      data,
      cached_at: new Date().toISOString(),
    };

    await kvSet(cacheKey, response, 3600); // 1 saat cache — EOD veri gün içi değişmez
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(response);

  } catch (err) {
    console.error('[bist-scan] EODHD hata:', err.message);
    return res.status(500).json({ error: err.message, source: 'eodhd' });
  }
};
