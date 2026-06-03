// ─────────────────────────────────────────────
// /api/symbol-list  → symbol list for exchange
// /api/symbol-search → symbol search
// (consolidated from two files to stay within Hobby plan 12-function limit)
// ─────────────────────────────────────────────
const https = require('https');

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
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method, headers: { ...headers } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function kvGet(key) {
  try {
    const raw  = await fetchHttp(process.env.KV_REST_API_URL + '/get/' + encodeURIComponent(key),
      'GET', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN });
    const json = JSON.parse(raw);
    return json.result ? JSON.parse(json.result) : null;
  } catch(e) { return null; }
}

async function kvSet(key, value, ttl) {
  try {
    await fetchHttp(process.env.KV_REST_API_URL + '/set/' + encodeURIComponent(key) + '?ex=' + ttl,
      'POST', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
      JSON.stringify(value));
  } catch(e) {}
}

// ── symbol-list ───────────────────────────────
const LIST_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  filters: [{ left: 'typespecs', operation: 'has', right: ['common'] }] },
  nasdaq: { tvPath: '/america/scan', filters: [{ left: 'exchange', operation: 'equal', right: 'NASDAQ' }, { left: 'is_primary', operation: 'equal', right: true }] },
  sp500:  { tvPath: '/america/scan', filters: [{ left: 'is_primary', operation: 'equal', right: true }] },
  dax:    { tvPath: '/germany/scan', filters: [{ left: 'is_primary', operation: 'equal', right: true }, { left: 'typespecs', operation: 'has', right: ['common'] }] },
  lse:    { tvPath: '/uk/scan',      filters: [{ left: 'is_primary', operation: 'equal', right: true }, { left: 'typespecs', operation: 'has', right: ['common'] }] },
  nikkei: { tvPath: '/japan/scan',   filters: [{ left: 'exchange', operation: 'equal', right: 'TSE' }, { left: 'is_primary', operation: 'equal', right: true }, { left: 'typespecs', operation: 'has', right: ['common'] }] },
  nyse:   { tvPath: '/america/scan', filters: [{ left: 'exchange', operation: 'equal', right: 'NYSE' }, { left: 'is_primary', operation: 'equal', right: true }] },
};

async function handleList(req, res) {
  const url      = new URL(req.url, 'http://localhost');
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  const cfg      = LIST_CONFIG[exchange];
  if (!cfg) return res.status(400).json({ error: 'Geçersiz borsa' });

  const cacheKey = 'df_symlist_v1_' + exchange;
  if (kvEnabled()) {
    const cached = await kvGet(cacheKey);
    if (cached) { res.setHeader('Cache-Control', 'public, s-maxage=3600'); return res.status(200).json(cached); }
  }

  const payload = JSON.stringify({ columns: ['name', 'description'], filter: cfg.filters, range: [0, 2000], sort: { sortBy: 'name', sortOrder: 'asc' }, ignore_unknown_fields: true });
  const tvHeaders = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Origin': 'https://www.tradingview.com', 'Referer': 'https://www.tradingview.com/', 'Accept': 'application/json' };

  return new Promise((resolve) => {
    const tvReq = https.request({ hostname: 'scanner.tradingview.com', path: cfg.tvPath, method: 'POST', headers: tvHeaders }, (tvRes) => {
      let raw = '';
      tvRes.on('data', c => raw += c);
      tvRes.on('end', async () => {
        try {
          const parsed = JSON.parse(raw);
          const symbols = (parsed.data || []).filter(row => row.d && row.d[0]).map(row => ({ s: row.d[0], n: row.d[1] || row.d[0] }));
          const result  = { symbols, exchange, count: symbols.length };
          if (kvEnabled() && symbols.length > 0) kvSet(cacheKey, result, 86400).catch(() => {});
          res.setHeader('Cache-Control', 'public, s-maxage=3600');
          res.status(200).json(result);
        } catch(e) { res.status(500).json({ error: 'TV screener parse hatası' }); }
        resolve();
      });
    });
    tvReq.on('error', (e) => { res.status(500).json({ error: e.message }); resolve(); });
    tvReq.write(payload); tvReq.end();
  });
}

// ── symbol-search ─────────────────────────────
const EX_MAP    = { bist: 'BIST', nasdaq: 'NASDAQ', sp500: '', dax: 'XETR', lse: 'LSE', nikkei: 'TSE', nyse: 'NYSE' };
const MARKET_MAP = { sp500: 'america', nasdaq: 'america', nyse: 'america' };

async function handleSearch(req, res) {
  const url   = new URL(req.url, 'http://localhost');
  const q     = (url.searchParams.get('q') || '').trim().substring(0, 60);
  const exKey = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  if (!q) return res.status(400).json({ symbols: [] });

  const tvEx     = EX_MAP[exKey] !== undefined ? EX_MAP[exKey] : exKey.toUpperCase();
  const tvMarket = MARKET_MAP[exKey] || '';
  const tvUrl    = 'https://symbol-search.tradingview.com/symbol_search/v3/?text=' + encodeURIComponent(q)
    + '&lang=en&domain=production'
    + (tvEx     ? '&exchange=' + encodeURIComponent(tvEx)     : '')
    + (tvMarket ? '&market='   + encodeURIComponent(tvMarket) : '');

  return new Promise((resolve) => {
    const u = new URL(tvUrl);
    const tvReq = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DeepFin/1.0)', 'Accept': 'application/json' }
    }, (tvRes) => {
      let data = '';
      tvRes.on('data', c => data += c);
      tvRes.on('end', () => {
        try {
          const parsed  = JSON.parse(data);
          const symbols = (parsed.symbols || parsed || []).filter(x => x && x.symbol).slice(0, 15)
            .map(x => ({ s: x.symbol, n: x.description || x.symbol, ex: x.exchange || '' }));
          res.setHeader('Cache-Control', 'public, s-maxage=300');
          res.status(200).json({ symbols });
        } catch(e) { res.status(200).json({ symbols: [], error: e.message }); }
        resolve();
      });
    });
    tvReq.on('error', (e) => { res.status(200).json({ symbols: [], error: e.message }); resolve(); });
    tvReq.setTimeout(5000, () => { tvReq.destroy(); res.status(200).json({ symbols: [] }); resolve(); });
    tvReq.end();
  });
}

// ── router ────────────────────────────────────
module.exports = async function(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = (req.url || '').split('?')[0];
  if (path === '/api/symbol-search') return handleSearch(req, res);
  return handleList(req, res);
};
