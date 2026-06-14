// api/recent-scans.js — Site-geneli son taramalar (KV liste)
// GET  -> son 10 tarama kaydi  | POST -> yeni kayit ekle (origin-korumali, validasyonlu)
const { kvPipeline } = require('./_kv');

const LIST_KEY = 'df_recent_scans_v1';
const MAX_KEEP = 20; // listede tutulan
const MAX_RET  = 10; // GET'te donen

const ALLOWED_KIND  = new Set(['goat', 'preset', 'tech']);
const ALLOWED_ASSET = new Set(['borsa', 'kripto', 'fon']);

const ALLOWED_ORIGINS = new Set([
  'https://www.deepfin.com',
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
]);
const PREVIEW_RE = /^https:\/\/bistproxy(-[a-z0-9-]+)?\.vercel\.app$/i;
function originOk(req) {
  const o = req.headers['origin'] || '';
  if (!o) return false;
  if (ALLOWED_ORIGINS.has(o)) return true;
  try { return PREVIEW_RE.test(o); } catch (e) { return false; }
}

function clean(s, max) {
  // kontrol karakterleri + < > cikar (markup/XSS guvenligi), sonra kirp
  return String(s == null ? '' : s).replace(/[\x00-\x1F<>]/g, '').slice(0, max).trim();
}

function readBody(req) {
  return new Promise(function (resolve) {
    let data = ''; let tooBig = false;
    req.on('data', function (c) { data += c; if (data.length > 4096) { tooBig = true; req.destroy(); } });
    req.on('end', function () { if (tooBig) return resolve(null); try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve(null); } });
    req.on('error', function () { resolve(null); });
  });
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      const out = await kvPipeline([['LRANGE', LIST_KEY, '0', String(MAX_RET - 1)]]);
      const raw = (out[0] && out[0].result) || [];
      const scans = raw.map(function (s) { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      return res.status(200).json({ scans: scans });
    } catch (e) {
      return res.status(200).json({ scans: [] }); // sessiz basarisizlik — homepage bozulmasin
    }
  }

  if (req.method === 'POST') {
    if (!originOk(req)) return res.status(403).json({ ok: false });
    const body = await readBody(req);
    if (!body) return res.status(400).json({ ok: false });

    const kind    = clean(body.kind, 8);
    const asset   = clean(body.asset, 8);
    const k       = clean(body.k, 40);
    const label   = clean(body.label, 48);
    const ex      = clean(body.ex, 16);
    const exLabel = clean(body.exLabel, 24);
    const count   = Math.max(0, Math.min(parseInt(body.count, 10) || 0, 1000000));

    if (!ALLOWED_KIND.has(kind) || !ALLOWED_ASSET.has(asset) || !k || !label) {
      return res.status(400).json({ ok: false });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(k)) return res.status(400).json({ ok: false });

    const rec = JSON.stringify({ kind: kind, asset: asset, k: k, label: label, ex: ex, exLabel: exLabel, count: count, ts: Date.now() });
    try {
      await kvPipeline([
        ['LPUSH', LIST_KEY, rec],
        ['LTRIM', LIST_KEY, '0', String(MAX_KEEP - 1)],
      ]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(200).json({ ok: false });
    }
  }

  return res.status(405).json({ ok: false });
};
