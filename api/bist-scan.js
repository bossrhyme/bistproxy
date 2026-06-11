// api/bist-scan.js
const { protect, trackViolation } = require('./_protect');
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

async function kvIncr(key, ttlSec) {
  try {
    const url   = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return 0;
    const r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['TTL', key]])
    });
    const arr = await r.json();
    const count = arr[0]?.result || 0;
    if ((arr[1]?.result || -1) < 0) {
      fetch(url + '/pipeline', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify([['EXPIRE', key, ttlSec]])
      }).catch(() => {});
    }
    return count;
  } catch { return 0; }
}

function getClientIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown').slice(0, 45);
}

// İş Yatırım'dan veri çek
async function fetchScreenerData() {
  const res = await fetch(ISYATIRIM_API, {
    method: 'POST',
    headers: {
      'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer':        ISYATIRIM_REFERER,
      'Accept':         'application/json, text/plain, */*',
      'Content-Type':   'application/json; charset=utf-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: '{}',
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

// ─────────────────────────────────────────────────────────────
// Günlük BIST snapshot — cron ile kapanış sonrası 1 kez çalışır.
// /api/preset-snapshot rewrite'i buraya gelir (Vercel Hobby 12
// fonksiyon limiti nedeniyle ayrı dosya değil).
// Koruma: CRON_SECRET env tanımlıysa Bearer token veya ?key= ister.
// ─────────────────────────────────────────────────────────────
const https = require('https');

const SNAP_COLS = [
  'close', 'change', 'volume', 'market_cap_basic',
  'price_earnings_ttm', 'price_book_fq',
  'return_on_equity_fq', 'net_margin', 'gross_margin',
  'revenue_growth_ttm_yoy', 'earnings_per_share_change_ttm_yoy',
  'dividends_yield', 'debt_to_equity_fq', 'current_ratio_fq',
  'sector',
  'Recommend.All', 'Recommend.MA', 'Recommend.Other',
  'Perf.1M', 'Perf.3M', 'Perf.6M', 'RSI',
  'price_52_week_high', 'price_52_week_low',
  'relative_volume_10d_calc', 'beta_1_year',
  'SMA50', 'SMA200', 'MACD.macd', 'MACD.signal',
  'ADX', 'ADX+DI', 'ADX-DI', 'BB.lower', 'Stoch.K', 'Stoch.D'
];

const SNAP_TTL = 400 * 86400;   // ~13 ay sakla
const SNAP_INDEX_KEY = 'dfsnap:index:bist';

function snapRound4(v) {
  if (typeof v !== 'number' || !isFinite(v)) return v == null ? null : v;
  return Math.round(v * 10000) / 10000;
}

// kvSet sessiz hata yutuyor — snapshot yazımı başarısızsa bilmemiz gerek
async function snapKvSet(key, value, ttlSec) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const r = await fetch(`${url}/set/${encodeURIComponent(key)}?ex=${ttlSec}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  if (!r.ok) throw new Error('KV yazma hatası: ' + r.status);
}

function snapFetchScanner(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'scanner.tradingview.com',
      path: '/turkey/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
      },
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Tarama yanıtı çözülemedi (HTTP ' + res.statusCode + ')')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Tarama zaman aşımı')); });
    req.write(body);
    req.end();
  });
}

async function handleSnapshot(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET bekleniyor' });

  // Cron koruması
  const url = new URL(req.url, 'http://localhost');
  const secret = process.env.CRON_SECRET || '';
  if (secret) {
    const auth = req.headers.authorization || '';
    const key = url.searchParams.get('key') || '';
    if (auth !== 'Bearer ' + secret && key !== secret) {
      return res.status(401).json({ ok: false, error: 'Yetkisiz' });
    }
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ ok: false, error: 'KV yapılandırılmamış' });
  }

  const force = url.searchParams.get('force') === '1';
  const now = new Date();
  const day = now.getUTCDay();
  if (!force && (day === 0 || day === 6)) {
    return res.status(200).json({ ok: true, skipped: 'hafta sonu' });
  }

  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const snapKey = 'dfsnap:bist:' + dateStr;

  // Idempotent: bugünün kaydı varsa tekrar çekme
  if (!force) {
    const existing = await kvGet(snapKey);
    if (existing) return res.status(200).json({ ok: true, skipped: 'mevcut', date: dateStr, count: existing.rows.length });
  }

  try {
    const parsed = await snapFetchScanner({
      columns: SNAP_COLS,
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
      range: [0, 800],
      markets: ['turkey'],
    });
    const tvRows = parsed.data || [];
    if (!tvRows.length) throw new Error('Tarama boş döndü');

    const rows = tvRows.map(r => {
      const sym = (r.s || '').split(':')[1] || r.s;
      return [sym].concat((r.d || []).map(snapRound4));
    });

    const snapshot = { d: dateStr, cols: SNAP_COLS, rows };
    await snapKvSet(snapKey, snapshot, SNAP_TTL);

    // Tarih indeksini güncelle (aralık sorguları için)
    const index = (await kvGet(SNAP_INDEX_KEY)) || [];
    if (!index.includes(dateStr)) {
      index.push(dateStr);
      index.sort();
      while (index.length > 400) index.shift();
      await snapKvSet(SNAP_INDEX_KEY, index, SNAP_TTL);
    }

    return res.status(200).json({ ok: true, date: dateStr, count: rows.length, cols: SNAP_COLS.length });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message });
  }
}

module.exports = async function handler(req, res) {
  // Cron snapshot rotası — protect()/CORS'tan ÖNCE: cron isteğinde
  // tarayıcı UA ve Origin yok, UA taraması onu engellerdi.
  const urlPath = (req.url || '').split('?')[0];
  if (urlPath === '/api/preset-snapshot') return handleSnapshot(req, res);

  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (await protect(req, res)) return;

  const ip = getClientIP(req);
  const rlCount = await kvIncr('rl:bist-scan:' + ip, 60);
  if (rlCount > 30) { trackViolation(ip).catch(() => {}); return res.status(429).json({ error: 'Çok fazla istek, lütfen bekleyin.' }); }

  const cacheKey = 'bist_enrichment_v3';

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

    await kvSet(cacheKey, response, 3600); // 1 saat cache (halka açıklık verisi nadiren değişir)
    fetch(process.env.KV_REST_API_URL + '/incr/df_total_scans', {
      method: 'POST', headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
    }).catch(() => {});
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
