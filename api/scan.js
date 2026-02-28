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
