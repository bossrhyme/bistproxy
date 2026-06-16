// api/macro.js — Makro göstergeler: FRED (ABD) + TCMB statik fallback
// Döner: { us_rate, us_cpi, vix, tr_rate, tr_cpi, ts, source }
const https = require('https');

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

const CACHE_MS = 12 * 60 * 60 * 1000; // 12 saat
let _cache = null;
let _cacheAt = 0;

// TCMB statik fallback — güncel değerler elle güncellenir
const TR_FALLBACK = { tr_rate: 47.5, tr_cpi: 38.1, _static: true };

function fredFetch(seriesId, apiKey) {
  return new Promise((resolve, reject) => {
    const path = '/fred/series/observations?series_id=' + seriesId +
      '&api_key=' + encodeURIComponent(apiKey) +
      '&sort_order=desc&limit=3&file_type=json';
    const req = https.request(
      { hostname: 'api.stlouisfed.org', path, method: 'GET',
        headers: { 'User-Agent': 'DeepFin/1.0', Accept: 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            const obs = (j.observations || []).filter(o => o.value !== '.');
            if (!obs.length) return reject(new Error('no data: ' + seriesId));
            resolve(parseFloat(obs[0].value));
          } catch (e) { reject(e); }
        });
      }
    );
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function fetchFred(apiKey) {
  const [fedFunds, cpi, vix] = await Promise.all([
    fredFetch('DFF', apiKey),         // Fed Funds Rate (daily)
    fredFetch('CPIAUCSL', apiKey),    // CPI (monthly, level — not YoY)
    fredFetch('VIXCLS', apiKey),      // VIX close
  ]);
  // CPIAUCSL is an index level; fetch 12 months ago for YoY
  let cpiYoy = null;
  try {
    const path = '/fred/series/observations?series_id=CPILFESL' +
      '&api_key=' + encodeURIComponent(apiKey) +
      '&sort_order=desc&limit=1&file_type=json';
    // Use core CPI YoY pre-computed by FRED — series: CPIAUCSL_PCH not available free
    // Use a direct YoY series instead: CPIAUCSL_PC1 (FRED calculated)
    cpiYoy = await fredFetch('CPIAUCSL_PC1', apiKey);
  } catch { cpiYoy = null; }

  return { us_rate: fedFunds, us_cpi: cpiYoy, vix, source: 'fred' };
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
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(_cache);
  }

  const apiKey = process.env.FRED_API_KEY;
  let result = {
    us_rate: 4.33,
    us_cpi: 2.7,
    vix: 16.4,
    ...TR_FALLBACK,
    ts: Date.now(),
    source: 'fallback',
  };

  if (apiKey) {
    try {
      const fredData = await fetchFred(apiKey);
      result = {
        ...result,
        ...fredData,
        ts: Date.now(),
      };
    } catch (e) {
      console.error('[macro] FRED fetch failed:', e.message);
    }
  }

  _cache = result;
  _cacheAt = Date.now();
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json(result);
};
