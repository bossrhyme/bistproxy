// api/quote.js — Yahoo Finance (crumb auth) proxy
let _crumb = null;
let _cookie = null;
let _crumbFetched = 0;

async function getYahooCrumb() {
  const now = Date.now();
  // 1 saatte bir yenile
  if (_crumb && _cookie && (now - _crumbFetched) < 3600000) {
    return { crumb: _crumb, cookie: _cookie };
  }

  // 1. Cookie al
  const r1 = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    redirect: 'follow',
  });
  const setCookie = r1.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/A1=([^;]+)/);
  if (!cookieMatch) throw new Error('Yahoo cookie alınamadı');
  _cookie = 'A1=' + cookieMatch[1];

  // 2. Crumb al
  const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': _cookie,
    },
  });
  _crumb = await r2.text();
  _crumbFetched = now;
  return { crumb: _crumb, cookie: _cookie };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { sym, ex, type } = req.query;
  if (!sym) return res.status(400).json({ error: 'sym required' });

  // Exchange → Yahoo sembol suffix
  const suffixMap = { bist: '.IS', nasdaq: '', sp500: '', dax: '.DE', lse: '.L', nikkei: '.T' };
  const suffix = suffixMap[ex] ?? '';
  const ySym = sym.toUpperCase().endsWith(suffix.toUpperCase()) ? sym : sym + suffix;

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  try {
    const { crumb, cookie } = await getYahooCrumb();
    const headers = { 'User-Agent': UA, 'Cookie': cookie, 'Accept': 'application/json' };

    if (type === 'news') {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ySym)}&newsCount=5&quotesCount=0&crumb=${encodeURIComponent(crumb)}`,
        { headers }
      );
      const j = await r.json();
      return res.json({ news: j.news || [] });
    }

    // quoteSummary — tüm fundamental veriler
    const modules = 'price,summaryDetail,defaultKeyStatistics,financialData,assetProfile';
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(crumb)}`;
    const r = await fetch(url, { headers });

    if (!r.ok) {
      return res.status(r.status).json({ error: `Yahoo ${r.status}: ${ySym}` });
    }

    const json = await r.json();
    const result = json?.quoteSummary?.result?.[0];
    if (!result) return res.status(404).json({ error: 'Veri bulunamadı: ' + ySym });

    const price   = result.price            || {};
    const summary = result.summaryDetail    || {};
    const stats   = result.defaultKeyStatistics || {};
    const fin     = result.financialData    || {};
    const profile = result.assetProfile     || {};

    const g = (obj, key) => { const v = obj[key]?.raw; return (v !== undefined && !isNaN(v)) ? v : 0; };

    return res.json({
      symbol:        sym,
      name:          price.longName || price.shortName || sym,
      price:         g(price, 'regularMarketPrice'),
      change:        g(price, 'regularMarketChange'),
      changePct:     g(price, 'regularMarketChangePercent'),
      currency:      price.currency || '',
      marketCap:     g(price, 'marketCap'),
      volume:        g(price, 'regularMarketVolume'),
      avgVolume:     g(summary, 'averageVolume'),

      pe:            g(summary, 'trailingPE')  || g(stats, 'trailingPE'),
      forwardPE:     g(summary, 'forwardPE')   || g(stats, 'forwardPE'),
      pb:            g(stats, 'priceToBook'),
      ps:            g(stats, 'priceToSalesTrailing12Months'),
      peg:           g(stats, 'pegRatio'),
      evEbitda:      g(stats, 'enterpriseToEbitda'),

      roe:           g(fin, 'returnOnEquity'),
      roa:           g(fin, 'returnOnAssets'),
      netMargin:     g(fin, 'profitMargins'),
      grossMargin:   g(fin, 'grossMargins'),
      opMargin:      g(fin, 'operatingMargins'),

      currentRatio:  g(fin, 'currentRatio'),
      debtToEquity:  g(fin, 'debtToEquity') ? g(fin, 'debtToEquity') / 100 : 0,
      totalCash:     g(fin, 'totalCash'),
      totalDebt:     g(fin, 'totalDebt'),
      freeCashFlow:  g(fin, 'freeCashflow'),

      revenueGrowth:  g(fin, 'revenueGrowth'),
      earningsGrowth: g(fin, 'earningsGrowth'),

      high52:        g(summary, 'fiftyTwoWeekHigh') || g(stats, 'fiftyTwoWeekHigh'),
      low52:         g(summary, 'fiftyTwoWeekLow')  || g(stats, 'fiftyTwoWeekLow'),
      beta:          g(summary, 'beta') || g(stats, 'beta'),
      dividendYield: g(summary, 'dividendYield') || g(summary, 'trailingAnnualDividendYield'),

      sector:      profile.sector   || '',
      industry:    profile.industry || '',
      description: profile.longBusinessSummary || '',
      employees:   profile.fullTimeEmployees   || 0,
      website:     profile.website || '',
      country:     profile.country || '',
    });

  } catch (e) {
    // Crumb expire olduysa sıfırla
    _crumb = null; _cookie = null;
    return res.status(500).json({ error: e.message });
  }
}
