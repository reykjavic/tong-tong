// Admin-only web toggle for the feature flags (zero-dep ESM).
//
//   POST /toggle  Authorization: Bearer <session>
//     body: { "feature": "ordering" | "reservations", "enabled": boolean }
//     -> 200 { ordering: { enabled }, reservations: { enabled } }  (full config shape)
//     -> 400 invalid body / 401 no valid session / 403 non-admin session
//
// Writes the exact same item shape as scripts/set-toggle.sh (PK='config',
// SK=<feature>, `${feature}Enabled` BOOL) so the script and the dashboard stay
// interchangeable. The session is minted by the auth Lambda only for the
// ADMIN_EMAIL Google account; this lambda re-checks the email at write time.
//
// No bundled npm dependencies: the Lambda Node 20 runtime ships the AWS SDK v3.
// REST API v1 payload (event.httpMethod / event.body / event.headers).

import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'

const TABLE_NAME = process.env.TABLE_NAME
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()

const client = new DynamoDBClient({ region: process.env.AWS_REGION })

// name -> { SK suffix, boolean attribute to write/read } — same map as config.
const FEATURES = {
  ordering: { sk: 'ordering', attr: 'orderingEnabled' },
  reservations: { sk: 'reservations', attr: 'reservationsEnabled' },
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS: the SPA is on a different origin; Lambda-proxy responses must carry
  // this themselves (SAM's Cors only generates the OPTIONS preflight mock).
  'Access-Control-Allow-Origin': '*',
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'method not allowed' })
    }

    // 1. Authenticate: valid Bearer session required.
    const token = bearerToken(event)
    if (!token) return json(401, { error: 'unauthorized' })

    const session = await getSession(token)
    if (!session) return json(401, { error: 'unauthorized' })

    // 2. Authorize: the session belongs to the admin email.
    const sessionEmail = (session.email?.S || '').toLowerCase()
    if (sessionEmail !== ADMIN_EMAIL) {
      console.warn(`toggle rejected for session email=${sessionEmail}`)
      return json(403, { error: 'forbidden' })
    }

    // 3. Validate the body.
    const body = parseBody(event)
    const feature = body?.feature
    const enabled = body?.enabled
    if (!FEATURES[feature] || typeof enabled !== 'boolean') {
      return json(400, { error: 'expected { feature: "ordering"|"reservations", enabled: boolean }' })
    }

    // 4. Write — same item shape as scripts/set-toggle.sh.
    const { sk, attr } = FEATURES[feature]
    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: 'config' },
          SK: { S: sk },
          [attr]: { BOOL: enabled },
        },
      }),
    )

    // 5. Read back both toggles and return the full GET /config shape.
    const [ordering, reservations] = await Promise.all([
      readFeature('ordering'),
      readFeature('reservations'),
    ])
    return json(200, { ordering, reservations })
  } catch (err) {
    // Never throw: API Gateway turns unhandled throws into opaque 502s.
    console.error('toggle failed:', err)
    return json(500, { error: 'toggle unavailable' })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) }
}

function parseBody(event) {
  if (!event.body) return {}
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

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
      ConsistentRead: true,
    }),
  )
  return res.Item
}

async function readFeature(name) {
  const { sk, attr } = FEATURES[name]
  const res = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { PK: { S: 'config' }, SK: { S: sk } },
      ConsistentRead: true,
    }),
  )
  const enabled = res.Item?.[attr]?.BOOL
  return { enabled: enabled ?? false } // missing item -> disabled
}
