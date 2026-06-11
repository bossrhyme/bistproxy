// ─────────────────────────────────────────────────────────────
// Günlük BIST snapshot — cron ile kapanış sonrası 1 kez çalışır.
// Tüm evrenin metriklerini KV'ye yazar; preset üyelikleri ve
// dönem getirileri bu kayıtlardan geriye dönük hesaplanabilir.
// Vercel cron: vercel.json → "30 15 * * *" (18:30 TRT, kapanış sonrası)
// Koruma: CRON_SECRET env tanımlıysa Bearer token veya ?key= ister.
// ─────────────────────────────────────────────────────────────
const https = require('https');

const KV_URL = () => process.env.KV_REST_API_URL || '';
const KV_TOK = () => process.env.KV_REST_API_TOKEN || '';

function kvFetch(path, opts) {
  return fetch(KV_URL() + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + KV_TOK(), 'Content-Type': 'application/json', ...(opts && opts.headers) }
  });
}

async function kvGet(key) {
  try {
    const r = await kvFetch('/get/' + encodeURIComponent(key));
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ttlSec) {
  const r = await kvFetch('/set/' + encodeURIComponent(key) + '?ex=' + ttlSec, {
    method: 'POST',
    body: JSON.stringify(value)
  });
  if (!r.ok) throw new Error('KV yazma hatası: ' + r.status);
}

// Preset/guru/teknik filtrelerin ihtiyaç duyduğu tüm alanlar + kapanış
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
const INDEX_KEY = 'dfsnap:index:bist';

function round4(v) {
  if (typeof v !== 'number' || !isFinite(v)) return v == null ? null : v;
  return Math.round(v * 10000) / 10000;
}

function fetchScanner(payload) {
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

module.exports = async function (req, res) {
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

  if (!KV_URL() || !KV_TOK()) {
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
    const parsed = await fetchScanner({
      columns: SNAP_COLS,
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
      range: [0, 800],
      markets: ['turkey'],
    });
    const tvRows = parsed.data || [];
    if (!tvRows.length) throw new Error('Tarama boş döndü');

    const rows = tvRows.map(r => {
      const sym = (r.s || '').split(':')[1] || r.s;
      return [sym].concat((r.d || []).map(round4));
    });

    const snapshot = { d: dateStr, cols: SNAP_COLS, rows };
    await kvSet(snapKey, snapshot, SNAP_TTL);

    // Tarih indeksini güncelle (aralık sorguları için)
    const index = (await kvGet(INDEX_KEY)) || [];
    if (!index.includes(dateStr)) {
      index.push(dateStr);
      index.sort();
      while (index.length > 400) index.shift();
      await kvSet(INDEX_KEY, index, SNAP_TTL);
    }

    return res.status(200).json({ ok: true, date: dateStr, count: rows.length, cols: SNAP_COLS.length });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message });
  }
};
