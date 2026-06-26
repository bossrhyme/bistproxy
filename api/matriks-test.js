// api/matriks-test.js
// Matriks Analist API test endpoint
// Env: MATRIKS_TOKEN (test token — Matriks'ten alınacak)
//
// Test tipleri:
//   GET /api/matriks-test?test=symbols          → Tüm BIST hisse listesi
//   GET /api/matriks-test?test=snapshot         → Tüm BIST anlık/gecikmeli fiyat snapshot
//   GET /api/matriks-test?test=fundamentals     → Temel veri (F/K, PD/DD, ROE...) — 10 hisse
//   GET /api/matriks-test?test=company&sym=THYAO→ Şirket kartı (tek hisse detay)
//   GET /api/matriks-test?test=circulation&sym=THYAO → Halka açıklık / dolaşım
//   GET /api/matriks-test?test=investor&sym=THYAO    → Yabancı yatırımcı oranı
//   GET /api/matriks-test?test=ratios           → Oran analizi (F/K, PD/DD, ROE toplu)
//   GET /api/matriks-test?test=screener         → filterRanker — sunucu taraflı sıralama
//   GET /api/matriks-test?test=bar&sym=THYAO    → Bar (OHLCV) grafik verisi
//   GET /api/matriks-test?test=broker&sym=THYAO → Aracı kurum dağılımı (takas)
//   GET /api/matriks-test?test=news             → KAP duyuruları (son 5)
//   GET /api/matriks-test?test=all              → Tüm testleri sırayla çalıştır

const BASE = 'https://apitest.matriksdata.com/dumrul';

// Screener için örnek BIST hisseleri (tam listesi symbols endpoint'inden gelecek)
const BIST_SAMPLE = [
  'THYAO','AKBNK','GARAN','ISCTR','EREGL','KCHOL','SISE','BIMAS',
  'ASELS','TOASO'
];

async function mxFetch(path, token) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: res.status, ok: res.ok, data };
}

// ── Test fonksiyonları ──────────────────────────────────────────────────────

async function testSymbols(token) {
  // Tüm BIST hisse sembollerini çek
  const r = await mxFetch('/v3/meta/symbols?marketCode=BIST&symbolType=S', token);
  const count = Array.isArray(r.data) ? r.data.length : (r.data?.data?.length ?? '?');
  const sample = Array.isArray(r.data) ? r.data.slice(0, 3) : r.data;
  return { endpoint: '/v3/meta/symbols', httpStatus: r.status, count, sample };
}

async function testSnapshot(token) {
  // Tüm BIST hisselerinin gecikmeli anlık fiyat verisi (tek çağrı)
  const r = await mxFetch('/v1/snapshot-market-delayed?marketCode=BIST&symbolType=S', token);
  const count = Array.isArray(r.data) ? r.data.length : (r.data?.data?.length ?? '?');
  const sample = Array.isArray(r.data) ? r.data.slice(0, 3) : r.data;
  return { endpoint: '/v1/snapshot-market-delayed', httpStatus: r.status, count, sample };
}

async function testFundamentals(token) {
  // Temel finansal göstergeler — birden fazla hisse, tek çağrı
  const syms = BIST_SAMPLE.join(',');
  const r = await mxFetch(`/v1/fundamentals-indicators?symbols=${syms}`, token);
  const count = Array.isArray(r.data) ? r.data.length : '?';
  const sample = Array.isArray(r.data) ? r.data.slice(0, 2) : r.data;
  return { endpoint: '/v1/fundamentals-indicators', httpStatus: r.status, count, sample };
}

async function testCompany(token, sym = 'THYAO') {
  // Şirket kartı — P/E, P/B, piyasa değeri, sektör vb.
  const r = await mxFetch(`/v1/company-cards?symbol=${sym}`, token);
  return { endpoint: `/v1/company-cards?symbol=${sym}`, httpStatus: r.status, data: r.data };
}

async function testFundamentalDashboard(token, sym = 'THYAO') {
  // Tam fundamental dashboard — bilanço, gelir tablosu oranları
  const r = await mxFetch(`/v1/fundamental-dashboard?symbol=${sym}&currency=TRY`, token);
  return { endpoint: `/v1/fundamental-dashboard?symbol=${sym}`, httpStatus: r.status, data: r.data };
}

async function testCirculation(token, sym = 'THYAO') {
  // Halka açıklık oranı / dolaşımdaki pay sayısı
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const past = '20240101';
  const r = await mxFetch(`/v1/circulation?symbol=${sym}&start=${past}&end=${today}`, token);
  return { endpoint: `/v1/circulation?symbol=${sym}`, httpStatus: r.status, data: r.data };
}

async function testInvestor(token, sym = 'THYAO') {
  // Yabancı yatırımcı oranı
  const r = await mxFetch(`/v1/investor?symbol=${sym}`, token);
  return { endpoint: `/v1/investor?symbol=${sym}`, httpStatus: r.status, data: r.data };
}

async function testRatios(token) {
  // Oran analizi — birden fazla hisse (F/K, PD/DD, ROE, Borç/Özsermaye)
  const syms = BIST_SAMPLE.join(',');
  const r = await mxFetch(`/v1/ratio-analysis?symbols=${syms}`, token);
  const count = Array.isArray(r.data) ? r.data.length : '?';
  const sample = Array.isArray(r.data) ? r.data.slice(0, 2) : r.data;
  return { endpoint: '/v1/ratio-analysis', httpStatus: r.status, count, sample };
}

async function testScreener(token) {
  // filterRanker — sunucu taraflı sıralama (hacim, getiri vb.)
  // type parametreleri: gainers, losers, volume, pe, pb gibi olabilir (dökümana bakılacak)
  const r = await mxFetch('/v1/filter-ranker?top=20&period=daily&indexes=XU100', token);
  return { endpoint: '/v1/filter-ranker', httpStatus: r.status, data: r.data };
}

async function testBar(token, sym = 'THYAO') {
  // OHLCV bar verisi — grafik için
  const r = await mxFetch(`/v1/tick/bar?symbol=${sym}&period=1440&count=5`, token);
  return { endpoint: `/v1/tick/bar?symbol=${sym}&period=1440`, httpStatus: r.status, data: r.data };
}

async function testBroker(token, sym = 'THYAO') {
  // Aracı kurum işlem dağılımı (takas analizi)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const past = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const r = await mxFetch(`/v1/broker-trading-volume/stock?symbolList=${sym}&start=${past}&end=${today}&top=5`, token);
  return { endpoint: `/v1/broker-trading-volume/stock?symbol=${sym}`, httpStatus: r.status, data: r.data };
}

async function testNews(token) {
  // KAP / haber akışı
  const r = await mxFetch('/v2/news/lastN?count=5&fields=title,symbol,publishDate', token);
  return { endpoint: '/v2/news/lastN?count=5', httpStatus: r.status, data: r.data };
}

// ── Ana handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { test = 'symbols', sym = 'THYAO' } = req.query;
  const token = process.env.MATRIKS_TOKEN;

  if (!token) {
    return res.status(500).json({
      error: 'MATRIKS_TOKEN env var eksik',
      hint: 'Matriks test token alındıktan sonra Vercel dashboard > Environment Variables > MATRIKS_TOKEN olarak ekle',
    });
  }

  const t0 = Date.now();

  try {
    let result;

    switch (test) {
      case 'symbols':       result = await testSymbols(token); break;
      case 'snapshot':      result = await testSnapshot(token); break;
      case 'fundamentals':  result = await testFundamentals(token); break;
      case 'company':       result = await testCompany(token, sym); break;
      case 'dashboard':     result = await testFundamentalDashboard(token, sym); break;
      case 'circulation':   result = await testCirculation(token, sym); break;
      case 'investor':      result = await testInvestor(token, sym); break;
      case 'ratios':        result = await testRatios(token); break;
      case 'screener':      result = await testScreener(token); break;
      case 'bar':           result = await testBar(token, sym); break;
      case 'broker':        result = await testBroker(token, sym); break;
      case 'news':          result = await testNews(token); break;

      case 'all': {
        // Tüm testleri sırayla çalıştır
        const results = {};
        const tests = [
          ['symbols',      () => testSymbols(token)],
          ['snapshot',     () => testSnapshot(token)],
          ['fundamentals', () => testFundamentals(token)],
          ['company',      () => testCompany(token, sym)],
          ['circulation',  () => testCirculation(token, sym)],
          ['investor',     () => testInvestor(token, sym)],
          ['ratios',       () => testRatios(token)],
          ['screener',     () => testScreener(token)],
          ['news',         () => testNews(token)],
        ];
        for (const [name, fn] of tests) {
          try { results[name] = await fn(); }
          catch (e) { results[name] = { error: e.message }; }
        }
        result = results;
        break;
      }

      default:
        return res.status(400).json({
          error: `Bilinmeyen test: ${test}`,
          gecerliTestler: ['symbols','snapshot','fundamentals','company','dashboard',
                           'circulation','investor','ratios','screener','bar','broker','news','all'],
        });
    }

    res.status(200).json({
      test,
      sym: sym || null,
      ms: Date.now() - t0,
      ...result,
    });

  } catch (err) {
    res.status(500).json({
      test,
      error: err.message,
      ms: Date.now() - t0,
      hint: 'Token geçersiz veya endpoint erişim izni yok olabilir',
    });
  }
}
