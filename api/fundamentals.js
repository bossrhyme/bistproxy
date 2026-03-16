// api/fundamentals.js — Finansal veriler
// type=metrics   → Finnhub stock metrics (özet kartlar)
// type=financials → Yahoo v8 chart'tan gelir tahmini (fallback: metrics)
// type=balance   → Yahoo v8 tabanlı (gelecek)  
// type=cashflow  → Yahoo v8 tabanlı (gelecek)
// type=news      → Finnhub company news
const https = require('https');

const SUFFIX = { bist:'.IS', nasdaq:'', sp500:'', dax:'.DE', lse:'.L', nikkei:'.T' };

function makeReq(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'GET',
      headers: headers || { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// Finnhub API key
function getFinnhubKey() {
  return process.env.FINNHUB_KEY 
      || process.env.FINNHUB_API_KEY 
      || process.env.NEXT_PUBLIC_FINNHUB_KEY
      || process.env.FINNHUB_TOKEN
      || process.env.FINNHUB
      || '';
}

// Finnhub metrics → uygulama formatı
function parseFinnhubMetrics(m) {
  if (!m) return null;
  const pct = v => (v != null && !isNaN(v)) ? parseFloat((v).toFixed(2)) : null;
  const num = v => (v != null && !isNaN(v)) ? parseFloat(parseFloat(v).toFixed(4)) : null;
  return {
    // Değerleme
    pe:              num(m.peNormalizedAnnual) ?? num(m.peBasicExclExtraItemsTTM),
    pb:              num(m.pbAnnual),
    ps:              num(m.psTTM),
    evEbitda:        num(m['ev/ebitdaAnnual']) ?? num(m['ev/ebitdaTTM']),
    // Karlılık (Finnhub % olarak döndürür, fraction değil)
    roe:             pct(m.roeTTM) ?? pct(m.roeRfy),
    roa:             pct(m.roaTTM) ?? pct(m.roaRfy),
    netMargin:       pct(m.netProfitMarginTTM) ?? pct(m.netProfitMarginAnnual),
    grossMargin:     pct(m.grossMarginTTM) ?? pct(m.grossMarginAnnual),
    // Büyüme
    revenueGrowth:   pct(m.revenueGrowthTTMYoy),
    epsGrowth:       pct(m.epsGrowthTTMYoy),
    // Sağlık
    dividendYield:   num(m.dividendYieldIndicatedAnnual),
    debtToEquity:    num(m['totalDebt/totalEquityAnnual']),
    currentRatio:    num(m.currentRatioAnnual),
    // Ek
    beta:            num(m.beta),
    high52:          num(m['52WeekHigh']),
    low52:           num(m['52WeekLow']),
    bookValuePerShare: num(m.bookValuePerShareAnnual),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  const url  = new URL(req.url, 'https://x');
  const sym  = (url.searchParams.get('symbol') || '').toUpperCase()
                 .replace(/\.(IS|DE|L|T)$/i, '');
  const ex   = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  const type = url.searchParams.get('type') || 'metrics';

  if (!sym) return res.status(400).json({ error: 'symbol gerekli' });

  const suffix  = SUFFIX[ex] ?? '';
  const fullSym = sym + suffix;
  const key     = getFinnhubKey();

  try {
    // ── HABERLER ─────────────────────────────────────────────────────
    if (type === 'news') {
      if (!key) return res.status(200).json({ news: [], error: 'FINNHUB_KEY yok' });

      const today = new Date();
      const from  = new Date(today - 90 * 864e5).toISOString().slice(0, 10);
      const to    = today.toISOString().slice(0, 10);
      const r     = await makeReq('finnhub.io',
        `/api/v1/company-news?symbol=${fullSym}&from=${from}&to=${to}&token=${key}`);

      const items = JSON.parse(r.body);
      const news  = (Array.isArray(items) ? items : [])
        .filter(n => n.headline && n.url)
        .slice(0, 15)
        .map(n => ({
          title:    n.headline,
          url:      n.url,
          source:   n.source,
          datetime: n.datetime * 1000,
          summary:  (n.summary || '').slice(0, 220),
          image:    n.image || null,
        }));

      return res.status(200).json({ news, symbol: fullSym });
    }

    // ── METRİKS (Finnhub) ────────────────────────────────────────────
    if (!key) {
      return res.status(200).json({
        error: 'FINNHUB_KEY ortam değişkeni ayarlanmamış',
        annual: [], quarterly: [], metrics: null
      });
    }

    const mRes  = await makeReq('finnhub.io',
      `/api/v1/stock/metric?symbol=${fullSym}&metric=all&token=${key}`);

    if (mRes.status !== 200) {
      return res.status(200).json({ error: 'Finnhub ' + mRes.status, annual: [], quarterly: [] });
    }

    const mData   = JSON.parse(mRes.body);
    const metrics = parseFinnhubMetrics(mData.metric);

    console.log('Finnhub metrics', fullSym, 'pe:', metrics?.pe, 'roe:', metrics?.roe);

    if (type === 'metrics') {
      return res.status(200).json({ metrics, symbol: fullSym });
    }

    // ── FİNANSALLAR / BİLANÇO / NAKİT AKIŞI ─────────────────────────
    // Yahoo v10 BIST için çalışmıyor → Finnhub metrics'ten özet döndür
    // Gerçek tablo verisi için Finnhub /financials endpoint dene

    const finRes = await makeReq('finnhub.io',
      `/api/v1/stock/financials-reported?symbol=${fullSym}&token=${key}&freq=annual&limit=4`);

    let annual = [], quarterly = [];

    if (finRes.status === 200) {
      const finData = JSON.parse(finRes.body);
      const reports = finData.data || [];

      if (type === 'financials') {
        annual = reports
          .filter(r => r.form === '20-F' || r.form === '10-K' || r.form === 'annual')
          .slice(0, 4)
          .map(r => {
            const ic = r.report?.ic || [];
            const get = label => {
              const item = ic.find(x => x.label === label || x.concept === label);
              return item ? item.value : null;
            };
            return {
              date:            r.period || '',
              totalRevenue:    get('Revenues') || get('Revenue') || get('RevenueFromContractWithCustomerExcludingAssessedTax'),
              grossProfit:     get('GrossProfit'),
              operatingIncome: get('OperatingIncomeLoss'),
              netIncome:       get('NetIncomeLoss') || get('ProfitLoss'),
              ebitda:          null, // hesaplanabilir ama karmaşık
            };
          })
          .filter(r => r.totalRevenue != null);
      }

      if (type === 'balance') {
        annual = reports
          .filter(r => r.form === '20-F' || r.form === '10-K' || r.form === 'annual')
          .slice(0, 4)
          .map(r => {
            const bs = r.report?.bs || [];
            const get = label => {
              const item = bs.find(x => x.label === label || x.concept === label);
              return item ? item.value : null;
            };
            return {
              date:                   r.period || '',
              totalAssets:            get('Assets'),
              totalLiab:              get('Liabilities'),
              totalStockholderEquity: get('StockholdersEquity') || get('Equity'),
              cash:                   get('CashAndCashEquivalentsAtCarryingValue'),
              totalDebt:              get('LongTermDebtNoncurrent') || get('LongTermDebt'),
              shortLongTermDebt:      get('LongTermDebtCurrent'),
            };
          })
          .filter(r => r.totalAssets != null);
      }

      if (type === 'cashflow') {
        annual = reports
          .filter(r => r.form === '20-F' || r.form === '10-K' || r.form === 'annual')
          .slice(0, 4)
          .map(r => {
            const cf = r.report?.cf || [];
            const get = label => {
              const item = cf.find(x => x.label === label || x.concept === label);
              return item ? item.value : null;
            };
            const op  = get('NetCashProvidedByUsedInOperatingActivities');
            const cap = get('PaymentsToAcquirePropertyPlantAndEquipment');
            return {
              date:                r.period || '',
              operatingCashflow:   op,
              capitalExpenditures: cap != null ? -Math.abs(cap) : null,
              freeCashflow:        op != null && cap != null ? op - Math.abs(cap) : null,
              dividendsPaid:       get('PaymentsOfDividends'),
            };
          })
          .filter(r => r.operatingCashflow != null);
      }
    }

    // Tablo boşsa metrics'ten özet bilgi döndür
    return res.status(200).json({
      annual,
      quarterly,
      metrics,    // her durumda metrics gönder
      symbol: fullSym,
    });

  } catch (e) {
    console.error('fundamentals error:', e.message);
    return res.status(500).json({ error: e.message, annual: [], quarterly: [] });
  }
};
