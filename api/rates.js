const https = require('https');

// In-memory cache (30 dakika)
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 30 * 60 * 1000;

// Fallback kurlar
const FALLBACK = { TRY: 36.5, EUR: 0.925, GBP: 0.787, JPY: 149.5 };

function fetchRates() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.exchangerate-api.com',
      path: '/v4/latest/USD',
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ TRY: json.rates.TRY, EUR: json.rates.EUR, GBP: json.rates.GBP, JPY: json.rates.JPY });
        } catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

module.exports = async function(req, res) {
  const ALLOWED_ORIGINS = [
    'https://deepfin.vercel.app',
    'https://bistproxy.vercel.app',
    'https://www.deepfin.com',
  ];
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const now = Date.now();
  if (_cache && (now - _cacheAt) < CACHE_TTL) {
    return res.status(200).json(_cache);
  }

  const rates = await fetchRates();
  if (rates) {
    _cache = rates;
    _cacheAt = now;
    return res.status(200).json(rates);
  }

  return res.status(200).json(FALLBACK);
};