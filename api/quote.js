// api/quote.js — Twelve Data proxy
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { sym, ex, type } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  const KEY = '40e35e9a3ec345adacbd3f8fc0d9246d';
  const BASE = 'https://api.twelvedata.com';

  // Exchange mapping
  const exMap = {
    bist: 'BIST', nasdaq: 'NASDAQ', sp500: 'NYSE',
    dax: 'XETR', lse: 'LSE', nikkei: 'TSE'
  };
  const exchange = exMap[ex] || '';
  const exParam = exchange ? `&exchange=${exchange}` : '';

  async function td(endpoint) {
    try {
      const r = await fetch(`${BASE}${endpoint}&apikey=${KEY}`);
      if (!r.ok) return null;
      const j = await r.json();
      return j.status === 'error' ? null : j;
    } catch(e) { return null; }
  }

  try {
    if (type === 'news') {
      const data = await td(`/news?symbol=${encodeURIComponent(sym)}${exParam}&outputsize=5`);
      return res.json({ news: data || [] });
    }

    // Paralel: quote + statistics + profile
    const [quote, stats, profile] = await Promise.all([
      td(`/quote?symbol=${encodeURIComponent(sym)}${exParam}`),
      td(`/statistics?symbol=${encodeURIComponent(sym)}${exParam}`),
      td(`/profile?symbol=${encodeURIComponent(sym)}${exParam}`),
    ]);

    if (!quote) return res.status(404).json({ error: 'No data for ' + sym });

    const s = stats?.statistics || {};
    const val = s.valuations_metrics || {};
    const fin = s.financials || {};
    const inc = fin.income_statement || {};
    const bal = fin.balance_sheet || {};
    const cf  = fin.cash_flow || {};
    const st  = s.stock_statistics || {};

    return res.json({
      symbol:        sym,
      name:          quote.name || sym,
      price:         parseFloat(quote.close) || 0,
      change:        parseFloat(quote.change) || 0,
      changePct:     parseFloat(quote.percent_change) || 0,
      currency:      quote.currency || '',
      marketCap:     parseFloat(st.market_capitalization) || 0,
      volume:        parseFloat(quote.volume) || 0,
      avgVolume:     parseFloat(st.average_volume) || 0,

      // Değerleme
      pe:            parseFloat(val.trailing_pe) || 0,
      forwardPE:     parseFloat(val.forward_pe) || 0,
      pb:            parseFloat(val.price_to_book_mrq) || 0,
      ps:            parseFloat(val.price_to_sales_ttm) || 0,
      peg:           parseFloat(val.peg_ratio) || 0,
      evEbitda:      parseFloat(val.enterprise_to_ebitda) || 0,

      // Karlılık
      roe:           parseFloat(inc.return_on_equity_ttm) / 100 || 0,
      roa:           parseFloat(inc.return_on_assets_ttm) / 100 || 0,
      netMargin:     parseFloat(inc.net_profit_margin_ttm) / 100 || 0,
      grossMargin:   parseFloat(inc.gross_profit_margin_ttm) / 100 || 0,
      opMargin:      parseFloat(inc.operating_margin_ttm) / 100 || 0,

      // Bilanço
      currentRatio:  parseFloat(bal.current_ratio_mrq) || 0,
      debtToEquity:  parseFloat(bal.total_debt_to_equity_mrq) / 100 || 0,
      totalCash:     parseFloat(bal.total_cash_mrq) || 0,
      totalDebt:     parseFloat(bal.total_debt_mrq) || 0,
      freeCashFlow:  parseFloat(cf.levered_free_cash_flow_ttm) || 0,

      // Büyüme
      revenueGrowth:  parseFloat(inc.quarterly_revenue_growth_yoy) / 100 || 0,
      earningsGrowth: parseFloat(inc.quarterly_earnings_growth_yoy) / 100 || 0,

      // Fiyat aralığı
      high52:        parseFloat(st['52_week_high']) || 0,
      low52:         parseFloat(st['52_week_low'])  || 0,
      beta:          parseFloat(st.beta) || 0,
      dividendYield: parseFloat(st.forward_annual_dividend_yield) / 100 || 0,

      // Şirket
      sector:      profile?.sector || '',
      industry:    profile?.industry || '',
      description: profile?.description || '',
      employees:   profile?.employees || 0,
      website:     profile?.website || '',
      country:     profile?.country || '',
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
