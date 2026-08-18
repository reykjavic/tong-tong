// Feature-toggle config endpoint for AWS Lambda + API Gateway (REST API).
//
// Serves the DB-backed feature toggles (SCOPE.md §12) to the public site:
//   GET /config  ->  { "ordering": { "enabled": true }, "reservations": { "enabled": false } }
//
// Each toggle is a config item in the RestaurantData single-table:
//   PK='config', SK='ordering'      -> orderingEnabled     (BOOL)
//   PK='config', SK='reservations'  -> reservationsEnabled (BOOL)
//
// Flip without redeploy:  aws dynamodb put-item (see scripts/set-toggle.sh).
//
// No bundled npm dependencies: the Lambda Node 20 runtime ships the AWS SDK v3
// (@aws-sdk/client-dynamodb), so the import resolves without a package.json —
// same zero-dep style as whatsapp-webhook/index.mjs.
//
// A missing item is treated as DISABLED (fail-closed): an operator must write
// an explicit BOOL to turn a feature on. The browser applies its own fail-open
// default on top (fetch failure -> show the UI as today).

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'

const TABLE_NAME = process.env.TABLE_NAME
const client = new DynamoDBClient({ region: process.env.AWS_REGION })

// name -> { SK suffix, boolean attribute to read }
const FEATURES = {
  ordering: { sk: 'ordering', attr: 'orderingEnabled' },
  reservations: { sk: 'reservations', attr: 'reservationsEnabled' },
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS: the site is on a different origin than this API, so the browser
  // needs Access-Control-Allow-Origin on the actual response. SAM's Cors
  // config on the Api only generates the OPTIONS preflight mock — Lambda-proxy
  // responses must carry the header themselves. '*' is fine: public config,
  // no credentials.
  'Access-Control-Allow-Origin': '*',
}

async function readFeature(name) {
  const { sk, attr } = FEATURES[name]
  const res = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { PK: { S: 'config' }, SK: { S: sk } },
      ConsistentRead: true, // a flip via put-item must apply immediately
    }),
  )
  const enabled = res.Item?.[attr]?.BOOL
  return { enabled: enabled ?? false } // missing item / wrong type -> disabled
}

export const handler = async () => {
  try {
    const [ordering, reservations] = await Promise.all([
      readFeature('ordering'),
      readFeature('reservations'),
    ])
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ ordering, reservations }),
    }
  } catch (err) {
    // Never throw: API Gateway turns unhandled throws into 502s with an
    // unreadable body. Return a stable 500; the site fails open on non-2xx.
    console.error('config read failed:', err)
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'config unavailable' }),
    }
  }
}
