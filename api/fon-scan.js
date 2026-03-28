const https = require('https');

// ── Yardımcı: HTTPS isteği ────────────────────────────────────────────
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

// ── TEFAS — tüm fonları çek ──────────────────────────────────────────
// POST https://www.tefas.gov.tr/api/DB/BindHistoryInfo
// fontip: YAT (yatırım fonu) | EMK (emeklilik) | BYF (borsa yatırım fonu)
// bastarih/bittarih: DD.MM.YYYY
// fonkod: boş = tümü

async function fetchTefasFunds(fonkod = '') {
  const today = new Date();
  const fmt = (d) => d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g, '.');
  const bittarih  = fmt(today);
  const bastarih  = fmt(new Date(today - 7 * 86400000)); // Son 7 gün

  const payload = new URLSearchParams({
    fontip: 'YAT',
    fonkod: fonkod,
    bastarih,
    bittarih
  }).toString();

  const r = await makeReq(
    'www.tefas.gov.tr',
    '/api/DB/BindHistoryInfo',
    'POST',
    {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
      'Origin': 'https://www.tefas.gov.tr'
    },
    payload
  );

  if (r.status !== 200) throw new Error('TEFAS HTTP ' + r.status);
  return JSON.parse(r.body);
}

// ── Yahoo Finance doğrulama: NAV ve fon bilgisi ──────────────────────
// Yahoo'da TEFAS fonları .IS suffix ile aranabiliyor
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
    const quotes = result.indicators.quote[0];
    const closes = quotes.close.filter(Boolean);
    return {
      source: 'yahoo',
      lastPrice: closes[closes.length - 1],
      currency: result.meta?.currency || 'TRY'
    };
  } catch(e) { return null; }
}

// ── Performans hesapla ───────────────────────────────────────────────
function calcReturns(records) {
  // records: [{TARIH, FIYAT, ...}] - en yeniden en eskiye
  if (!records || records.length < 2) return {};
  const prices = records
    .map(r => ({ date: parseInt(r.TARIH), price: parseFloat(r.FIYAT) }))
    .filter(r => r.price > 0)
    .sort((a, b) => b.date - a.date);

  const latest = prices[0]?.price;
  if (!latest) return {};

  const find = (daysAgo) => {
    const target = Date.now() - daysAgo * 86400000;
    return prices.find(p => p.date * 1000 <= target)?.price;
  };

  const ret = (old) => old ? ((latest - old) / old * 100) : null;
  return {
    price: latest,
    ret1m:  ret(find(30)),
    ret3m:  ret(find(90)),
    ret6m:  ret(find(180)),
    ret1y:  ret(find(365)),
    retYtd: ret(prices[prices.length - 1]?.price),
  };
}

// ── Sharpe oranı (basit) ─────────────────────────────────────────────
function calcSharpe(records, riskFreeAnnual = 0.45) {
  if (!records || records.length < 20) return null;
  const prices = records
    .map(r => parseFloat(r.FIYAT))
    .filter(p => p > 0);
  if (prices.length < 10) return null;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }

  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - avg) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;

  const annualReturn = avg * 252;
  const annualStd = stdDev * Math.sqrt(252);
  return parseFloat(((annualReturn - riskFreeAnnual) / annualStd).toFixed(2));
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

  const url = new URL(req.url, 'https://x');
  const fonTur   = url.searchParams.get('fontur')  || 'YAT'; // YAT|EMK|BYF
  const fonkod   = url.searchParams.get('fonkod')  || '';
  const minRet1y = parseFloat(url.searchParams.get('min_ret1y') || '0');
  const minSharpe= parseFloat(url.searchParams.get('min_sharpe')|| '0');
  const minSize  = parseFloat(url.searchParams.get('min_size')  || '0'); // Min büyüklük ₺M
  const sortBy   = url.searchParams.get('sort') || 'ret1y';
  const limit    = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

  // Cache key
  const cacheKey = `df_fon_v1_${fonTur}_${sortBy}_${limit}`;
  if (kvEnabled()) {
    const cached = await kvGet(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).end(JSON.stringify(cached));
    }
  }

  try {
    // 1. TEFAS'tan ham veri
    const tefasRaw = await fetchTefasFunds(fonkod);
    const records  = tefasRaw?.data || [];

    if (!records.length) {
      return res.status(200).json({ funds: [], total: 0, source: 'tefas', error: 'Veri yok' });
    }

    // 2. Fonları grupla (FONKOD bazında son 30 gün kayıt)
    const fundMap = {};
    for (const r of records) {
      const code = r.FONKOD;
      if (!fundMap[code]) fundMap[code] = { info: r, prices: [] };
      fundMap[code].prices.push(r);
    }

    // 3. Her fon için hesapla
    let funds = Object.entries(fundMap).map(([code, { info, prices }]) => {
      const perf   = calcReturns(prices);
      const sharpe = calcSharpe(prices);
      const totalValue = parseFloat(info.PORTFOYBUYUKLUGU || 0); // ₺

      return {
        code,
        name:       info.FONUNVAN || code,
        category:   info.FONTUR || fonTur,
        price:      perf.price || parseFloat(info.FIYAT || 0),
        totalValueM: totalValue / 1e6, // Milyon ₺
        investors:  parseInt(info.YATIRIMCI_SAYISI || 0),
        ret1m:      perf.ret1m,
        ret3m:      perf.ret3m,
        ret6m:      perf.ret6m,
        ret1y:      perf.ret1y,
        retYtd:     perf.retYtd,
        sharpe,
        source:     'tefas',
        verified:   false
      };
    });

    // 4. Filtrele
    if (minRet1y) funds = funds.filter(f => f.ret1y != null && f.ret1y >= minRet1y);
    if (minSharpe) funds = funds.filter(f => f.sharpe != null && f.sharpe >= minSharpe);
    if (minSize)   funds = funds.filter(f => f.totalValueM >= minSize);

    // 5. Sırala
    funds.sort((a, b) => {
      const va = a[sortBy] ?? -Infinity;
      const vb = b[sortBy] ?? -Infinity;
      return vb - va;
    });

    funds = funds.slice(0, limit);

    // 6. İlk 5 fon için Yahoo Finance doğrulama (rate limit için sadece top 5)
    const top5 = funds.slice(0, 5);
    await Promise.all(top5.map(async (f) => {
      const ydata = await verifyWithYahoo(f.code);
      if (ydata && ydata.lastPrice) {
        const diff = Math.abs((ydata.lastPrice - f.price) / f.price * 100);
        f.yahooPrice  = ydata.lastPrice;
        f.priceMatch  = diff < 2; // %2 tolerans
        f.verified    = diff < 5;
        f.verifyNote  = f.priceMatch
          ? `Yahoo ile uyuşuyor (${diff.toFixed(2)}% fark)`
          : `Yahoo farkı: ${diff.toFixed(2)}%`;
      }
    }));

    const result = {
      funds,
      total:     funds.length,
      source:    'tefas',
      secondary: 'yahoo_finance',
      updatedAt: new Date().toISOString()
    };

    // 7. Cache'e yaz (1 saat)
    if (kvEnabled()) await kvSet(cacheKey, result, 3600);

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify(result));

  } catch (err) {
    console.error('fon-scan error:', err);
    return res.status(500).json({ error: err.message, funds: [] });
  }
};
