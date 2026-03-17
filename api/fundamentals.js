// api/fundamentals.js — TV Scanner tabanlı finansal veriler
// type=metrics   → TradingView Scanner (ücretsiz, tüm borsalar)
// type=news      → Finnhub company-news (API key gerekli)
// type=financials|balance|cashflow → TV'den özet metrics (detaylı tablo mevcut değil)
const https = require('https');

const SUFFIX = { bist:'.IS', nasdaq:'', sp500:'', dax:'.DE', lse:'.L', nikkei:'.T' };
const TV_PATHS = {
  bist:'/turkey/scan', nasdaq:'/america/scan', sp500:'/america/scan',
  dax:'/germany/scan', lse:'/uk/scan', nikkei:'/japan/scan'
};

const TV_FIELDS = [
  'name','close','change','volume','market_cap_basic',
  'price_earnings_ttm','price_book_fq','price_book_ratio','price_sales_current',
  'return_on_equity_fq','return_on_equity','return_on_assets_fq','return_on_assets',
  'net_margin','gross_margin',
  'total_revenue_change_ttm_yoy','revenue_growth_ttm_yoy',
  'earnings_per_share_change_ttm_yoy','earnings_per_share_diluted_ttm',
  'dividends_yield','dividends_yield_current',
  'debt_to_equity_fq','total_debt_to_equity','current_ratio_fq','current_ratio',
  'piotroski_f_score','price_earnings_growth_ttm','beta_1_year',
  'High.1M','Low.1M','52_week_high','52_week_low',
  'Perf.W','Perf.1M','Perf.Y',
];

function tvScan(exchange, symbol) {
  const tvPath = TV_PATHS[exchange] || TV_PATHS.bist;
  const payload = JSON.stringify({
    filter: [{ left: 'name', operation: 'equal', right: symbol }],
    columns: TV_FIELDS,
    range: [0, 1],
    ignore_unknown_fields: true,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'scanner.tradingview.com',
      path: tvPath, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'Accept': 'application/json',
      }
    }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({status:res.statusCode,body:d}));
    });
    req.on('error', reject);
    req.setTimeout(9000, () => { req.destroy(); reject(new Error('TV timeout')); });
    req.write(payload); req.end();
  });
}

const num = v => (v != null && !isNaN(v)) ? parseFloat(parseFloat(v).toFixed(4)) : null;
const pct = v => (v != null && !isNaN(v)) ? parseFloat(parseFloat(v).toFixed(2)) : null;

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

  try {
    // ── HABERLER ─────────────────────────────────────────────────────
    if (type === 'news') {
      const key = process.env.FINHUB_KEY
               || process.env.FINNHUB_KEY
               || process.env.FINNHUB_API_KEY
               || '';
      if (!key) return res.status(200).json({ news: [], info: 'API key yok' });

      const today = new Date();
      const from  = new Date(today - 90*864e5).toISOString().slice(0,10);
      const to    = today.toISOString().slice(0,10);

      const r = await new Promise((resolve, reject) => {
        const req2 = https.request({
          hostname: 'finnhub.io',
          path: `/api/v1/company-news?symbol=${fullSym}&from=${from}&to=${to}&token=${key}`,
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (res2) => {
          let d=''; res2.on('data',c=>d+=c);
          res2.on('end', () => resolve({status:res2.statusCode, body:d}));
        });
        req2.on('error', reject);
        req2.setTimeout(8000, () => { req2.destroy(); reject(new Error('timeout')); });
        req2.end();
      });

      if (r.status === 403) {
        return res.status(200).json({ news: [], info: 'Finnhub BIST için premium gerekli' });
      }

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


    // ── SEKTÖR ORTALAMASI ─────────────────────────────────────────────
    if (type === 'sector_avg') {
      const sector = url.searchParams.get('sector') || '';
      if (!sector) return res.status(400).json({ error: 'sector gerekli' });

      const tvPath = TV_PATHS[ex] || TV_PATHS.bist;
      const avgFields = [
        'price_earnings_ttm', 'price_book_fq', 'price_sales_current',
        'return_on_equity_fq', 'return_on_assets_fq',
        'net_margin', 'gross_margin', 'dividends_yield',
        'debt_to_equity_fq', 'current_ratio_fq',
        'revenue_growth_ttm_yoy', 'price_earnings_growth_ttm',
      ];

      const payload = JSON.stringify({
        filter: [{ left: 'sector', operation: 'equal', right: sector }],
        columns: avgFields,
        range: [0, 100],
        ignore_unknown_fields: true,
      });

      return new Promise(async (resolve) => {
        try {
          const reqBody = payload;
          const r = await new Promise((ok, fail) => {
            const req2 = https.request({
              hostname: 'scanner.tradingview.com',
              path: tvPath, method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(reqBody),
                'User-Agent': 'Mozilla/5.0',
                'Origin': 'https://www.tradingview.com',
                'Referer': 'https://www.tradingview.com/',
              }
            }, (res2) => { let d=''; res2.on('data',c=>d+=c); res2.on('end',()=>ok({status:res2.statusCode,body:d})); });
            req2.on('error', fail);
            req2.setTimeout(9000, () => { req2.destroy(); fail(new Error('timeout')); });
            req2.write(reqBody); req2.end();
          });

          const parsed = JSON.parse(r.body);
          const rows = parsed.data || [];
          if (!rows.length) return res.status(200).json({ avg: {}, count: 0, sector });

          // Her alan için null olmayan değerlerin ortalamasını al
          const sums = {}, counts = {};
          avgFields.forEach(f => { sums[f] = 0; counts[f] = 0; });

          rows.forEach(row => {
            (row.d || []).forEach((v, i) => {
              const f = avgFields[i];
              if (v != null && !isNaN(v)) { sums[f] += parseFloat(v); counts[f]++; }
            });
          });

          const avg = {};
          avgFields.forEach(f => {
            avg[f] = counts[f] > 0 ? parseFloat((sums[f] / counts[f]).toFixed(4)) : null;
          });

          res.status(200).json({
            avg: {
              pe:            avg.price_earnings_ttm,
              pb:            avg.price_book_fq,
              ps:            avg.price_sales_current,
              roe:           avg.return_on_equity_fq,
              roa:           avg.return_on_assets_fq,
              netMargin:     avg.net_margin,
              grossMargin:   avg.gross_margin,
              dividendYield: avg.dividends_yield,
              debtToEquity:  avg.debt_to_equity_fq,
              currentRatio:  avg.current_ratio_fq,
              revenueGrowth: avg.revenue_growth_ttm_yoy,
              peg:           avg.price_earnings_growth_ttm,
            },
            count: rows.length,
            sector,
            exchange: ex,
          });
        } catch(e) {
          res.status(500).json({ error: e.message });
        }
        resolve();
      });
    }

    // ── TV SCANNER — metrics/financials/balance/cashflow ─────────────
    const r    = await tvScan(ex, sym);
    const data = JSON.parse(r.body);
    const row  = data?.data?.[0]?.d || [];

    if (!row.length) {
      return res.status(404).json({ error: 'Hisse bulunamadı: ' + sym, annual:[], quarterly:[] });
    }

    const g = {};
    TV_FIELDS.forEach((f, i) => { g[f] = row[i] ?? null; });

    const metrics = {
      // Değerleme
      pe:           num(g.price_earnings_ttm),
      pb:           num(g.price_book_fq) ?? num(g.price_book_ratio),
      ps:           num(g.price_sales_current),
      peg:          num(g.price_earnings_growth_ttm),
      // Karlılık
      roe:          pct(g.return_on_equity_fq) ?? pct(g.return_on_equity),
      roa:          pct(g.return_on_assets_fq) ?? pct(g.return_on_assets),
      netMargin:    pct(g.net_margin),
      grossMargin:  pct(g.gross_margin),
      // Büyüme
      revenueGrowth: pct(g.total_revenue_change_ttm_yoy) ?? pct(g.revenue_growth_ttm_yoy),
      epsGrowth:     pct(g.earnings_per_share_change_ttm_yoy),
      // Sağlık
      dividendYield: num(g.dividends_yield) ?? num(g.dividends_yield_current),
      debtToEquity:  num(g.debt_to_equity_fq) ?? num(g.total_debt_to_equity),
      currentRatio:  num(g.current_ratio_fq) ?? num(g.current_ratio),
      // Ek
      piotroski:     g.piotroski_f_score != null ? Math.round(g.piotroski_f_score) : null,
      beta:          num(g.beta_1_year),
      high52:        num(g['52_week_high']) ?? num(g['High.1M']),
      low52:         num(g['52_week_low'])  ?? num(g['Low.1M']),
      perfW:         pct(g['Perf.W']),
      perf1M:        pct(g['Perf.1M']),
      perfY:         pct(g['Perf.Y']),
    };

    console.log('TV metrics', sym, 'pe:', metrics.pe, 'roe:', metrics.roe);

    // Tüm tipler için aynı metrics döndür
    // Bilanço/nakit detay tablosu için TV'de veri yok
    return res.status(200).json({
      metrics,
      annual:    [],
      quarterly: [],
      symbol:    fullSym,
      source:    'tradingview',
      _note: type !== 'metrics' ? 'Detaylı tablo TradingView Scanner\'da mevcut değil. Özet metrikler gösteriliyor.' : undefined,
    });

  } catch (e) {
    console.error('fundamentals error:', e.message);
    return res.status(500).json({ error: e.message, annual:[], quarterly:[] });
  }
};
