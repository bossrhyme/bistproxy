// api/twelvedata-test.js
// Twelve Data API test endpoint — BIST + global hisse verisi
// Env: TWELVEDATA_API_KEY (Vercel dashboard > Environment Variables)
//
// Test tipleri:
//   GET /api/td-test?test=stocks          → BIST hisse listesi
//   GET /api/td-test?test=quote&sym=THYAO → Tekil fiyat/özet
//   GET /api/td-test?test=stats&sym=THYAO → Temel veri (F/K, ROE, piyasa değeri...)
//   GET /api/td-test?test=batch&syms=THYAO,AKBNK,GARAN → Toplu fiyat
//   GET /api/td-test?test=screen          → Tarama testi (50 BIST hissesi)
//   GET /api/td-test?test=compare         → Mevcut TV verisiyle karşılaştırma

const TD_BASE = 'https://api.twelvedata.com';

// Yaygın BIST hisseleri — tarama testi için
const BIST_SAMPLE = [
  'THYAO','AKBNK','GARAN','ISCTR','EREGL','KCHOL','SISE','BIMAS',
  'ASELS','TOASO','TUPRS','PETKM','KOZAL','FROTO','VESTL','DOHOL',
  'SAHOL','TTKOM','TCELL','ENKAI','ARCLK','OTKAR','BRISA','AGHOL',
  'AEFES','ALARK','EKGYO','ULKER','TAVHL','HALKB','VAKBN','YKBNK',
  'SASA','TKFEN','CCOLA','MGROS','OYAKC','PGSUS','CIMSA','NETAS',
  'LOGO','KRDMD','BIZIM','TURSG','ADEL','INDES','TSKB','DOAS','ASUZU','GUBRF'
];

async function tdFetch(path) {
  const key = process.env.TWELVEDATA_API_KEY || 'demo';
  const sep = path.includes('?') ? '&' : '?';
  const url = `${TD_BASE}${path}${sep}apikey=${key}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DeepFin-Test/1.0' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`TD HTTP ${res.status}`);
  return res.json();
}

// ── Test 1: BIST Hisse Listesi ─────────────────
async function testStocks() {
  const data = await tdFetch('/stocks?country=Turkey&exchange=BIST&type=Common Stock');
  return {
    test: 'stocks',
    status: data.status || 'ok',
    count: data.data?.length || 0,
    sample: data.data?.slice(0, 10).map(s => ({
      symbol: s.symbol, name: s.name, exchange: s.exchange, currency: s.currency
    })),
    raw_status: data.status,
    message: data.message || null
  };
}

// ── Test 2: Tekil Fiyat/Özet ───────────────────
async function testQuote(sym) {
  const data = await tdFetch(`/quote?symbol=${sym}&exchange=BIST`);
  return {
    test: 'quote',
    symbol: sym,
    available: !data.code,
    price: data.close,
    change_pct: data.percent_change,
    volume: data.volume,
    market_cap: data.market_cap,
    pe: data.pe,
    week52_high: data['fifty_two_week']?.high,
    week52_low: data['fifty_two_week']?.low,
    raw: data.code ? { error: data.message } : null
  };
}

// ── Test 3: Temel Veri (statistics endpoint) ───
async function testStats(sym) {
  const data = await tdFetch(`/statistics?symbol=${sym}&exchange=BIST`);
  const v = data.statistics?.valuations_metrics || {};
  const fin = data.statistics?.financials || {};
  const inc = fin.income_statement || {};
  const bal = fin.balance_sheet || {};
  return {
    test: 'stats',
    symbol: sym,
    available: !data.code,
    // Değerleme
    pe_ratio: v.trailing_pe,
    pb_ratio: v.price_to_book_mrq,
    ps_ratio: v.price_to_sales_ttm,
    peg_ratio: v.peg_ratio,
    market_cap: v.market_capitalization,
    enterprise_value: v.enterprise_value,
    // Karlılık
    profit_margin: inc.profit_margin,
    operating_margin: inc.operating_margin,
    roe: fin.return_on_equity_ttm,
    roa: fin.return_on_assets_ttm,
    // Büyüme
    revenue_growth: inc.quarterly_revenue_growth_yoy,
    earnings_growth: inc.quarterly_earnings_growth_yoy,
    // Bilanço
    current_ratio: bal.current_ratio_mrq,
    debt_to_equity: bal.total_debt_to_equity_mrq,
    // Temettü
    dividend_yield: v.forward_annual_dividend_yield,
    raw_error: data.code ? data.message : null
  };
}

// ── Test 4: Toplu Fiyat (batch) ────────────────
async function testBatch(symsStr) {
  const syms = (symsStr || 'THYAO,AKBNK,GARAN').split(',').slice(0, 10);
  const joined = syms.map(s => `${s}:BIST`).join(',');
  const data = await tdFetch(`/quote?symbol=${joined}`);
  // Tek sembol → obje, çoklu → obje of objects
  const results = Array.isArray(data) ? data : (data.code ? [] : Object.values(data));
  return {
    test: 'batch',
    requested: syms.length,
    received: results.filter(r => !r.code).length,
    failed: results.filter(r => r.code).length,
    data: results.map(r => ({
      symbol: r.symbol,
      price: r.close,
      change_pct: r.percent_change,
      market_cap: r.market_cap,
      pe: r.pe,
      error: r.code ? r.message : null
    }))
  };
}

// ── Test 5: Tarama Testi (50 hisse fundamentals) ─
async function testScreen() {
  const t0 = Date.now();
  // Twelve Data batch quote — tüm semboller tek istekte
  const joined = BIST_SAMPLE.map(s => `${s}:BIST`).join(',');
  const data = await tdFetch(`/quote?symbol=${joined}`);
  const elapsed = Date.now() - t0;

  const rows = Object.values(data);
  const ok = rows.filter(r => !r.code);
  const fields = ok.length > 0 ? Object.keys(ok[0]) : [];

  return {
    test: 'screen',
    elapsed_ms: elapsed,
    requested: BIST_SAMPLE.length,
    received: ok.length,
    failed: rows.filter(r => r.code).length,
    fields_available: fields,
    has_pe: fields.includes('pe'),
    has_market_cap: fields.includes('market_cap'),
    sample: ok.slice(0, 5).map(r => ({
      symbol: r.symbol,
      price: r.close,
      change_pct: r.percent_change,
      pe: r.pe,
      market_cap: r.market_cap
    }))
  };
}

// ── Test 6: Mevcut TV ile Karşılaştırma ────────
async function testCompare() {
  // Aynı hisse için hem TD hem de mevcut /api/fundamentals'ı çağır
  const sym = 'THYAO';
  const [tdData, tvData] = await Promise.allSettled([
    testStats(sym),
    fetch(`https://deepfin.vercel.app/api/fundamentals?exchange=bist&symbol=${sym}`)
      .then(r => r.json()).catch(() => null)
  ]);

  return {
    test: 'compare',
    symbol: sym,
    twelve_data: tdData.status === 'fulfilled' ? tdData.value : { error: tdData.reason?.message },
    current_tv: tvData.status === 'fulfilled' ? tvData.value : { error: 'could not fetch' },
    note: 'TV = mevcut TradingView Scanner (gayriresmi), TD = Twelve Data (ticari lisanslı)'
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const test = req.query?.test || 'stocks';
  const sym  = (req.query?.sym  || 'THYAO').toUpperCase();
  const syms = req.query?.syms || 'THYAO,AKBNK,GARAN';

  const apiKey = process.env.TWELVEDATA_API_KEY;
  const usingDemo = !apiKey;

  try {
    let result;
    if      (test === 'stocks')  result = await testStocks();
    else if (test === 'quote')   result = await testQuote(sym);
    else if (test === 'stats')   result = await testStats(sym);
    else if (test === 'batch')   result = await testBatch(syms);
    else if (test === 'screen')  result = await testScreen();
    else if (test === 'compare') result = await testCompare();
    else result = { error: 'Geçersiz test. Seçenekler: stocks, quote, stats, batch, screen, compare' };

    res.status(200).json({
      ...result,
      _meta: {
        api_key_configured: !usingDemo,
        using_demo_key: usingDemo,
        demo_warning: usingDemo ? 'API key yok — demo key kullanılıyor, çok sınırlı (8 istek/dk, sınırlı veri)' : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      test,
      _meta: {
        api_key_configured: !usingDemo,
        using_demo_key: usingDemo,
        timestamp: new Date().toISOString()
      }
    });
  }
};
