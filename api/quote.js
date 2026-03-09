// api/quote.js — Yahoo Finance proxy
// Kullanım: /api/quote?sym=TUPRS.IS&modules=price,financialData,...

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { sym, type } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  try {
    let data = {};

    if (type === 'news') {
      // Haberler
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&newsCount=5&quotesCount=0`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      const json = await r.json();
      return res.json({ news: json.news || [] });
    }

    // quoteSummary — tüm fundamental veriler
    const modules = 'price,summaryDetail,defaultKeyStatistics,financialData,assetProfile';
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: `Yahoo returned ${r.status}` });
    }

    const json = await r.json();
    const result = json?.quoteSummary?.result?.[0];
    if (!result) return res.status(404).json({ error: 'No data' });

    const price   = result.price || {};
    const summary = result.summaryDetail || {};
    const stats   = result.defaultKeyStatistics || {};
    const fin     = result.financialData || {};
    const profile = result.assetProfile || {};

    data = {
      // Fiyat
      symbol:       sym,
      name:         price.longName || price.shortName || sym,
      price:        price.regularMarketPrice?.raw || 0,
      change:       price.regularMarketChange?.raw || 0,
      changePct:    price.regularMarketChangePercent?.raw || 0,
      currency:     price.currency || '',
      marketCap:    price.marketCap?.raw || 0,
      volume:       price.regularMarketVolume?.raw || 0,
      avgVolume:    summary.averageVolume?.raw || 0,
      
      // Değerleme
      pe:           summary.trailingPE?.raw || stats.trailingPE?.raw || 0,
      forwardPE:    summary.forwardPE?.raw || 0,
      pb:           stats.priceToBook?.raw || 0,
      ps:           stats.priceToSalesTrailing12Months?.raw || 0,
      peg:          stats.pegRatio?.raw || 0,
      evEbitda:     stats.enterpriseToEbitda?.raw || 0,
      
      // Karlılık
      roe:          fin.returnOnEquity?.raw || 0,
      roa:          fin.returnOnAssets?.raw || 0,
      netMargin:    fin.profitMargins?.raw || 0,
      grossMargin:  fin.grossMargins?.raw || 0,
      opMargin:     fin.operatingMargins?.raw || 0,
      
      // Bilanço
      currentRatio: fin.currentRatio?.raw || 0,
      debtToEquity: fin.debtToEquity?.raw ? fin.debtToEquity.raw / 100 : 0,
      totalCash:    fin.totalCash?.raw || 0,
      totalDebt:    fin.totalDebt?.raw || 0,
      freeCashFlow: fin.freeCashflow?.raw || 0,
      
      // Büyüme
      revenueGrowth:  fin.revenueGrowth?.raw || 0,
      earningsGrowth: fin.earningsGrowth?.raw || 0,
      
      // Fiyat aralığı
      high52:       summary.fiftyTwoWeekHigh?.raw || stats.fiftyTwoWeekHigh?.raw || 0,
      low52:        summary.fiftyTwoWeekLow?.raw  || stats.fiftyTwoWeekLow?.raw  || 0,
      beta:         summary.beta?.raw || stats.beta?.raw || 0,
      dividendYield: summary.dividendYield?.raw || summary.trailingAnnualDividendYield?.raw || 0,
      
      // Şirket
      sector:       profile.sector || '',
      industry:     profile.industry || '',
      description:  profile.longBusinessSummary || '',
      employees:    profile.fullTimeEmployees || 0,
      website:      profile.website || '',
      country:      profile.country || '',
    };

    return res.json(data);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
