// api/market-pulse.js — Piyasa nabzı (breadth, sektör, hacim, duygu)
// ?ex=EXCHANGE_NAME → o borsa için hesaplar; varsayılan: bist
// Sonuçlar 5 dakika KV'de önbelleğe alınır

const CACHE_TTL = 300;

// exchange → TradingView scan path (scan.js ile senkronize)
const TV_PATH = {
  bist:        '/turkey/scan',
  nasdaq:      '/america/scan',
  nyse:        '/america/scan',
  sp500:       '/america/scan',
  dax:         '/germany/scan',
  lse:         '/uk/scan',
  nikkei:      '/japan/scan',
  krx:         '/korea/scan',
  france:      '/france/scan',
  amsterdam:   '/netherlands/scan',
  brussels:    '/belgium/scan',
  lisbon:      '/portugal/scan',
  dublin:      '/ireland/scan',
  oslo:        '/norway/scan',
  milan:       '/italy/scan',
  tsx:         '/canada/scan',
  twse:        '/taiwan/scan',
  b3:          '/brazil/scan',
  hkex:        '/hongkong/scan',
  china:       '/china/scan',
  saudi:       '/global/scan',
  switzerland: '/switzerland/scan',
  australia:   '/australia/scan',
  southafrica: '/global/scan',
  sweden:      '/sweden/scan',
  india:       '/india/scan',
  uae:         '/uae/scan',
  moex:        '/russia/scan',
};

// Aynı TV path'i paylaşan borsalar → ortak cache key
function cacheKey(ex) {
  const path = TV_PATH[ex];
  if (!path) return null;
  // path → /turkey/scan → turkey
  const market = path.replace('/','').replace('/scan','');
  return 'market-pulse:' + market;
}

function kvUrl() {
  return process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    null;
}
function kvToken() {
  return process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    null;
}

async function kvGet(key) {
  const url = kvUrl(), tok = kvToken();
  if (!url || !tok) return null;
  try {
    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${tok}` },
      signal: AbortSignal.timeout(3000)
    });
    const j = await r.json();
    if (j.error) return null;
    return j.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ttl = CACHE_TTL) {
  const url = kvUrl(), tok = kvToken();
  if (!url || !tok) return;
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}?ex=${ttl}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
      signal: AbortSignal.timeout(3000)
    });
  } catch { /* silent */ }
}

async function fetchBreadth(tvPath) {
  const payload = JSON.stringify({
    columns: ['change', 'volume', 'average_volume_10d_calc', 'sector'],
    range: [0, 2000],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    ignore_unknown_fields: true
  });

  const res = await fetch(`https://scanner.tradingview.com${tvPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: payload,
    signal: AbortSignal.timeout(12000)
  });

  if (!res.ok) throw new Error(`TV scan HTTP ${res.status}`);
  return res.json();
}

function computePulse(raw) {
  const stocks = (raw.data || [])
    .map(s => {
      const d = s.d || [];
      return { change: d[0], volume: d[1], avgVol: d[2], sector: d[3] };
    })
    .filter(s => s.change != null && isFinite(s.change));

  const total = stocks.length;
  if (!total) return null;

  const up   = stocks.filter(s => s.change > 0).length;
  const down = stocks.filter(s => s.change < 0).length;
  const unch = total - up - down;

  // Sektör bazlı ortalama değişim
  const secMap = {};
  stocks.forEach(s => {
    if (!s.sector) return;
    if (!secMap[s.sector]) secMap[s.sector] = { sum: 0, n: 0 };
    secMap[s.sector].sum += s.change;
    secMap[s.sector].n   += 1;
  });
  let topSector = null, topChg = -Infinity;
  let botSector = null, botChg =  Infinity;
  Object.entries(secMap).forEach(([sec, v]) => {
    if (v.n < 2) return;
    const avg = v.sum / v.n;
    if (avg > topChg) { topChg = avg; topSector = sec; }
    if (avg < botChg) { botChg = avg; botSector = sec; }
  });

  // Hacim oranı
  const totalVol    = stocks.reduce((a, s) => a + (s.volume  || 0), 0);
  const totalAvgVol = stocks.reduce((a, s) => a + (s.avgVol  || 0), 0);
  const volumeRatio = totalAvgVol > 1000 ? +(totalVol / totalAvgVol).toFixed(2) : null;

  // Duygu skoru 0-100
  let score = Math.round(((up - down) / total) * 40 + 50);
  if (volumeRatio && volumeRatio > 1.3) {
    score = 50 + Math.round((score - 50) * 1.15);
  }
  score = Math.max(5, Math.min(95, score));

  const sentimentLabel =
    score < 20 ? 'Aşırı Korku' :
    score < 40 ? 'Korku'       :
    score < 60 ? 'Nötr'        :
    score < 80 ? 'Açgözlülük'  : 'Aşırı Açgözlülük';

  const sentimentColor =
    score < 20 ? '#ef4444' :
    score < 40 ? '#f97316' :
    score < 60 ? '#eab308' :
    score < 80 ? '#22c55e' : '#10b981';

  return {
    total, up, down, unch,
    topSector: topSector ? { name: topSector, change: +topChg.toFixed(2) } : null,
    botSector: botSector ? { name: botSector, change: +botChg.toFixed(2) } : null,
    volumeRatio,
    sentiment: { score, label: sentimentLabel, color: sentimentColor },
    updatedAt: Date.now()
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

  const url = new URL(req.url, 'http://localhost');
  const ex  = url.searchParams.get('ex') || 'bist';
  const tvPath = TV_PATH[ex];
  if (!tvPath) return res.status(400).json({ ok: false, error: 'Bilinmeyen borsa: ' + ex });

  const key    = cacheKey(ex);
  const cached = await kvGet(key);
  const age    = cached ? (Date.now() - cached.updatedAt) : Infinity;

  if (cached && age < CACHE_TTL * 1000) {
    return res.json({ ok: true, ...cached, fromCache: true });
  }

  try {
    const raw   = await fetchBreadth(tvPath);
    const pulse = computePulse(raw);
    if (!pulse) return res.status(503).json({ ok: false, error: 'Veri işlenemedi' });
    await kvSet(key, pulse);
    return res.json({ ok: true, ...pulse });
  } catch (err) {
    if (cached) return res.json({ ok: true, ...cached, fromCache: true, stale: true });
    return res.status(503).json({ ok: false, error: err.message });
  }
};
