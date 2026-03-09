// api/quote.js — TradingView single symbol proxy (symbols array syntax)
const https = require('https');

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  prefix: 'BIST:' },
  nasdaq: { tvPath: '/america/scan', prefix: 'NASDAQ:' },
  sp500:  { tvPath: '/america/scan', prefix: 'NYSE:' },
  dax:    { tvPath: '/germany/scan', prefix: 'XETR:' },
  lse:    { tvPath: '/uk/scan',      prefix: 'LSE:' },
  nikkei: { tvPath: '/japan/scan',   prefix: 'TSE:' },
};

const PROFILE_COLS = [
  'name','description','close','change','change_abs','volume','average_volume_10d_calc',
  'market_cap_basic','currency',
  'price_earnings_ttm','price_book_fq','price_sales_current',
  'enterprise_value_ebitda_ttm','peg_ratio','earnings_per_share_diluted_ttm',
  'return_on_equity_fq','return_on_assets_fq',
  'net_margin','gross_margin','operating_margin',
  'total_revenue_change_ttm_yoy','revenue_growth_ttm_yoy',
  'earnings_per_share_diluted_yoy_growth_ttm',
  'debt_to_equity_fq','current_ratio_fq','quick_ratio',
  'cash_n_short_term_investments_fq','total_debt_fq',
  'free_cash_flow','cash_f_operating_activities',
  'dividends_yield_current','dividends_yield',
  '52_week_high','52_week_low',
  'Perf.W','Perf.1M','Perf.3M','Perf.6M','Perf.Y','Perf.YTD',
  'beta_1_year',
  'sector','industry','piotroski_f_score','number_of_employees',
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data.slice(0,200))); }
      });
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
  const ex  = (url.searchParams.get('ex')  || 'bist').toLowerCase();

  if (!sym) return res.status(400).json({ error: 'sym required' });

  const cfg    = EXCHANGE_CONFIG[ex] || EXCHANGE_CONFIG.bist;
  const ticker = cfg.prefix + sym;

  try {
    // symbols array — TV'nin tek sembol için doğru yöntemi
    const body = {
      symbols: { tickers: [ticker], query: { types: [] } },
      columns: PROFILE_COLS,
    };

    const data = await tvRequest(cfg.tvPath, body);
    const row  = data?.data?.[0]?.d;

    if (!row) {
      // Fallback: prefix olmadan dene
      const body2 = {
        symbols: { tickers: [sym], query: { types: [] } },
        columns: PROFILE_COLS,
      };
      const data2 = await tvRequest(cfg.tvPath, body2);
      const row2  = data2?.data?.[0]?.d;
      if (!row2) return res.status(404).json({ error: 'Bulunamadı: ' + ticker, raw: data });
      return buildResponse(sym, row2, res);
    }

    return buildResponse(sym, row, res);

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};

function buildResponse(sym, row, res) {
  const r = {};
  PROFILE_COLS.forEach((col, i) => { r[col] = row[i]; });
  const n = (v) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : 0;

  return res.json({
    symbol:      sym,
    name:        r.description || r.name || sym,
    price:       n(r.close),
    change:      n(r.change_abs),
    changePct:   n(r.change),
    currency:    r.currency || '',
    marketCap:   n(r.market_cap_basic),
    volume:      n(r.volume),
    avgVolume:   n(r.average_volume_10d_calc),

    pe:          n(r.price_earnings_ttm),
    pb:          n(r.price_book_fq),
    ps:          n(r.price_sales_current),
    peg:         n(r.peg_ratio),
    evEbitda:    n(r.enterprise_value_ebitda_ttm),
    eps:         n(r.earnings_per_share_diluted_ttm),

    roe:         n(r.return_on_equity_fq),
    roa:         n(r.return_on_assets_fq),
    netMargin:   n(r.net_margin),
    grossMargin: n(r.gross_margin),
    opMargin:    n(r.operating_margin),

    revenueGrowth:  n(r.revenue_growth_ttm_yoy) || n(r.total_revenue_change_ttm_yoy),
    earningsGrowth: n(r.earnings_per_share_diluted_yoy_growth_ttm),

    currentRatio: n(r.current_ratio_fq),
    quickRatio:   n(r.quick_ratio),
    debtToEquity: n(r.debt_to_equity_fq),
    totalCash:    n(r.cash_n_short_term_investments_fq),
    totalDebt:    n(r.total_debt_fq),
    freeCashFlow: n(r.free_cash_flow),
    operatingCF:  n(r.cash_f_operating_activities),

    dividendYield: n(r.dividends_yield_current) || n(r.dividends_yield),

    high52:  n(r['52_week_high']),
    low52:   n(r['52_week_low']),
    beta:    n(r.beta_1_year),

    perfW:   n(r['Perf.W']),
    perf1M:  n(r['Perf.1M']),
    perf3M:  n(r['Perf.3M']),
    perf6M:  n(r['Perf.6M']),
    perfY:   n(r['Perf.Y']),
    perfYTD: n(r['Perf.YTD']),

    sector:    r.sector   || '',
    industry:  r.industry || '',
    employees: n(r.number_of_employees),
    piotroski: n(r.piotroski_f_score),
  });
}
