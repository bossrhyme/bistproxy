const https = require('https');

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
    dax:    { open: 8,  close: 16 }, // 09:00-17:30 CET
    lse:    { open: 8,  close: 16 }, // 08:00-16:30 BST
    nikkei: { open: 0,  close: 6  }, // 09:00-15:30 JST
  };
  const h = hours[exchange] || { open: 8, close: 16 };
  return (hour >= h.open && hour < h.close) ? 300 : 1800; // açık:5dk kapalı:30dk
}

// ─────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────
function makeRequest(hostname, path, method, headers, body, callback) {
  const options = { hostname, path, method, headers };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(null, data, res.statusCode));
  });
  req.on('error', (err) => callback(err));
  if (body) req.write(body);
  req.end();
}

const EXCHANGE_CONFIG = {
  bist:   { tvPath: '/turkey/scan',  yahooSuffix: '.IS', currency: 'TRY',
            extraFilters: [{ left: 'typespecs', operation: 'has', right: ['common'] }] },
  nasdaq: { tvPath: '/america/scan', yahooSuffix: '',    currency: 'USD',
            extraFilters: [
              { left: 'exchange',   operation: 'equal', right: 'NASDAQ' },
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
            ] },
  sp500:  { tvPath: '/america/scan', yahooSuffix: '',    currency: 'USD',
            extraFilters: [
              { left: 'is_primary', operation: 'equal', right: true },
              { left: 'typespecs',  operation: 'has',   right: ['common'] },
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
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (kvEnabled()) {
    try {
      const rlKey = 'rl_' + clientIp.replace(/[^a-zA-Z0-9.]/g, '_') + '_' + Math.floor(Date.now() / 60000);
      const rlRaw = await fetchHttp(
        process.env.KV_REST_API_URL + '/incr/' + encodeURIComponent(rlKey),
        'POST', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
      );
      const rlJson = JSON.parse(rlRaw);
      const rlCount = rlJson.result || 0;
      if (rlCount === 1) {
        // İlk istek — TTL ayarla
        await fetchHttp(
          process.env.KV_REST_API_URL + '/expire/' + encodeURIComponent(rlKey) + '/60',
          'POST', { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
        );
      }
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
      'price_sales_current','return_on_equity','return_on_equity_fq',
      'return_on_assets','return_on_assets_fq','net_margin','gross_margin',
      'dividends_yield','dividends_yield_current','debt_to_equity_fq','total_debt_to_equity',
      'current_ratio','current_ratio_fq','sector','High.1M','Low.1M',
      'piotroski_f_score',
      'revenue_growth_ttm_yoy','total_revenue_change_ttm_yoy',
      'earnings_per_share_diluted_yoy_growth_ttm','earnings_per_share_change_ttm_yoy',
      'earnings_per_share_diluted_ttm',
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
      'price_sales_current','return_on_equity','return_on_equity_fq',
      'return_on_assets','return_on_assets_fq','net_margin','gross_margin',
      'dividends_yield','dividends_yield_current','debt_to_equity_fq','total_debt_to_equity',
      'current_ratio','current_ratio_fq','sector','High.1M','Low.1M',
      'piotroski_f_score','revenue_growth_ttm_yoy','total_revenue_change_ttm_yoy',
      'earnings_per_share_diluted_yoy_growth_ttm','earnings_per_share_change_ttm_yoy',
      'earnings_per_share_diluted_ttm',
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

    // Cache key: borsa + kolon listesi
    const colHash  = Buffer.from((merged.columns || []).join(',')).toString('base64').slice(0, 20);
    const cacheKey = 'df_v2_' + exchange + '_' + colHash; // v2: typespecs+is_primary filters
    const ttl      = getCacheTTL(exchange);

    // 1. Cache HIT?
    if (kvEnabled()) {
      const cached = await kvGet(cacheKey);
      if (cached) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).end(JSON.stringify(cached));
      }
    }

    // 2. Cache MISS → TradingView'dan çek
    const payload = JSON.stringify(merged);
    return new Promise((resolve) => {
      const headers = {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin':         'https://www.tradingview.com',
        'Referer':        'https://www.tradingview.com/',
        'Accept':         'application/json',
      };
      makeRequest('scanner.tradingview.com', cfg.tvPath, 'POST', headers, payload, async (err, data, statusCode) => {
        if (err) { res.status(500).json({ error: 'Veri alınamadı' }); return resolve(); }

        res.setHeader('Content-Type', 'application/json');
        try {
          const parsed = JSON.parse(data);
          // Sadece client'ın ihtiyacı olan meta — kaynak detayları gizli
          parsed._exchange  = exchange;
          parsed._currency  = cfg.currency;

          // 3. Cache'e yaz (response'u bloklamaz)
          if (kvEnabled() && parsed.data && parsed.data.length > 0) {
            kvSet(cacheKey, parsed, ttl).catch(() => {});
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
    const yhSym       = symbol + suffix;

    const fetchChart = (sym) => new Promise((resolve, reject) => {
      const path = '/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=' + yhInterval + '&range=' + yhRange + '&includePrePost=false';
      makeRequest('query1.finance.yahoo.com', path, 'GET', { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, null, (err, data) => {
        if (err) reject(err); else resolve(data);
      });
    });

    if (currency === 'USD' && suffix === '.IS') {
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
        const raw    = await fetchChart(yhSym);
        const result = JSON.parse(raw).chart.result[0];
        const q      = result.indicators.quote[0];
        const candles = result.timestamp.map((t, i) => ({
          t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i]||0
        })).filter(c => c.o != null && c.c != null);
        res.status(200).json({ s: 'ok', candles });
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
