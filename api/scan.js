export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const payload = req.body || {
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
  };

  try {
    const response = await fetch('https://scanner.tradingview.com/turkey/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `TradingView: ${response.status}`, body: text });
    }

    const data = JSON.parse(text);
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
