// Public opening-hours endpoint (Places API (New), read-only).
//
//   GET /hours
//     -> 200 { source: "google"|"cache"|"cache_stale", businessStatus,
//              regularHours, currentHours, fetchedAt }
//     -> 503 unconfigured (empty PLACES_API_KEY) or no cache + Places down
//
// Reads the restaurant's REAL hours from the public Places API — the same
// data the owner maintains on the Google Business Profile. Two fields are
// relayed:
//   regularHours  the standard week (day-based periods)
//   currentHours  the effective hours for the next 7 days, where every
//                 period carries an explicit date — this is the
//                 special/vacation-adjusted view (a vacation day entered on
//                 Google shows up as a missing/adjusted period for that date)
// plus businessStatus for temporary/permanent closures. The SPA computes
// open/closed from this; when the payload is missing it falls back to the
// site's default schedule (fail-open, same pattern as /config).
//
// Caching: the payload (and the resolved placeId) lives in RestaurantData for
// CACHE_TTL_SECONDS (default 24h — opening hours change only a few times a
// year, so this is ~1 Google call/day; a same-day edit lands within a day),
// so Places is only called on cache expiry. When Places is unreachable, a
// stale cache is served (source: "cache_stale") — a 503 is only returned when
// there is nothing at all.
// The placeId is resolved once via Text Search from PLACE_QUERY and cached,
// so no manual resolution step is needed (PLACE_ID short-circuits it).
//
// No bundled npm dependencies: the Lambda Node 20 runtime ships the AWS SDK v3
// and global fetch. REST API v1 payload (event.httpMethod).

import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'

const TABLE_NAME = process.env.TABLE_NAME
const PLACES_API_KEY = process.env.PLACES_API_KEY || ''
const PLACE_ID = process.env.PLACE_ID || ''
const PLACE_QUERY = process.env.PLACE_QUERY || ''
const CACHE_TTL_SECONDS = Number(process.env.HOURS_CACHE_TTL_SECONDS || 86400)

const client = new DynamoDBClient({ region: process.env.AWS_REGION })

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS: the SPA is on a different origin; Lambda-proxy responses must carry
  // this themselves (SAM's Cors only generates the OPTIONS preflight mock).
  'Access-Control-Allow-Origin': '*',
}

const PLACES_BASE = 'https://places.googleapis.com/v1'

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'method not allowed' })
    }
    if (!PLACES_API_KEY) {
      // Ships inert until backend/.env.places is filled (like the auth 503s).
      return json(503, { error: 'hours_unavailable' })
    }

    const cached = await getCache()

    // Fresh cache -> no Places call at all.
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL_SECONDS * 1000) {
      return json(200, { ...cached, source: 'cache' })
    }

    // Resolve the place once (Text Search) and remember it.
    let placeId = PLACE_ID || cached?.placeId || ''
    if (!placeId && PLACE_QUERY) {
      placeId = await resolvePlaceId(PLACE_QUERY)
    }
    if (!placeId) {
      return json(503, { error: 'hours_unavailable' })
    }

    try {
      const data = await fetchPlace(placeId)
      const payload = {
        placeId,
        businessStatus: data.businessStatus ?? null,
        regularHours: data.regularOpeningHours ?? null,
        currentHours: data.currentOpeningHours ?? null,
        fetchedAt: new Date().toISOString(),
      }
      await putCache(payload)
      return json(200, { ...payload, source: 'google' })
    } catch (err) {
      console.error('Places fetch failed:', err)
      // Fail-open: serve whatever we have, even if stale.
      if (cached) return json(200, { ...cached, source: 'cache_stale' })
      throw err
    }
  } catch (err) {
    // Never throw: API Gateway turns unhandled throws into opaque 502s.
    console.error('hours read failed:', err)
    return json(503, { error: 'hours_unavailable' })
  }
}

// ---------------------------------------------------------------------------
// Places API calls
// ---------------------------------------------------------------------------

async function resolvePlaceId(query) {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      // Only the id is needed for the Details call that follows.
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'de' }),
  })
  if (!res.ok) throw new Error(`places searchText ${res.status}`)
  const data = await res.json()
  const id = data.places?.[0]?.id
  if (!id) throw new Error('places searchText: no result')
  return id
}

async function fetchPlace(placeId) {
  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': PLACES_API_KEY,
      // currentOpeningHours carries the special/vacation-adjusted view for the
      // next 7 days (periods with explicit dates); regularOpeningHours is the
      // plain week the client compares against to explain closures.
      'X-Goog-FieldMask': 'businessStatus,regularOpeningHours,currentOpeningHours',
    },
  })
  if (!res.ok) throw new Error(`places details ${res.status}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// DynamoDB cache (PK='hours', SK='effective'; TTL for auto-expiry)
// ---------------------------------------------------------------------------

async function getCache() {
  const res = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { PK: { S: 'hours' }, SK: { S: 'effective' } },
    }),
  )
  const item = res.Item
  if (!item?.Data?.S) return null
  try {
    return { ...JSON.parse(item.Data.S), fetchedAt: item.fetchedAt?.S ?? null }
  } catch {
    return null
  }
}

async function putCache(payload) {
  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: { S: 'hours' },
        SK: { S: 'effective' },
        Data: { S: JSON.stringify(payload) },
        fetchedAt: { S: payload.fetchedAt },
        TTL: { N: String(Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS) },
      },
    }),
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) }
}
