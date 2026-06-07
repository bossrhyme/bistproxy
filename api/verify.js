// api/verify.js — TradingView Scanner ile TV verisi doğrulama
// Aynı scan.js proxy'sini kullanır - ek kaynak gerektirmez
const https = require('https');

const TV_PATHS = {
  bist:'   /turkey/scan', nasdaq:'/america/scan', sp500:'/america/scan',
  dax:'/germany/scan', lse:'/uk/scan', nikkei:'/japan/scan', nyse:'/america/scan'
};

const FIELDS = [
  'name','close','price_earnings_ttm','price_book_fq','price_book_ratio',
  'price_sales_current','return_on_equity_fq','return_on_equity',
  'return_on_assets_fq','return_on_assets',
  'net_margin','gross_margin',
  'total_revenue_change_ttm_yoy','revenue_growth_ttm_yoy',
  'earnings_per_share_change_ttm_yoy',
  'dividends_yield','dividends_yield_current',
  'debt_to_equity_fq','total_debt_to_equity',
  'current_ratio_fq','current_ratio',
  'piotroski_f_score','price_earnings_growth_ttm',
];

function tvScan(exchange, symbol) {
  const tvPath = (TV_PATHS[exchange] || TV_PATHS.bist).trim();
  const payload = JSON.stringify({
    filter: [{ left: 'name', operation: 'equal', right: symbol }],
    columns: FIELDS,
    range: [0, 1],
    ignore_unknown_fields: true,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'scanner.tradingview.com',
      path: tvPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'Accept': 'application/json',
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(9000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(payload);
    req.end();
  });
}

const num = v => (v != null && !isNaN(v)) ? parseFloat(parseFloat(v).toFixed(4)) : null;
const pct = v => (v != null && !isNaN(v)) ? parseFloat(parseFloat(v).toFixed(2)) : null;

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

async function kvGet(key) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    const r = await fetch(url + '/get/' + encodeURIComponent(key), { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ttlSec) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return;
    await fetch(url + '/set/' + encodeURIComponent(key) + '?ex=' + ttlSec, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  } catch {}
}

async function kvIncr(key, ttlSec) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return 0;
    const r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['TTL', key]])
    });
    const arr = await r.json();
    const count = arr[0]?.result || 0;
    if ((arr[1]?.result || -1) < 0) {
      fetch(url + '/pipeline', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify([['EXPIRE', key, ttlSec]])
      }).catch(() => {});
    }
    return count;
  } catch { return 0; }
}

function getClientIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown').slice(0, 45);
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url      = new URL(req.url, 'https://x');
  const sym      = (url.searchParams.get('symbol') || '').toUpperCase()
                     .replace(/\.(IS|DE|L|T)$/i, '');
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();

  if (!sym) return res.status(400).json({ error: 'symbol gerekli' });

  // Rate limit
  const ip = getClientIP(req);
  const rlCount = await kvIncr('rl:verify:' + ip, 60);
  if (rlCount > 20) return res.status(429).json({ error: 'Çok fazla istek, lütfen bekleyin.' });

  // KV cache
  const cacheKey = 'df_verify_v1_' + exchange + '_' + sym;
  const cached = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    const r    = await tvScan(exchange, sym);
    const data = JSON.parse(r.body);
    const row  = data?.data?.[0]?.d || [];

    if (!row.length) {
      return res.status(404).json({ error: 'Hisse bulunamadı: ' + sym });
    }

    const g = {};
    FIELDS.forEach((f, i) => { g[f] = row[i] ?? null; });

    const yahoo = {
      symbol:   sym,
      source:  'tradingview',
      pe:       num(g.price_earnings_ttm),
      pb:       num(g.price_book_fq) ?? num(g.price_book_ratio),
      ps:       num(g.price_sales_current),
      roe:      pct(g.return_on_equity_fq) ?? pct(g.return_on_equity),
      roa:      pct(g.return_on_assets_fq) ?? pct(g.return_on_assets),
      netMargin:    pct(g.net_margin),
      grossMargin:  pct(g.gross_margin),
      revenueGrowth: pct(g.total_revenue_change_ttm_yoy) ?? pct(g.revenue_growth_ttm_yoy),
      epsGrowth:    pct(g.earnings_per_share_change_ttm_yoy),
      dividendYield: num(g.dividends_yield) ?? num(g.dividends_yield_current),
      debtToEquity:  num(g.debt_to_equity_fq) ?? num(g.total_debt_to_equity),
      currentRatio:  num(g.current_ratio_fq) ?? num(g.current_ratio),
      piotroski:     g.piotroski_f_score != null ? Math.round(g.piotroski_f_score) : null,
    };

    const result = { source: 'tradingview', yahoo, symbol: sym };
    kvSet(cacheKey, result, 300).catch(() => {});
    kvSet('stale:' + cacheKey, result, 86400).catch(() => {});
    res.status(200).json(result);

  } catch (e) {
    const stale = await kvGet('stale:' + cacheKey);
    if (stale) { res.setHeader('X-Cache', 'STALE'); return res.status(200).json(stale); }
    res.status(500).json({ error: 'Doğrulama hatası' });
  }
};
