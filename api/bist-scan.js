// api/bist-scan.js
// DeepFin — İş Yatırım Screener Proxy
// BIST'e özel tarama: halka açıklık, yabancı oranı + tüm temel kriterler
// Vercel serverless — Upstash KV cache (5dk TTL)

const ISYATIRIM_SCREENER =
  'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/gelismis-hisse-arama.aspx';

const ISYATIRIM_API =
  'https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/GelismisAramaHisseler';

// Criteria ID haritası — İş Yatırım Screener API
// Her ID bir filtreleme kriteri; min/max olarak gönderilir
const CRITERIA = {
  pe:         11,   // F/K
  pb:         14,   // PD/DD
  ps:         15,   // F/S
  roe:        33,   // ROE (%)
  roa:        32,   // ROA (%)
  margin:     35,   // Net Marj (%)
  gross:      19,   // Brüt Marj (%)
  div:        20,   // Temettü Verimi (%)
  de:         17,   // Borç/Özsermaye
  cr:         18,   // Cari Oran
  revg:       38,   // Gelir Büyümesi (%)
  earng:      37,   // Kazanç Büyümesi (%)
  mcap:       30,   // Piyasa Değeri (mn TL)
  free_float: 25,   // Halka Açıklık Oranı (%)
  foreign:    26,   // Yabancı Oranı (%)
  price:       7,   // Kapanış Fiyatı (TL)
};

// Sonuçtaki kolon ID'leri → anlamlı alan adı
const COL_MAP = {
  'criteria_7':  'price',
  'criteria_11': 'pe',
  'criteria_14': 'pb',
  'criteria_15': 'ps',
  'criteria_17': 'de',
  'criteria_18': 'cr',
  'criteria_19': 'gross_margin',
  'criteria_20': 'dividend_yield',
  'criteria_25': 'free_float',
  'criteria_26': 'foreign_ratio',
  'criteria_30': 'market_cap',
  'criteria_32': 'roa',
  'criteria_33': 'roe',
  'criteria_35': 'net_margin',
  'criteria_37': 'earnings_growth',
  'criteria_38': 'revenue_growth',
};

// Upstash KV cache
async function kvGet(key) {
  try {
    const url  = process.env.KV_REST_API_URL;
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
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSec })
    });
  } catch { /* silent */ }
}

// Filters objesini → İş Yatırım query string'e çevir
// Örn: { pe_max:15, roe_min:20 } → "criteria11Max=15&criteria33Min=20"
function buildQuery(filters) {
  const parts = [];

  // Her filtre key'ini parse et: roe_min / pe_max / free_float_min / foreign_max
  for (const [key, val] of Object.entries(filters)) {
    if (val === null || val === undefined || val === '') continue;

    // "free_float_min" → field="free_float", dir="min"
    const lastUnderscore = key.lastIndexOf('_');
    const field = key.slice(0, lastUnderscore);  // e.g. "free_float"
    const dir   = key.slice(lastUnderscore + 1); // "min" or "max"

    const criteriaId = CRITERIA[field];
    if (!criteriaId) continue;

    const paramName = dir === 'min'
      ? `criteria${criteriaId}Min`
      : `criteria${criteriaId}Max`;

    parts.push(`${paramName}=${encodeURIComponent(val)}`);
  }

  return parts.join('&');
}

// Sektör/endeks filtresi
function buildSectorQuery(sector, index) {
  const parts = [];
  if (sector) parts.push(`sectorId=${encodeURIComponent(sector)}`);
  if (index)  parts.push(`indexCode=${encodeURIComponent(index)}`);
  return parts.join('&');
}

// İş Yatırım'dan ham veri çek
async function fetchFromIsyatirim(queryStr) {
  const url = `${ISYATIRIM_API}?${queryStr}&returnColumns=${Object.values(CRITERIA).join(',')}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DeepFin/1.0)',
      'Referer': ISYATIRIM_SCREENER,
      'Accept': 'application/json, text/plain, */*',
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!res.ok) throw new Error(`İş Yatırım HTTP ${res.status}`);
  return res.json();
}

// Ham satırı → normalize edilmiş hisse objesi
function normalizeRow(row) {
  const out = {
    symbol: row.symbol || row.SEMBOL || '',
    name:   row.name   || row.SIRKET_ADI || '',
  };

  for (const [col, field] of Object.entries(COL_MAP)) {
    const raw = row[col];
    if (raw !== undefined && raw !== null && raw !== '') {
      out[field] = parseFloat(raw) || raw;
    }
  }

  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    // Temel GURU filtre parametreleri
    pe_min, pe_max,
    pb_max, ps_max,
    roe_min, roa_min,
    margin_min, gross_min,
    div_min,
    de_max,
    cr_min,
    revg_min, earng_min,
    mcap_min,
    // BIST'e özgü yeni parametreler
    free_float_min,
    foreign_min, foreign_max,
    // Sektör / endeks filtresi
    sector, index: indexCode,
  } = req.query;

  // Filtre objesini oluştur
  const filters = {};
  if (pe_min)         filters.pe_min         = pe_min;
  if (pe_max)         filters.pe_max         = pe_max;
  if (pb_max)         filters.pb_max         = pb_max;
  if (ps_max)         filters.ps_max         = ps_max;
  if (roe_min)        filters.roe_min        = roe_min;
  if (roa_min)        filters.roa_min        = roa_min;
  if (margin_min)     filters.margin_min     = margin_min;
  if (gross_min)      filters.gross_min      = gross_min;
  if (div_min)        filters.div_min        = div_min;
  if (de_max)         filters.de_max         = de_max;
  if (cr_min)         filters.cr_min         = cr_min;
  if (revg_min)       filters.revg_min       = revg_min;
  if (earng_min)      filters.earng_min      = earng_min;
  if (mcap_min)       filters.mcap_min       = mcap_min;
  if (free_float_min) filters.free_float_min = free_float_min;
  if (foreign_min)    filters.foreign_min    = foreign_min;
  if (foreign_max)    filters.foreign_max    = foreign_max;

  const cacheKey = `bist_scan_${JSON.stringify(filters)}_${sector||''}_${indexCode||''}`;

  // Cache kontrolü
  const cached = await kvGet(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    const filterQuery  = buildQuery(filters);
    const sectorQuery  = buildSectorQuery(sector, indexCode);
    const fullQuery    = [filterQuery, sectorQuery].filter(Boolean).join('&');

    const raw = await fetchFromIsyatirim(fullQuery);

    // İş Yatırım yanıtı genellikle { value: [...] } formatında
    const rows = Array.isArray(raw) ? raw : (raw.value || raw.data || raw.results || []);

    const data = rows.map(normalizeRow).filter(r => r.symbol);

    const response = {
      source: 'isyatirim',
      count: data.length,
      data,
      cached_at: new Date().toISOString(),
    };

    await kvSet(cacheKey, response, 300); // 5dk cache
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(response);

  } catch (err) {
    console.error('[bist-scan] Error:', err.message);
    return res.status(500).json({
      error: 'İş Yatırım veri çekme hatası',
      detail: err.message,
      fallback: true
    });
  }
}
