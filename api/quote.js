const https = require('https');
const { protect, trackViolation } = require('./_protect');

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

// scan.js ile aynı exchange config
const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  currency: '₺',  symbolSuffix: '' },
  nasdaq: { tvPath: '/america/scan', currency: '$',  symbolSuffix: '' },
  sp500:  { tvPath: '/america/scan', currency: '$',  symbolSuffix: '' },
  dax:    { tvPath: '/germany/scan', currency: '€',  symbolSuffix: '' },
  lse:    { tvPath: '/uk/scan',      currency: 'p',  symbolSuffix: '' },
  nikkei: { tvPath: '/japan/scan',   currency: '¥',  symbolSuffix: '' },
  nyse:   { tvPath: '/america/scan', currency: '$',  symbolSuffix: '' },
};

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

module.exports = async function(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (await protect(req, res)) return;

  const url      = new URL(req.url, 'http://localhost');
  const symbol   = (url.searchParams.get('sym') || url.searchParams.get('symbol') || '').toUpperCase();
  const exchange = (url.searchParams.get('ex')  || url.searchParams.get('exchange') || 'bist').toLowerCase();
  const type     = url.searchParams.get('type') || '';

  if (!symbol) return res.status(400).json({ error: 'symbol gerekli' });

  // Rate limit
  const ip = getClientIP(req);
  const rlCount = await kvIncr('rl:quote:' + ip, 60);
  if (rlCount > 60) { trackViolation(ip).catch(() => {}); return res.status(429).json({ error: 'Çok fazla istek, lütfen bekleyin.' }); }

  // Haber isteği — şimdilik boş
  if (type === 'news') return res.status(200).json({ news: [] });

  const cfg = EXCHANGE_CONFIG[exchange] || EXCHANGE_CONFIG.bist;

  // KV cache
  const cacheKey = 'df_quote_v1_' + exchange + '_' + symbol;
  const cached = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  const fields = [
    'name', 'description', 'close', 'change', 'change_abs', 'volume',
    'average_volume_10d_calc', 'market_cap_basic',
    'price_earnings_ttm', 'price_book_fq', 'price_sales_current',
    'return_on_equity_fq', 'return_on_assets_fq',
    'net_margin', 'gross_margin', 'dividends_yield',
    'debt_to_equity_fq', 'current_ratio_fq',
    'sector', 'High.1M', 'Low.1M', 'beta_1_year',
    '52_week_high', '52_week_low',
    'Perf.W', 'Perf.1M', 'Perf.Y',
    'Recommend.All', 'number_of_employees', 'piotroski_f_score',
    'price_earnings_growth_ttm',
  ];

  // scan.js ile aynı format: filter + range (symbols.tickers değil)
  const payload = JSON.stringify({
    filter: [
      { left: 'name', operation: 'equal', right: symbol },
    ],
    columns: fields,
    range:   [0, 1],
    ignore_unknown_fields: true,
  });

  const headers = {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Origin':         'https://www.tradingview.com',
    'Referer':        'https://www.tradingview.com/',
    'Accept':         'application/json',
  };

  makeRequest('scanner.tradingview.com', cfg.tvPath, 'POST', headers, payload, async (err, data) => {
    if (err) {
      const stale = await kvGet('stale:' + cacheKey);
      if (stale) { res.setHeader('X-Cache', 'STALE'); return res.status(200).json(stale); }
      return res.status(500).json({ error: 'Bağlantı hatası' });
    }

    try {
      const parsed = JSON.parse(data);
      const row    = parsed.data?.[0]?.d || [];

      if (!row.length) {
        const stale = await kvGet('stale:' + cacheKey);
        if (stale) { res.setHeader('X-Cache', 'STALE'); return res.status(200).json(stale); }
        return res.status(404).json({ error: 'Hisse bulunamadı: ' + symbol });
      }

      const raw = {};
      fields.forEach((f, i) => { raw[f] = row[i] ?? null; });

      // profile.html'in beklediği alan isimlerine dönüştür
      const result = {
        symbol,
        exchange,
        name:         raw.name,
        description:  raw.description,
        sector:       raw.sector,

        // Fiyat
        price:        raw.close,
        close:        raw.close,
        change:       raw.change_abs,
        changePct:    raw.change,

        // Hacim & piyasa
        volume:       raw.volume,
        avgVolume:    raw.average_volume_10d_calc,
        marketCap:    raw.market_cap_basic,  // TV zaten tam deger veriyor

        // Çarpanlar
        pe:  raw.price_earnings_ttm,
        pb:  raw.price_book_fq,
        ps:  raw.price_sales_current,
        peg: raw.price_earnings_growth_ttm,

        // Karlılık (TV % olarak veriyor, profile.html /100 yapıyor)
        roe:         raw.return_on_equity_fq,
        roa:         raw.return_on_assets_fq,
        netMargin:   raw.net_margin,
        grossMargin: raw.gross_margin,

        // Finansal sağlık
        dividendYield: raw.dividends_yield,
        debtToEquity:  raw.debt_to_equity_fq,
        currentRatio:  raw.current_ratio_fq,
        beta:          raw.beta_1_year,

        // 52 hafta
        high52: raw['52_week_high'] || raw['High.1M'],
        low52:  raw['52_week_low']  || raw['Low.1M'],

        // Performans
        perfW:  raw['Perf.W'],
        perf1M: raw['Perf.1M'],
        perfY:  raw['Perf.Y'],

        // Diğer
        piotroski: raw.piotroski_f_score,
        employees: raw.number_of_employees,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=60');
      kvSet(cacheKey, result, 60).catch(() => {});
      kvSet('stale:' + cacheKey, result, 86400).catch(() => {});
      return res.status(200).json(result);

    } catch(e) {
      // JSON parse başarısız = TradingView banlı/rate-limited
      const stale = await kvGet('stale:' + cacheKey);
      if (stale) { res.setHeader('X-Cache', 'STALE'); return res.status(200).json(stale); }
      return res.status(500).json({ error: 'Veri işlenemedi' });
    }
  });
};
