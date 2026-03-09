// api/quote.js — Yahoo Finance proxy v2
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { sym, type } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com/',
    'Cache-Control': 'no-cache',
  };

  try {
    if (type === 'news') {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&newsCount=5&quotesCount=0&enableFuzzyQuery=false`;
      const r = await fetch(url, { headers });
      if (!r.ok) return res.json({ news: [] });
      const json = await r.json();
      return res.json({ news: json.news || [] });
    }

    // v11/finance/quoteSummary — daha güncel endpoint
    const modules = 'price,summaryDetail,defaultKeyStatistics,financialData,assetProfile';
    const url = `https://query2.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${encodeURIComponent(modules)}&corsDomain=finance.yahoo.com&crumb=`;

    const r = await fetch(url, { headers });

    if (!r.ok) {
      // Fallback: v10
      const url2 = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${encodeURIComponent(modules)}`;
      const r2 = await fetch(url2, { headers });
      if (!r2.ok) return res.status(r2.status).json({ error: `Yahoo returned ${r2.status}` });
      const json2 = await r2.json();
      return res.json(parseYahoo(json2, sym));
    }

    const json = await r.json();
    return res.json(parseYahoo(json, sym));

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function parseYahoo(json, sym) {
  const result = json?.quoteSummary?.result?.[0];
  if (!result) return { error: 'No data', raw: json };

  const price   = result.price || {};
  const summary = result.summaryDetail || {};
  const stats   = result.defaultKeyStatistics || {};
  const fin     = result.financialData || {};
  const profile = result.assetProfile || {};

  return {
    symbol:        sym,
    name:          price.longName || price.shortName || sym,
    price:         price.regularMarketPrice?.raw || 0,
    change:        price.regularMarketChange?.raw || 0,
    changePct:     price.regularMarketChangePercent?.raw || 0,
    currency:      price.currency || '',
    marketCap:     price.marketCap?.raw || 0,
    volume:        price.regularMarketVolume?.raw || 0,
    avgVolume:     summary.averageVolume?.raw || 0,
    pe:            summary.trailingPE?.raw || stats.trailingPE?.raw || 0,
    forwardPE:     summary.forwardPE?.raw || stats.forwardPE?.raw || 0,
    pb:            stats.priceToBook?.raw || 0,
    ps:            stats.priceToSalesTrailing12Months?.raw || 0,
    peg:           stats.pegRatio?.raw || 0,
    roe:           fin.returnOnEquity?.raw || 0,
    roa:           fin.returnOnAssets?.raw || 0,
    netMargin:     fin.profitMargins?.raw || 0,
    grossMargin:   fin.grossMargins?.raw || 0,
    opMargin:      fin.operatingMargins?.raw || 0,
    currentRatio:  fin.currentRatio?.raw || 0,
    debtToEquity:  fin.debtToEquity?.raw ? fin.debtToEquity.raw / 100 : 0,
    totalCash:     fin.totalCash?.raw || 0,
    totalDebt:     fin.totalDebt?.raw || 0,
    freeCashFlow:  fin.freeCashflow?.raw || 0,
    revenueGrowth: fin.revenueGrowth?.raw || 0,
    earningsGrowth:fin.earningsGrowth?.raw || 0,
    high52:        summary.fiftyTwoWeekHigh?.raw || stats.fiftyTwoWeekHigh?.raw || 0,
    low52:         summary.fiftyTwoWeekLow?.raw  || stats.fiftyTwoWeekLow?.raw  || 0,
    beta:          summary.beta?.raw || stats.beta?.raw || 0,
    dividendYield: summary.dividendYield?.raw || summary.trailingAnnualDividendYield?.raw || 0,
    sector:        profile.sector || '',
    industry:      profile.industry || '',
    description:   profile.longBusinessSummary || '',
    employees:     profile.fullTimeEmployees || 0,
    website:       profile.website || '',
    country:       profile.country || '',
  };
}
