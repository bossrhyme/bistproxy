const https = require('https');

function makeRequest(hostname, path, callback) {
  const options = {
    hostname,
    path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    }
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(null, data, res.statusCode));
  });
  req.on('error', (err) => callback(err));
  req.end();
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const action = url.searchParams.get('action') || 'scan';

  // ── SCAN ──
  if (action === 'scan') {
    const payload = JSON.stringify({
      columns: [
        'name', 'close', 'change', 'volume',
        'market_cap_basic', 'price_earnings_ttm',
        'price_book_fq', 'price_sales_current',
        'return_on_equity_fq', 'return_on_assets_fq',
        'net_margin', 'gross_margin',
        'dividends_yield', 'debt_to_equity_fq',
        'current_ratio_fq', 'sector', 'High.1M', 'Low.1M'
      ],
      range: [0, 500],
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' }
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'scanner.tradingview.com',
        path: '/turkey/scan',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/'
        }
      };
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.status(response.statusCode).end(data);
          resolve();
        });
      });
      request.on('error', (err) => { res.status(500).json({ error: err.message }); resolve(); });
      request.write(payload);
      request.end();
    });
  }

  // ── CHART — Yahoo Finance ──
  if (action === 'chart') {
    const symbol = (url.searchParams.get('symbol') || 'TUPRS').toUpperCase();
    const interval = url.searchParams.get('interval') || '240';
    const currency = url.searchParams.get('currency') || 'TL';

    // Yahoo Finance interval/range mapping
    const intervalMap = { '240': '1h', 'D': '1d', 'W': '1wk' };
    const rangeMap    = { '240': '30d', 'D': '6mo', 'W': '2y' };
    const yhInterval  = intervalMap[interval] || '1h';
    const yhRange     = rangeMap[interval] || '30d';

    // Yahoo symbol: TUPRS.IS for TL, for USD we fetch both and divide
    const yhSym = symbol + '.IS';

    if (currency === 'USD') {
      // Fetch both stock and USDTRY=X in parallel
      return new Promise((resolve) => {
        let stockData = null, fxData = null, errors = 0;

        function tryMerge() {
          if (stockData === null || fxData === null) return;
          try {
            const sJson = JSON.parse(stockData);
            const fJson = JSON.parse(fxData);
            const sq = sJson.chart.result[0];
            const fq = fJson.chart.result[0];
            const timestamps = sq.timestamp;
            const sClose = sq.indicators.quote[0].close;
            const fClose = fq.indicators.quote[0].close;
            const fOpen  = fq.indicators.quote[0].open;
            const fHigh  = fq.indicators.quote[0].high;
            const fLow   = fq.indicators.quote[0].low;

            // Build fx lookup by timestamp
            const fxTs = fq.timestamp;
            const fxMap = {};
            fxTs.forEach((t, i) => { fxMap[t] = fClose[i] || fClose[i-1]; });

            const candles = [];
            const sOpen  = sq.indicators.quote[0].open;
            const sHigh  = sq.indicators.quote[0].high;
            const sLow   = sq.indicators.quote[0].low;

            timestamps.forEach((t, i) => {
              // Find nearest FX rate
              let fx = fxMap[t];
              if(!fx) {
                // find closest
                const nearest = fxTs.reduce((a, b) => Math.abs(b-t) < Math.abs(a-t) ? b : a);
                fx = fxMap[nearest];
              }
              if(!fx || fx === 0) return;
              const o = sOpen[i], h = sHigh[i], l = sLow[i], c = sClose[i];
              if(o==null||h==null||l==null||c==null) return;
              candles.push({ t, o: o/fx, h: h/fx, l: l/fx, c: c/fx });
            });

            res.status(200).json({ s: 'ok', candles });
          } catch(e) {
            res.status(500).json({ error: 'Merge error: ' + e.message });
          }
          resolve();
        }

        const stockPath = `/v8/finance/chart/${encodeURIComponent(yhSym)}?interval=${yhInterval}&range=${yhRange}&includePrePost=false`;
        const fxPath    = `/v8/finance/chart/USDTRY=X?interval=${yhInterval}&range=${yhRange}&includePrePost=false`;

        makeRequest('query1.finance.yahoo.com', stockPath, (err, data) => {
          if(err) { errors++; if(errors===1){ res.status(500).json({error:err.message}); resolve(); } return; }
          stockData = data;
          tryMerge();
        });
        makeRequest('query1.finance.yahoo.com', fxPath, (err, data) => {
          if(err) { errors++; if(errors===1){ res.status(500).json({error:err.message}); resolve(); } return; }
          fxData = data;
          tryMerge();
        });
      });
    }

    // TL mode - direkt Yahoo
    return new Promise((resolve) => {
      const path = `/v8/finance/chart/${encodeURIComponent(yhSym)}?interval=${yhInterval}&range=${yhRange}&includePrePost=false`;
      makeRequest('query1.finance.yahoo.com', path, (err, data, statusCode) => {
        if(err) { res.status(500).json({ error: err.message }); return resolve(); }
        try {
          const json = JSON.parse(data);
          const result = json.chart.result[0];
          const q = result.indicators.quote[0];
          const timestamps = result.timestamp;
          const candles = timestamps.map((t, i) => ({
            t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i]
          })).filter(c => c.o != null && c.c != null);
          res.status(200).json({ s: 'ok', candles });
        } catch(e) {
          res.status(500).json({ error: 'Parse error: ' + e.message, raw: data.slice(0,200) });
        }
        resolve();
      });
    });
  }

  res.status(400).json({ error: 'Unknown action' });
};
