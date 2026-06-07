// ─────────────────────────────────────────────
// Vercel KV helper — native fetch (Node 24)
// ─────────────────────────────────────────────

function kvUrl() {
  // UPSTASH_REDIS_REST_REDIS_URL = native rediss:// protokolü, REST için kullanılamaz
  // UPSTASH_REDIS_REST_KV_REST_API_URL = https:// REST endpoint, doğru olan bu
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_URL ||
    process.env.STORAGE_URL;
  if (!url) throw new Error('Redis REST URL env değişkeni bulunamadı');
  return url;
}

function kvToken() {
  const tok =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN;
  if (!tok) throw new Error('Redis Token env değişkeni bulunamadı');
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

async function kvIncr(key) {
  const res  = await fetch(kvUrl() + '/incr/' + encodeURIComponent(key), {
    method: 'POST',
    headers: kvHeaders()
  });
  const json = await res.json();
  return json.result || 0;
}

// Run multiple Redis commands in one round-trip via Upstash pipeline
async function kvPipeline(commands) {
  const res  = await fetch(kvUrl() + '/pipeline', {
    method: 'POST',
    headers: { ...kvHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error('KV PIPELINE bad response');
  return arr;
}

async function kvKeys(pattern) {
  const arr = await kvPipeline([['KEYS', pattern]]);
  return (arr[0] && arr[0].result) || [];
}

async function kvMGet(keys) {
  if (!keys.length) return [];
  const arr = await kvPipeline(keys.map(k => ['GET', k]));
  return arr.map(function(item) {
    if (!item || item.result === null || item.result === undefined) return null;
    try { return JSON.parse(item.result); } catch(e) { return item.result; }
  });
}

module.exports = { kvGet, kvSet, kvDel, kvIncr, kvPipeline, kvKeys, kvMGet };
