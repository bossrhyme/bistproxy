const https = require('https');

// TV symbol search exchange → TV exchange code
const EX_MAP = {
  bist:   'BIST',
  nasdaq: 'NASDAQ',
  sp500:  '',       // exchange filtresi yok → market=america ile US geneli
  dax:    'XETR',
  lse:    'LSE',
  nikkei: 'TSE',
  nyse:   'NYSE',
};

// sp500 ve nasdaq için market parametresi
const MARKET_MAP = {
  sp500:  'america',
  nasdaq: 'america',
  nyse:   'america',
};

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

function fetchJson(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DeepFin/1.0)',
        'Accept': 'application/json',
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse hatası')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

module.exports = async function(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url  = new URL(req.url, 'http://localhost');
  const q    = (url.searchParams.get('q') || '').trim().substring(0, 60);
  const exKey = (url.searchParams.get('exchange') || 'bist').toLowerCase();

  if (!q) return res.status(400).json({ symbols: [] });

  const tvEx     = EX_MAP[exKey] !== undefined ? EX_MAP[exKey] : exKey.toUpperCase();
  const tvMarket = MARKET_MAP[exKey] || '';

  let tvUrl = 'https://symbol-search.tradingview.com/symbol_search/v3/'
    + '?text=' + encodeURIComponent(q)
    + '&lang=en&domain=production'
    + (tvEx     ? '&exchange=' + encodeURIComponent(tvEx)     : '')
    + (tvMarket ? '&market='   + encodeURIComponent(tvMarket) : '');

  try {
    const data = await fetchJson(tvUrl);
    const symbols = (data.symbols || data || [])
      .filter(x => x && x.symbol)
      .slice(0, 15)
      .map(x => ({ s: x.symbol, n: x.description || x.symbol, ex: x.exchange || '' }));
    res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 dk edge cache
    return res.status(200).json({ symbols });
  } catch(e) {
    return res.status(200).json({ symbols: [], error: e.message });
  }
};
