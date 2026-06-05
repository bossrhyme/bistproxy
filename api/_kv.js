// ─────────────────────────────────────────────
// Vercel KV helper — native fetch (Node 24)
// ─────────────────────────────────────────────

function kvUrl() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) throw new Error('KV_REST_API_URL veya UPSTASH_REDIS_REST_URL env değişkeni tanımlı değil');
  return url;
}

function kvToken() {
  const tok = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!tok) throw new Error('KV_REST_API_TOKEN veya UPSTASH_REDIS_REST_TOKEN env değişkeni tanımlı değil');
  return tok;
}

function kvHeaders() {
  return { Authorization: 'Bearer ' + kvToken() };
}

async function kvGet(key) {
  const res  = await fetch(kvUrl() + '/get/' + encodeURIComponent(key), { headers: kvHeaders() });
  const json = await res.json();
  if (json.error) throw new Error('KV: ' + json.error);
  if (!res.ok)    throw new Error('KV GET HTTP ' + res.status);
  return json.result ? JSON.parse(json.result) : null;
}

async function kvSet(key, value, ttlSeconds) {
  const url  = kvUrl() + '/set/' + encodeURIComponent(key) + (ttlSeconds ? '?ex=' + ttlSeconds : '');
  const res  = await fetch(url, {
    method: 'POST',
    headers: { ...kvHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  const json = await res.json();
  if (json.error) throw new Error('KV: ' + json.error);
  if (!res.ok)    throw new Error('KV SET HTTP ' + res.status);
}

async function kvDel(key) {
  const res  = await fetch(kvUrl() + '/del/' + encodeURIComponent(key), {
    method: 'POST',
    headers: kvHeaders()
  });
  const json = await res.json().catch(() => ({}));
  if (json.error) throw new Error('KV: ' + json.error);
}

module.exports = { kvGet, kvSet, kvDel };
