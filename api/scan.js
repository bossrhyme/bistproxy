const https = require('https');

// ─────────────────────────────────────────────
// Vercel KV Cache — scan action için
// ─────────────────────────────────────────────
function kvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function fetchHttp(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method, headers: { ...headers } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function kvGet(key) {
  try {
    const raw = await fetchHttp(
      process.env.KV_REST_API_URL + '/get/' + encodeURIComponent(key),
      'GET', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
    );
    const json = JSON.parse(raw);
    return json.result ? JSON.parse(json.result) : null;
  } catch(e) { return null; }
}

async function kvSet(key, value, ttlSeconds) {
  try {
    await fetchHttp(
      process.env.KV_REST_API_URL + '/set/' + encodeURIComponent(key) + '?ex=' + ttlSeconds,
      'POST',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
      JSON.stringify(value)
    );
  } catch(e) {}
}

function getCacheTTL(exchange) {
  const now  = new Date();
  const hour = now.getUTCHours();
  const day  = now.getUTCDay();
  if (day === 0 || day === 6) return 1800;
  const hours = {
    bist:   { open: 7,  close: 14 },
    nasdaq: { open: 14, close: 21 },
    sp500:  { open: 14, close: 21 },
    dax:    { open: 8,  close: 16 },
    lse:    { open: 8,  close: 16 },
    nikkei: { open: 0,  close: 6  },
  };
  const h = hours[exchange] || { open: 8, close: 16 };
  return (hour >= h.open && hour < h.close) ? 300 : 1800;
}

function makeRequest(hostname, path, method, headers, body, callback) {
  const options = { hostname, path, method, headers };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(null, data, res.statusCode));
  });
  req.on('error', (err) => callback(err));
  if (body) req.write(body);
  req.end();
}

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  currency: 'TRY', extraFilters: [] },
  nasdaq: { tvPath: '/america/scan', currency: 'USD', extraFilters: [{ left: 'exchange', operation: 'equal', right: 'NASDAQ' }] },
  sp500:  { tvPath: '/america/scan', currency: 'USD', extraFilters: [{ left: 'is_primary', operation: 'equal', right: true }, { left: 'index', operation: 'equal', right: 'SP500' }] },
  dax:    { tvPath: '/germany/scan', currency: 'EUR', extraFilters: [] },
  lse:    { tvPath: '/uk/scan',      currency: 'GBP', extraFilters: [] },
  nikkei: { tvPath: '/japan/scan',   currency: 'JPY', extraFilters: [] },
};

module.exports = async function(req, res) {
  const ALLOWED_ORIGINS = [
    'https://deepfin.vercel.app',
    'https://bistproxy.vercel.app',
    'https://www.deepfin.com',
  ];
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url      = new URL(req.url, 'http://localhost');
  const action   = url.searchParams.get('action') || 'scan';
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  const cfg      = EXCHANGE_CONFIG[exchange] || EXCHANGE_CONFIG.bist;

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (kvEnabled()) {
    try {
      const rlKey = 'rl_' + clientIp.replace(/[^a-zA-Z0-9.]/g, '_') + '_' + Math.floor(Date.now() / 60000);
      const rlRaw = await fetchHttp(
        process.env.KV_REST_API_URL + '/incr/' + encodeURIComponent(rlKey),
        'POST', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
      );
      const rlJson = JSON.parse(rlRaw);
      const rlCount = rlJson.result || 0;
      if (rlCount === 1) {
        await fetchHttp(
          process.env.KV_REST_API_URL + '/expire/' + encodeURIComponent(rlKey) + '/60',
          'POST', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
        );
      }
      if (rlCount > 60) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Çok fazla istek. Lütfen bir dakika bekleyin.' });
      }
    } catch(e) {}
  }

  if (action === 'scan') {
    const rawBody = await new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
    });

    let clientPayload = {};
    try { clientPayload = JSON.parse(rawBody); } catch(e) {}

    const ALLOWED_COLS = new Set([
      'name','description','close','change','change_abs','volume','average_volume_10d_calc',
      'market_cap_basic','price_earnings_ttm','price_book_fq','price_book_ratio',
      'price_sales_current','return_on_equity','return_on_equity_fq',
      'return_on_assets','return_on_assets_fq','net_margin','gross_margin',
      'dividends_yield','dividends_yield_current','debt_to_equity_fq','total_debt_to_equity',
      'current_ratio','current_ratio_fq','sector','High.1M','Low.1M',
      'is_primary','typespecs','exchange','index',
    ]);
    const rawCols = clientPayload.columns || ['name','close','change','volume','market_cap_basic'];
    const safeCols = rawCols.filter(c => ALLOWED_COLS.has(c));
    const safeRange = [0, Math.min(Number(clientPayload.range?.[1]) || 500, 2000)];

    const merged = {
      columns: safeCols.length > 0 ? safeCols : ['name','close','change','volume','market_cap_basic'],
      range:   safeRange,
      sort:    clientPayload.sort || { sortBy: 'market_cap_basic', sortOrder: 'desc' },
      ignore_unknown_fields: true,
    };
    if (cfg.extraFilters.length > 0) merged.filter = cfg.extraFilters;

    const colHash  = Buffer.from((merged.columns || []).join(',')).toString('base64').slice(0, 20);
    const cacheKey = 'df_v1_' + exchange + '_' + colHash;
    const ttl      = getCacheTTL(exchange);

    if (kvEnabled()) {
      const cached = await kvGet(cacheKey);
      if (cached) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).end(JSON.stringify(cached));
      }
    }

    const payload = JSON.stringify(merged);
    return new Promise((resolve) => {
      const headers = {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin':         'https://www.tradingview.com',
        'Referer':        'https://www.tradingview.com/',
        'Accept':         'application/json',
      };
      makeRequest('scanner.tradingview.com', cfg.tvPath, 'POST', headers, payload, async (err, data, statusCode) => {
        if (err) { res.status(500).json({ error: 'Veri alınamadı' }); return resolve(); }
        res.setHeader('Content-Type', 'application/json');
        try {
          const parsed = JSON.parse(data);
          parsed._exchange = exchange;
          parsed._currency = cfg.currency;
          if (kvEnabled() && parsed.data && parsed.data.length > 0) {
            kvSet(cacheKey, parsed, ttl).catch(() => {});
          }
          res.status(statusCode).end(JSON.stringify(parsed));
        } catch(e) {
          res.status(statusCode).end(data);
        }
        resolve();
      });
    });
  }

  res.status(400).json({ error: 'Unknown action' });
};