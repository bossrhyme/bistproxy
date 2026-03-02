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

  // ── INSIDER — SEC EDGAR Form 4 ──
  if (action === 'insider') {
    const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    return new Promise(async (resolve) => {
      try {
        // 1. Ticker → CIK
        const tickerRes = await new Promise((res2, rej) => {
          makeRequest('data.sec.gov', '/files/company_tickers.json', 'GET',
            { 'User-Agent': 'DeepFin info@deepfin.com', 'Accept': 'application/json' },
            null, (err, data) => err ? rej(err) : res2(data));
        });
        const tickers = JSON.parse(tickerRes);
        let cik = null;
        for (const [, v] of Object.entries(tickers)) {
          if (v.ticker.toUpperCase() === symbol) {
            cik = String(v.cik_str).padStart(10, '0');
            break;
          }
        }
        if (!cik) { res.status(404).json({ error: `${symbol} CIK bulunamadi` }); return resolve(); }

        // 2. Form 4 listesi
        const subData = await new Promise((res2, rej) => {
          makeRequest('data.sec.gov', `/submissions/CIK${cik}.json`, 'GET',
            { 'User-Agent': 'DeepFin info@deepfin.com', 'Accept': 'application/json' },
            null, (err, data) => err ? rej(err) : res2(JSON.parse(data)));
        });

        const filings = subData.filings?.recent;
        if (!filings) { res.status(404).json({ error: 'Basvuru verisi yok' }); return resolve(); }

        // Form 4 indislerini bul (son 15)
        const form4Idx = [];
        for (let i = 0; i < filings.form.length && form4Idx.length < 15; i++) {
          if (filings.form[i] === '4') form4Idx.push(i);
        }

        // 3. Her Form 4 XML'ini çek ve parse et
        const results = [];
        for (const i of form4Idx.slice(0, 10)) {
          try {
            const acc = filings.accessionNumber[i].replace(/-/g, '');
            const doc = filings.primaryDocument[i];
            const cikNum = parseInt(cik);
            const xmlData = await new Promise((res2, rej) => {
              makeRequest('www.sec.gov',
                `/Archives/edgar/data/${cikNum}/${acc}/${doc}`, 'GET',
                { 'User-Agent': 'DeepFin info@deepfin.com' },
                null, (err, data) => err ? rej(err) : res2(data));
            });

            // Basit regex parse (XML parser yok Node'da)
            const get = (tag) => {
              const m = xmlData.match(new RegExp(`<${tag}[^>]*>([^<]*)<`, 'i'));
              return m ? m[1].trim() : '';
            };
            const getAll = (tag) => {
              const matches = [...xmlData.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)<`, 'gi'))];
              return matches.map(m => m[1].trim());
            };

            const owner = get('rptOwnerName');
            const title = get('officerTitle') || 'Director';
            const txCodes = getAll('transactionCode');
            const txShares = getAll('transactionShares');
            const txPrices = getAll('transactionPricePerShare');
            const txDates  = getAll('transactionDate');

            for (let t = 0; t < txCodes.length; t++) {
              const shares = parseFloat(txShares[t]) || 0;
              const price  = parseFloat(txPrices[t]) || 0;
              if (shares === 0) continue;
              results.push({
                date:   txDates[t]  || filings.reportDate[i] || filings.filingDate[i],
                owner:  owner || 'Bilinmiyor',
                title:  title,
                type:   txCodes[t],
                shares: shares,
                price:  price,
                value:  shares * price,
              });
            }
          } catch(e) { /* bu Form 4'ü atla */ }
        }

        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({ cik, results: results.slice(0, 20) });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
      resolve();
    });
  }

  // ── SHORT INTEREST — FINRA ──
  if (action === 'short') {
    const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    return new Promise(async (resolve) => {
      try {
        // FINRA OTCM short interest
        const filter = encodeURIComponent(JSON.stringify({
          filters: [{ fieldName: 'symbolCode', fieldValue: symbol, compareType: 'EQUAL' }]
        }));
        const data = await new Promise((res2, rej) => {
          makeRequest('api.finra.org',
            `/data/group/OTCMarket/name/consolidatedShortInterest?limit=1&filter=${filter}`, 'GET',
            { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            null, (err, data, status) => err ? rej(err) : res2({ data, status }));
        });

        const parsed = JSON.parse(data.data);
        if (!parsed || parsed.length === 0) {
          // FINRA ikinci endpoint
          const filter2 = encodeURIComponent(JSON.stringify({
            filters: [{ fieldName: 'issueSymbolIdentifier', fieldValue: symbol, compareType: 'EQUAL' }]
          }));
          const data2 = await new Promise((res2, rej) => {
            makeRequest('api.finra.org',
              `/data/group/otcMarket/name/otcShortInterest?limit=2&filter=${filter2}`, 'GET',
              { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
              null, (err, data) => err ? rej(err) : res2(data));
          });
          const parsed2 = JSON.parse(data2);
          if (!parsed2 || parsed2.length === 0) {
            res.status(404).json({ error: 'Veri bulunamadi' });
            return resolve();
          }
          res.status(200).json(parsed2[0]);
          return resolve();
        }
        res.status(200).json(parsed[0]);
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
      resolve();
    });
  }

  res.status(400).json({ error: 'Unknown action' });
};
