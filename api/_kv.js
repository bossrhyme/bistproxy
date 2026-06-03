// ─────────────────────────────────────────────
// Vercel KV helper — native fetch (Node 24)
// ─────────────────────────────────────────────

const KV_URL   = () => process.env.KV_REST_API_URL;
const KV_TOKEN = () => process.env.KV_REST_API_TOKEN;

function kvHeaders() {
  return { Authorization: 'Bearer ' + KV_TOKEN() };
}

async function kvGet(key) {
  try {
    const res  = await fetch(KV_URL() + '/get/' + encodeURIComponent(key), { headers: kvHeaders() });
    const json = await res.json();
    return json.result ? JSON.parse(json.result) : null;
  } catch (e) { return null; }
}

async function kvSet(key, value, ttlSeconds) {
  try {
    const url  = KV_URL() + '/set/' + encodeURIComponent(key) + (ttlSeconds ? '?ex=' + ttlSeconds : '');
    await fetch(url, {
      method: 'POST',
      headers: { ...kvHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  } catch (e) { /* ignore */ }
}

async function kvDel(key) {
  try {
    await fetch(KV_URL() + '/del/' + encodeURIComponent(key), {
      method: 'POST',
      headers: kvHeaders()
    });
  } catch (e) { /* ignore */ }
}

module.exports = { kvGet, kvSet, kvDel };
