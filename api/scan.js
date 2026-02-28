const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const payload = JSON.stringify({
    columns: [
      'name', 'close', 'change', 'volume',
      'market_cap_basic', 'price_earnings_ttm',
      'price_book_ratio', 'price_sales_current',
      'return_on_equity', 'return_on_assets',
      'net_income_to_total_revenue_ttm', 'gross_profit_to_revenue_ttm',
      'total_revenue_change_ttm_yoy', 'earnings_per_share_change_ttm_yoy',
      'dividends_yield_current', 'total_debt_to_equity',
      'current_ratio', 'sector', 'High.1M', 'Low.1M'
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
        try {
          const json = JSON.parse(data);
          res.setHeader('Content-Type', 'application/json');
          res.status(response.statusCode).end(data);
        } catch(e) {
          res.status(500).json({ error: 'Parse error', raw: data.slice(0, 200) });
        }
        resolve();
      });
    });

    request.on('error', (err) => {
      res.status(500).json({ error: err.message });
      resolve();
    });

    request.write(payload);
    request.end();
  });
};
