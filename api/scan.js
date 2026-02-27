export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const payload = {
    columns: ['name', 'close', 'change'],
    range: [0, 10],
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
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  return res.status(200).json({ status: response.status, body: text.slice(0, 1000) });
}
```

Commit et, deploy bekle, sonra tarayıcıda şunu aç:
```
https://bistproxy.vercel.app/api/scan
