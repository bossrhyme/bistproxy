// ─────────────────────────────────────────────
// GET /api/auth/callback — Google OAuth callback
// ─────────────────────────────────────────────
const crypto = require('crypto');
const { kvGet, kvSet } = require('../_kv');
const { parseCookie }  = require('../_auth');

module.exports = async function handler(req, res) {
  const qs    = new URLSearchParams(req.url.split('?')[1] || '');
  const code  = qs.get('code');
  const state = qs.get('state');
  const error = qs.get('error');

  // Error from Google
  if (error) {
    res.writeHead(302, { Location: '/?auth_error=' + encodeURIComponent(error) });
    res.end(); return;
  }

  // CSRF check
  const storedState = parseCookie(req, 'df_oauth_state');
  if (!state || state !== storedState) {
    res.writeHead(302, { Location: '/?auth_error=csrf' });
    res.end(); return;
  }

  if (!code) {
    res.writeHead(302, { Location: '/?auth_error=no_code' });
    res.end(); return;
  }

  // Build redirect_uri (must match what was sent to Google)
  const proto       = req.headers['x-forwarded-proto'] || 'https';
  const host        = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const redirectUri = proto + '://' + host + '/api/auth/callback';

  // Exchange code for tokens
  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code'
      }).toString()
    });
    tokenData = await tokenRes.json();
  } catch (e) {
    res.writeHead(302, { Location: '/?auth_error=token_exchange' });
    res.end(); return;
  }

  if (!tokenData.access_token) {
    res.writeHead(302, { Location: '/?auth_error=no_access_token' });
    res.end(); return;
  }

  // Fetch user info
  let userInfo;
  try {
    const uiRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    userInfo = await uiRes.json();
  } catch (e) {
    res.writeHead(302, { Location: '/?auth_error=userinfo' });
    res.end(); return;
  }

  const userId = userInfo.sub;
  if (!userId) {
    res.writeHead(302, { Location: '/?auth_error=no_sub' });
    res.end(); return;
  }

  // Upsert user in KV
  const existingUser = await kvGet('usr:' + userId);
  const user = {
    id:        userId,
    email:     userInfo.email || '',
    name:      userInfo.name  || userInfo.email || '',
    picture:   userInfo.picture || '',
    createdAt: existingUser ? existingUser.createdAt : Date.now()
  };
  await kvSet('usr:' + userId, user);

  // Create session (30 days)
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const ttl = 30 * 24 * 60 * 60; // 30 days in seconds
  await kvSet('sess:' + sessionToken, {
    userId:    userId,
    expiresAt: Date.now() + ttl * 1000
  }, ttl);

  // Clear CSRF state cookie, set session cookie
  const cookies = [
    'df_oauth_state=; Path=/; Max-Age=0; SameSite=Lax; Secure',
    [
      'df_sess=' + sessionToken,
      'Path=/',
      'Max-Age=' + ttl,
      'HttpOnly',
      'Secure',
      'SameSite=Lax'
    ].join('; ')
  ];
  res.setHeader('Set-Cookie', cookies);
  res.writeHead(302, { Location: '/profil' });
  res.end();
};
