const https = require('https');
const { protect, trackViolation } = require('./_protect');

async function kvGet(key) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    const r = await fetch(url + '/get/' + encodeURIComponent(key), { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ttlSec) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return;
    await fetch(url + '/set/' + encodeURIComponent(key) + '?ex=' + ttlSec, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  } catch {}
}

async function kvIncr(key, ttlSec) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return 0;
    const r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['TTL', key]])
    });
    const arr = await r.json();
    const count = arr[0]?.result || 0;
    if ((arr[1]?.result || -1) < 0) {
      fetch(url + '/pipeline', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify([['EXPIRE', key, ttlSec]])
      }).catch(() => {});
    }
    return count;
  } catch { return 0; }
}

function getClientIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown').slice(0, 45);
}

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
  if (await protect(req, res)) return;

  const url = new URL(req.url, 'http://localhost');
  const sym = (url.searchParams.get('sym') || '').toUpperCase();
  const ex  = (url.searchParams.get('ex') || 'bist').toLowerCase();

  if (!sym) return res.status(400).json({ news: [] });

  // Rate limit
  const ip = getClientIP(req);
  const rlCount = await kvIncr('rl:news:' + ip, 60);
  if (rlCount > 30) { trackViolation(ip).catch(() => {}); return res.status(429).json({ news: [] }); }

  // KV cache
  const cacheKey = 'df_news_v2_' + (ex || 'bist') + '_' + sym;
  const cachedNews = await kvGet(cacheKey);
  if (cachedNews) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(cachedNews);
  }

  // Exchange → TradingView prefix mapping
  const PREFIX = { bist:'BIST:', nasdaq:'NASDAQ:', sp500:'NYSE:', dax:'XETR:', lse:'LSE:', nikkei:'TSE:' };
  const tvSym = (PREFIX[ex] || 'BIST:') + sym;
  // BIST için Türkçe akış: KAP bildirimleri TradingView'in tr akışında geliyor
  const lang = ex === 'bist' ? 'tr' : 'en';

  const options = {
    hostname: 'news-headlines.tradingview.com',
    path: '/v2/headlines?symbol=' + encodeURIComponent(tvSym) + '&lang=' + lang + '&client=web&streaming=false',
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
    res2.on('end', async () => {
      try {
        const parsed = JSON.parse(data);
        const items = (parsed.items || []).slice(0, 10).map(item => ({
          headline: item.title || item.headline || '',
          source:   item.source?.name || item.provider || '',
          published: item.published,
          url:      item.link || item.url || '',
        }));
        const newsResult = { news: items };
        kvSet(cacheKey, newsResult, 300).catch(() => {});
        kvSet('stale:' + cacheKey, newsResult, 86400).catch(() => {});
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).json(newsResult);
      } catch(e) {
        // JSON parse başarısız = TradingView banlı/rate-limited → stale dene
        const stale = await kvGet('stale:' + cacheKey);
        if (stale) { res.setHeader('X-Cache', 'STALE'); return res.status(200).json(stale); }
        return res.status(200).json({ news: [] });
      }
    });
  });
  req2.on('error', async () => {
    const stale = await kvGet('stale:' + cacheKey);
    if (stale) { res.setHeader('X-Cache', 'STALE'); return res.status(200).json(stale); }
    res.status(200).json({ news: [] });
  });
  req2.end();
};
