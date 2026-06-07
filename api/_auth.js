// ─────────────────────────────────────────────
// Auth helper — parse df_sess cookie → user
// ─────────────────────────────────────────────
const { kvGet } = require('./_kv');

function parseCookie(req, name) {
  const header = req.headers['cookie'] || '';
  const parts  = header.split(';');
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=');
    if (k.trim() === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

async function getUser(req) {
  try {
    const token = parseCookie(req, 'df_sess');
    if (!token) return null;

    const session = await kvGet('sess:' + token);
    if (!session) return null;
    if (session.expiresAt && Date.now() > session.expiresAt) return null;

    const user = await kvGet('usr:' + session.userId);
    if (!user) return null;
    if (user.passwordChangedAt && session.createdAt && session.createdAt < user.passwordChangedAt) return null;
    return user;
  } catch (e) { return null; }
}

module.exports = { getUser, parseCookie };
