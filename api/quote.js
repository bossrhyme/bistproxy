// api/quote.js — TradingView profil verisi proxy
// scan.js'deki aynı TV endpoint'ini kullanır, sadece tek sembol için daha fazla field

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  prefix: 'BIST:' },
  nasdaq: { tvPath: '/america/scan', prefix: 'NASDAQ:' },
  sp500:  { tvPath: '/america/scan', prefix: '' },
  dax:    { tvPath: '/germany/scan', prefix: 'XETR:' },
  lse:    { tvPath: '/uk/scan',      prefix: 'LSE:' },
  nikkei: { tvPath: '/japan/scan',   prefix: 'TSE:' },
};

// Profil için geniş field listesi
const PROFILE_COLS = [
  // Fiyat
  'name','description','close','change','change_abs','volume','average_volume_10d_calc',
  'market_cap_basic','currency',
  // Değerleme
  'price_earnings_ttm','price_book_ratio','price_book_fq','price_sales_current',
  'enterprise_value_ebitda_ttm','peg_ratio','earnings_per_share_diluted_ttm',
  // Karlılık
  'return_on_equity','return_on_equity_fq',
  'return_on_assets','return_on_assets_fq',
  'net_margin','gross_margin','operating_margin',
  // Büyüme
  'total_revenue_change_ttm_yoy','revenue_growth_ttm_yoy',
  'earnings_per_share_diluted_yoy_growth_ttm','earnings_per_share_change_ttm_yoy',
  // Bilanço
  'debt_to_equity_fq','total_debt_to_equity',
  'current_ratio_fq','current_ratio',
  'quick_ratio',
  'cash_n_short_term_investments_fq',
  'total_debt_fq',
  'free_cash_flow','cash_f_operating_activities',
  // Temettü
  'dividends_yield','dividends_yield_current','dps_common_stock_prim_issue_fy',
  // Fiyat aralığı
  '52_week_high','52_week_low',
  'High.6M','Low.6M','High.1M','Low.1M',
  'Perf.W','Perf.1M','Perf.3M','Perf.6M','Perf.Y','Perf.YTD',
  // Risk
  'beta_1_year','beta_5_year',
  // Diğer
  'sector','industry','piotroski_f_score',
  'number_of_employees',
  'shares_outstanding',
  'float_shares_outstanding',
];

const https = require('https');

function tvRequest(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'scanner.tradingview.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('TV parse error: ' + data.slice(0,100))); }
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
  const sym = url.searchParams.get('sym');
  const ex  = (url.searchParams.get('ex') || 'bist').toLowerCase();

  if (!sym) return res.status(400).json({ error: 'sym required' });

  const cfg = EXCHANGE_CONFIG[ex] || EXCHANGE_CONFIG.bist;
  const fullSym = cfg.prefix + sym.toUpperCase();

  try {
    const body = {
      columns: PROFILE_COLS,
      range: [0, 1],
      filter: [{ left: 'name', operation: 'equal', right: fullSym }],
    };

    const data = await tvRequest(cfg.tvPath, body);
    const row = data?.data?.[0]?.d;
    if (!row) return res.status(404).json({ error: 'Hisse bulunamadı: ' + fullSym });

    // Column → value map
    const r = {};
    PROFILE_COLS.forEach((col, i) => { r[col] = row[i]; });

    const n = (v) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : 0;

    return res.json({
      symbol:      sym,
      name:        r.name || r.description || sym,
      price:       n(r.close),
      change:      n(r.change_abs),
      changePct:   n(r.change),
      currency:    r.currency || '',
      marketCap:   n(r.market_cap_basic),
      volume:      n(r.volume),
      avgVolume:   n(r.average_volume_10d_calc),

      pe:          n(r.price_earnings_ttm),
      pb:          n(r.price_book_fq) || n(r.price_book_ratio),
      ps:          n(r.price_sales_current),
      peg:         n(r.peg_ratio),
      evEbitda:    n(r.enterprise_value_ebitda_ttm),
      eps:         n(r.earnings_per_share_diluted_ttm),

      roe:         n(r.return_on_equity_fq) || n(r.return_on_equity),
      roa:         n(r.return_on_assets_fq) || n(r.return_on_assets),
      netMargin:   n(r.net_margin),
      grossMargin: n(r.gross_margin),
      opMargin:    n(r.operating_margin),

      revenueGrowth:  n(r.revenue_growth_ttm_yoy) || n(r.total_revenue_change_ttm_yoy),
      earningsGrowth: n(r.earnings_per_share_diluted_yoy_growth_ttm),

      currentRatio: n(r.current_ratio_fq) || n(r.current_ratio),
      quickRatio:   n(r.quick_ratio),
      debtToEquity: n(r.debt_to_equity_fq) || n(r.total_debt_to_equity),
      totalCash:    n(r.cash_n_short_term_investments_fq),
      totalDebt:    n(r.total_debt_fq),
      freeCashFlow: n(r.free_cash_flow),

      dividendYield: n(r.dividends_yield_current) || n(r.dividends_yield),
      dps:           n(r.dps_common_stock_prim_issue_fy),

      high52:    n(r['52_week_high']),
      low52:     n(r['52_week_low']),
      beta:      n(r.beta_1_year) || n(r.beta_5_year),

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
      shares:    n(r.shares_outstanding),
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
