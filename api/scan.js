export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {
      columns: [
        'name', 'close', 'change', 'volume',
        'market_cap_basic', 'price_earnings_ttm',
        'return_on_equity', 'price_book_ratio',
        'debt_to_equity', 'net_income', 'sector'
      ],
      range: [0, 500],
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' }
    };

    const response = await fetch('https://scanner.tradingview.com/turkey/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `TradingView returned ${response.status}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
