// api/quote.js — TradingView proxy (exchange-specific columns)
const https = require('https');

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  prefix: 'BIST:' },
  nasdaq: { tvPath: '/america/scan', prefix: 'NASDAQ:' },
  sp500:  { tvPath: '/america/scan', prefix: 'NYSE:' },
  dax:    { tvPath: '/germany/scan', prefix: 'XETR:' },
  lse:    { tvPath: '/uk/scan',      prefix: 'LSE:' },
  nikkei: { tvPath: '/japan/scan',   prefix: 'TSE:' },
};

// Screener'da zaten çalıştığı doğrulanmış base field'lar + ek profil field'ları
const BASE_COLS = [
  'name','description','close','change','change_abs','volume','average_volume_10d_calc',
  'market_cap_basic',
  'price_earnings_ttm','price_book_fq','price_sales_current',
  'return_on_equity_fq','return_on_assets_fq',
  'net_margin','gross_margin',
  'total_revenue_change_ttm_yoy','earnings_per_share_change_ttm_yoy',
  'revenue_growth_ttm_yoy','earnings_per_share_diluted_yoy_growth_ttm',
  'dividends_yield','debt_to_equity_fq','current_ratio_fq',
  'sector','High.1M','Low.1M','piotroski_f_score',
  // Ek profil field'ları — bunlar TV'de standart
  '52_week_high','52_week_low',
  'Perf.W','Perf.1M','Perf.3M','Perf.6M','Perf.Y','Perf.YTD',
  'beta_1_year',
  'cash_f_operating_activities',
];

const US_EXTRA = [
  'price_book_ratio','return_on_equity','return_on_assets',
  'dividends_yield_current','total_debt_to_equity','current_ratio',
  'earnings_per_share_diluted_ttm',
];

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
  const sym = (url.searchParams.get('sym') || '').toUpperCase();
  const ex  = (url.searchParams.get('ex') || 'bist').toLowerCase();

  if (!sym) return res.status(400).json({ error: 'sym required' });

  const cfg    = EXCHANGE_CONFIG[ex] || EXCHANGE_CONFIG.bist;
  const ticker = cfg.prefix + sym;
  const isUS   = ['nasdaq','sp500'].includes(ex);
  const cols   = isUS ? [...BASE_COLS, ...US_EXTRA] : BASE_COLS;

  try {
    const rawStr = await tvRequest(cfg.tvPath, {
      symbols: { tickers: [ticker] },
      columns: cols,
    });

    let parsed;
    try { parsed = JSON.parse(rawStr); }
    catch(e) { return res.status(500).json({ error: 'Parse failed', raw: rawStr.slice(0,300) }); }

    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const entry = (parsed.data || []).find(x => x.s === ticker) || (parsed.data||[])[0];
    const row   = entry?.d;
    if (!row?.length) return res.status(404).json({ error: 'Bulunamadı: ' + ticker, raw: rawStr.slice(0,300) });

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
      revenueGrowth: n(r.revenue_growth_ttm_yoy) || n(r.total_revenue_change_ttm_yoy),
      earningsGrowth:n(r.earnings_per_share_diluted_yoy_growth_ttm) || n(r.earnings_per_share_change_ttm_yoy),
      eps:           n(r.earnings_per_share_diluted_ttm),
      debtToEquity:  n(r.debt_to_equity_fq) || n(r.total_debt_to_equity),
      currentRatio:  n(r.current_ratio_fq) || n(r.current_ratio),
      operatingCF:   n(r.cash_f_operating_activities),
      dividendYield: n(r.dividends_yield_current) || n(r.dividends_yield),
      high52:        n(r['52_week_high']),
      low52:         n(r['52_week_low']),
      beta:          n(r.beta_1_year),
      perfW:         n(r['Perf.W']),
      perf1M:        n(r['Perf.1M']),
      perf3M:        n(r['Perf.3M']),
      perf6M:        n(r['Perf.6M']),
      perfY:         n(r['Perf.Y']),
      perfYTD:       n(r['Perf.YTD']),
      sector:        r.sector || '',
      piotroski:     n(r.piotroski_f_score),
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
