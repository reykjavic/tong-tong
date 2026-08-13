// WhatsApp Cloud API webhook for AWS Lambda + API Gateway (HTTP API).
//
// Milestone 0 (see SCOPE.md): verify the webhook (GET handshake) and
// auto-reply to inbound text messages (POST). No database, no framework,
// zero npm dependencies — plain ESM + Node 18+ global fetch, same style as
// decap-oauth/index.mjs.
//
// The SAM template (template.yaml) exposes GET + POST /webhook/whatsapp on an
// API Gateway REST API; the handler dispatches on HTTP method. Meta calls the
// callback URL with:
//   GET  /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
//   POST /webhook/whatsapp  (JSON, signed with X-Hub-Signature-256)
//
// Required Lambda environment variables:
//   VERIFY_TOKEN        a token you invent; must match the one entered in the
//                       Meta App Dashboard (Webhooks -> WhatsApp -> Configure)
//   META_ACCESS_TOKEN   permanent / system-user token for the Graph API
//   PHONE_NUMBER_ID     numeric ID of the WhatsApp Business number that replies
//   APP_SECRET          Meta App secret — HMAC key for X-Hub-Signature-256
//
// Optional:
//   AUTO_REPLY_TEXT     fixed reply sent to any inbound text; if unset the
//                       handler echoes the received text (good first smoke test)
//   GRAPH_API_VERSION   Graph API version, default "v25.0" — bump on Meta's
//                       deprecation schedule (check developers.facebook.com)
//   BUSINESS_WA_ID      the restaurant's own WhatsApp number; messages from it
//                       (our own sends echoed back by Meta) are never replied to

import crypto from 'node:crypto'

const VERIFY_TOKEN = process.env.VERIFY_TOKEN
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID
const APP_SECRET = process.env.APP_SECRET
const AUTO_REPLY_TEXT = process.env.AUTO_REPLY_TEXT
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0'
const BUSINESS_WA_ID = process.env.BUSINESS_WA_ID

const GRAPH_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`

export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET'

  if (method === 'GET') return handleVerification(event)
  if (method === 'POST') return handleInbound(event)

  return { statusCode: 405, headers: JSON_HEADERS, body: 'Method Not Allowed' }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// ---------------------------------------------------------------------------
// GET — Meta's one-time endpoint verification. If hub.verify_token matches
// ours, echo the raw hub.challenge back as plain text (no quotes, no JSON).
// ---------------------------------------------------------------------------
function handleVerification(event) {
  const q = event.queryStringParameters || {}
  const mode = q['hub.mode']
  const token = q['hub.verify_token']
  const challenge = q['hub.challenge']

  if (mode === 'subscribe' && token && token === VERIFY_TOKEN) {
    return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: challenge || '' }
  }

  console.warn('webhook verification failed (verify_token mismatch)')
  return { statusCode: 403, headers: { 'Content-Type': 'text/plain' }, body: 'Verification failed' }
}

// ---------------------------------------------------------------------------
// POST — inbound event from Meta. Verify the HMAC signature first (without it
// anyone could spoof a message), then auto-reply to each text message.
// Always ack 200 quickly so Meta does not retry.
// ---------------------------------------------------------------------------
async function handleInbound(event) {
  if (!hasValidSignature(event)) {
    console.warn('webhook POST rejected: bad or missing X-Hub-Signature-256')
    return { statusCode: 403, headers: JSON_HEADERS, body: JSON.stringify({ error: 'invalid signature' }) }
  }

  let payload
  try {
    payload = JSON.parse(rawBody(event))
  } catch {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'invalid json' }) }
  }

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue // webhook field we subscribed to
      const value = change.value || {}
      for (const message of value.messages || []) {
        await handleMessage(message, value)
      }
    }
  }

  return { statusCode: 200, headers: JSON_HEADERS, body: 'OK' }
}

async function handleMessage(message, value) {
  const from = message.from // sender's wa_id (E.164, no "+")
  const text = message.text?.body

  // Never reply to our own sends (Meta echoes outbound messages back to us)
  // — that would loop. Guard on the direction field plus the business number.
  if (message.direction === 'outbound') return
  if (BUSINESS_WA_ID && from === BUSINESS_WA_ID) return
  if (!from) return

  if (message.type === 'text' && text) {
    const reply = AUTO_REPLY_TEXT || text // canned reply, or echo for a smoke test
    console.log(`replying to ${from}: ${JSON.stringify(reply)}`)
    await sendText(from, reply)
  } else {
    // Media, reactions, interactive buttons etc. — ack but ignore at M0.
    console.log(`ignoring ${message.type || 'unknown'} message from ${from} (id ${message.id})`)
  }
}

// ---------------------------------------------------------------------------
// Messages API: send a free-form text reply. Only valid while a
// customer-initiated conversation is open (24h window) — see SCOPE.md §10.
// ---------------------------------------------------------------------------
async function sendText(to, body) {
  const res = await fetch(GRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${META_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error(`Meta send failed (${res.status}): ${detail}`)
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Signature + body helpers
// ---------------------------------------------------------------------------

// Every Meta webhook POST carries X-Hub-Signature-256: sha256=<HMAC-SHA256 of
// the RAW body bytes keyed with the App secret>. Must hash the exact bytes
// received — re-serializing parsed JSON breaks the digest.
function hasValidSignature(event) {
  if (!APP_SECRET) {
    console.warn('APP_SECRET not configured; cannot verify webhook — refusing')
    return false
  }
  const signature = getHeader(event, 'x-hub-signature-256')
  if (!signature) return false

  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody(event)).digest('hex')
  return timingSafeEqual(signature, expected)
}

function getHeader(event, lowerName) {
  const headers = event.headers || {}
  const direct = headers[lowerName]
  if (direct) return direct
  const key = Object.keys(headers).find((k) => k.toLowerCase() === lowerName)
  return key ? headers[key] : undefined
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}

// API Gateway gives the raw body as a string, or base64 when it considers the
// payload binary. Decode if needed so the HMAC is computed over real bytes.
function rawBody(event) {
  if (event.isBase64Encoded) return Buffer.from(event.body || '', 'base64').toString('utf8')
  return event.body || ''
}
