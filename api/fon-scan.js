const https = require('https');

// ── Yardımcı: HTTPS isteği ────────────────────────────────────────────
function makeReq(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname, path, method,
      headers: {
        ...headers,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Vercel KV Cache ──────────────────────────────────────────────────
function kvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
async function kvGet(key) {
  try {
    const r = await makeReq(
      new URL(process.env.KV_REST_API_URL).hostname,
      '/get/' + encodeURIComponent(key),
      'GET', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
    );
    const j = JSON.parse(r.body);
    return j.result ? JSON.parse(j.result) : null;
  } catch(e) { return null; }
}
async function kvSet(key, value, ttl) {
  try {
    const u = new URL(process.env.KV_REST_API_URL);
    await makeReq(
      u.hostname,
      '/set/' + encodeURIComponent(key) + '?ex=' + ttl,
      'POST',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
      JSON.stringify(value)
    );
  } catch(e) {}
}

// ── Tarih formatlama (DD.MM.YYYY) ────────────────────────────────────
function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

// ── TEFAS BindHistoryInfo — belirli tarih penceresini çek ────────────
async function fetchTefasWindow(fonTur, daysBack, windowDays) {
  const now      = new Date();
  const bittarih = fmtDate(new Date(now - daysBack * 86400000));
  const bastarih = fmtDate(new Date(now - (daysBack + windowDays) * 86400000));

  const payload = new URLSearchParams({
    fontip: fonTur, fonkod: '', bastarih, bittarih
  }).toString();

  try {
    const r = await makeReq(
      'www.tefas.gov.tr', '/api/DB/BindHistoryInfo', 'POST',
      {
        'Content-Type':     'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer':          'https://www.tefas.gov.tr/TarihselVeriler.aspx',
        'Origin':           'https://www.tefas.gov.tr'
      },
      payload
    );
    if (r.status !== 200) return [];
    const parsed = JSON.parse(r.body);
    return Array.isArray(parsed.data) ? parsed.data : [];
  } catch (e) {
    console.error(`fetchTefasWindow(${daysBack}, ${windowDays}) error:`, e.message);
    return [];
  }
}

// ── YTD referans: 1 Ocak - 15 Ocak ─────────────────────────────────
async function fetchYtdRef(fonTur) {
  const year = new Date().getFullYear();
  const payload = new URLSearchParams({
    fontip: fonTur, fonkod: '',
    bastarih: `01.01.${year}`, bittarih: `15.01.${year}`
  }).toString();

  try {
    const r = await makeReq(
      'www.tefas.gov.tr', '/api/DB/BindHistoryInfo', 'POST',
      {
        'Content-Type':     'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer':          'https://www.tefas.gov.tr/TarihselVeriler.aspx',
        'Origin':           'https://www.tefas.gov.tr'
      },
      payload
    );
    if (r.status !== 200) return [];
    const parsed = JSON.parse(r.body);
    return Array.isArray(parsed.data) ? parsed.data : [];
  } catch (e) {
    console.error('fetchYtdRef error:', e.message);
    return [];
  }
}

// ── Referans pencereden her fon için en güncel fiyatı al ─────────────
function buildRefMap(records) {
  const map = {};
  for (const r of records) {
    const code  = r.FONKODU;           // Doğru alan adı: FONKODU
    if (!code || code === 'undefined') continue;
    const price = parseFloat(r.BORSABULTENFIYAT || r.FIYAT || 0);
    const date  = parseInt(r.TARIH || 0);
    if (price > 0 && (!map[code] || date > map[code].date)) {
      map[code] = { price, date };
    }
  }
  return map;
}

// ── Sharpe oranı (basit) — 30 günlük pencere yeterli ────────────────
function calcSharpe(prices, riskFreeAnnual = 0.45) {
  if (!prices || prices.length < 10) return null;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] > 0) returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  if (returns.length < 5) return null;
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - avg) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;
  const annualReturn = avg * 252;
  const annualStd    = stdDev * Math.sqrt(252);
  return parseFloat(((annualReturn - riskFreeAnnual) / annualStd).toFixed(2));
}

// ── Yahoo Finance doğrulama (top 5 fon için) ─────────────────────────
async function verifyWithYahoo(fonkod) {
  try {
    const path = '/v8/finance/chart/' + encodeURIComponent(fonkod + '.IS') +
                 '?interval=1d&range=5d';
    const r = await makeReq(
      'query1.finance.yahoo.com', path, 'GET',
      { Accept: 'application/json' }
    );
    if (r.status !== 200) return null;
    const j = JSON.parse(r.body);
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const closes = result.indicators.quote[0].close.filter(Boolean);
    return { lastPrice: closes[closes.length - 1] };
  } catch(e) { return null; }
}

// ── Ana handler ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url      = new URL(req.url, 'https://x');
  const fonTur   = url.searchParams.get('fontur')   || 'YAT';
  const minRet1y = parseFloat(url.searchParams.get('min_ret1y')  || '-Infinity');
  const maxRet1y = parseFloat(url.searchParams.get('max_ret1y')  || 'Infinity');
  const minSharpe= parseFloat(url.searchParams.get('min_sharpe') || '-Infinity');
  const minSize  = parseFloat(url.searchParams.get('min_size')   || '0');
  const sortBy   = url.searchParams.get('sort')     || 'ret1y';
  const limit    = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

  // Cache — sort client-side yaptığımız için key'de sortBy yok
  const cacheKey = `df_fon_v3_${fonTur}_${limit}`;
  if (kvEnabled()) {
    const cached = await kvGet(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).end(JSON.stringify(cached));
    }
  }

  try {
    // ── TEFAS istekleri: önce ana veri, sonra referanslar paralel ─
    // main: son 30 gün  → anlık fiyat + 1M ref + Sharpe
    // ref1y: ~1Y önce  → 1Y referans fiyatı (küçük pencere)
    // ref3m: ~3M önce  → 3M referans fiyatı (küçük pencere)
    // refYtd: Oca başı → YTD referans fiyatı
    const main30 = await fetchTefasWindow(fonTur, 0, 30);
    const [ref1y, ref3m, refYtd] = await Promise.all([
      fetchTefasWindow(fonTur, 360, 7),
      fetchTefasWindow(fonTur, 85,  7),
      fetchYtdRef(fonTur),
    ]);

    if (!main30.length) {
      return res.status(200).json({ funds: [], total: 0, source: 'tefas', error: 'TEFAS veri döndürmedi' });
    }

    // ── Referans fiyat haritaları ─────────────────────────────────
    const map1y  = buildRefMap(ref1y);
    const map3m  = buildRefMap(ref3m);
    const mapYtd = buildRefMap(refYtd);

    // ── Ana pencereyi FONKODU bazında grupla ──────────────────────
    const fundMap = {};
    for (const r of main30) {
      const code = r.FONKODU;                    // ← FIX: FONKOD → FONKODU
      if (!code || code === 'undefined') continue;
      if (!fundMap[code]) fundMap[code] = { info: r, prices: [] };
      fundMap[code].prices.push(r);
    }

    // ── Her fon için hesapla ──────────────────────────────────────
    const ret = (cur, ref) =>
      (cur > 0 && ref > 0) ? parseFloat(((cur - ref) / ref * 100).toFixed(2)) : null;

    let funds = Object.entries(fundMap).map(([code, { info, prices }]) => {
      // En güncel fiyat: en büyük TARIH değerine sahip kayıt
      const sorted = prices
        .map(r => ({ price: parseFloat(r.BORSABULTENFIYAT || r.FIYAT || 0), date: parseInt(r.TARIH || 0) }))
        .filter(p => p.price > 0)
        .sort((a, b) => b.date - a.date);

      const curPrice = sorted[0]?.price || 0;
      const oldPrice = sorted[sorted.length - 1]?.price || 0; // 30 gün önceki (1M)

      // Sharpe: 30 günlük fiyat dizisi
      const priceArr = sorted.map(p => p.price);
      const sharpe   = calcSharpe(priceArr);

      // AUM: pay sayısı × fiyat
      const shares   = parseInt(info.TEDPAYSAYISI || 0);
      const totalValueM = shares > 0 ? parseFloat((shares * curPrice / 1e6).toFixed(2)) : 0;

      return {
        code,
        name:        info.FONUNVAN || code,
        category:    info.FONTUR   || fonTur,
        price:       curPrice,
        totalValueM,
        investors:   parseInt(info.KISISAYISI || 0),   // ← FIX: YATIRIMCI_SAYISI → KISISAYISI
        ret1m:       ret(curPrice, oldPrice),           // 30 günlük pencere
        ret3m:       ret(curPrice, map3m[code]?.price),
        ret1y:       ret(curPrice, map1y[code]?.price),
        retYtd:      ret(curPrice, mapYtd[code]?.price),
        sharpe,
        source:      'tefas',
        verified:    false
      };
    });

    // ── Filtrele ──────────────────────────────────────────────────
    if (isFinite(minRet1y)) funds = funds.filter(f => f.ret1y != null && f.ret1y >= minRet1y);
    if (isFinite(maxRet1y)) funds = funds.filter(f => f.ret1y != null && f.ret1y <= maxRet1y);
    if (isFinite(minSharpe)) funds = funds.filter(f => f.sharpe != null && f.sharpe >= minSharpe);
    if (minSize > 0)         funds = funds.filter(f => f.totalValueM >= minSize);

    // ── Sırala ───────────────────────────────────────────────────
    const SORT_FIELDS = ['ret1y','retYtd','ret3m','ret1m','sharpe','totalValueM','investors'];
    const field = SORT_FIELDS.includes(sortBy) ? sortBy : 'ret1y';
    funds.sort((a, b) => {
      const va = a[field] ?? -Infinity;
      const vb = b[field] ?? -Infinity;
      return vb - va;
    });

    funds = funds.slice(0, limit);

    // ── İlk 5 fon için Yahoo Finance doğrulama ────────────────────
    await Promise.all(funds.slice(0, 5).map(async (f) => {
      const ydata = await verifyWithYahoo(f.code);
      if (ydata?.lastPrice) {
        const diff = Math.abs((ydata.lastPrice - f.price) / f.price * 100);
        f.yahooPrice = ydata.lastPrice;
        f.verified   = diff < 5;
        f.verifyNote = `Yahoo farkı: ${diff.toFixed(2)}%`;
      }
    }));

    const result = {
      funds,
      total:     funds.length,
      source:    'tefas',
      secondary: 'yahoo_finance',
      updatedAt: new Date().toISOString()
    };

    // ── Cache: 1 saat ─────────────────────────────────────────────
    if (kvEnabled()) await kvSet(cacheKey, result, 3600);

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify(result));

  } catch (err) {
    console.error('fon-scan error:', err.message);
    return res.status(500).json({ error: err.message, funds: [], total: 0 });
  }
};
