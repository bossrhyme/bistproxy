// api/bist-quote.js
// DeepFin — İş Yatırım Tekil Hisse Proxy
// Tek bir BIST hissesi için: fiyat, F/K, PD/DD, ROE, halka açıklık, yabancı oranı
// Vercel serverless — Upstash KV cache (2dk TTL)

const IS_BASE = 'https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx';
const IS_REFERER = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/hisse-detay.aspx';

// Upstash KV cache
async function kvGet(key) {
  try {
    const url   = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    return json.result ? JSON.parse(json.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ttlSec = 120) {
  try {
    const url   = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return;
    await fetch(`${url}/set/${encodeURIComponent(key)}?ex=${ttlSec}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  } catch { /* silent */ }
}

// İş Yatırım fast_info endpoint (hisse özet verisi)
async function fetchFastInfo(ticker) {
  const url = `${IS_BASE}/HisseGetir?hisse=${encodeURIComponent(ticker)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DeepFin/1.0)',
      'Referer': IS_REFERER,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Alanları normalize et — İş Yatırım farklı key isimleri kullanabiliyor
function normalize(raw, ticker) {
  if (!raw) return null;

  // İş Yatırım'ın döndürdüğü olası field adları
  const get = (keys, fallback = null) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') {
        return parseFloat(raw[k]) || raw[k];
      }
    }
    return fallback;
  };

  return {
    symbol:       ticker,
    name:         get(['SIRKET_ADI', 'name', 'companyName']) || ticker,
    price:        get(['SATIS', 'KAPANIS', 'last_price', 'close']),
    prev_close:   get(['KAPANIS_ONCE', 'previous_close', 'prevClose']),
    change_pct:   get(['DEGISIM_ORAN', 'change_percent', 'changePercent']),
    volume:       get(['ISLEM_HACMI', 'volume']),
    market_cap:   get(['PIYASA_DEGERI', 'market_cap', 'marketCap']),
    pe_ratio:     get(['FK', 'pe_ratio', 'peRatio', 'P_E']),
    pb_ratio:     get(['PDDD', 'pb_ratio', 'pbRatio', 'P_B']),
    roe:          get(['ROE', 'roe']),
    free_float:   get(['HALKA_ACIKLIK', 'free_float', 'freeFloat']),   // %
    foreign_ratio: get(['YABANCI_ORANI', 'foreign_ratio', 'foreignRatio']), // %
    sector:       raw.SEKTOR || raw.sector || null,
    source: 'isyatirim',
    fetched_at: new Date().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol parametresi gerekli' });
  }

  // Güvenlik: sadece harf/rakam, max 10 karakter
  const ticker = symbol.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  if (!ticker) return res.status(400).json({ error: 'Geçersiz sembol' });

  const cacheKey = `bist_quote_${ticker}`;

  const cached = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    const raw  = await fetchFastInfo(ticker);
    const data = normalize(raw, ticker);

    if (!data) {
      return res.status(404).json({ error: `${ticker} için veri bulunamadı` });
    }

    await kvSet(cacheKey, data, 120); // 2dk cache
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);

  } catch (err) {
    console.error('[bist-quote] Error:', err.message);
    return res.status(500).json({
      error: 'İş Yatırım veri çekme hatası',
      detail: err.message,
      symbol: ticker
    });
  }
}
