// api/verify.js — Yahoo Finance ile TV verisi doğrulama
// GET /api/verify?symbol=THYAO&exchange=bist
const https = require('https');

function makeRequest(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.end();
  });
}

// Yahoo suffix map (scan.js ile aynı)
const YAHOO_SUFFIX = {
  bist: '.IS', nasdaq: '', sp500: '', dax: '.DE', lse: '.L', nikkei: '.T'
};

// Yahoo fraction değerleri → % (TV ile uyumlu)
const pct = (v) => (v != null && !isNaN(v)) ? +(v * 100).toFixed(2) : null;
const num = (v) => (v != null && !isNaN(v)) ? +parseFloat(v).toFixed(4) : null;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const url      = new URL(req.url, 'https://x');
  const symbol   = (url.searchParams.get('symbol') || '').toUpperCase().replace('.IS','').replace('.DE','').replace('.L','').replace('.T','');
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();

  if (!symbol) return res.status(400).json({ error: 'symbol gerekli' });

  const suffix  = YAHOO_SUFFIX[exchange] ?? '';
  const yhSym   = symbol + suffix;
  const modules = 'financialData,defaultKeyStatistics,summaryDetail';
  const path    = `/v10/finance/quoteSummary/${encodeURIComponent(yhSym)}?modules=${modules}&corsDomain=finance.yahoo.com&formatted=false`;

  try {
    const raw = await makeRequest('query1.finance.yahoo.com', path, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    const parsed = JSON.parse(raw);
    const r = parsed?.quoteSummary?.result?.[0];
    if (!r) return res.status(404).json({ error: 'Yahoo veri bulunamadı', symbol: yhSym });

    const fd  = r.financialData        || {};
    const ks  = r.defaultKeyStatistics || {};
    const sd  = r.summaryDetail        || {};

    // Yahoo değerleri — TV ile karşılaştırılabilir format
    const yahoo = {
      symbol: yhSym,
      // Değerleme
      pe:         (function() {
      var v = num(sd.trailingPE) ?? num(sd.forwardPE);
      if (v == null && fd.currentPrice && fd.earningsPerShare) v = num(fd.currentPrice / fd.earningsPerShare);
      return v;
    })(),
      pb:         num(ks.priceToBook),
      ps:         num(sd.priceToSalesTrailing12Months),
      // Karlılık (Yahoo fraction → *100 = %)
      roe:        pct(fd.returnOnEquity),
      roa:        pct(fd.returnOnAssets),
      netMargin:  pct(fd.profitMargins),
      grossMargin:pct(fd.grossMargins),
      // Büyüme (Yahoo fraction → *100 = %)
      revenueGrowth: pct(fd.revenueGrowth),
      epsGrowth:     pct(fd.earningsGrowth),
      // Temettü (Yahoo fraction → *100 = %)
      dividendYield: pct(sd.dividendYield),
      // Sağlık
      debtToEquity:  num(fd.debtToEquity),
      currentRatio:  num(fd.currentRatio),
      // Fiyat
      currentPrice:  num(fd.currentPrice),
      targetMeanPrice: num(fd.targetMeanPrice),
      recommendation: fd.recommendationKey || null,
    };

    res.status(200).json({
      source: 'yahoo',
      yahoo,
      _note: 'TV ile karşılaştır: roe/roa/margins *100 yapılmış, debtToEquity ham'
    });

  } catch (e) {
    res.status(500).json({ error: e.message, symbol: yhSym });
  }
};
