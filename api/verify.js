// api/verify.js — Finnhub ile TV verisi doğrulama
const https = require('https');
const SUFFIX = { bist:'.IS', nasdaq:'', sp500:'', dax:'.DE', lse:'.L', nikkei:'.T' };

function makeReq(hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(9000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

const num = v => (v != null && !isNaN(v)) ? parseFloat(parseFloat(v).toFixed(4)) : null;
const pct = v => (v != null && !isNaN(v)) ? parseFloat((v).toFixed(2)) : null;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const url      = new URL(req.url, 'https://x');
  const sym      = (url.searchParams.get('symbol') || '').toUpperCase().replace(/\.(IS|DE|L|T)$/i,'');
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();

  if (!sym) return res.status(400).json({ error: 'symbol gerekli' });

  const key = process.env.FINNHUB_KEY || process.env.FINNHUB_API_KEY || '';
  if (!key) return res.status(200).json({ error: 'FINNHUB_KEY yok', yahoo: null });

  const fullSym = sym + (SUFFIX[exchange] ?? '');

  try {
    const r = await makeReq('finnhub.io',
      `/api/v1/stock/metric?symbol=${fullSym}&metric=all&token=${key}`);

    if (r.status !== 200) {
      return res.status(200).json({ error: 'Finnhub ' + r.status, yahoo: null });
    }

    const data = JSON.parse(r.body);
    const m    = data.metric || {};

    const yahoo = {
      symbol: fullSym,
      source: 'finnhub',
      // Değerleme
      pe:           num(m.peNormalizedAnnual) ?? num(m.peBasicExclExtraItemsTTM),
      pb:           num(m.pbAnnual),
      ps:           num(m.psTTM),
      // Karlılık (Finnhub zaten % döndürür)
      roe:          pct(m.roeTTM) ?? pct(m.roeRfy),
      roa:          pct(m.roaTTM) ?? pct(m.roaRfy),
      netMargin:    pct(m.netProfitMarginTTM),
      grossMargin:  pct(m.grossMarginTTM),
      // Büyüme
      revenueGrowth: pct(m.revenueGrowthTTMYoy),
      epsGrowth:     pct(m.epsGrowthTTMYoy),
      // Sağlık
      dividendYield: num(m.dividendYieldIndicatedAnnual),
      debtToEquity:  num(m['totalDebt/totalEquityAnnual']),
      currentRatio:  num(m.currentRatioAnnual),
    };

    res.status(200).json({ source: 'finnhub', yahoo, symbol: fullSym });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
