// api/quote.js — Twelve Data proxy v2
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { sym, ex, type } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  const KEY = '40e35e9a3ec345adacbd3f8fc0d9246d';
  const BASE = 'https://api.twelvedata.com';

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
      return (j.status === 'error' || j.code) ? null : j;
    } catch(e) { return null; }
  }

  const s = encodeURIComponent(sym);

  try {
    if (type === 'news') {
      const data = await td(`/news?symbol=${s}${exParam}&outputsize=5`);
      return res.json({ news: Array.isArray(data) ? data : [] });
    }

    // Paralel: quote + statistics + profile
    const [quote, stats, profile] = await Promise.all([
      td(`/quote?symbol=${s}${exParam}`),
      td(`/statistics?symbol=${s}${exParam}`),
      td(`/profile?symbol=${s}${exParam}`),
    ]);

    if (!quote) return res.status(404).json({ error: 'No data for ' + sym });

    // Statistics field mapping — Twelve Data dökümanı
    const sv  = stats?.statistics?.valuations_metrics || {};
    const sf  = stats?.statistics?.financials || {};
    const sinc = sf.income_statement || {};
    const sbal = sf.balance_sheet || {};
    const scf  = sf.cash_flow || {};
    const sst  = stats?.statistics?.stock_statistics || {};

    const p = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

    // ROE, ROA, margins — hem statistics'ten hem quote'dan dene
    const roe = p(sinc.return_on_equity_ttm) / 100 || p(quote.fifty_two_week?.return_on_equity) / 100 || 0;
    const roa = p(sinc.return_on_assets_ttm) / 100 || 0;
    const netMargin   = p(sinc.net_profit_margin_ttm)   / 100 || 0;
    const grossMargin = p(sinc.gross_profit_margin_ttm) / 100 || 0;
    const opMargin    = p(sinc.operating_margin_ttm)    / 100 || 0;

    // 52H, beta, dividend — statistics'ten + quote fallback
    const high52 = p(sst['52_week_high']) || p(quote.fifty_two_week?.high) || 0;
    const low52  = p(sst['52_week_low'])  || p(quote.fifty_two_week?.low)  || 0;
    const beta   = p(sst.beta)            || p(quote.beta)                 || 0;
    const divYield = p(sst.forward_annual_dividend_yield) / 100
                  || p(sst.trailing_annual_dividend_yield) / 100 || 0;

    return res.json({
      symbol:        sym,
      name:          quote.name || sym,
      price:         p(quote.close),
      change:        p(quote.change),
      changePct:     p(quote.percent_change),
      currency:      quote.currency || '',
      marketCap:     p(sst.market_capitalization) || p(quote.market_cap) || 0,
      volume:        p(quote.volume),
      avgVolume:     p(sst.average_volume) || p(quote.average_volume) || 0,

      pe:            p(sv.trailing_pe)         || p(quote.pe) || 0,
      forwardPE:     p(sv.forward_pe)          || p(quote.forward_pe) || 0,
      pb:            p(sv.price_to_book_mrq)   || p(quote.pb) || 0,
      ps:            p(sv.price_to_sales_ttm)  || 0,
      peg:           p(sv.peg_ratio)           || p(quote.peg) || 0,
      evEbitda:      p(sv.enterprise_to_ebitda)|| 0,

      roe, roa, netMargin, grossMargin, opMargin,

      currentRatio:  p(sbal.current_ratio_mrq)         || p(quote.current_ratio) || 0,
      debtToEquity:  p(sbal.total_debt_to_equity_mrq) / 100 || p(quote.debt_to_equity) / 100 || 0,
      totalCash:     p(sbal.total_cash_mrq)            || p(quote.total_cash) || 0,
      totalDebt:     p(sbal.total_debt_mrq)            || p(quote.total_debt) || 0,
      freeCashFlow:  p(scf.levered_free_cash_flow_ttm) || p(quote.free_cash_flow) || 0,

      revenueGrowth:  p(sinc.quarterly_revenue_growth_yoy)  / 100 || 0,
      earningsGrowth: p(sinc.quarterly_earnings_growth_yoy) / 100 || p(quote.earnings_growth) || 0,

      high52, low52, beta, dividendYield: divYield,

      sector:      profile?.sector      || quote.sector      || '',
      industry:    profile?.industry    || quote.industry    || '',
      description: profile?.description || quote.description || '',
      employees:   profile?.employees   || quote.employees   || 0,
      website:     profile?.website     || quote.website     || '',
      country:     profile?.country     || quote.country     || '',

      // Debug — statistics'in ham yapısını göster
      _statsKeys: stats ? Object.keys(stats.statistics || {}) : [],
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
