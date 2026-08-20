// Google OAuth login + admin session for the dashboard (zero-dep ESM).
//
// REST API v1 payload (AWS::Serverless::Api — NOT the HTTP API v2 shape used by
// decap-oauth; event.resource/event.path, event.queryStringParameters, and
// event.requestContext.domainName are the REST fields).
//
// Routes:
//   GET /auth/login            -> 302 to Google's authorize URL (HMAC-signed state)
//   GET /auth/google/callback  -> verify state, exchange code, verify the id_token
//                                 (JWKS RS256 + iss/aud/exp/email_verified), gate on
//                                 ADMIN_EMAIL, mint an opaque session, 302 back to
//                                 SITE_URL/?auth_token=<t>&next=<n>
//   GET /auth/me               -> Authorization: Bearer <session> -> { email, name, picture } | 401
//   POST /auth/logout          -> Authorization: Bearer <session> -> 204
//
// Sessions are opaque random tokens stored in the RestaurantData single-table
// (PK='session', TTL 7 days) — revocable, no JWT library, no cookies (the API
// and site are on different origins; a bearer header also means no CSRF surface).
// Only the ADMIN_EMAIL Google account ever receives a session; /toggle re-checks
// the email at write time (belt and suspenders).
//
// Empty GOOGLE_CLIENT_ID/SECRET -> 503 "auth not configured" (ships inert until
// backend/.env.google is filled; see scripts/deploy-backend.sh).

import crypto from 'node:crypto'
import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '')
const TABLE_NAME = process.env.TABLE_NAME
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

const client = new DynamoDBClient({ region: process.env.AWS_REGION })

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS: the SPA is on a different origin; the browser needs this on the actual
  // response (SAM's Cors config only generates the OPTIONS preflight mock).
  // '*' is safe — auth is via a Bearer header, never credentials mode.
  'Access-Control-Allow-Origin': '*',
}

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'

export const handler = async (event) => {
  try {
    const method = event.httpMethod || 'GET'
    const path = (event.resource || event.path || '').replace(/\/+$/, '') || '/'

    if (method === 'GET' && path === '/auth/login') return handleLogin(event)
    if (method === 'GET' && path === '/auth/google/callback') return handleCallback(event)
    if (method === 'GET' && path === '/auth/me') return handleMe(event)
    if (method === 'POST' && path === '/auth/logout') return handleLogout(event)

    return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'not found' }) }
  } catch (err) {
    // Never throw: API Gateway turns unhandled throws into opaque 502s.
    console.error('auth handler failed:', err)
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'internal error' }),
    }
  }
}

// ---------------------------------------------------------------------------
// GET /auth/login — build the Google authorize URL and 302 to it.
// ---------------------------------------------------------------------------
function handleLogin(event) {
  if (!configured()) return serviceUnavailable('login')

  const next = event.queryStringParameters?.next
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(event),
    response_type: 'code',
    scope: 'openid email profile',
    state: makeState(),
    prompt: 'select_account',
  })

  return {
    statusCode: 302,
    headers: { Location: `${GOOGLE_AUTHORIZE_URL}?${params}` },
    body: '',
  }
}

// ---------------------------------------------------------------------------
// GET /auth/google/callback — the full OAuth code exchange.
// ---------------------------------------------------------------------------
async function handleCallback(event) {
  if (!configured()) return serviceUnavailable('callback')

  const q = event.queryStringParameters || {}
  const next = safeNext(q.next)

  // User cancelled / Google reported an error: no session, back to the SPA.
  if (q.error) {
    return redirect(`${SITE_URL}/?auth=denied`)
  }
  if (!q.code) {
    return redirect(SITE_URL)
  }
  if (!verifyState(q.state)) {
    console.warn('OAuth callback rejected: bad state')
    return { statusCode: 403, headers: JSON_HEADERS, body: JSON.stringify({ error: 'invalid state' }) }
  }

  const payload = await exchangeAndVerify(event, q.code)
  if (payload instanceof Response) return payload // already an HTTP response

  // The admin gate: only the configured email ever gets a session.
  if (!(payload.email || '').toLowerCase() || payload.email.toLowerCase() !== ADMIN_EMAIL) {
    console.warn(`OAuth callback denied for email=${payload.email}`)
    return redirect(`${SITE_URL}/?auth=denied`)
  }

  const token = crypto.randomBytes(32).toString('base64url')
  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: { S: 'session' },
        SK: { S: token },
        email: { S: payload.email.toLowerCase() },
        // The `profile` scope makes Google include name/picture in the id_token;
        // stored so /auth/me can serve them without a second Google round-trip.
        ...(payload.name ? { name: { S: String(payload.name) } } : {}),
        ...(payload.picture ? { picture: { S: String(payload.picture) } } : {}),
        createdAt: { S: new Date().toISOString() },
        TTL: { N: String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS) },
      },
    }),
  )

  return redirect(
    `${SITE_URL}/?auth_token=${token}&next=${encodeURIComponent(next)}`,
  )
}

// ---------------------------------------------------------------------------
// GET /auth/me + POST /auth/logout — session lookup via Bearer header.
// ---------------------------------------------------------------------------
async function handleMe(event) {
  const token = bearerToken(event)
  if (!token) return unauthorized()

  const session = await getSession(token)
  if (!session) return unauthorized()

  return {
    statusCode: 200,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      email: session.email.S,
      // Older sessions (minted before profile scope) have no name/picture attrs.
      name: session.name?.S ?? null,
      picture: session.picture?.S ?? null,
    }),
  }
}

async function handleLogout(event) {
  const token = bearerToken(event)
  // Best-effort delete; deleting a non-existent session is still a clean logout.
  if (token) {
    await client.send(
      new DeleteItemCommand({ TableName: TABLE_NAME, Key: { PK: { S: 'session' }, SK: { S: token } } }),
    )
  }
  return { statusCode: 204, headers: JSON_HEADERS, body: '' }
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

// The callback URL must byte-match the Google-registered redirect URI on BOTH
// the authorize hop and the token exchange. Built from the request context so
// the API id is never hardcoded.
function callbackUrl(event) {
  const { domainName, stage } = event.requestContext
  return `https://${domainName}/${stage}/auth/google/callback`
}

function configured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

function serviceUnavailable(where) {
  console.warn(`/auth/${where}: Google OAuth not configured`)
  return {
    statusCode: 503,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: 'auth not configured' }),
  }
}

function redirect(location) {
  return { statusCode: 302, headers: { Location: location }, body: '' }
}

function unauthorized() {
  return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'unauthorized' }) }
}

// Prevent an open redirect: only same-site paths (and not protocol-relative).
function safeNext(next) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}

// Exchange the code for tokens and return the VERIFIED id_token payload, or an
// HTTP Response object on failure (so the caller can short-circuit).
async function exchangeAndVerify(event, code) {
  let json
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl(event),
        grant_type: 'authorization_code',
      }),
    })
    json = await res.json()
    if (!res.ok || !json.id_token) throw new Error(`token endpoint ${res.status}`)
  } catch (err) {
    console.error('token exchange failed:', err)
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'token exchange failed' }) }
  }

  try {
    return await verifyIdToken(json.id_token)
  } catch (err) {
    console.error('id_token verification failed:', err.message || err)
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'invalid id_token' }) }
  }
}

// ---------------------------------------------------------------------------
// State (HMAC-signed, 10-min expiry) — binds the callback to this authorize
// hop without any server-side storage.
// ---------------------------------------------------------------------------
function makeState() {
  const nonce = crypto.randomBytes(16).toString('hex')
  const exp = Math.floor(Date.now() / 1000) + 600
  const msg = `${nonce}.${exp}`
  const sig = crypto.createHmac('sha256', GOOGLE_CLIENT_SECRET).update(msg).digest('base64url')
  return `${msg}.${sig}`
}

function verifyState(state) {
  const [nonce, exp, sig] = String(state).split('.')
  if (!nonce || !exp || !sig) return false
  const expected = crypto.createHmac('sha256', GOOGLE_CLIENT_SECRET).update(`${nonce}.${exp}`).digest('base64url')
  if (!timingSafeEqual(sig, expected)) return false
  return Number(exp) > Math.floor(Date.now() / 1000)
}

// ---------------------------------------------------------------------------
// id_token verification — RS256 signature against Google's JWKS, then the
// standard iss/aud/exp/email_verified claims. The access_token is ignored.
// ---------------------------------------------------------------------------
let jwksCache = { keys: [], fetchedAt: 0 }
const JWKS_CACHE_MS = 60 * 60 * 1000 // 1h; stale keys are a fallback on fetch failure

async function getJwks() {
  if (jwksCache.keys.length && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_MS) return jwksCache.keys
  try {
    const res = await fetch(GOOGLE_JWKS_URL)
    if (res.ok) {
      const { keys } = await res.json()
      jwksCache = { keys: keys || [], fetchedAt: Date.now() }
    }
  } catch {
    // keep whatever we had
  }
  return jwksCache.keys
}

async function verifyIdToken(idToken) {
  const [h, p, s] = String(idToken).split('.')
  if (!h || !p || !s) throw new Error('malformed id_token')

  const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))

  if (header.alg !== 'RS256') throw new Error(`unexpected alg ${header.alg}`)

  const keys = await getJwks()
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA')
  if (!jwk) throw new Error('no matching JWK')

  const publicKey = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' })
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), publicKey, Buffer.from(s, 'base64url'))
  if (!valid) throw new Error('bad signature')

  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    throw new Error('unexpected iss')
  }
  if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error('aud mismatch')
  if (Number(payload.exp) < Math.floor(Date.now() / 1000)) throw new Error('expired')
  if (payload.email_verified !== true) throw new Error('email not verified')
  if (!payload.email) throw new Error('no email')

  return payload
}

// ---------------------------------------------------------------------------
// Header + body helpers
// ---------------------------------------------------------------------------

function getHeader(event, lowerName) {
  const headers = event.headers || {}
  const direct = headers[lowerName]
  if (direct) return direct
  const key = Object.keys(headers).find((k) => k.toLowerCase() === lowerName)
  return key ? headers[key] : undefined
}

function bearerToken(event) {
  const auth = getHeader(event, 'authorization')
  if (!auth || !auth.startsWith('Bearer ')) return undefined
  return auth.slice('Bearer '.length).trim() || undefined
}

async function getSession(token) {
  const res = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { PK: { S: 'session' }, SK: { S: token } },
      ConsistentRead: true, // a just-minted session must be visible to /auth/me
    }),
  )
  return res.Item
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}
