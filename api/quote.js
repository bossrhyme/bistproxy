// api/quote.js — TradingView proxy (minimal safe fields)
const https = require('https');

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  prefix: 'BIST:' },
  nasdaq: { tvPath: '/america/scan', prefix: 'NASDAQ:' },
  sp500:  { tvPath: '/america/scan', prefix: 'NYSE:' },
  dax:    { tvPath: '/germany/scan', prefix: 'XETR:' },
  lse:    { tvPath: '/uk/scan',      prefix: 'LSE:' },
  nikkei: { tvPath: '/japan/scan',   prefix: 'TSE:' },
};

// Sadece screener'da zaten çalıştığı kanıtlanmış field'lar
const COLS_BIST = [
  'name','description','close','change','change_abs','volume','average_volume_10d_calc',
  'market_cap_basic',
  'price_earnings_ttm','price_book_fq','price_sales_current',
  'return_on_equity_fq','return_on_assets_fq',
  'net_margin','gross_margin',
  'dividends_yield','debt_to_equity_fq','current_ratio_fq',
  'sector','High.1M','Low.1M',
];

const COLS_US = [
  'name','description','close','change','change_abs','volume','average_volume_10d_calc',
  'market_cap_basic',
  'price_earnings_ttm','price_book_ratio','price_book_fq','price_sales_current',
  'return_on_equity','return_on_equity_fq','return_on_assets','return_on_assets_fq',
  'net_margin','gross_margin',
  'dividends_yield_current','dividends_yield',
  'total_debt_to_equity','debt_to_equity_fq','current_ratio','current_ratio_fq',
  'sector','High.1M','Low.1M',
];

const COLS_GLOBAL = [
  'name','description','close','change','change_abs','volume','average_volume_10d_calc',
  'market_cap_basic',
  'price_earnings_ttm','price_book_ratio','price_book_fq','price_sales_current',
  'return_on_equity','return_on_equity_fq','return_on_assets','return_on_assets_fq',
  'net_margin','gross_margin',
  'dividends_yield_current','dividends_yield',
  'total_debt_to_equity','debt_to_equity_fq','current_ratio','current_ratio_fq',
  'sector','High.1M','Low.1M',
];

const COL_MAP = {
  bist: COLS_BIST,
  nasdaq: COLS_US, sp500: COLS_US,
  dax: COLS_GLOBAL, lse: COLS_GLOBAL, nikkei: COLS_GLOBAL,
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
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const url = new URL(req.url, 'http://localhost');
  const sym  = (url.searchParams.get('sym') || '').toUpperCase();
  const ex   = (url.searchParams.get('ex')  || 'bist').toLowerCase();
  const type = url.searchParams.get('type') || '';

  if (!sym) return res.status(400).json({ error: 'sym required' });

  // Haberler için şimdilik boş dön — TV haber API'si yok
  if (type === 'news') return res.json({ news: [] });

  const cfg    = EXCHANGE_CONFIG[ex] || EXCHANGE_CONFIG.bist;
  const cols   = COL_MAP[ex] || COLS_GLOBAL;
  const ticker = cfg.prefix + sym;

  try {
    const rawStr = await tvRequest(cfg.tvPath, {
      symbols: { tickers: [ticker] },
      columns: cols,
    });

    let parsed;
    try { parsed = JSON.parse(rawStr); }
    catch(e) { return res.status(500).json({ error: 'Parse failed', raw: rawStr.slice(0,200) }); }

    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const entry = (parsed.data || []).find(x => x.s === ticker) || (parsed.data||[])[0];
    const row   = entry?.d;
    if (!row?.length) return res.status(404).json({ error: 'Bulunamadı: ' + ticker });

    const r = {};
    cols.forEach((col, i) => { r[col] = row[i] ?? null; });
    const n = (v) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : 0;

    return res.json({
      symbol:        sym,
      name:          r.description || r.name || sym,
      price:         n(r.close),
      change:        n(r.change_abs),
      changePct:     n(r.change),
      marketCap:     n(r.market_cap_basic),
      volume:        n(r.volume),
      avgVolume:     n(r.average_volume_10d_calc),
      pe:            n(r.price_earnings_ttm),
      pb:            n(r.price_book_fq) || n(r.price_book_ratio),
      ps:            n(r.price_sales_current),
      roe:           n(r.return_on_equity_fq) || n(r.return_on_equity),
      roa:           n(r.return_on_assets_fq) || n(r.return_on_assets),
      netMargin:     n(r.net_margin),
      grossMargin:   n(r.gross_margin),
      debtToEquity:  n(r.debt_to_equity_fq) || n(r.total_debt_to_equity),
      currentRatio:  n(r.current_ratio_fq)  || n(r.current_ratio),
      dividendYield: n(r.dividends_yield_current) || n(r.dividends_yield),
      high52:        n(r['High.1M']),
      low52:         n(r['Low.1M']),
      sector:        r.sector || '',
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
