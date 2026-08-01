// Decap CMS GitHub OAuth provider for AWS Lambda + API Gateway (HTTP API).
//
// Routes (use a `$default` / `{proxy+}` catch-all integration):
//   GET /auth?site_domain=example.com  -> 302 redirect to GitHub OAuth authorize
//   GET /callback?code=...&state=...   -> exchange code for a token, then
//                                         postMessage it back to the admin window
//
// Required Lambda environment variables:
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET
//
// Setup guide: docs/decap-oauth.md

const CLIENT_ID = process.env.GITHUB_CLIENT_ID
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  const path = event.rawPath || event.path || ''
  const params = new URLSearchParams(event.rawQueryString || '')

  if (path === '/auth' || path === '/auth/') {
    const siteDomain = params.get('site_domain') || ''
    const redirectUri = `https://${event.requestContext.domainName}/callback`
    const location =
      `${GITHUB_AUTHORIZE_URL}?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'repo',
        state: siteDomain,
      }).toString()
    return { statusCode: 302, headers: { ...CORS_HEADERS, Location: location }, body: '' }
  }

  if (path === '/callback' || path === '/callback/') {
    const code = params.get('code')
    const siteDomain = params.get('state') || ''
    if (!code) {
      return { statusCode: 400, headers: CORS_HEADERS, body: 'Missing authorization code' }
    }
    const token = await exchangeCode(code)
    if (!token) {
      return { statusCode: 502, headers: CORS_HEADERS, body: 'Token exchange failed' }
    }
    const origin = `https://${siteDomain}`
    const html = `<!doctype html><html><body><script>
      try {
        window.opener.postMessage({ token: ${JSON.stringify(token)}, provider: 'github' }, ${JSON.stringify(origin)});
        window.close();
      } catch (err) {
        document.body.textContent = 'Login erfolgreich. Dieses Fenster kann geschlossen werden.';
      }
    </script></body></html>`
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/html' },
      body: html,
    }
  }

  return { statusCode: 404, headers: CORS_HEADERS, body: 'Not found' }
}

async function exchangeCode(code) {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}
