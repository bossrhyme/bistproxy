// api/rates.js — Döviz kuru proxy
// Primary: open.er-api.com (ToS uyumlu, 1500 req/ay)
// Fallback: KV backup → sabit değerler
const https = require('https');

async function kvGet(key) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    const r = await fetch(url + '/get/' + encodeURIComponent(key), { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ttlSec) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return;
    await fetch(url + '/set/' + encodeURIComponent(key) + '?ex=' + ttlSec, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  } catch {}
}

let _cache = null;
let _cacheAt = 0;
const CACHE_MS = 24 * 60 * 60 * 1000; // 24 saat

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

function fetchRaw(hostname, path, extraHeaders) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({
      'User-Agent': 'Mozilla/5.0 (compatible; DeepFin/1.0)',
      'Accept': 'application/json',
    }, extraHeaders || {});
    const req = https.request(
      { hostname, path, method: 'GET', headers },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(data));
      }
    );
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// Primary: open.er-api.com — USD bazlı tüm kurlar (ToS uyumlu, ücretsiz)
async function fetchOpenEr() {
  const raw = await fetchRaw('open.er-api.com', '/v6/latest/USD');
  const json = JSON.parse(raw);
  if (!json.rates || !json.rates.TRY) throw new Error('open.er-api parse failed');
  const r = json.rates;
  return {
    TRY: r.TRY,
    EUR: r.EUR || 0.920,
    GBP: r.GBP || 0.790,
    JPY: r.JPY || 150.0,
    KRW: r.KRW || 1350.0,
    RUB: r.RUB || 89.0,
    NOK: r.NOK || 10.7,
    CAD: r.CAD || 1.37,
    TWD: r.TWD || 32.0,
    BRL: r.BRL || 5.70,
    HKD: r.HKD || 7.78,
    CNY: r.CNY || 7.25,
    SAR: r.SAR || 3.75,
    CHF: r.CHF || 0.895,
    AUD: r.AUD || 1.58,
    ZAR: r.ZAR || 18.5,
    SEK: r.SEK || 10.5,
    INR: r.INR || 84.0,
    AED: r.AED || 3.67,
    source: 'open.er-api',
  };
}

module.exports = async function(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // In-memory cache geçerli mi?
  if (_cache && (Date.now() - _cacheAt) < CACHE_MS) {
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).json(_cache);
  }

  let rates = null;

  // 1. open.er-api (primary — ToS uyumlu)
  try {
    rates = await fetchOpenEr();
  } catch (e1) {
    // 2. KV backup (cold start / API down)
    const kvBackup = await kvGet('df_rates_backup');
    if (kvBackup) {
      rates = { ...kvBackup, source: 'kv_backup' };
    } else {
      // 3. Sabit fallback
      rates = { TRY: 44.6, EUR: 0.920, GBP: 0.790, JPY: 150.0, KRW: 1350.0, RUB: 89.0, NOK: 10.7, CAD: 1.37, TWD: 32.0, BRL: 5.70, HKD: 7.78, CNY: 7.25, SAR: 3.75, CHF: 0.895, AUD: 1.58, ZAR: 18.5, SEK: 10.5, INR: 84.0, AED: 3.67, source: 'fallback' };
    }
  }

  // KV backup'ı taze veriyle güncelle
  if (rates.source !== 'kv_backup' && rates.source !== 'fallback') {
    kvSet('df_rates_backup', rates, 7200).catch(() => {});
  }

  if (_cache && Math.abs(rates.TRY - _cache.TRY) > 0.5) {
    console.log('[rates] TRY updated:', _cache.TRY, '→', rates.TRY);
  }
  _cache = rates;
  _cacheAt = Date.now();
  res.setHeader('Cache-Control', 'public, max-age=1800');
  return res.status(200).json(rates);
};
