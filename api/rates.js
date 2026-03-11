// api/rates.js — Döviz kuru proxy (exchangerate-api.com gizlenir)
const https = require('https');

// Basit in-memory cache — Vercel function warm instance'da 30dk geçerli
let _cache = null;
let _cacheAt = 0;
const CACHE_MS = 30 * 60 * 1000; // 30 dakika

module.exports = async function(req, res) {
  // CORS whitelist
  const ALLOWED_ORIGINS = [
    'https://deepfin.vercel.app',
    'https://bistproxy.vercel.app',
    'https://www.deepfin.com',
  ];
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache geçerli mi?
  if (_cache && (Date.now() - _cacheAt) < CACHE_MS) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).json(_cache);
  }

  // Upstream'den çek
  return new Promise((resolve) => {
    const req2 = https.request({
      hostname: 'api.exchangerate-api.com',
      path: '/v4/latest/USD',
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    }, (upstream) => {
      let data = '';
      upstream.on('data', c => data += c);
      upstream.on('end', () => {
        try {
          const json = JSON.parse(data);
          const rates = json.rates || {};
          // Sadece ihtiyacımız olan kurları döndür — tüm kur listesi gizli
          const filtered = {
            TRY: rates.TRY || 44.1,
            EUR: rates.EUR || 0.860,
            GBP: rates.GBP || 0.750,
            JPY: rates.JPY || 158.0,
          };
          _cache = filtered;
          _cacheAt = Date.now();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'public, max-age=1800');
          res.status(200).json(filtered);
        } catch(e) {
          // Hata durumunda fallback
          res.status(200).json({ TRY: 44.1, EUR: 0.860, GBP: 0.750, JPY: 158.0 });
        }
        resolve();
      });
    });
    req2.on('error', () => {
      res.status(200).json({ TRY: 44.1, EUR: 0.860, GBP: 0.750, JPY: 158.0 });
      resolve();
    });
    req2.end();
  });
};
