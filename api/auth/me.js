// ─────────────────────────────────────────────
// GET /api/auth/me — return current user or null
// ─────────────────────────────────────────────
const { getUser } = require('../_auth');

module.exports = async function handler(req, res) {
  const user = await getUser(req);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (user) {
    res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
  } else {
    res.status(200).json({ user: null });
  }
};
