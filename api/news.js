const https = require('https');

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

// TradingView news API endpoint
// https://news-headlines.tradingview.com/v2/headlines?symbol=BIST:TUPRS&client=web

module.exports = async function(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const sym = (url.searchParams.get('sym') || '').toUpperCase();
  const ex  = (url.searchParams.get('ex') || 'bist').toLowerCase();

  if (!sym) return res.status(400).json({ news: [] });

  // Exchange → TradingView prefix mapping
  const PREFIX = { bist:'BIST:', nasdaq:'NASDAQ:', sp500:'NYSE:', dax:'XETR:', lse:'LSE:', nikkei:'TSE:' };
  const tvSym = (PREFIX[ex] || 'BIST:') + sym;

  const newsUrl = 'https://news-headlines.tradingview.com/v2/headlines?symbol='
    + encodeURIComponent(tvSym)
    + '&lang=en&client=web&streaming=false';

  const options = {
    hostname: 'news-headlines.tradingview.com',
    path: '/v2/headlines?symbol=' + encodeURIComponent(tvSym) + '&lang=en&client=web&streaming=false',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/',
    }
  };

  const req2 = https.request(options, (res2) => {
    let data = '';
    res2.on('data', c => data += c);
    res2.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        // TV news response: { items: [{title, published, source, url, ...}] }
        const items = (parsed.items || []).slice(0, 10).map(item => ({
          headline: item.title || item.headline || '',
          source:   item.source?.name || item.provider || '',
          published: item.published,
          url:      item.link || item.url || '',
        }));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).json({ news: items });
      } catch(e) {
        return res.status(200).json({ news: [] });
      }
    });
  });
  req2.on('error', () => res.status(200).json({ news: [] }));
  req2.end();
};
