const https = require('https');

// ── HTTPS isteği ──────────────────────────────────────────────────────
function makeReq(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname, path, method,
      headers: { ...headers, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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

// ── Vercel KV Cache ───────────────────────────────────────────────────
function kvEnabled() { return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN); }
async function kvGet(key) {
  try {
    const r = await makeReq(new URL(process.env.KV_REST_API_URL).hostname,
      '/get/' + encodeURIComponent(key), 'GET',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN });
    const j = JSON.parse(r.body);
    return j.result ? JSON.parse(j.result) : null;
  } catch(e) { return null; }
}
async function kvSet(key, value, ttl) {
  try {
    const u = new URL(process.env.KV_REST_API_URL);
    await makeReq(u.hostname, '/set/' + encodeURIComponent(key) + '?ex=' + ttl, 'POST',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
      JSON.stringify(value));
  } catch(e) {}
}

// ── Tarih formatlama ──────────────────────────────────────────────────
function fmtDate(d) {
  return String(d.getDate()).padStart(2,'0') + '.' +
         String(d.getMonth()+1).padStart(2,'0') + '.' +
         d.getFullYear();
}

// ── TEFAS BindHistoryInfo ─────────────────────────────────────────────
// Alan adları: FONKODU, BORSABULTENFIYAT, KISISAYISI, TEDPAYSAYISI, FONUNVAN, TARIH
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tefasFetch(fonTur, daysBack, windowDays, attempt = 0) {
  const now      = new Date();
  const bittarih = fmtDate(new Date(+now - daysBack * 86400000));
  const bastarih = fmtDate(new Date(+now - (daysBack + windowDays) * 86400000));

  const body = new URLSearchParams({
    fontip: fonTur, fonkod: '', bastarih, bittarih
  }).toString();

  try {
    const r = await makeReq('www.tefas.gov.tr', '/api/DB/BindHistoryInfo', 'POST', {
      'Content-Type':     'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer':          'https://www.tefas.gov.tr/TarihselVeriler.aspx',
      'Origin':           'https://www.tefas.gov.tr'
    }, body);

    if (r.status !== 200) { console.error('TEFAS status', r.status); return []; }
    if (!r.body.startsWith('{') && !r.body.startsWith('[')) {
      // Rate limit veya geçici hata — 1 kez daha dene
      if (attempt === 0) {
        console.warn(`TEFAS rate limit (daysBack=${daysBack}), 2s sonra tekrar...`);
        await sleep(2000);
        return tefasFetch(fonTur, daysBack, windowDays, 1);
      }
      console.error('TEFAS non-JSON (2. deneme):', r.body.slice(0, 80));
      return [];
    }
    const parsed = JSON.parse(r.body);
    return Array.isArray(parsed.data) ? parsed.data : [];
  } catch(e) {
    console.error(`tefasFetch(${daysBack},${windowDays}):`, e.message);
    return [];
  }
}

// ── Referans pencereden kod→fiyat haritası ────────────────────────────
function refMap(records) {
  const map = {};
  for (const r of records) {
    const code  = r.FONKODU;
    if (!code || code === 'undefined') continue;
    const price = parseFloat(r.FIYAT) || parseFloat(r.BORSABULTENFIYAT) || 0;
    const date  = parseInt(r.TARIH || 0);
    if (price > 0 && (!map[code] || date > map[code].date))
      map[code] = { price, date };
  }
  return map;
}

// ── Sharpe (basit, risk-free %45 TRY) ────────────────────────────────
function sharpe(prices) {
  if (!prices || prices.length < 10) return null;
  const rets = [];
  for (let i = 1; i < prices.length; i++)
    if (prices[i-1] > 0) rets.push((prices[i] - prices[i-1]) / prices[i-1]);
  if (rets.length < 5) return null;
  const avg = rets.reduce((a,b) => a+b, 0) / rets.length;
  const std = Math.sqrt(rets.reduce((a,b) => a+(b-avg)**2, 0) / rets.length);
  if (std === 0) return null;
  return parseFloat(((avg*252 - 0.45) / (std*Math.sqrt(252))).toFixed(2));
}

// ── Yahoo Finance doğrulama ───────────────────────────────────────────
async function yahoo(code) {
  try {
    const r = await makeReq('query1.finance.yahoo.com',
      '/v8/finance/chart/' + encodeURIComponent(code+'.IS') + '?interval=1d&range=5d',
      'GET', { Accept: 'application/json' });
    if (r.status !== 200) return null;
    const j = JSON.parse(r.body);
    const closes = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean);
    return closes?.length ? closes[closes.length-1] : null;
  } catch(e) { return null; }
}

// ── CORS origins ──────────────────────────────────────────────────────
const ORIGINS = ['https://deepfin.vercel.app','https://bistproxy.vercel.app','https://www.deepfin.com'];

// ── Handler ───────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ORIGINS.includes(origin) ? origin : ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q       = new URL(req.url, 'https://x').searchParams;
  const fonTur  = q.get('fontur') || 'YAT';
  const sortBy  = q.get('sort')   || 'ret1y';
  const limit   = Math.min(parseInt(q.get('limit') || '500'), 1000);
  const minSize = parseFloat(q.get('min_size') || '0');

  // KV Cache
  const cacheKey = `df_fon_v8_${fonTur}_${limit}`;
  if (kvEnabled()) {
    const hit = await kvGet(cacheKey);
    if (hit) { res.setHeader('X-Cache','HIT'); return res.status(200).end(JSON.stringify(hit)); }
  }

  try {
    // Ana pencere: son 7 gün (küçük, hızlı, ~5600 kayıt)
    const mainData = await tefasFetch(fonTur, 0, 7);

    if (!mainData.length) {
      return res.status(200).end(JSON.stringify({ funds:[], total:0, source:'tefas', error:'Veri yok' }));
    }

    // Referans pencereler — sıralı + 600ms bekleme (rate limit önlemi)
    await sleep(600);
    const ref1yData  = await tefasFetch(fonTur, 358, 7);   // ~1Y önce
    await sleep(600);
    const ref3mData  = await tefasFetch(fonTur, 87,  7);   // ~3A önce
    await sleep(600);
    const ref1mData  = await tefasFetch(fonTur, 28,  7);   // ~1A önce

    // YTD: yılın ilk haftası
    const now2   = new Date();
    const jan1   = new Date(now2.getFullYear(), 0, 1);
    const ytdDb  = Math.floor((now2 - jan1) / 86400000);
    await sleep(600);
    const refYtdData = await tefasFetch(fonTur, ytdDb, 10); // Oca başı

    const ref1y  = refMap(ref1yData);
    const ref3m  = refMap(ref3mData);
    const ref1m  = refMap(ref1mData);
    const refYtd = refMap(refYtdData);

    // ── FONKODU bazında grupla (FONKODU: doğru alan adı!) ─────────
    const fundMap = {};
    for (const r of mainData) {
      const code = r.FONKODU;                        // Doğru alan: FONKODU
      if (!code || code === 'undefined') continue;
      if (!fundMap[code]) fundMap[code] = { info: r, recs: [] };
      fundMap[code].recs.push(r);
    }

    // ── Her fon için metrikler ────────────────────────────────────
    const pct = (cur, ref) =>
      (cur > 0 && ref > 0) ? parseFloat(((cur-ref)/ref*100).toFixed(2)) : null;

    let funds = Object.entries(fundMap).map(([code, { info, recs }]) => {
      const pts = recs
        .map(r => ({ price: parseFloat(r.FIYAT) || parseFloat(r.BORSABULTENFIYAT) || 0, date: parseInt(r.TARIH||0) }))
        .filter(p => p.price > 0)
        .sort((a,b) => b.date - a.date);

      const cur  = pts[0]?.price || 0;
      const old7 = pts[pts.length-1]?.price || 0;

      const shares = parseInt(info.TEDPAYSAYISI || 0);
      const aum    = shares > 0 ? parseFloat((shares * cur / 1e6).toFixed(2)) : 0;

      return {
        code,
        name:        info.FONUNVAN || code,
        category:    info.FONTUR   || fonTur,
        price:       cur,
        totalValueM: aum,
        investors:   parseInt(info.KISISAYISI || 0),
        ret1m:       pct(cur, ref1m[code]?.price),
        ret3m:       pct(cur, ref3m[code]?.price),
        ret1y:       pct(cur, ref1y[code]?.price),
        retYtd:      pct(cur, refYtd[code]?.price),
        ret7d:       pct(cur, old7),
        sharpe:      sharpe(pts.map(p=>p.price)),
        source:      'tefas',
        verified:    false
      };
    });

    // ── Filtre: min_size ──────────────────────────────────────────
    if (minSize > 0) funds = funds.filter(f => f.totalValueM >= minSize);

    // ── Sırala ───────────────────────────────────────────────────
    const VALID = ['ret1y','ret3m','ret1m','retYtd','ret7d','sharpe','totalValueM','investors','price'];
    const sf = VALID.includes(sortBy) ? sortBy : 'ret1y';
    funds.sort((a,b) => (b[sf] ?? -Infinity) - (a[sf] ?? -Infinity));
    funds = funds.slice(0, limit);

    // ── Yahoo Finance doğrulama (top 3) ──────────────────────────
    await Promise.all(funds.slice(0,3).map(async f => {
      const yp = await yahoo(f.code);
      if (yp) {
        const diff = Math.abs((yp - f.price) / f.price * 100);
        f.yahooPrice = yp;
        f.verified   = diff < 5;
        f.verifyNote = `Yahoo farkı: ${diff.toFixed(2)}%`;
      }
    }));

    const result = { funds, total: funds.length, source:'tefas', secondary:'yahoo_finance', updatedAt: new Date().toISOString() };
    if (kvEnabled()) await kvSet(cacheKey, result, 3600);
    return res.status(200).end(JSON.stringify(result));

  } catch(err) {
    console.error('fon-scan fatal:', err.message);
    return res.status(200).end(JSON.stringify({ funds:[], total:0, source:'tefas', error: err.message }));
  }
};
