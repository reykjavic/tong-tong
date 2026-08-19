// Public order intake for the online-ordering feature (zero-dep ESM).
//
//   POST /orders
//     body: { "items": [{ "name", "qty", "price" }], "channel": "email"|"whatsapp", "contact": "..." }
//     -> 201 { orderId, status: 'Pending', createdAt, total }
//     -> 400 invalid body / 403 ordering disabled / 405 wrong method
//
// Server-side gate (SCOPE.md §12): the ordering feature toggle is checked HERE,
// at request time, before anything is written. When the toggle is OFF the order
// is rejected with 403 regardless of what the browser UI shows — the public
// fail-open default (show the UI while loading) is deliberately asymmetric.
// Flip without redeploy:  aws dynamodb put-item (scripts/set-toggle.sh).
//
// The order is stored as the SCOPE §6 item shape: PK='ORDER#<id>', SK='METADATA',
// Status='Pending', with the top-level Status/CreatedAt attributes the GSI1
// (Status -> CreatedAt) index reads for the kitchen's open-orders query.
// Total is recomputed server-side from the items, so a caller can't set their
// own price. Mockup orders carry a short TTL so test data doesn't accumulate;
// real-order retention comes with the kitchen dashboard.
//
// No bundled npm dependencies: the Lambda Node 20 runtime ships the AWS SDK v3.
// REST API v1 payload (event.httpMethod / event.body / event.headers).

import { randomUUID } from 'node:crypto'
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'

const TABLE_NAME = process.env.TABLE_NAME

const client = new DynamoDBClient({ region: process.env.AWS_REGION })

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS: the SPA is on a different origin; Lambda-proxy responses must carry
  // this themselves (SAM's Cors only generates the OPTIONS preflight mock).
  'Access-Control-Allow-Origin': '*',
}

const TTL_SECONDS = 7 * 24 * 60 * 60 // mockup orders expire after a week

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'method not allowed' })
    }

    // 1. Gate on the ordering feature toggle (fail-closed: missing = OFF).
    if (!(await orderingEnabled())) {
      return json(403, { error: 'ordering_disabled' })
    }

    // 2. Validate the body.
    const body = parseBody(event)
    if (!isValidOrder(body)) {
      return json(400, {
        error: 'expected { items: [{ name, qty, price }], channel: "email"|"whatsapp", contact }',
      })
    }

    // 3. Write the order (Pending). Total is recomputed server-side.
    const orderId = randomUUID()
    const createdAt = new Date().toISOString()
    const total = body.items.reduce((sum, it) => sum + it.price * it.qty, 0)

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: `ORDER#${orderId}` },
          SK: { S: 'METADATA' },
          Status: { S: 'Pending' },
          CreatedAt: { S: createdAt },
          Channel: { S: body.channel },
          Contact: { S: body.contact },
          Payment: { S: 'pay_at_pickup' },
          Items: {
            L: body.items.map((it) => ({
              M: {
                name: { S: it.name },
                qty: { N: String(it.qty) },
                price: { N: String(it.price) },
              },
            })),
          },
          Total: { N: String(total) },
          TTL: { N: String(Math.floor(Date.now() / 1000) + TTL_SECONDS) },
        },
      }),
    )

    return json(201, { orderId, status: 'Pending', createdAt, total })
  } catch (err) {
    // Never throw: API Gateway turns unhandled throws into opaque 502s.
    console.error('order placement failed:', err)
    return json(500, { error: 'order unavailable' })
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

function isValidOrder(body) {
  if (!body || typeof body !== 'object') return false
  const { items, channel, contact } = body
  const isChannel = channel === 'email' || channel === 'whatsapp'
  const isContact = typeof contact === 'string' && contact.trim().length > 0
  const isItems =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (it) =>
        it &&
        typeof it.name === 'string' &&
        it.name.trim().length > 0 &&
        typeof it.qty === 'number' &&
        Number.isInteger(it.qty) &&
        it.qty > 0 &&
        typeof it.price === 'number' &&
        Number.isFinite(it.price) &&
        it.price >= 0,
    )
  return isChannel && isContact && isItems
}

async function orderingEnabled() {
  const res = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { PK: { S: 'config' }, SK: { S: 'ordering' } },
      ConsistentRead: true, // a flip via put-item must apply immediately
    }),
  )
  return res.Item?.orderingEnabled?.BOOL === true // missing item / wrong type -> disabled
}
