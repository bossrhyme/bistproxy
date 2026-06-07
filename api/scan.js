const https = require('https');

// ─────────────────────────────────────────────
// In-memory fallback cache (aynı serverless instance içinde KV down olunca devreye girer)
// ─────────────────────────────────────────────
const _memCache = new Map();
function memGet(key) {
  const e = _memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { _memCache.delete(key); return null; }
  return e.data;
}
function memSet(key, data, ttlSeconds) {
  if (_memCache.size >= 60) { // bellek sınırı: ~60 entry
    _memCache.delete(_memCache.keys().next().value);
  }
  _memCache.set(key, { data, exp: Date.now() + ttlSeconds * 1000 });
}

// ─────────────────────────────────────────────
// Vercel KV Cache — scan action için
// Env variables: KV_REST_API_URL, KV_REST_API_TOKEN
// Vercel dashboard > Storage > KV'den otomatik inject edilir
// ─────────────────────────────────────────────
function kvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function fetchHttp(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method, headers: { ...headers } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function kvGet(key) {
  try {
    const raw = await fetchHttp(
      process.env.KV_REST_API_URL + '/get/' + encodeURIComponent(key),
      'GET', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
    );
    const json = JSON.parse(raw);
    return json.result ? JSON.parse(json.result) : null;
  } catch(e) { return null; }
}

async function kvSet(key, value, ttlSeconds) {
  try {
    await fetchHttp(
      process.env.KV_REST_API_URL + '/set/' + encodeURIComponent(key) + '?ex=' + ttlSeconds,
      'POST',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
      JSON.stringify(value)
    );
  } catch(e) { /* cache yazma hatası kritik değil */ }
}

// Borsa saatlerine göre cache süresi
function getCacheTTL(exchange) {
  const now  = new Date();
  const hour = now.getUTCHours();
  const day  = now.getUTCDay(); // 0=Pazar, 6=Cumartesi
  if (day === 0 || day === 6) return 1800; // hafta sonu: 30dk

  const hours = {
    bist:   { open: 7,  close: 14 }, // 10:00-17:00 TRT
    nasdaq: { open: 14, close: 21 }, // 09:30-16:00 ET
    sp500:  { open: 14, close: 21 },
    nyse:   { open: 14, close: 21 },
    dax:    { open: 8,  close: 16 }, // 09:00-17:30 CET
    lse:    { open: 8,  close: 16 }, // 08:00-16:30 BST
    nikkei: { open: 0,  close: 6  }, // 09:00-15:30 JST
    dublin:    { open: 8, close: 16 }, // 09:00-17:30 IST
    lisbon:    { open: 8, close: 16 }, // 09:00-17:30 WET/WEST
    brussels:  { open: 8, close: 16 }, // 09:00-17:30 CET
    amsterdam: { open: 8, close: 16 }, // 09:00-17:30 CET
    france: { open: 8,  close: 16 }, // 09:00-17:30 CET
    moex:   { open: 7,  close: 16 }, // 09:50-18:45 MSK (UTC+3)
    oslo:   { open: 8,  close: 16 }, // 09:00-17:30 CET
    milan:  { open: 8,  close: 16 }, // 09:00-17:30 CET
    tsx:    { open: 14, close: 21 }, // 09:30-16:00 EST
    twse:   { open: 1,  close: 6  }, // 09:00-13:30 TST (UTC+8)
    b3:     { open: 13, close: 21 }, // 10:00-17:55 BRT (UTC-3)
    hkex:   { open: 1,  close: 8  }, // 09:30-16:00 HKT (UTC+8)
    china:  { open: 1,  close: 7  }, // 09:30-15:00 CST (UTC+8)
    saudi:       { open: 7,  close: 12 }, // 10:00-15:00 AST (UTC+3)
    sweden:      { open: 8,  close: 16 }, // 09:00-17:30 CET (UTC+1)
    india:       { open: 4,  close: 10 }, // 09:15-15:30 IST (UTC+5:30)
    uae:         { open: 6,  close: 12 }, // 10:00-14:00 GST (UTC+4)
    switzerland: { open: 8,  close: 16 }, // 09:00-17:30 CET (UTC+1)
    australia:    { open: 0,  close: 6  }, // 10:00-16:00 AEST (UTC+10)
    southafrica:  { open: 7,  close: 15 }, // 09:00-17:00 SAST (UTC+2)
  };
  const h = hours[exchange] || { open: 8, close: 16 };
  return (hour >= h.open && hour < h.close) ? 300 : 1800; // açık:5dk kapalı:30dk
}

// ─────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────
function makeRequest(hostname, path, method, headers, body, callback, timeoutMs = 8000) {
  const options = { hostname, path, method, headers };
  let done = false;
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => { if (!done) { done = true; callback(null, data, res.statusCode); } });
  });
  req.setTimeout(timeoutMs, () => {
    if (!done) { done = true; req.destroy(); callback(new Error('timeout')); }
  });
  req.on('error', (err) => { if (!done) { done = true; callback(err); } });
  if (body) req.write(body);
  req.end();
}

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  yahooSuffix: '.IS', currency: 'TRY',
            extraFilters: [
              { left: 'typespecs', operation: 'has', right: ['common'] },
            ] },
  nasdaq: { tvPath: '/america/scan', yahooSuffix: '',    currency: 'USD',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'NASDAQ' },
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
  sp500:  { tvPath: '/america/scan', yahooSuffix: '',    currency: 'USD',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
  dax:    { tvPath: '/germany/scan', yahooSuffix: '.DE', currency: 'EUR',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  lse:    { tvPath: '/uk/scan',      yahooSuffix: '.L',  currency: 'GBP',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  nikkei: { tvPath: '/japan/scan',   yahooSuffix: '.T',  currency: 'JPY',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'TSE' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  nyse:   { tvPath: '/america/scan', yahooSuffix: '',    currency: 'USD',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'NYSE' },
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
  krx:    { tvPath: '/korea/scan',   yahooSuffix: '.KS', currency: 'KRW',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'KRX' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  dublin:    { tvPath: '/ireland/scan',     yahooSuffix: '.IR', currency: 'EUR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'EURONEXT' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  lisbon:    { tvPath: '/portugal/scan',    yahooSuffix: '.LS', currency: 'EUR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'EURONEXT' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  brussels:  { tvPath: '/belgium/scan',     yahooSuffix: '.BR', currency: 'EUR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'EURONEXT' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  amsterdam: { tvPath: '/netherlands/scan', yahooSuffix: '.AS', currency: 'EUR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'EURONEXT' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  france: { tvPath: '/france/scan',  yahooSuffix: '.PA', currency: 'EUR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'EURONEXT' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  moex:   { tvPath: '/russia/scan',  yahooSuffix: '.ME', currency: 'RUB',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  oslo:   { tvPath: '/norway/scan',  yahooSuffix: '.OL', currency: 'NOK',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  milan:  { tvPath: '/italy/scan',   yahooSuffix: '.MI', currency: 'EUR',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  tsx:    { tvPath: '/canada/scan',  yahooSuffix: '.TO', currency: 'CAD',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'TSX' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  twse:   { tvPath: '/taiwan/scan',  yahooSuffix: '.TW', currency: 'TWD',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'TWSE' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  b3:     { tvPath: '/brazil/scan',  yahooSuffix: '.SA', currency: 'BRL',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'BMFBOVESPA' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  hkex:   { tvPath: '/hongkong/scan', yahooSuffix: '.HK', currency: 'HKD',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'HKEX' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  china:  { tvPath: '/china/scan',        yahooSuffix: '.SS', currency: 'CNY',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  saudi:  { tvPath: '/global/scan', yahooSuffix: '.SR', currency: 'SAR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'TADAWUL' },
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
  switzerland: { tvPath: '/switzerland/scan', yahooSuffix: '.SW', currency: 'CHF',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  australia:   { tvPath: '/australia/scan',    yahooSuffix: '.AX', currency: 'AUD',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'ASX' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  southafrica: { tvPath: '/global/scan',        yahooSuffix: '.JO', currency: 'ZAR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'JSE' },
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
  sweden:      { tvPath: '/sweden/scan',        yahooSuffix: '.ST', currency: 'SEK',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
  india:       { tvPath: '/india/scan',          yahooSuffix: '.NS', currency: 'INR',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'NSE' },
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
  uae:         { tvPath: '/uae/scan',           yahooSuffix: '.DU', currency: 'AED',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
            ] },
};

module.exports = async function(req, res) {
  // ── CORS: sadece kendi domain'imize izin ver ──
  const ALLOWED_ORIGINS = [
    'https://deepfin.vercel.app',
    'https://bistproxy.vercel.app',
    'https://www.deepfin.com',
  ];
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url      = new URL(req.url, 'http://localhost');
  const action   = url.searchParams.get('action') || 'scan';
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  const cfg      = EXCHANGE_CONFIG[exchange] || EXCHANGE_CONFIG.bist;

  // ── RATE LIMIT: IP başına dakikada 60 istek ──
  // Vercel'in x-real-ip header'ı gerçek client IP'sini verir (manipüle edilemez)
  // Yoksa x-forwarded-for zincirinin son geçerli IP'si alınır
  const xForwardedFor = req.headers['x-forwarded-for'] || '';
  const xRealIp = req.headers['x-real-ip'] || '';
  const clientIp = xRealIp || xForwardedFor.split(',').map(s => s.trim()).filter(Boolean).pop() || 'unknown';
  if (kvEnabled()) {
    try {
      const rlKey = 'rl_' + clientIp.replace(/[^a-zA-Z0-9.:]/g, '_') + '_' + Math.floor(Date.now() / 60000);
      // SET NX EX atomik olarak key'i oluşturur ve TTL'yi tek seferde ayarlar
      await fetchHttp(
        process.env.KV_REST_API_URL + '/set/' + encodeURIComponent(rlKey) + '?nx=true&ex=60',
        'POST',
        { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
        JSON.stringify(0)
      ).catch(() => {});
      const rlRaw = await fetchHttp(
        process.env.KV_REST_API_URL + '/incr/' + encodeURIComponent(rlKey),
        'POST', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
      );
      const rlJson = JSON.parse(rlRaw);
      const rlCount = rlJson.result || 0;
      if (rlCount > 60) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Çok fazla istek. Lütfen bir dakika bekleyin.' });
      }
    } catch(e) { /* rate limit hatası kritik değil, devam et */ }
  }

  // ── SCAN ──────────────────────────────────
  if (action === 'scan') {
    const rawBody = await new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
    });

    let clientPayload = {};
    try { clientPayload = JSON.parse(rawBody); } catch(e) {}

    // ── Payload whitelist: client'ın gönderebileceği kolonlar ──
    const ALLOWED_COLS = new Set([
      'name','description','close','change','change_abs','volume','average_volume_10d_calc',
      'market_cap_basic','price_earnings_ttm','price_book_fq','price_book_ratio',
      'price_sales_current','price_to_revenue_ratio','return_on_equity','return_on_equity_fq',
      'return_on_assets','return_on_assets_fq','net_margin','gross_margin',
      'dividends_yield','dividends_yield_current','debt_to_equity_fq','total_debt_to_equity',
      'current_ratio','current_ratio_fq','sector','High.1M','Low.1M',
      'piotroski_f_score',
      'revenue_growth_ttm_yoy','total_revenue_change_ttm_yoy',
      'earnings_per_share_diluted_yoy_growth_ttm','earnings_per_share_change_ttm_yoy',
      'earnings_per_share_diluted_ttm',
      'Recommend.All','Recommend.MA','Recommend.Other',
      'Perf.3M','Perf.6M','Perf.Y','Perf.W',
      'RSI',
      'float_shares_outstanding_percent',
      'is_primary','typespecs','exchange','index',
    ]);
    const rawCols = clientPayload.columns || ['name','close','change','volume','market_cap_basic'];
    const safeCols = rawCols.filter(c => ALLOWED_COLS.has(c));
    const safeRange = [0, Math.min(Number(clientPayload.range?.[1]) || 500, 5000)];

    const merged = {
      columns: safeCols.length > 0 ? safeCols : ['name','close','change','volume','market_cap_basic'],
      range:   safeRange,
      sort:    clientPayload.sort || { sortBy: 'market_cap_basic', sortOrder: 'desc' },
      ignore_unknown_fields: true,
    };

    // Client filter'larını güvenli şekilde ekle (whitelist'ten geçir)
    const ALLOWED_FILTER_FIELDS = new Set([
      'name','close','change','change_abs','volume','average_volume_10d_calc',
      'market_cap_basic','price_earnings_ttm','price_book_fq','price_book_ratio',
      'price_sales_current','price_to_revenue_ratio','price_to_revenue_ratio','return_on_equity','return_on_equity_fq',
      'return_on_assets','return_on_assets_fq','net_margin','gross_margin',
      'dividends_yield','dividends_yield_current','debt_to_equity_fq','total_debt_to_equity',
      'current_ratio','current_ratio_fq','sector','High.1M','Low.1M',
      'piotroski_f_score','revenue_growth_ttm_yoy','total_revenue_change_ttm_yoy',
      'earnings_per_share_diluted_yoy_growth_ttm','earnings_per_share_change_ttm_yoy',
      'earnings_per_share_diluted_ttm',
      'Perf.W','float_shares_outstanding_percent',
      'is_primary','typespecs','exchange','index',
    ]);
    const ALLOWED_OPS = new Set(['greater','less','egreater','eless','equal','nequal','in_range','not_in_range','has','has_none_of']);
    const clientFilters = Array.isArray(clientPayload.filter)
      ? clientPayload.filter.filter(f =>
          f && typeof f.left === 'string' && ALLOWED_FILTER_FIELDS.has(f.left) &&
          typeof f.operation === 'string' && ALLOWED_OPS.has(f.operation)
        )
      : [];

    // extraFilters (borsa bazlı) + client filtreleri birleştir
    const baseFilters = cfg.extraFilters.length > 0 ? cfg.extraFilters : [];
    if (baseFilters.length > 0 || clientFilters.length > 0) {
      merged.filter = [...baseFilters, ...clientFilters];
    }

    // Cache key: borsa + kolon listesi (sıralanmış — client farklı sıra gönderse de aynı cache'e düşer)
    const colHash  = Buffer.from([...(merged.columns || [])].sort().join(',')).toString('base64').slice(0, 20);
    const cacheKey = 'df_v4_' + exchange + '_' + colHash; // v4: country-specific paths for india/sweden/uae
    const ttl      = getCacheTTL(exchange);

    // Her tarama isteğinde sayacı artır (cache hit/miss fark etmez)
    if (kvEnabled()) {
      fetchHttp(process.env.KV_REST_API_URL + '/incr/df_total_scans', 'POST',
        { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }).catch(() => {});
    }

    // 1. Cache HIT? — önce KV, yoksa in-memory fallback
    const memHit = memGet(cacheKey);
    if (memHit) {
      if (!memHit.columns) memHit.columns = safeCols;
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).end(JSON.stringify(memHit));
    }
    if (kvEnabled()) {
      const cached = await kvGet(cacheKey);
      if (cached) {
        if (!cached.columns) cached.columns = safeCols;
        memSet(cacheKey, cached, Math.min(ttl, 300)); // in-memory'ye de al
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).end(JSON.stringify(cached));
      }
    }

    // 2. Cache MISS → TradingView'dan çek
    const payload = JSON.stringify(merged);
    return new Promise((resolve) => {
      const headers = {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(payload),
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin':          'https://www.tradingview.com',
        'Referer':         'https://www.tradingview.com/',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-fetch-dest':  'empty',
        'sec-fetch-mode':  'cors',
        'sec-fetch-site':  'same-site',
      };
      makeRequest('scanner.tradingview.com', cfg.tvPath, 'POST', headers, payload, async (err, data, statusCode) => {
        if (err) {
          const msg = err.message === 'timeout' ? 'İstek zaman aşımına uğradı' : 'Veri alınamadı';
          res.status(504).json({ error: msg });
          return resolve();
        }

        res.setHeader('Content-Type', 'application/json');
        try {
          const parsed = JSON.parse(data);
          parsed._exchange  = exchange;
          parsed._currency  = cfg.currency;
          parsed.columns    = merged.columns;

          // 3. Cache'e yaz — KV + in-memory
          if (parsed.data && parsed.data.length > 0) {
            memSet(cacheKey, parsed, Math.min(ttl, 300));
            if (kvEnabled()) {
              kvSet(cacheKey, parsed, ttl).catch(() => {});
            }
          }

          res.status(statusCode).end(JSON.stringify(parsed));
        } catch(e) {
          res.status(statusCode).end(data);
        }
        resolve();
      });
    });
  }

  // ── CHART — Yahoo Finance ──────────────────
  if (action === 'chart') {
    const symbol   = (url.searchParams.get('symbol') || 'TUPRS').toUpperCase();
    const interval = url.searchParams.get('interval') || '240';
    const currency = url.searchParams.get('currency') || 'TL';
    const suffix   = url.searchParams.get('suffix') !== null ? url.searchParams.get('suffix') : '.IS';

    const intervalMap = { '240': '1h', 'D': '1d', 'W': '1wk' };
    const rangeMap    = { '240': '30d', 'D': '6mo', 'W': '2y' };
    const yhInterval  = intervalMap[interval] || '1h';
    const yhRange     = rangeMap[interval]    || '30d';

    // Çin hisseleri: 6 ile başlayanlar SSE (.SS), diğerleri SZSE (.SZ)
    let activeSuffix = suffix;
    if (suffix === '.SS' && !/^6/.test(symbol)) activeSuffix = '.SZ';
    if (suffix === '.SZ' && /^6/.test(symbol))  activeSuffix = '.SS';
    const altSuffix = activeSuffix === '.SS' ? '.SZ' : activeSuffix === '.SZ' ? '.SS' : null;
    const yhSym = symbol + activeSuffix;

    const fetchChart = (sym) => new Promise((resolve, reject) => {
      const path = '/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=' + yhInterval + '&range=' + yhRange + '&includePrePost=false';
      makeRequest('query1.finance.yahoo.com', path, 'GET', { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, null, (err, data) => {
        if (err) reject(err); else resolve(data);
      });
    });

    // Veriyi parse eder, başarısızsa null döner
    function parseCandles(raw) {
      try {
        const result = JSON.parse(raw).chart.result[0];
        if (!result || !result.timestamp) return null;
        const q = result.indicators.quote[0];
        const candles = result.timestamp.map((t, i) => ({
          t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0
        })).filter(c => c.o != null && c.c != null);
        return candles.length > 0 ? candles : null;
      } catch(_) { return null; }
    }

    if (currency === 'USD' && activeSuffix === '.IS') {
      return new Promise(async (resolve) => {
        try {
          const [stockRaw, fxRaw] = await Promise.all([fetchChart(yhSym), fetchChart('USDTRY=X')]);
          const sq = JSON.parse(stockRaw).chart.result[0];
          const fq = JSON.parse(fxRaw).chart.result[0];
          const fxMap = {};
          fq.timestamp.forEach((t, i) => { fxMap[t] = fq.indicators.quote[0].close[i]; });
          const q = sq.indicators.quote[0];
          const candles = sq.timestamp.map((t, i) => {
            let fx = fxMap[t];
            if (!fx) { const n = fq.timestamp.reduce((a,b) => Math.abs(b-t)<Math.abs(a-t)?b:a); fx = fxMap[n]; }
            if (!fx) return null;
            const [o,h,l,c] = [q.open[i],q.high[i],q.low[i],q.close[i]];
            if (o==null||c==null) return null;
            return { t, o: o/fx, h: h/fx, l: l/fx, c: c/fx, v: q.volume[i]||0 };
          }).filter(Boolean);
          res.status(200).json({ s: 'ok', candles });
        } catch(e) { res.status(500).json({ error: e.message }); }
        resolve();
      });
    }

    return new Promise(async (resolve) => {
      try {
        const raw = await fetchChart(yhSym);
        let candles = parseCandles(raw);
        // Başarısızsa alternatif suffix ile tekrar dene (SSE ↔ SZSE)
        if (!candles && altSuffix) {
          const raw2 = await fetchChart(symbol + altSuffix);
          candles = parseCandles(raw2);
        }
        if (candles) {
          res.status(200).json({ s: 'ok', candles });
        } else {
          res.status(200).json({ s: 'no_data', candles: [] });
        }
      } catch(e) { res.status(500).json({ error: e.message }); }
      resolve();
    });
  }

  // ── INSIDER — SEC EDGAR Form 4 ────────────
  if (action === 'insider') {
    const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    return new Promise(async (resolve) => {
      try {
        const tickerSearch = await new Promise((res2, rej) => {
          makeRequest('www.sec.gov',
            '/cgi-bin/browse-edgar?company=&CIK=' + symbol + '&type=4&dateb=&owner=include&count=1&search_text=&action=getcompany&output=atom',
            'GET', { 'User-Agent': 'DeepFin info@deepfin.com', 'Accept': '*/*' },
            null, (err, data) => err ? rej(err) : res2(data));
        });

        const cikMatch = tickerSearch.match(/CIK=(\d+)/i) || tickerSearch.match(/cik>(\d+)</i);
        let cik = cikMatch ? String(parseInt(cikMatch[1])).padStart(10, '0') : null;

        if (!cik) {
          const exData = await new Promise((res2, rej) => {
            makeRequest('data.sec.gov', '/files/company_tickers_exchange.json', 'GET',
              { 'User-Agent': 'DeepFin info@deepfin.com' },
              null, (err, data) => err ? rej(err) : res2(data));
          });
          const exJson = JSON.parse(exData);
          const fields = exJson.fields;
          const tickerIdx = fields.indexOf('ticker');
          const cikIdx = fields.indexOf('cik');
          const found = exJson.data.find(row => row[tickerIdx] && row[tickerIdx].toUpperCase() === symbol);
          if (found) cik = String(found[cikIdx]).padStart(10, '0');
        }

        if (!cik) { res.status(404).json({ error: symbol + ' bulunamadi' }); return resolve(); }

        const subData = await new Promise((res2, rej) => {
          makeRequest('data.sec.gov', '/submissions/CIK' + cik + '.json', 'GET',
            { 'User-Agent': 'DeepFin info@deepfin.com', 'Accept': 'application/json' },
            null, (err, data) => err ? rej(err) : res2(JSON.parse(data)));
        });

        const filings = subData.filings?.recent;
        if (!filings) { res.status(404).json({ error: 'Basvuru verisi yok' }); return resolve(); }

        const form4Idx = [];
        for (let i = 0; i < filings.form.length && form4Idx.length < 15; i++) {
          if (filings.form[i] === '4') form4Idx.push(i);
        }

        const results = [];
        for (let fi = 0; fi < Math.min(form4Idx.length, 10); fi++) {
          const i = form4Idx[fi];
          try {
            const acc = filings.accessionNumber[i].replace(/-/g, '');
            const doc = filings.primaryDocument[i];
            const xmlData = await new Promise((res2, rej) => {
              makeRequest('www.sec.gov',
                '/Archives/edgar/data/' + parseInt(cik) + '/' + acc + '/' + doc, 'GET',
                { 'User-Agent': 'DeepFin info@deepfin.com', 'Accept': 'text/xml,application/xml,*/*' },
                null, (err, data) => err ? rej(err) : res2(data));
            });
            if (!xmlData || xmlData.trim().startsWith('<!DOCTYPE') || xmlData.trim().startsWith('<html')) continue;
            const get = (tag) => { const m = new RegExp('<' + tag + '[^>]*>([^<]*)<', 'i').exec(xmlData); return m ? m[1].trim() : ''; };
            const getAll = (tag) => { const r=new RegExp('<'+tag+'[^>]*>([^<]*)<','gi'),res2=[]; let mx; while((mx=r.exec(xmlData))!==null)res2.push(mx[1].trim()); return res2; };
            const owner = get('rptOwnerName');
            const title = get('officerTitle') || 'Director';
            const txCodes=getAll('transactionCode'), txShares=getAll('transactionShares'), txPrices=getAll('transactionPricePerShare'), txDates=getAll('transactionDate');
            for (let t = 0; t < txCodes.length; t++) {
              const shares = parseFloat(txShares[t]) || 0;
              const price  = parseFloat(txPrices[t]) || 0;
              if (shares === 0) continue;
              results.push({ date: txDates[t] || filings.filingDate[i], owner: owner||'Bilinmiyor', title, type: txCodes[t], shares, price, value: shares*price });
            }
          } catch(e) {}
        }
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({ cik, results: results.slice(0, 20) });
      } catch(e) { res.status(500).json({ error: e.message }); }
      resolve();
    });
  }

  // ── SHORT INTEREST — Nasdaq API ───────────
  if (action === 'short') {
    const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    return new Promise(async (resolve) => {
      try {
        const nasdaqData = await new Promise((res2, rej) => {
          makeRequest('api.nasdaq.com',
            '/api/quote/' + symbol + '/short-interest?assetClass=stocks', 'GET',
            { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Origin': 'https://www.nasdaq.com', 'Referer': 'https://www.nasdaq.com/' },
            null, (err, data) => err ? rej(err) : res2(data));
        });
        const json = JSON.parse(nasdaqData);
        if (!json.data?.shortInterestTable) throw new Error('Veri yok');
        const rows = json.data.shortInterestTable.rows || [];
        if (rows.length === 0) throw new Error('Satir yok');

        let floatShares = null;
        try {
          const sData = await new Promise((res2, rej) => {
            makeRequest('api.nasdaq.com', '/api/quote/' + symbol + '/summary?assetClass=stocks', 'GET',
              { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Origin': 'https://www.nasdaq.com', 'Referer': 'https://www.nasdaq.com/' },
              null, (err, data) => err ? rej(err) : res2(data));
          });
          const sJson = JSON.parse(sData);
          floatShares = sJson.data?.summaryData?.ShareFloat?.value || null;
        } catch(e) {}

        res.status(200).json({ source: 'nasdaq', symbol, rows: rows.slice(0, 10), floatShares });
      } catch(e) { res.status(500).json({ error: e.message }); }
      resolve();
    });
  }

  res.status(400).json({ error: 'Unknown action' });
};
