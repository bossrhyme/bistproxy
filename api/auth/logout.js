// ─────────────────────────────────────────────
// GET/POST /api/auth/logout — clear session
// ─────────────────────────────────────────────
const { parseCookie } = require('../_auth');
const { kvDel }       = require('../_kv');

module.exports = async function handler(req, res) {
  const token = parseCookie(req, 'df_sess');
  if (token) {
    await kvDel('sess:' + token);
  }
  res.setHeader('Set-Cookie', 'df_sess=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  res.writeHead(302, { Location: '/' });
  res.end();
};
