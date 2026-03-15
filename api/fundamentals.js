// api/fundamentals.js — Yahoo Finance bilanço, gelir tablosu, nakit akışı, haberler
// GET /api/fundamentals?symbol=KCHOL&exchange=bist&type=financials|balance|cashflow|news
const https = require('https');

const SUFFIX = { bist:'.IS', nasdaq:'', sp500:'', dax:'.DE', lse:'.L', nikkei:'.T' };

function yhFetch(path, altHost) {
  const hostname = altHost || 'query1.finance.yahoo.com';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        // query2 mirror dene
        if (res.statusCode === 429 && !altHost) {
          yhFetch(path, 'query2.finance.yahoo.com').then(resolve).catch(reject);
        } else {
          resolve(d);
        }
      });
    });
    req.on('error', err => {
      // query2 mirror dene
      if (!altHost) {
        yhFetch(path, 'query2.finance.yahoo.com').then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Yahoo timeout')); });
    req.end();
  });
}

// Milyon/Milyar formatla
function fmt(v) {
  if (v == null || isNaN(v)) return null;
  return v; // raw sayı gönder, frontend formatlar
}

// Yahoo quarterly/annual gelir tablosu parse
function parseIncome(stmts) {
  if (!stmts || !Array.isArray(stmts)) return [];
  return stmts.map(function(s) {
    // formatted=false: direkt sayı; formatted=true: {raw, fmt}
    var v = function(x) { return x && typeof x === 'object' ? x.raw : x; };
    var d = s.endDate; var dateStr = d && typeof d === 'object' ? d.fmt : d;
    return {
      date:            dateStr || '',
      totalRevenue:    fmt(v(s.totalRevenue)),
      grossProfit:     fmt(v(s.grossProfit)),
      operatingIncome: fmt(v(s.operatingIncome)),
      netIncome:       fmt(v(s.netIncome)),
      ebitda:          fmt(v(s.ebitda)),
    };
  });
}

// Yahoo bilanço parse
function parseBalance(stmts) {
  if (!stmts || !Array.isArray(stmts)) return [];
  return stmts.map(function(s) {
    var v = function(x) { return x && typeof x === 'object' ? x.raw : x; };
    var d = s.endDate; var dateStr = d && typeof d === 'object' ? d.fmt : d;
    return {
      date:                   dateStr || '',
      totalAssets:            fmt(v(s.totalAssets)),
      totalLiab:              fmt(v(s.totalLiab)),
      totalStockholderEquity: fmt(v(s.totalStockholderEquity)),
      cash:                   fmt(v(s.cash)),
      totalDebt:              fmt(v(s.longTermDebt)),
      shortLongTermDebt:      fmt(v(s.shortLongTermDebt)),
    };
  });
}

// Yahoo nakit akışı parse
function parseCashflow(stmts) {
  if (!stmts || !Array.isArray(stmts)) return [];
  return stmts.map(function(s) {
    var v = function(x) { return x && typeof x === 'object' ? x.raw : x; };
    var d = s.endDate; var dateStr = d && typeof d === 'object' ? d.fmt : d;
    var op  = v(s.totalCashFromOperatingActivities) || 0;
    var cap = v(s.capitalExpenditures) || 0;
    return {
      date:                dateStr || '',
      operatingCashflow:   fmt(op),
      capitalExpenditures: fmt(cap),
      freeCashflow:        fmt(op + cap),
      dividendsPaid:       fmt(v(s.dividendsPaid)),
    };
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  const url  = new URL(req.url, 'https://x');
  const sym  = (url.searchParams.get('symbol') || '').toUpperCase()
                 .replace(/\.(IS|DE|L|T)$/i, '');
  const ex   = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  const type = url.searchParams.get('type') || 'financials';

  if (!sym) return res.status(400).json({ error: 'symbol gerekli' });

  const suffix = SUFFIX[ex] ?? '';
  const yhSym  = encodeURIComponent(sym + suffix);

  try {
    if (type === 'news') {
      // Finnhub haberler (API key var)
      const finnhubKey = process.env.FINNHUB_KEY || process.env.FINNHUB_API_KEY || '';
      if (!finnhubKey) return res.status(200).json({ news: [] });

      const today = new Date();
      const from  = new Date(today - 90 * 864e5).toISOString().slice(0, 10);
      const to    = today.toISOString().slice(0, 10);
      const newsPath = `/api/v1/company-news?symbol=${sym + suffix}&from=${from}&to=${to}&token=${finnhubKey}`;

      const raw = await new Promise((resolve, reject) => {
        const r = https.request({
          hostname: 'finnhub.io', path: newsPath, method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); });
        r.on('error', reject);
        r.setTimeout(8000, () => { r.destroy(); reject(new Error('timeout')); });
        r.end();
      });

      const items = JSON.parse(raw);
      const news = (Array.isArray(items) ? items : [])
        .filter(n => n.headline && n.url)
        .slice(0, 15)
        .map(n => ({
          title:    n.headline,
          url:      n.url,
          source:   n.source,
          datetime: n.datetime * 1000, // ms
          summary:  n.summary?.slice(0, 200),
          image:    n.image || null,
        }));

      return res.status(200).json({ news, symbol: sym + suffix });
    }

    // Yahoo Finance finansal tablolar
    const moduleMap = {
      financials: 'incomeStatementHistory,incomeStatementHistoryQuarterly',
      balance:    'balanceSheetHistory,balanceSheetHistoryQuarterly',
      cashflow:   'cashflowStatementHistory,cashflowStatementHistoryQuarterly',
      all:        'incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,incomeStatementHistoryQuarterly',
    };
    const modules = moduleMap[type] || moduleMap.financials;
    const path = `/v10/finance/quoteSummary/${yhSym}?modules=${modules}&formatted=false`;

    const raw = await yhFetch(path);
    const parsed = JSON.parse(raw);
    const r = parsed?.quoteSummary?.result?.[0];
    if (!r) return res.status(404).json({ error: 'Veri bulunamadı', symbol: sym + suffix });

    if (type === 'financials') {
      const annInc = r.incomeStatementHistory?.incomeStatementHistory;
      const qtrInc = r.incomeStatementHistoryQuarterly?.incomeStatementHistory;
      console.log('financials annInc:', Array.isArray(annInc) ? annInc.length : typeof annInc);
      return res.status(200).json({
        annual:    parseIncome(annInc),
        quarterly: parseIncome(qtrInc),
        symbol: sym + suffix,
        _debug: { annCount: annInc?.length || 0, qtrCount: qtrInc?.length || 0 },
      });
    }
    if (type === 'balance') {
      const annStmts = r.balanceSheetHistory?.balanceSheetStatements;
      const qtrStmts = r.balanceSheetHistoryQuarterly?.balanceSheetStatements;
      console.log('balance annStmts:', Array.isArray(annStmts) ? annStmts.length : typeof annStmts);
      return res.status(200).json({
        annual:    parseBalance(annStmts),
        quarterly: parseBalance(qtrStmts),
        symbol: sym + suffix,
        _debug: { annCount: annStmts?.length || 0, qtrCount: qtrStmts?.length || 0 },
      });
    }
    if (type === 'cashflow') {
      const annCf = r.cashflowStatementHistory?.cashflowStatements;
      const qtrCf = r.cashflowStatementHistoryQuarterly?.cashflowStatements;
      console.log('cashflow annCf:', Array.isArray(annCf) ? annCf.length : typeof annCf);
      return res.status(200).json({
        annual:    parseCashflow(annCf),
        quarterly: parseCashflow(qtrCf),
        symbol: sym + suffix,
        _debug: { annCount: annCf?.length || 0, qtrCount: qtrCf?.length || 0 },
      });
    }

  } catch (e) {
    console.error('fundamentals error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
