// IP ban check + User-Agent screening + violation tracking
// Auto-bans IPs that exceed rate limits 3+ times in 1 hour (24h ban)

const KV_URL = () => process.env.KV_REST_API_URL || '';
const KV_TOK = () => process.env.KV_REST_API_TOKEN || '';

async function kv(cmds) {
  try {
    const url = KV_URL(), tok = KV_TOK();
    if (!url || !tok) return [];
    const r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds)
    });
    return await r.json();
  } catch(e) { console.error('[kv] error:', e.message); return []; }
}

// Common automated HTTP clients — not real browser users
const BAD_UA = /^$|^-$|curl\/|python-requests\/|python\/\d|go-http|scrapy|wget\/|libwww-perl|okhttp\/|java\/\d/i;

function getIP(req) {
  return ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown').slice(0, 45);
}

async function protect(req, res) {
  const ua = req.headers['user-agent'] || '';
  if (BAD_UA.test(ua)) {
    res.status(403).json({ error: 'Forbidden' });
    return true;
  }
  const url = KV_URL(), tok = KV_TOK();
  if (!url || !tok) return false;
  const ip = getIP(req);
  const arr = await kv([['GET', 'ban:ip:' + ip]]);
  if (arr[0]?.result) {
    res.status(403).json({ error: 'Erişim engellendi.' });
    return true;
  }
  return false;
}

// Called when an IP hits a rate limit. After 3 violations in 1 hour → 24h auto-ban.
async function trackViolation(ip) {
  try {
    const arr = await kv([['INCR', 'viol:ip:' + ip], ['TTL', 'viol:ip:' + ip]]);
    const count = arr[0]?.result || 0;
    if ((arr[1]?.result ?? -1) < 0) kv([['EXPIRE', 'viol:ip:' + ip, 3600]]).catch(() => {});
    if (count >= 3) kv([['SET', 'ban:ip:' + ip, '1', 'EX', 86400]]).catch(() => {});
  } catch {}
}

module.exports = { protect, trackViolation, getIP };
