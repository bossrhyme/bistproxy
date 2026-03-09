// api/quote.js — TradingView debug version
const https = require('https');

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  prefix: 'BIST:' },
  nasdaq: { tvPath: '/america/scan', prefix: 'NASDAQ:' },
  sp500:  { tvPath: '/america/scan', prefix: 'NYSE:' },
  dax:    { tvPath: '/germany/scan', prefix: 'XETR:' },
  lse:    { tvPath: '/uk/scan',      prefix: 'LSE:' },
  nikkei: { tvPath: '/japan/scan',   prefix: 'TSE:' },
};

function tvRequest(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'scanner.tradingview.com',
      path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, raw: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, 'http://localhost');
  const sym = (url.searchParams.get('sym') || '').toUpperCase();
  const ex  = (url.searchParams.get('ex') || 'bist').toLowerCase();
  const cfg = EXCHANGE_CONFIG[ex] || EXCHANGE_CONFIG.bist;

  const cols = ['name','description','close','change','market_cap_basic','price_earnings_ttm','sector'];

  // 3 farklı yöntemi paralel dene
  const [r1, r2, r3] = await Promise.all([
    // Yöntem 1: symbols + tickers
    tvRequest(cfg.tvPath, {
      symbols: { tickers: [cfg.prefix + sym] },
      columns: cols,
    }),
    // Yöntem 2: symbols + query
    tvRequest(cfg.tvPath, {
      symbols: { tickers: [cfg.prefix + sym], query: { types: [] } },
      columns: cols,
    }),
    // Yöntem 3: scan.js gibi range + sort, sembolü filtrele
    tvRequest(cfg.tvPath, {
      columns: cols,
      range: [0, 1000],
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    }),
  ]);

  // Yöntem 3'te sembolü bul
  let found3 = null;
  try {
    const parsed3 = JSON.parse(r3.raw);
    const target = cfg.prefix + sym;
    found3 = parsed3?.data?.find(row => row.s === target || row.s === sym);
  } catch(e) {}

  return res.json({
    target: cfg.prefix + sym,
    m1_status: r1.status, m1: r1.raw.slice(0, 300),
    m2_status: r2.status, m2: r2.raw.slice(0, 300),
    m3_found: found3 ? found3 : 'not found in top 1000',
    m3_sample: (() => { try { return JSON.parse(r3.raw)?.data?.slice(0,2); } catch(e) { return r3.raw.slice(0,200); } })(),
  });
};
