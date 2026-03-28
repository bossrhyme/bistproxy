// api/bist-scan.js
// DeepFin — İş Yatırım Screener Proxy
// Gerçek endpoint: getScreenerDataNEW
// Doğrulanmış field ID'leri:
//   "11" = Halka Açıklık Oranı (%)
//   "40" = Cari Yabancı Oranı (%)
//   "7"  = Kapanış Fiyatı (TL)

const ISYATIRIM_API =
  'https://www.isyatirim.com.tr/tr-tr/analiz/_Layouts/15/IsYatirim.Website/StockInfo/CompanyInfoAjax.aspx/getScreenerDataNEW';

const ISYATIRIM_REFERER =
  'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/gelismis-hisse-arama.aspx';

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

async function kvSet(key, value, ttlSec = 300) {
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

// İş Yatırım'dan veri çek
async function fetchScreenerData() {
  const res = await fetch(ISYATIRIM_API, {
    method: 'POST',
    headers: {
      'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer':        ISYATIRIM_REFERER,
      'Accept':         'application/json, text/plain, */*',
      
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: null,
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) throw new Error(`İş Yatırım HTTP ${res.status}`);

  const text = await res.text();
  console.log('[bist-scan] raw response length:', text.length);
  console.log('[bist-scan] raw response preview:', text.substring(0, 200));

  const json = JSON.parse(text);

  // Response formatı: { "d": "[{...}, {...}]" }
  if (!json.d) throw new Error(`d field missing. Keys: ${Object.keys(json).join(',')}`);

  return JSON.parse(json.d);
}

// Ham satırı → normalize et
// "Hisse": "THYAO - Türk Hava Yolları"
// "11": "50.47"  → freeFloat
// "40": "21.86"  → foreignRatio
// "7":  "283.5"  → price (varsa)
function normalizeRow(row) {
  const hisse   = row['Hisse'] || '';
  const dashIdx = hisse.indexOf(' - ');
  const symbol  = dashIdx > -1 ? hisse.slice(0, dashIdx).trim() : hisse.trim();
  const name    = dashIdx > -1 ? hisse.slice(dashIdx + 3).trim() : '';

  const out = { symbol, name };

  if (row['11'] !== undefined) out.freeFloat    = parseFloat(row['11']) || null;
  if (row['40'] !== undefined) out.foreignRatio = parseFloat(row['40']) || null;
  if (row['7']  !== undefined) out.price        = parseFloat(row['7'])  || null;

  return out;
}

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const cacheKey = 'bist_enrichment_v1';

  // Cache kontrolü
  const cached = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    const rows = await fetchScreenerData();
    const data = rows.map(normalizeRow).filter(r => r.symbol);

    const response = {
      source:    'isyatirim',
      count:     data.length,
      data,
      cached_at: new Date().toISOString(),
    };

    await kvSet(cacheKey, response, 300); // 5dk cache
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(response);

  } catch (err) {
    console.error('[bist-scan] Error:', err.message);
    return res.status(500).json({
      error:    'İş Yatırım veri çekme hatası',
      detail:   err.message,
      fallback: true
    });
  }
}
