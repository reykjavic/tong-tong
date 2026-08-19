// Staff order read endpoint for the admin dashboard (zero-dep ESM).
//
//   GET /staff/orders  Authorization: Bearer <session>
//     -> 200 { orders: [ { orderId, status, createdAt, items, total, channel, contact, notifiedAt } ] }
//     -> 401 no valid session / 403 non-admin session / 405 wrong method
//
// Lists open orders (Pending + Notified) via GSI1 (Status -> CreatedAt),
// newest first; Completed orders drop out of the open list but stay in the
// table. Not gated by the ordering feature toggle — staff can always see
// orders once the feature exists.
//
// The session check is copied verbatim from toggle/index.mjs: each Lambda
// ships as its own self-contained bundle (own CodeUri), so the ~15 lines are
// duplicated rather than shared — the established pattern in this stack.
//
// No bundled npm dependencies: the Lambda Node 20 runtime ships the AWS SDK v3.
// REST API v1 payload (event.httpMethod / event.headers).

import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'

const TABLE_NAME = process.env.TABLE_NAME
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()

const client = new DynamoDBClient({ region: process.env.AWS_REGION })

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS: the SPA is on a different origin; Lambda-proxy responses must carry
  // this themselves (SAM's Cors only generates the OPTIONS preflight mock).
  'Access-Control-Allow-Origin': '*',
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'method not allowed' })
    }

    // 1. Authenticate + authorize (same check as toggle/index.mjs).
    const token = bearerToken(event)
    if (!token) return json(401, { error: 'unauthorized' })

    const session = await getSession(token)
    if (!session) return json(401, { error: 'unauthorized' })

    const sessionEmail = (session.email?.S || '').toLowerCase()
    if (sessionEmail !== ADMIN_EMAIL) {
      console.warn(`staff orders rejected for session email=${sessionEmail}`)
      return json(403, { error: 'forbidden' })
    }

    // 2. Query GSI1 for open orders (Pending + Notified), newest first.
    const [pending, notified] = await Promise.all([
      queryByStatus('Pending'),
      queryByStatus('Notified'),
    ])
    const orders = [...pending, ...notified]
      .sort((a, b) => (b.CreatedAt?.S ?? '').localeCompare(a.CreatedAt?.S ?? ''))
      .map(unmarshalOrder)

    return json(200, { orders })
  } catch (err) {
    // Never throw: API Gateway turns unhandled throws into opaque 502s.
    console.error('staff orders read failed:', err)
    return json(500, { error: 'orders unavailable' })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) }
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

async function queryByStatus(status) {
  const res = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      // 'Status' is a DynamoDB reserved word — must alias it in expressions.
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'Status' },
      ExpressionAttributeValues: { ':status': { S: status } },
      ScanIndexForward: false, // newest first
      Limit: 100,
    }),
  )
  return res.Items || []
}

// Hand-pick the known attributes into a plain JSON object (no
// @aws-sdk/util-dynamodb dependency — the zero-dep style of this stack).
function unmarshalOrder(item) {
  const orderId = (item.PK?.S || '').replace(/^ORDER#/, '')
  const items = (item.Items?.L || []).map((entry) => ({
    name: entry.M?.name?.S ?? '',
    qty: Number(entry.M?.qty?.N ?? 0),
    price: Number(entry.M?.price?.N ?? 0),
  }))
  return {
    orderId,
    status: item.Status?.S ?? null,
    createdAt: item.CreatedAt?.S ?? null,
    items,
    total: Number(item.Total?.N ?? 0),
    channel: item.Channel?.S ?? null,
    contact: item.Contact?.S ?? null,
    notifiedAt: item.NotifiedAt?.S ?? null, // set by the (future) notify flow
  }
}
