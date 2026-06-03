// ─────────────────────────────────────────────
// GET /api/auth/google — redirect to Google OAuth
// ─────────────────────────────────────────────

module.exports = async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });
    return;
  }

  // Build redirect_uri from request host
  const proto       = req.headers['x-forwarded-proto'] || 'https';
  const host        = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const redirectUri = proto + '://' + host + '/api/auth/callback';

  // CSRF state
  const state = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomBytes(16).toString('hex');

  // Set CSRF state cookie (SameSite=Lax, no HttpOnly so JS can't read but needed for redirect flow)
  const cookieOpts = [
    'df_oauth_state=' + state,
    'Path=/',
    'Max-Age=600',
    'SameSite=Lax',
    'Secure'
  ].join('; ');
  res.setHeader('Set-Cookie', cookieOpts);

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    state:         state,
    access_type:   'online',
    prompt:        'select_account'
  });

  res.writeHead(302, { Location: 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString() });
  res.end();
};
