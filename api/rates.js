// api/rates.js — Döviz kuru proxy
// Primary: TCMB günlük kapanış kuru (today.xml)
// Fallback: exchangerate-api.com
const https = require('https');

let _cache = null;
let _cacheAt = 0;
const CACHE_MS = 24 * 60 * 60 * 1000; // 24 saat — TCMB günlük yayınlar

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

function fetchRaw(hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' } },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(data));
      }
    );
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// TCMB today.xml'den USD/TRY ve diğer kurları çek
async function fetchTcmb() {
  const xml = await fetchRaw('www.tcmb.gov.tr', '/kurlar/today.xml');

  function extractRate(code) {
    // <Currency ... CurrencyCode="USD"> ... <ForexSelling>38.7</ForexSelling>
    const re = new RegExp(
      'CurrencyCode="' + code + '"[\\s\\S]*?<ForexSelling>([\\d.]+)<\\/ForexSelling>'
    );
    const m = xml.match(re);
    return m ? parseFloat(m[1]) : null;
  }

  const usd = extractRate('USD');
  const eur = extractRate('EUR');
  const gbp = extractRate('GBP');
  const jpy = extractRate('JPY');

  if (!usd) throw new Error('TCMB parse failed');

  // rates.js TRY değeri = 1 USD kaç TRY
  // TCMB ForexSelling: 1 USD = X TRY → doğrudan kullanılabilir
  return {
    TRY: usd,                              // 1 USD = X TRY
    EUR: eur ? usd / eur : 1.08,          // 1 EUR = X/Y TRY → prf.js EUR/USD için
    GBP: gbp ? usd / gbp : 1.27,
    JPY: jpy ? jpy / usd : 0.0067,       // 1 JPY = X TRY → ters çevir için
    source: 'tcmb',
  };
}

// Fallback: exchangerate-api.com (USD bazlı, TRY/USD = rates.TRY)
async function fetchExchangeRateApi() {
  const raw = await fetchRaw('api.exchangerate-api.com', '/v4/latest/USD');
  const json = JSON.parse(raw);
  const r = json.rates || {};
  if (!r.TRY) throw new Error('exchangerate-api parse failed');
  return {
    TRY: r.TRY,
    EUR: r.EUR || 0.920,
    GBP: r.GBP || 0.790,
    JPY: r.JPY || 150.0,
    source: 'exchangerate-api',
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
    res.setHeader('Cache-Control', 'public, max-age=3600'); // client 1 saat cache'lesin
    return res.status(200).json(_cache);
  }

  try {
    // 1. TCMB dene
    const rates = await fetchTcmb();
    _cache = rates;
    _cacheAt = Date.now();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(rates);
  } catch (e1) {
    try {
      // 2. Fallback: exchangerate-api
      const rates = await fetchExchangeRateApi();
      _cache = rates;
      _cacheAt = Date.now();
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).json(rates);
    } catch (e2) {
      // 3. Son fallback sabit değerler
      const fallback = { TRY: 38.5, EUR: 0.920, GBP: 0.790, JPY: 150.0, source: 'fallback' };
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).json(fallback);
    }
  }
};
