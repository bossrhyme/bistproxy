// api/quote.js — Twelve Data proxy v3 (only /quote + /profile + /news)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { sym, ex, type } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  const KEY = '40e35e9a3ec345adacbd3f8fc0d9246d';
  const BASE = 'https://api.twelvedata.com';

  const exMap = { bist:'BIST', nasdaq:'NASDAQ', sp500:'NYSE', dax:'XETR', lse:'LSE', nikkei:'TSE' };
  const exParam = exMap[ex] ? `&exchange=${exMap[ex]}` : '';
  const s = encodeURIComponent(sym);

  async function td(endpoint) {
    try {
      const r = await fetch(`${BASE}${endpoint}&apikey=${KEY}`);
      if (!r.ok) return null;
      const j = await r.json();
      return (j.status === 'error' || j.code) ? null : j;
    } catch(e) { return null; }
  }

  const p = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

  try {
    if (type === 'news') {
      const data = await td(`/news?symbol=${s}${exParam}&outputsize=5`);
      return res.json({ news: Array.isArray(data) ? data : [] });
    }

    if (type === 'raw') {
      // Debug: ham quote verisini göster
      const q = await td(`/quote?symbol=${s}${exParam}`);
      return res.json(q || {});
    }

    const [quote, profile] = await Promise.all([
      td(`/quote?symbol=${s}${exParam}`),
      td(`/profile?symbol=${s}${exParam}`),
    ]);

    if (!quote) return res.status(404).json({ error: 'No data for ' + sym });

    // /quote endpoint field'larını direkt kullan
    const fw = quote.fifty_two_week || {};

    return res.json({
      symbol:        sym,
      name:          quote.name || sym,
      price:         p(quote.close),
      change:        p(quote.change),
      changePct:     p(quote.percent_change),
      currency:      quote.currency || '',
      marketCap:     p(quote.market_cap),
      volume:        p(quote.volume),
      avgVolume:     p(quote.average_volume),

      // Değerleme — quote'dan
      pe:            p(quote.pe),
      forwardPE:     p(quote.forward_pe),
      pb:            p(quote.pb),
      ps:            p(quote.ps),
      peg:           p(quote.peg),
      evEbitda:      p(quote.ev_to_ebitda) || p(quote.enterprise_to_ebitda) || 0,

      // Karlılık — quote'dan
      roe:           p(quote.roe) / 100,
      roa:           p(quote.roa) / 100,
      netMargin:     p(quote.net_margin) / 100,
      grossMargin:   p(quote.gross_margin) / 100,
      opMargin:      p(quote.operating_margin) / 100,

      // Bilanço
      currentRatio:  p(quote.current_ratio),
      debtToEquity:  p(quote.debt_to_equity) / 100,
      totalCash:     p(quote.total_cash),
      totalDebt:     p(quote.total_debt),
      freeCashFlow:  p(quote.free_cash_flow),

      // Büyüme
      revenueGrowth:  p(quote.revenue_growth) / 100,
      earningsGrowth: p(quote.earnings_growth) / 100,

      // 52H, beta, dividend — fifty_two_week objesinden
      high52:        p(fw.high) || p(quote.fifty_two_week_high) || 0,
      low52:         p(fw.low)  || p(quote.fifty_two_week_low)  || 0,
      beta:          p(quote.beta),
      dividendYield: p(quote.dividend_yield) / 100,

      // Şirket
      sector:      profile?.sector      || quote.sector      || '',
      industry:    profile?.industry    || quote.industry    || '',
      description: profile?.description || '',
      employees:   p(profile?.employees || quote.employees),
      website:     profile?.website     || quote.website     || '',
      country:     profile?.country     || quote.country     || '',

      // Debug
      _quoteKeys: Object.keys(quote),
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
