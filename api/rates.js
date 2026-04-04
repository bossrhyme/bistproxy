// api/rates.js — Döviz kuru proxy
// Primary: Google Finance HTML scrape (USD-TRY gerçek zamanlı)
// Fallback: open.er-api.com
const https = require('https');

let _cache = null;
let _cacheAt = 0;
const CACHE_MS = 60 * 60 * 1000; // 1 saat

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

function fetchRaw(hostname, path, extraHeaders) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
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

// Google Finance HTML scrape — USD/TRY gerçek zamanlı kur
async function fetchGoogle() {
  const html = await fetchRaw('www.google.com', '/finance/quote/USD-TRY');

  // Yöntem 1: <div class="YMlKec fxKbKc">38.75</div>
  let m = html.match(/class="YMlKec fxKbKc">([0-9,\.]+)</);
  // Yöntem 2: JSON blob içinde fiyat
  if (!m) m = html.match(/"USD-TRY"[^}]*?"([0-9]{2,3}[.,][0-9]+)"/);
  // Yöntem 3: data-last-price attribute
  if (!m) m = html.match(/data-last-price="([0-9\.]+)"/);
  // Yöntem 4: genel sayı pattern (USD-TRY sayfasında büyük rakam = kur)
  if (!m) m = html.match(/\b([3-9][0-9]\.[0-9]{2,4})\b/);

  const price = m ? parseFloat(m[1].replace(',', '.')) : null;
  if (!price || price < 10 || price > 500) throw new Error('Google parse failed: ' + price);
  return { TRY: price, source: 'google' };
}

// Fallback: open.er-api.com — USD bazlı tüm kurlar
async function fetchOpenEr() {
  const raw = await fetchRaw('open.er-api.com', '/v6/latest/USD', { Accept: 'application/json' });
  const json = JSON.parse(raw);
  if (!json.rates || !json.rates.TRY) throw new Error('open.er-api parse failed');
  const r = json.rates;
  return {
    TRY: r.TRY,
    EUR: r.EUR || 0.920,
    GBP: r.GBP || 0.790,
    JPY: r.JPY || 150.0,
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

  // Cache geçerli mi?
  if (_cache && (Date.now() - _cacheAt) < CACHE_MS) {
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).json(_cache);
  }

  let rates = null;

  // 1. Google Finance
  try {
    const g = await fetchGoogle();
    // Google sadece TRY veriyor, diğerleri için fallback'ten tamamla
    try {
      const er = await fetchOpenEr();
      rates = { TRY: g.TRY, EUR: er.EUR, GBP: er.GBP, JPY: er.JPY, source: 'google' };
    } catch(_) {
      rates = { TRY: g.TRY, EUR: 0.920, GBP: 0.790, JPY: 150.0, source: 'google' };
    }
  } catch (e1) {
    // 2. open.er-api
    try {
      rates = await fetchOpenEr();
    } catch (e2) {
      // 3. Sabit fallback
      rates = { TRY: 44.6, EUR: 0.920, GBP: 0.790, JPY: 150.0, source: 'fallback' };
    }
  }

  _cache = rates;
  _cacheAt = Date.now();
  res.setHeader('Cache-Control', 'public, max-age=1800');
  return res.status(200).json(rates);
};
