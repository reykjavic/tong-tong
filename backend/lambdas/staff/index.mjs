// Staff order endpoints for the admin dashboard (zero-dep ESM).
//
//   GET    /staff/orders               Authorization: Bearer <session>
//     -> 200 { orders: [ { orderId, status, createdAt, items, total, channel, contact, notifiedAt } ] }
//   PATCH  /staff/orders/{id}/status   Authorization: Bearer <session>  body: { status }
//     -> 200 { orderId, status }       status: "Pending" | "Notified" | "Completed"
//     -> 400 invalid status / 404 unknown order
//   DELETE /staff/orders/{id}          Authorization: Bearer <session>
//     -> 200 { deleted: orderId }      hard delete (GDPR erasure / mockup cleanup)
//     -> 404 unknown order
//   any other method -> 405
//
// GET lists open orders (Pending + Notified) via GSI1 (Status -> CreatedAt),
// newest first; Completed orders drop out of the open list but stay in the
// table. Not gated by the ordering feature toggle — staff can always see
// orders once the feature exists.
//
// PATCH moves an order between the documented lifecycle states (SCOPE §6:
// Pending -> Notified -> Completed); the dropdown in the dashboard lets staff
// move either way as an override. Completing sets CompletedAt, moving away
// clears it again so the field always reflects reality.
//
// DELETE hard-deletes the order item. Deliberately unconditional (no
// status guard): staff may remove test data or an accidental order in any
// state; the UI asks for confirmation first.
//
// The session check is copied verbatim from toggle/index.mjs: each Lambda
// ships as its own self-contained bundle (own CodeUri), so the ~15 lines are
// duplicated rather than shared — the established pattern in this stack.
//
// No bundled npm dependencies: the Lambda Node 20 runtime ships the AWS SDK v3.
// REST API v1 payload (event.httpMethod / event.resource / event.pathParameters).

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb'

const TABLE_NAME = process.env.TABLE_NAME
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()

const client = new DynamoDBClient({ region: process.env.AWS_REGION })

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS: the SPA is on a different origin; Lambda-proxy responses must carry
  // this themselves (SAM's Cors only generates the OPTIONS preflight mock).
  'Access-Control-Allow-Origin': '*',
}

const VALID_STATUSES = new Set(['Pending', 'Notified', 'Completed'])

export const handler = async (event) => {
  try {
    // 1. Authenticate + authorize (same check as toggle/index.mjs).
    const token = bearerToken(event)
    if (!token) return json(401, { error: 'unauthorized' })

    const session = await getSession(token)
    if (!session) return json(401, { error: 'unauthorized' })

    const sessionEmail = (session.email?.S || '').toLowerCase()
    if (sessionEmail !== ADMIN_EMAIL) {
      console.warn(`staff endpoint rejected for session email=${sessionEmail}`)
      return json(403, { error: 'forbidden' })
    }

    // 2. Dispatch on method + route. SAM REST API v1 exposes the route pattern
    //    in event.resource and decoded params in event.pathParameters.
    const method = event.httpMethod
    if (method === 'GET' && event.resource === '/staff/orders') {
      return listOrders()
    }
    if (method === 'PATCH' && event.resource === '/staff/orders/{id}/status') {
      return updateStatus(event)
    }
    if (method === 'DELETE' && event.resource === '/staff/orders/{id}') {
      return deleteOrder(event)
    }
    return json(405, { error: 'method not allowed' })
  } catch (err) {
    // Never throw: API Gateway turns unhandled throws into opaque 502s.
    console.error('staff request failed:', err)
    return json(500, { error: 'staff request unavailable' })
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function listOrders() {
  const [pending, notified] = await Promise.all([
    queryByStatus('Pending'),
    queryByStatus('Notified'),
  ])
  const orders = [...pending, ...notified]
    .sort((a, b) => (b.CreatedAt?.S ?? '').localeCompare(a.CreatedAt?.S ?? ''))
    .map(unmarshalOrder)

  return json(200, { orders })
}

async function updateStatus(event) {
  const orderId = event.pathParameters?.id
  if (!orderId) return json(400, { error: 'missing order id' })

  const body = parseBody(event)
  const status = body?.status
  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    return json(400, { error: 'expected { status: "Pending" | "Notified" | "Completed" }' })
  }

  const now = new Date().toISOString()
  // 'Status' is a DynamoDB reserved word — must alias it in expressions.
  // Condition on the non-key Status attribute so a PATCH for an unknown order
  // fails the update instead of creating a ghost item. CompletedAt mirrors the
  // SCOPE §6 model (ISO timestamp | null): set when completing, REMOVE (null)
  // when moving back.
  const completing = status === 'Completed'
  const updateExpression = completing
    ? 'SET #status = :status, CompletedAt = :completedAt'
    : 'SET #status = :status REMOVE CompletedAt'
  try {
    await client.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { PK: { S: `ORDER#${orderId}` }, SK: { S: 'METADATA' } },
        UpdateExpression: updateExpression,
        ConditionExpression: 'attribute_exists(#status)',
        ExpressionAttributeNames: { '#status': 'Status' },
        ExpressionAttributeValues: completing
          ? { ':status': { S: status }, ':completedAt': { S: now } }
          : { ':status': { S: status } },
      }),
    )
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return json(404, { error: 'order not found' })
    }
    throw err
  }

  return json(200, { orderId, status })
}

async function deleteOrder(event) {
  const orderId = event.pathParameters?.id
  if (!orderId) return json(400, { error: 'missing order id' })

  const existing = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { PK: { S: `ORDER#${orderId}` }, SK: { S: 'METADATA' } },
    }),
  )
  if (!existing.Item) return json(404, { error: 'order not found' })

  await client.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: { PK: { S: `ORDER#${orderId}` }, SK: { S: 'METADATA' } },
    }),
  )

  return json(200, { deleted: orderId })
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

function parseBody(event) {
  if (!event.body) return null
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
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
