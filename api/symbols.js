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
  return !!(
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL
  );
}

function kvUrl() {
  return process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL || '';
}

function kvToken() {
  return process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN || '';
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
    const raw  = await fetchHttp(kvUrl() + '/get/' + encodeURIComponent(key),
      'GET', { Authorization: 'Bearer ' + kvToken() });
    const json = JSON.parse(raw);
    return json.result ? JSON.parse(json.result) : null;
  } catch(e) { return null; }
}

async function kvSet(key, value, ttl) {
  try {
    await fetchHttp(kvUrl() + '/set/' + encodeURIComponent(key) + '?ex=' + ttl,
      'POST', { Authorization: 'Bearer ' + kvToken(), 'Content-Type': 'application/json' },
      JSON.stringify(value));
  } catch(e) {}
}

async function kvIncr(key, ttlSec) {
  try {
    if (!kvEnabled()) return 0;
    const raw = await fetchHttp(kvUrl() + '/pipeline', 'POST',
      { Authorization: 'Bearer ' + kvToken(), 'Content-Type': 'application/json' },
      JSON.stringify([['INCR', key], ['TTL', key]]));
    const arr = JSON.parse(raw);
    const count = arr[0]?.result || 0;
    if ((arr[1]?.result || -1) < 0) {
      fetchHttp(kvUrl() + '/pipeline', 'POST',
        { Authorization: 'Bearer ' + kvToken(), 'Content-Type': 'application/json' },
        JSON.stringify([['EXPIRE', key, ttlSec]])).catch(() => {});
    }
    return count;
  } catch(e) { return 0; }
}

function getClientIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown').slice(0, 45);
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

function parseTvSearchResponse(raw) {
  try {
    const parsed = JSON.parse(raw);
    // v3 format: { symbols: [...] }  or  v1 format: [...]
    const arr = Array.isArray(parsed) ? parsed : (parsed.symbols || parsed.data || []);
    return arr.filter(x => x && (x.symbol || x.s)).slice(0, 15).map(x => ({
      s: x.symbol || x.s,
      n: x.description || x.full_name || x.name || x.symbol || '',
      ex: (x.exchange || '').toUpperCase()
    }));
  } catch(e) { return null; }
}

function tvSearchRequest(path, resolve, onSymbols) {
  const req = https.request({
    hostname: 'symbol-search.tradingview.com', path, method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json', 'Origin': 'https://www.tradingview.com', 'Referer': 'https://www.tradingview.com/' }
  }, (tvRes) => {
    let data = '';
    tvRes.on('data', c => data += c);
    tvRes.on('end', () => { onSymbols(parseTvSearchResponse(data)); resolve(); });
  });
  req.on('error', () => { onSymbols(null); resolve(); });
  req.setTimeout(5000, () => { req.destroy(); onSymbols(null); resolve(); });
  req.end();
  return req;
}

async function handleSearch(req, res) {
  const url   = new URL(req.url, 'http://localhost');
  const q     = (url.searchParams.get('q') || '').trim().substring(0, 60);
  const exKey = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  if (!q) return res.status(200).json({ symbols: [] });

  const tvEx     = EX_MAP[exKey] !== undefined ? EX_MAP[exKey] : exKey.toUpperCase();
  const tvMarket = MARKET_MAP[exKey] || '';
  const qs = '?text=' + encodeURIComponent(q) + '&lang=en&domain=production'
    + (tvEx     ? '&exchange=' + encodeURIComponent(tvEx) : '')
    + (tvMarket ? '&market='   + encodeURIComponent(tvMarket) : '');

  // Try v3 first, fall back to v1
  return new Promise((resolve) => {
    tvSearchRequest('/symbol_search/v3/' + qs, resolve, function(symbols) {
      if (symbols && symbols.length > 0) {
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json({ symbols });
      }
      // v3 returned nothing — try v1
      new Promise((resolve2) => {
        tvSearchRequest('/symbol_search/' + qs, resolve2, function(symbols2) {
          res.setHeader('Cache-Control', 'public, s-maxage=300');
          res.status(200).json({ symbols: symbols2 || [] });
        });
      });
    });
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

  const ip = getClientIP(req);
  const rlCount = await kvIncr('rl:symbols:' + ip, 60);
  if (rlCount > 30) return res.status(429).json({ error: 'Çok fazla istek, lütfen bekleyin.' });

  const path = (req.url || '').split('?')[0];
  if (path === '/api/symbol-search') return handleSearch(req, res);
  return handleList(req, res);
};
