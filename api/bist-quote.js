// api/bist-quote.js — Twelve Data tabanlı tekil BIST hisse fiyatı
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
async function kvSet(key, value, ttlSec = 120) {
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

// ── Twelve Data quote ─────────────────────────────────────────
async function tdQuote(ticker) {
  const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(ticker)}&exchange=BIST&apikey=${TD_KEY()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DeepFin/1.0' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`TD HTTP ${res.status}`);
  const data = await res.json();
  if (data.code) throw new Error(`TD hata: ${data.message}`);
  return data;
}

function normalize(q, ticker) {
  const f = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
  return {
    symbol:      ticker,
    name:        q.name || ticker,
    price:       f(q.close),
    prev_close:  f(q.previous_close),
    change_pct:  f(q.percent_change),
    volume:      f(q.volume),
    market_cap:  f(q.market_cap),
    pe_ratio:    f(q.pe),
    week52_high: f(q.fifty_two_week?.high),
    week52_low:  f(q.fifty_two_week?.low),
    open:        f(q.open),
    high:        f(q.high),
    low:         f(q.low),
    exchange:    q.exchange || 'BIST',
    currency:    q.currency || 'TRY',
    is_market_open: q.is_market_open ?? null,
    source:      'twelvedata',
    fetched_at:  new Date().toISOString(),
  };
}

function getClientIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown').slice(0, 45);
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (await protect(req, res)) return;

  const ip = getClientIP(req);
  const rlCount = await kvIncr('rl:bist-quote:' + ip, 60);
  if (rlCount > 60) { trackViolation(ip).catch(() => {}); return res.status(429).json({ error: 'Çok fazla istek, lütfen bekleyin.' }); }

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol parametresi gerekli' });

  const ticker = symbol.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  if (!ticker) return res.status(400).json({ error: 'Geçersiz sembol' });

  const cacheKey = `td_bist_quote_${ticker}`;
  const cached = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    const raw  = await tdQuote(ticker);
    const data = normalize(raw, ticker);
    await kvSet(cacheKey, data, 120);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[bist-quote] TD hata:', err.message);
    return res.status(500).json({ error: err.message, symbol: ticker, source: 'twelvedata' });
  }
};
