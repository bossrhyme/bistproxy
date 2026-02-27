const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const payload = JSON.stringify({
    columns: ['name', 'close', 'change'],
    range: [0, 10],
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
        res.status(200).json({ status: response.statusCode, body: data.slice(0, 1000) });
        resolve();
      });
    });

    request.on('error', (err) => {
      res.status(200).json({ error: err.message });
      resolve();
    });

    request.write(payload);
    request.end();
  });
};
