const https = require('https');

function makeReq(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname, path, method, headers: { ...headers } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function kvEnabled() { return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN); }

async function kvGetRaw(key) {
  const r = await makeReq(
    new URL(process.env.KV_REST_API_URL).hostname,
    '/get/' + encodeURIComponent(key), 'GET',
    { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
  );
  const j = JSON.parse(r.body);
  return j.result != null ? parseInt(j.result) : 0;
}

async function kvIncr(key) {
  await makeReq(
    new URL(process.env.KV_REST_API_URL).hostname,
    '/incr/' + encodeURIComponent(key), 'POST',
    { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Length': '0' },
    ''
  );
}

const ORIGINS = ['https://deepfin.vercel.app','https://bistproxy.vercel.app','https://www.deepfin.com'];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ORIGINS.includes(origin) ? origin : ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!kvEnabled()) {
    return res.status(200).json({ scans: 0 });
  }

  try {
    if (req.method === 'POST') {
      // Dahili: tarama sayacını artır (scan API'lerinden çağrılır)
      await kvIncr('df_total_scans');
      return res.status(200).json({ ok: true });
    }
    // GET: mevcut sayıyı döndür
    const count = await kvGetRaw('df_total_scans');
    return res.status(200).json({ scans: count });
  } catch(e) {
    return res.status(200).json({ scans: 0 });
  }
};
