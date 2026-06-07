// GET /api/stats — returns { scans, users } from KV
// Cache-Control: max-age=60 so CDN/browsers cache for 60s

const { kvGet } = require('./_kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  res.setHeader('Content-Type', 'application/json');

  try {
    const [scansRaw, usersRaw] = await Promise.all([
      kvGet('df_total_scans'),
      kvGet('df_total_users')
    ]);

    const scans = parseInt(scansRaw, 10) || 0;
    const users = parseInt(usersRaw, 10) || 0;

    res.status(200).json({ scans, users });
  } catch (e) {
    console.error('[stats] error:', e.message);
    res.status(200).json({ scans: 0, users: 0 });
  }
};
