// Decap CMS GitHub OAuth provider for AWS Lambda + API Gateway (HTTP API).
//
// Implements the Netlify-style two-phase message handshake that Decap's
// NetlifyAuthenticator expects (decap-cms-lib-auth/src/netlify-auth.js):
//
//   Decap (admin window) opens a popup to  /auth?provider=github&site_id=...&scope=repo
//   /auth   302-redirects the popup to GitHub's OAuth authorize page
//   GitHub  redirects the popup to        /callback?code=...&state=...
//   /callback exchanges the code for a token, then serves an HTML page that:
//     1. posts  'authorizing:github'              to the opener (admin window)
//     2. waits  for the opener to echo 'authorizing:github' back
//     3. posts  'authorization:github:success:<json>'  to the opener, then closes
//   Decap's authorizeCallback sees that string prefix, parses the JSON, and
//   completes login with { token, provider: 'github' }.
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

export const handler = async (event) => {
  const path = event.rawPath || event.path || ''
  const params = new URLSearchParams(event.rawQueryString || '')

  // Start of the OAuth flow: redirect the popup to GitHub. The handshake
  // actually happens in the /callback page (see renderScript below), so a
  // plain 302 here is correct.
  if (path === '/auth' || path === '/auth/') {
    const siteId = params.get('site_id') || ''
    const redirectUri = `https://${event.requestContext.domainName}/callback`
    const location =
      `${GITHUB_AUTHORIZE_URL}?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'repo',
        state: siteId,
      }).toString()
    return { statusCode: 302, headers: { Location: location }, body: '' }
  }

  // End of the OAuth flow: exchange the code for a token and complete the
  // postMessage handshake with the admin window.
  if (path === '/callback' || path === '/callback/') {
    const code = params.get('code')
    const siteId = (params.get('state') || '').replace(/^https?:\/\//, '')
    const fallbackOrigin = siteId ? `https://${siteId}` : '*'

    const token = code ? await exchangeCode(code) : null
    const message = token ? 'success' : 'error'
    const content = token ? { token, provider: 'github' } : { message: 'Token exchange failed' }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: renderScript('github', message, content, fallbackOrigin),
    }
  }

  return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Not found' }
}

// The page served from /callback. It starts the handshake by telling the
// opener (admin window) it's authorizing, waits for the echo, then delivers
// the result as a string message of the form
//   authorization:<provider>:<message>:<json>
// A 5s timeout fallback posts to the site origin so the popup never hangs.
function renderScript(provider, message, content, fallbackOrigin) {
  return `<!doctype html><html><body><script>
(function() {
  var provider = ${JSON.stringify(provider)};
  var content = ${JSON.stringify(content)};
  var message = ${JSON.stringify(message)};

  function receive(e) {
    if (e.data === 'authorizing:' + provider) {
      window.opener.postMessage('authorization:' + provider + ':' + message + ':' + JSON.stringify(content), e.origin);
      window.close();
    }
  }
  window.addEventListener('message', receive, false);

  // Start the handshake with the parent (admin) window.
  window.opener.postMessage('authorizing:' + provider, '*');

  // Safety net: if the echo never arrives, deliver to the site origin anyway.
  setTimeout(function() {
    try {
      window.opener.postMessage('authorization:' + provider + ':' + message + ':' + JSON.stringify(content), ${JSON.stringify(fallbackOrigin)});
      window.close();
    } catch (err) { /* popup was already closed */ }
  }, 5000);
})();
</script></body></html>`
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
