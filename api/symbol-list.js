const https = require('https');

// Scan.js ile aynı config — aynı hisseler screener'da da aramada da çıksın
const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',
            filters: [
              { left: 'typespecs',        operation: 'has',     right: ['common'] },
              { left: 'market_cap_basic', operation: 'greater', right: 0 },
            ]},
  nasdaq: { tvPath: '/america/scan',
            filters: [
              { left: 'exchange',   operation: 'equal', right: 'NASDAQ' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ]},
  sp500:  { tvPath: '/america/scan',
            filters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ]},
  dax:    { tvPath: '/germany/scan',
            filters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ]},
  lse:    { tvPath: '/uk/scan',
            filters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ]},
  nikkei: { tvPath: '/japan/scan',
            filters: [
              { left: 'exchange',   operation: 'equal', right: 'TSE' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ]},
};

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

function kvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function fetchHttp(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: { ...headers },
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function kvGet(key) {
  try {
    const raw  = await fetchHttp(
      process.env.KV_REST_API_URL + '/get/' + encodeURIComponent(key),
      'GET', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
    );
    const json = JSON.parse(raw);
    return json.result ? JSON.parse(json.result) : null;
  } catch(e) { return null; }
}

async function kvSet(key, value, ttl) {
  try {
    await fetchHttp(
      process.env.KV_REST_API_URL + '/set/' + encodeURIComponent(key) + '?ex=' + ttl,
      'POST',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
      JSON.stringify(value)
    );
  } catch(e) { /* cache yazma hatası kritik değil */ }
}

module.exports = async function(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url      = new URL(req.url, 'http://localhost');
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  const cfg      = EXCHANGE_CONFIG[exchange];
  if (!cfg) return res.status(400).json({ error: 'Geçersiz borsa' });

  const cacheKey = 'df_symlist_v1_' + exchange;

  // 1. KV cache hit?
  if (kvEnabled()) {
    const cached = await kvGet(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600');
      return res.status(200).json(cached);
    }
  }

  // 2. TV screener'dan sembol+isim listesi çek
  const payload = JSON.stringify({
    columns: ['name', 'description'],
    filter:  cfg.filters,
    range:   [0, 2000],
    sort:    { sortBy: 'name', sortOrder: 'asc' },
    ignore_unknown_fields: true,
  });

  const tvHeaders = {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Origin':         'https://www.tradingview.com',
    'Referer':        'https://www.tradingview.com/',
    'Accept':         'application/json',
  };

  return new Promise((resolve) => {
    const opts = {
      hostname: 'scanner.tradingview.com',
      path:     cfg.tvPath,
      method:   'POST',
      headers:  tvHeaders,
    };
    const tvReq = https.request(opts, (tvRes) => {
      let raw = '';
      tvRes.on('data', c => raw += c);
      tvRes.on('end', async () => {
        try {
          const parsed = JSON.parse(raw);
          // d[0]=name(ticker), d[1]=description(şirket adı)
          const symbols = (parsed.data || [])
            .filter(row => row.d && row.d[0])
            .map(row => ({ s: row.d[0], n: row.d[1] || row.d[0] }));

          const result = { symbols, exchange, count: symbols.length };

          // 24 saat KV cache
          if (kvEnabled() && symbols.length > 0) {
            kvSet(cacheKey, result, 86400).catch(() => {});
          }

          res.setHeader('Cache-Control', 'public, s-maxage=3600');
          res.status(200).json(result);
        } catch(e) {
          res.status(500).json({ error: 'TV screener parse hatası' });
        }
        resolve();
      });
    });
    tvReq.on('error', (e) => { res.status(500).json({ error: e.message }); resolve(); });
    tvReq.write(payload);
    tvReq.end();
  });
};
