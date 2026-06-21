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
  // TEST ONLY — move to Vercel env var before any merge to main
  const key = process.env.TWELVEDATA_API_KEY || '40e35e9a3ec345adacbd3f8fc0d9246d';
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

// ── EODHD Test Fonksiyonları ───────────────────────────────────
const EOD_BASE = 'https://eodhd.com/api';
const EOD_KEY  = () => process.env.EODHD_API_KEY || '6a37fc16640424.99227602';

async function eodFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url  = `${EOD_BASE}${path}${sep}api_token=${EOD_KEY()}&fmt=json`;
  const res  = await fetch(url, {
    headers: { 'User-Agent': 'DeepFin-Test/1.0' },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`EODHD HTTP ${res.status}`);
  return res.json();
}

// Test A: Bulk EOD — tüm BIST hisseleri tek istekte
async function testEodBulk() {
  const t0   = Date.now();
  const data = await eodFetch('/eod-bulk-last-day/IS');
  const elapsed = Date.now() - t0;
  const arr  = Array.isArray(data) ? data : [];
  return {
    test: 'eod-bulk',
    ok: arr.length > 0,
    count: arr.length,
    elapsed_ms: elapsed,
    fields: arr[0] ? Object.keys(arr[0]) : [],
    sample: arr.slice(0, 5).map(r => ({
      code: r.code, name: r.name, date: r.date,
      open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume
    })),
    error: arr.length === 0 ? JSON.stringify(data).slice(0, 200) : null
  };
}

// Test B: Tekil fundamentals — PE, ROE, market cap vb.
async function testEodFundamentals(sym) {
  const t0   = Date.now();
  const data = await eodFetch(`/fundamentals/${sym}.IS`);
  const elapsed = Date.now() - t0;
  const h = data.Highlights || {};
  const v = data.Valuation  || {};
  const g = data.General    || {};
  return {
    test: 'eod-fundamentals',
    symbol: sym,
    ok: !!g.Code,
    elapsed_ms: elapsed,
    general: { name: g.Name, sector: g.Sector, industry: g.Industry, exchange: g.Exchange },
    highlights: {
      market_cap:    h.MarketCapitalization,
      pe:            h.PERatio,
      eps:           h.EarningsShare,
      roe:           h.ReturnOnEquityTTM,
      roa:           h.ReturnOnAssetsTTM,
      profit_margin: h.ProfitMargin,
      revenue_growth: h.QuarterlyRevenueGrowthYOY,
      earnings_growth: h.QuarterlyEarningsGrowthYOY,
      dividend_yield: h.DividendYield,
    },
    valuation: {
      trailing_pe: v.TrailingPE,
      forward_pe:  v.ForwardPE,
      pb:          v.PriceBookMRQ,
      ps:          v.PriceSalesTTM,
      ev:          v.EnterpriseValue,
      ev_ebitda:   v.EnterpriseValueEbitda,
    },
    error: !g.Code ? JSON.stringify(data).slice(0, 200) : null
  };
}

// Test B2: Tekil EOD — BIST veya US hisse (API key çalışıyor mu?)
async function testEodSingle(sym, exchange) {
  const t0   = Date.now();
  // HTTP hata fırlatmak yerine raw status dön
  const sep = '/eod/' + sym + '.' + exchange + '?order=d&limit=1';
  const url  = `${EOD_BASE}${sep}&api_token=${EOD_KEY()}&fmt=json`;
  const res  = await fetch(url, { headers:{'User-Agent':'DeepFin-Test/1.0'}, signal:AbortSignal.timeout(10000) });
  const elapsed = Date.now() - t0;
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
  return {
    test: 'eod-single',
    symbol: sym + '.' + exchange,
    http_status: res.status,
    ok: res.ok,
    elapsed_ms: elapsed,
    data: Array.isArray(data) ? data[0] : data,
    note: 'US=AAPL.US, BIST=THYAO.IS. http_status=200 ise API key geçerli ve bu exchange dahil.'
  };
}

// Test C: Bulk Fundamentals — tüm BIST temel veri tek istekte (plan dahilinde mi?)
async function testEodBulkFundamentals() {
  const t0 = Date.now();
  let data, error;
  try {
    data = await eodFetch('/bulk-fundamental/IS?limit=10');
  } catch(e) {
    error = e.message;
  }
  const elapsed = Date.now() - t0;
  const isArray = Array.isArray(data);
  const isObj   = data && typeof data === 'object' && !isArray;
  return {
    test: 'bulk-fundamentals',
    elapsed_ms: elapsed,
    plan_supported: !error && (isArray || isObj),
    response_type: isArray ? 'array' : (isObj ? 'object' : 'unknown'),
    count: isArray ? data.length : (isObj ? Object.keys(data).length : 0),
    sample_keys: isArray && data[0] ? Object.keys(data[0]).slice(0, 10) : (isObj ? Object.keys(data).slice(0, 5) : []),
    raw_preview: error ? null : JSON.stringify(data).slice(0, 300),
    error: error || null,
    note: 'Bu endpoint Extended Fundamentals planı gerektirebilir. plan_supported=false ise mevcut planda yok.'
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const test = req.query?.test || 'stocks';
  const sym  = (req.query?.sym  || 'THYAO').toUpperCase();
  const syms = req.query?.syms || 'THYAO,AKBNK,GARAN';

  const tdKey   = process.env.TWELVEDATA_API_KEY;
  const eodKey  = process.env.EODHD_API_KEY;

  try {
    let result;
    // Twelve Data testleri
    if      (test === 'stocks')  result = await testStocks();
    else if (test === 'quote')   result = await testQuote(sym);
    else if (test === 'stats')   result = await testStats(sym);
    else if (test === 'batch')   result = await testBatch(syms);
    else if (test === 'screen')  result = await testScreen();
    else if (test === 'compare') result = await testCompare();
    // EODHD testleri
    else if (test === 'eod-bulk')             result = await testEodBulk();
    else if (test === 'eod-fundamentals')     result = await testEodFundamentals(sym);
    else if (test === 'eod-single')           result = await testEodSingle(sym, req.query?.exchange || 'IS');
    else if (test === 'eod-single-us')        result = await testEodSingle('AAPL', 'US');
    else if (test === 'bulk-fundamentals')    result = await testEodBulkFundamentals();
    else result = { error: 'Geçersiz test. TD: stocks|quote|stats|batch|screen|compare  EODHD: eod-bulk|eod-fundamentals|bulk-fundamentals' };

    res.status(200).json({
      ...result,
      _meta: {
        td_key_configured:  !!tdKey,
        eod_key_configured: !!eodKey,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      test,
      _meta: { timestamp: new Date().toISOString() }
    });
  }
};
