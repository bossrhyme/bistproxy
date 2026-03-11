const https = require('https');

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

const EXCHANGE_META = {
  bist:   { tvExchange: 'Turkey',     symbolPrefix: 'BIST:' },
  nasdaq: { tvExchange: 'NASDAQ',     symbolPrefix: 'NASDAQ:' },
  sp500:  { tvExchange: 'NYSE',       symbolPrefix: 'NYSE:' },
  dax:    { tvExchange: 'XETR',       symbolPrefix: 'XETR:' },
  lse:    { tvExchange: 'LSE',        symbolPrefix: 'LSE:' },
  nikkei: { tvExchange: 'Japan',      symbolPrefix: 'TSE:' },
};

module.exports = function(req, res) {
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
  const symbol   = (url.searchParams.get('symbol') || '').toUpperCase();
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();

  if (!symbol) return res.status(400).json({ error: 'symbol gerekli' });

  const meta   = EXCHANGE_META[exchange] || EXCHANGE_META.bist;
  const tvSym  = meta.symbolPrefix + symbol;

  const fields = [
    'name','description','close','change','change_abs','volume','average_volume_10d_calc',
    'market_cap_basic','price_earnings_ttm','price_book_fq','price_sales_current',
    'return_on_equity_fq','return_on_assets_fq','net_margin','gross_margin',
    'dividends_yield','debt_to_equity_fq','current_ratio_fq','sector',
    'High.1M','Low.1M',
  ];

  const payload = JSON.stringify({
    symbols: { tickers: [tvSym], query: { types: [] } },
    columns: fields,
  });

  const headers = {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Origin':         'https://www.tradingview.com',
    'Referer':        'https://www.tradingview.com/',
    'Accept':         'application/json',
  };

  makeRequest('scanner.tradingview.com', '/scan', 'POST', headers, payload, (err, data, statusCode) => {
    if (err) return res.status(500).json({ error: 'Veri alınamadı' });

    try {
      const parsed = JSON.parse(data);
      const row    = parsed.data?.[0]?.d || [];
      const result = {};
      fields.forEach((f, i) => { result[f] = row[i] ?? null; });
      result._symbol   = symbol;
      result._exchange = exchange;
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(result);
    } catch(e) {
      res.status(500).json({ error: 'Veri alınamadı' });
    }
  });
};