const https = require('https');

function tvRequest(path, payload, callback) {
  const body = JSON.stringify(payload);
  const options = {
    hostname: 'scanner.tradingview.com',
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': 'Mozilla/5.0',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/'
    }
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(null, data, res.statusCode));
  });
  req.on('error', (err) => callback(err));
  req.write(body);
  req.end();
}

function tvGet(hostname, path, callback) {
  const options = {
    hostname: hostname,
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/'
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
    const payload = {
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
    };

    return new Promise((resolve) => {
      tvRequest('/turkey/scan', payload, (err, data, statusCode) => {
        if (err) { res.status(500).json({ error: err.message }); return resolve(); }
        res.setHeader('Content-Type', 'application/json');
        res.status(statusCode).end(data);
        resolve();
      });
    });
  }

  // ── CHART ──
  if (action === 'chart') {
    const symbol = url.searchParams.get('symbol') || 'TUPRS';
    const interval = url.searchParams.get('interval') || '240';
    const currency = url.searchParams.get('currency') || 'TL';

    // TradingView history API
    // resolution: 240 = 4h, D = 1d, W = 1w
    const resMap = { '240': '240', 'D': '1D', 'W': '1W' };
    const resolution = resMap[interval] || '240';

    // bar count
    const countMap = { '240': 120, 'D': 90, 'W': 52 };
    const barCount = countMap[interval] || 120;

    const sym = currency === 'USD'
      ? `BIST:${symbol}/FX_IDC:USDTRY`
      : `BIST:${symbol}`;

    const to = Math.floor(Date.now() / 1000);
    const path = `/history?symbol=${encodeURIComponent(sym)}&resolution=${resolution}&from=${to - barCount * 7 * 24 * 3600}&to=${to}&countback=${barCount}`;

    return new Promise((resolve) => {
      tvGet('data.tradingview.com', path, (err, data, statusCode) => {
        if (err) { res.status(500).json({ error: err.message }); return resolve(); }
        res.setHeader('Content-Type', 'application/json');
        res.status(statusCode).end(data);
        resolve();
      });
    });
  }

  res.status(400).json({ error: 'Unknown action' });
};
