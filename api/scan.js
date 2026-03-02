const https = require('https');

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
  bist:   { tvPath: '/turkey/scan',  symbolPrefix: 'BIST:',   yahooSuffix: '.IS', currency: 'TRY', extraFilters: [] },
  nasdaq: { tvPath: '/america/scan', symbolPrefix: 'NASDAQ:', yahooSuffix: '',    currency: 'USD', extraFilters: [{ left: 'exchange', operation: 'equal', right: 'NASDAQ' }] },
  sp500:  { tvPath: '/america/scan', symbolPrefix: '',        yahooSuffix: '',    currency: 'USD', extraFilters: [{ left: 'is_primary', operation: 'equal', right: true }, { left: 'index', operation: 'equal', right: 'SP500' }] },
  dax:    { tvPath: '/germany/scan', symbolPrefix: 'XETR:',   yahooSuffix: '.DE', currency: 'EUR', extraFilters: [] },
  lse:    { tvPath: '/uk/scan',      symbolPrefix: 'LSE:',    yahooSuffix: '.L',  currency: 'GBP', extraFilters: [] },
  nikkei: { tvPath: '/japan/scan',   symbolPrefix: 'TSE:',    yahooSuffix: '.T',  currency: 'JPY', extraFilters: [] },
};

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url      = new URL(req.url, 'http://localhost');
  const action   = url.searchParams.get('action') || 'scan';
  const exchange = (url.searchParams.get('exchange') || 'bist').toLowerCase();
  const cfg      = EXCHANGE_CONFIG[exchange] || EXCHANGE_CONFIG.bist;

  // ── SCAN ──
  if (action === 'scan') {
    // Read body sent from client
    const rawBody = await new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
    });

    let clientPayload = {};
    try { clientPayload = JSON.parse(rawBody); } catch(e) {}

    // Merge: keep client columns/sort/range, inject exchange filters
    const merged = {
      columns: clientPayload.columns || ['name','close','change','volume','market_cap_basic'],
      range:   clientPayload.range   || [0, 500],
      sort:    clientPayload.sort    || { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    };

    // Only add filter if exchange needs it
    if (cfg.extraFilters.length > 0) {
      merged.filter = cfg.extraFilters;
    }

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
      makeRequest('scanner.tradingview.com', cfg.tvPath, 'POST', headers, payload, (err, data, statusCode) => {
        if (err) { res.status(500).json({ error: err.message }); return resolve(); }
        res.setHeader('Content-Type', 'application/json');
        // Inject meta for client
        try {
          const parsed = JSON.parse(data);
          parsed._exchange    = exchange;
          parsed._currency    = cfg.currency;
          parsed._yahooSuffix = cfg.yahooSuffix;
          res.status(statusCode).end(JSON.stringify(parsed));
        } catch(e) {
          res.status(statusCode).end(data);
        }
        resolve();
      });
    });
  }

  // ── CHART — Yahoo Finance ──
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
      const path = `/v8/finance/chart/${encodeURIComponent(sym)}?interval=${yhInterval}&range=${yhRange}&includePrePost=false`;
      const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
      makeRequest('query1.finance.yahoo.com', path, 'GET', headers, null, (err, data) => {
        if (err) reject(err); else resolve(data);
      });
    });

    // BIST USD mode — divide by USDTRY
    if (currency === 'USD' && suffix === '.IS') {
      return new Promise(async (resolve) => {
        try {
          const [stockRaw, fxRaw] = await Promise.all([fetchChart(yhSym), fetchChart('USDTRY=X')]);
          const sq  = JSON.parse(stockRaw).chart.result[0];
          const fq  = JSON.parse(fxRaw).chart.result[0];
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

    // Direct (TL or non-BIST USD)
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

  res.status(400).json({ error: 'Unknown action' });
};
