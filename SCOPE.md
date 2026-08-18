# SCOPE.md — Serverless Ordering & Kitchen System

Scope and implementation plan for the **serverless ordering + kitchen dashboard** system that wraps the existing Tong Tong website ([SPEC.md](./SPEC.md) stays the site spec; this is the ordering-system spec). Delivery is **phased** — each milestone is small and independently shippable. **Milestone 0 (WhatsApp auto-reply) is the current iteration** and is fully documented in [backend/README.md](./backend/README.md).

> **Status legend** — `[in progress]` being built now; `[planned]` scoped but not started; `[deferred]` consciously postponed. Mirrors the `[built]`/`[planned]` convention in `SPEC.md`.

---

## 1. Product Definition & Goals

### The flow (as decided)

1. **Customer** goes to the website → **Online bestellen** → selects one or more products.
2. Enters an **email** *or* **WhatsApp number** to receive the pickup notification.
3. Chooses **pay at pickup** (v1; online payment deferred — see §9/M3).
4. The order is stored in **DynamoDB**: what was ordered, the contact value, the notification channel, and the payment choice.
5. **Kitchen dashboard**: a UI lists **open orders**, each with **timeframe buttons (15 / 20 / 30 / 45 min)**. Tapping one messages that customer — **via email or WhatsApp, whichever they chose** — that the food is ready for pickup.
6. The dashboard shows **open orders**, **who was notified** (and when), **who wasn't**, and lets staff **mark an order completed**. Data-table features are specced later (§9/M3).

### Goals
- **Zero-maintenance, near-$0** system: AWS Serverless only (Lambda + API Gateway + DynamoDB + SES), no EC2, no managed servers, no recurring fees. Baseline cost ≈ $0/month.
- **Customers can order from the website** and get notified when their food is ready — on the channel they choose.
- **Two notification channels**: WhatsApp (Meta Cloud API) and **email (SES)**.
- **Kitchen dashboard**: staff see open orders, notify a customer with one tap, and see exactly who has/hasn't been notified.
- **Customers can also message the restaurant on WhatsApp** — inbound messages are stored and (eventually) become orders.
- Keep building on the existing repo (website) and existing AWS account (`eu-central-1`).

### Positioning — why this exists
Most restaurant websites use WordPress on expensive managed hosting, or hand a big cut to delivery platforms (Lieferando, Uber Eats, etc.) for every order. **This project is a public showcase of a self-owned, low-cost alternative:** a serverless stack on AWS that stays near €0/month, keeps the restaurant in control of its own ordering, and adds no percentage per order. Code is kept clean, commented, and documented (backend conventions in `CLAUDE.md`) precisely because it's public.

### Non-Goals (v1)
- **No online payment** — customers pay at pickup. Supersedes the earlier `/order` idea of "hosted checkout, no backend" (TODO.md); this system *does* add a backend. Online payment is a *deferred* decision (§12).
- **No customer login / auth** — the customer just leaves an email or WhatsApp number with the order. No OTP, no magic links, no accounts, no favorites/"Re-Order My Usual" in v1.
- No table/seat reservations, no inventory, no multi-branch support.
- **No out-of-window messaging, ever.** We only send within the 24h window that a customer's inbound message opened. No template messages, no marketing pushes, no unsolicited reminders (see [§10](#10-edge-cases--error-handling)). Deliberate product decision.

---

## 2. Architecture Decision — AWS SAM

**Decision:** the backend is an **AWS SAM application** ([`backend/template.yaml`](./backend/template.yaml)). Each Lambda is a self-contained `backend/lambdas/<name>/index.mjs` (plain ESM, zero npm dependencies — same style as [`decap-oauth/index.mjs`](./decap-oauth/index.mjs)); SAM declares the function, its API Gateway route, invoke permission, env vars and stage in one place, and `sam deploy` handles diff/rollback.

**Why SAM (not a setup script, not CDK)?** There will be *several* Lambdas — the WhatsApp webhook, order intake, kitchen staff API, (later) auth. A shell script that manually wires `add-permission` + routes + env per function gets brittle past ~2 functions. SAM makes each function a ~15-line block and keeps the whole fleet declarative and reproducibly deployable. Trade-offs: the SAM CLI is a per-developer prerequisite, and one more toolchain to keep current — acceptable here, where the benefit (many small functions, one deploy) is exactly the problem we have. CDK would add the same benefit with more framework and a `cdk bootstrap` stack; no need for it. `decap-oauth` stays as-is for now and can be onboarded into this SAM app later.

---

## 3. High-Level Architecture

```
┌──────────────────────────┐
│ Meta WhatsApp Cloud API  │  inbound msg → POST /webhook/whatsapp
└─────────────┬────────────┘  GET handshake → verify endpoint
              │
              ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│  API Gateway (REST API)  │──────▶ │  AWS Lambda               │
│  SAM ServerlessRestApi   │        │  whatsapp-webhook (M0)    │
│  /webhook/whatsapp       │        │  orders (M2)              │
│  /api/orders             │        │  staff (M2)               │
│  /api/staff/orders       │        └──────────┬───────────────┘
└──────────────────────────┘                   │ notifications (M2)
                                               ▼
                          ┌──────────────────────────────────────┐
                          │ email ─▶ AWS SES (verified domain)   │
                          │ WhatsApp ─▶ Meta Graph Messages API  │
                          └──────────────────────────────────────┘
                                    ▲
                                    │
   [Customer site (existing S3)] ───┘  POST /api/orders (public)
   [Kitchen dashboard (S3 SPA)] ───────┘  GET /api/staff/orders, POST notify, PATCH status
```

- **Milestone 0** = the `whatsapp-webhook` Lambda + webhook route only. No database yet.
- **Milestone 2** = the core product: `orders` + `staff` Lambdas, DynamoDB `RestaurantData`, SES + Meta outbound, the website order form, and the kitchen SPA.

---

## 4. Repository / Directory Structure

```
├── SCOPE.md                        # This document
├── backend/                        # Serverless backend (SAM app)
│   ├── template.yaml               # SAM template — every function + API route + DynamoDB
│   ├── README.md                   # Runbook: Meta setup + deploy + test (start here)
│   ├── .env.whatsapp               # LOCAL secrets, gitignored (M0)
│   ├── .env.whatsapp.example       # Committed template
│   └── lambdas/
│       ├── whatsapp-webhook/       # M0  — webhook verify + auto-reply [in progress]
│       │   └── index.mjs
│       ├── orders/                 # M2  — customer order intake (POST /api/orders)
│       ├── staff/                  # M2  — kitchen API: list open orders, notify, complete
│       ├── auth/                   # [deferred] — staff auth if needed
│       └── (future) notify/        # extracted only if notification triggers multiply
├── kitchen/                        # M2  — kitchen dashboard SPA (separate mini Vite app)
├── scripts/
│   ├── deploy-backend.sh           # M0  — sam build + deploy (secrets from .env.*)
│   ├── setup-staging.sh            # existing
│   └── README.md                   # documents both
├── .github/workflows/
│   ├── deploy.yml                  # existing site deploy
│   └── deploy-lambda.yml           # M1+ — SAM build + deploy from GitHub Actions
├── src/ …                          # existing website; gains the order form in M2
└── docs/
    └── whatsapp-setup.md           # [planned] Meta console deep-dive if README grows
```

Every Lambda is a **self-contained single `index.mjs`** (zero npm dependencies, Node 18+ global `fetch`) — SAM packages it as-is, so there is no `node_modules` story. Shared logic (DynamoDB helpers, Meta/SES clients, notification dispatch) lands in `backend/shared/` once a second function needs it.

---

## 5. API Gateway Routes & HTTP Methods

**Milestone 0** — the SAM template's `Api` event exposes **GET + POST `/webhook/whatsapp`** on an API Gateway REST API (implicit `ServerlessRestApi`). SAM wires the route, stage and Lambda invoke permission automatically; the Lambda dispatches on method. The deploy prints the callback URL (`…/Prod/webhook/whatsapp`).

| Method | Path                 | Auth                          | Handler            | Purpose |
| :----- | :------------------- | :---------------------------- | :----------------- | :------ |
| GET    | `/webhook/whatsapp`  | `hub.verify_token`            | whatsapp-webhook   | Meta webhook verification handshake |
| POST   | `/webhook/whatsapp`  | `X-Hub-Signature-256` (HMAC)  | whatsapp-webhook   | Inbound WhatsApp messages → auto-reply (M0), persist + order (M1+) |

**Milestone 2** (routes added on the same SAM REST API):

| Method | Path                           | Auth        | Handler | Purpose |
| :----- | :----------------------------- | :---------- | :------ | :------ |
| POST   | `/api/orders`                  | public      | orders  | Place an order: items + contact channel (email/WhatsApp) + pay-at-pickup |
| GET    | `/api/staff/orders`            | staff token | staff   | Open orders for the kitchen (Pending + Notified) |
| POST   | `/api/staff/orders/:id/notify` | staff token | staff   | Mark notified: send "ready for pickup" via the order's channel (SES or WhatsApp), set `NotifiedAt` + `PickupInMinutes` |
| PATCH  | `/api/staff/orders/:id/status` | staff token | staff   | Mark an order `Completed` (or other status changes) |

**Notes**
- Order intake is **public** — no login; contact info travels with the order.
- Staff auth: a shared token (recommended for a family tool) or Google OAuth against `ALLOWED_EMAILS` — decision in §12.
- *(Deferred: no customer `GET /api/orders` history, no favorites, no OTP routes — see Non-Goals.)*

---

## 6. DynamoDB Single-Table Schema

Table **`RestaurantData`** (`PAY_PER_REQUEST`, eu-central-1). Created in M1; **M0 needs no database.**

### v1 order model — the core

| Partition Key (`PK`) | Sort Key (`SK`) | Payload |
| :-------------------- | :--------------- | :------ |
| `ORDER#<order_id>`    | `METADATA`       | `Status`, `Channel`, `Contact`, `Payment`, `Items`, `Total`, `CreatedAt`, `NotifiedAt`, `PickupInMinutes`, `CompletedAt` |

**Fields on an order (`ORDER#<id>/METADATA`):**

| Field | Values / type | Purpose |
| :---- | :------------ | :------ |
| `Status` | `Pending` → `Notified` → `Completed` | Lifecycle; the kitchen's primary view |
| `Channel` | `email` \| `whatsapp` | How the customer wants the pickup notification |
| `Contact` | email address \| WhatsApp `wa_id` (E.164) | Where to send it |
| `Payment` | `pay_at_pickup` (v1) | Payment choice |
| `Items` | `[{ name, qty, price }]` | What was ordered (structured — the customer selects products) |
| `Total` | number | Sum of items |
| `CreatedAt` | ISO timestamp | Set on placement |
| `NotifiedAt` | ISO timestamp \| null | Set when a timeframe button is tapped |
| `PickupInMinutes` | `15` \| `20` \| `30` \| `45` \| null | The tapped timeframe; used in the notification text |
| `CompletedAt` | ISO timestamp \| null | Set when staff marks completed |

**Kitchen "open orders" query:** GSI `GSI1` with `PK = STATUS#<status>`, `SK = <CreatedAt>`. The kitchen lists `STATUS#Pending` + `STATUS#Notified` (open = not completed), newest first. Completed orders drop out of the open list but remain in the table.

**Inbound-message log (M1):**

| Partition Key (`PK`) | Sort Key (`SK`) | Payload |
| :-------------------- | :--------------- | :------ |
| `MSG#<message_id>`    | `METADATA`       | `From`, `Text`, `Type`, `ReceivedAt`, `Handled` |

Meta redelivers webhooks on non-200/timeout; persisting by Meta's `message.id` makes processing idempotent — the core correctness fix in M1.

*(Deferred: `USER#` profiles, `FAVORITE#` rows, and `USER#…/ORDER#` history — all need login, which v1 doesn't have.)*

---

## 7. Lambda Handlers

| Function | Env vars (all) | What it does |
| :------- | :------------- | :----------- |
| **whatsapp-webhook** (M0) | `VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `PHONE_NUMBER_ID`, `APP_SECRET` (+ optional `AUTO_REPLY_TEXT`, `GRAPH_API_VERSION`, `BUSINESS_WA_ID`) | GET: verify handshake. POST: verify `X-Hub-Signature-256`, parse `entry[].changes[].value.messages[]`, **auto-reply** via Graph API, ack 200 fast. |
| **orders** (M2) | `DYNAMO_TABLE_NAME` | Gate on `orderingEnabled` (config item) → `403` when off (see §12). Then validate + insert an order (`ORDER#<id>/METADATA`). Public, no auth. |
| **staff** (M2) | `DYNAMO_TABLE_NAME`, `STAFF_TOKEN` (or Google OAuth vars), `META_ACCESS_TOKEN`, `PHONE_NUMBER_ID`, `SES_FROM_EMAIL`, `SES_REGION` | Verify staff auth. List open orders (GSI). **Notify:** send "ready for pickup" via the order's channel (WhatsApp Messages API or SES email) + set `NotifiedAt`/`PickupInMinutes`. **Status:** mark `Completed`. |

Notification copy (German-first): *"Ihre Bestellung ist in ca. X Minuten abholbereit."* — same message body through either channel.

---

## 8. Environment Variables & Secrets

**Milestone 0** (SAM template parameters, declared `NoEcho`; [`scripts/deploy-backend.sh`](./scripts/deploy-backend.sh) reads the gitignored `backend/.env.whatsapp` and `backend/.env.google` and passes them to `sam deploy`):

| Variable | Required | Purpose |
| :------- | :------- | :------ |
| `VERIFY_TOKEN` | yes | Your own secret string; must match what you enter in the Meta dashboard webhook config |
| `META_ACCESS_TOKEN` | yes | Permanent/system-user token for the Graph API (Meta dashboard → WhatsApp → API Setup) |
| `PHONE_NUMBER_ID` | yes | Numeric ID of the WhatsApp Business number that replies |
| `APP_SECRET` | yes | Meta App secret — HMAC key for `X-Hub-Signature-256` |
| `AUTO_REPLY_TEXT` | no | Fixed reply text; if unset the handler echoes the inbound message (handy first smoke test) |
| `GRAPH_API_VERSION` | no | default `v25.0` — bump on Meta's deprecation schedule |
| `BUSINESS_WA_ID` | no | The restaurant's own WhatsApp number; messages from it are never auto-replied (loop guard) |

**Milestone 2 (added):** `DYNAMO_TABLE_NAME`, `STAFF_TOKEN` (or `ALLOWED_EMAILS` + Google OAuth), `SES_FROM_EMAIL` (e.g. `bestellung@tong-tong.eu`), `SES_REGION`.

**Secrets handling:** never commit secrets. M0 declares them as `NoEcho` CloudFormation parameters and the deploy script injects them from gitignored `backend/.env.whatsapp` — nothing secret touches the repo or `samconfig.toml`. For M2+ consider **SSM Parameter Store** (`SecureString`) for `META_ACCESS_TOKEN`/`STAFF_TOKEN` and have Lambdas read at runtime. CI (`deploy-lambda.yml`, M1) reads env vars from GitHub Secrets.

---

## 9. Implementation Milestones

### M0 — WhatsApp webhook + auto-reply  `[in progress]`
Smallest shippable slice: message a number → it auto-replies.
1. Add Meta credentials: create a WhatsApp Business app, get `META_ACCESS_TOKEN`, `PHONE_NUMBER_ID`, `APP_SECRET` (console steps in [backend/README.md](./backend/README.md)).
2. Fill in `backend/.env.whatsapp`.
3. Install the SAM CLI and run `./scripts/deploy-backend.sh` — builds the Lambda, creates the `tong-tong-backend` stack (role, function, REST API route, env vars), prints the **WebhookUrl**.
4. Configure the webhook in the Meta dashboard (Callback URL + verify token, subscribe to `messages`).
5. Send a WhatsApp message → get the auto-reply. Also test GET verification + curl a synthetic POST.

**Exit criteria:** a real WhatsApp message to the number receives an auto-reply within seconds; the signature check rejects spoofed POSTs with 403; no self-reply loop.

### M1 — Persistence + idempotency + CI
1. Create DynamoDB table `RestaurantData` (PAY_PER_REQUEST) in the SAM template.
2. `whatsapp-webhook` writes every inbound message to `MSG#<message_id>` and skips duplicates (idempotent redelivery).
3. `.github/workflows/deploy-lambda.yml` — `sam build` + `sam deploy` from GitHub Actions on push to `main`.

**Exit criteria:** webhook processing is idempotent under Meta redelivery; code deploys from CI.

### M2 — Customer ordering + kitchen dashboard (the core product)
1. **DynamoDB order model** (§6): `ORDER#<id>/METADATA` + `GSI1` (status → createdAt).
2. **`orders` Lambda + `POST /api/orders`** (public): gate on `orderingEnabled` (config item, §12) → `403` when off; accept items + `Channel` (email/WhatsApp) + contact value + `pay_at_pickup`; validate (items non-empty, contact well-formed); insert with `Status: Pending`.
3. **Website order form**: a new route on the existing SPA — product selection, email/WhatsApp field, "pay at pickup" (only option shown in v1), submit → `POST /api/orders`. German-first text via `t()`.
4. **SES identity**: verify the `tong-tong.eu` domain (or a subdomain) in SES so email can send; set `SES_FROM_EMAIL`.
5. **`staff` Lambda + kitchen SPA** (`kitchen/`): list open orders (Pending + Notified), each row showing items, total, channel + contact, and **who has/hasn't been notified** (with `NotifiedAt`/`PickupInMinutes`). **Timeframe buttons [15][20][30][45]** → `POST /api/staff/orders/:id/notify` → dispatch via the order's channel (SES or WhatsApp) → set `NotifiedAt`. **Mark completed** → `PATCH /api/staff/orders/:id/status`.
6. **Staff access**: shared token in a header (recommended) or Google OAuth — see §12.

**Exit criteria:** a customer orders on the website → the order appears in the kitchen dashboard → staff tap "15" → the customer receives the ready-for-pickup **email or WhatsApp** (the channel they chose) → the row shows as notified (with the time) → staff mark it completed and it leaves the open list.

### M3 — Data-table features + deferred product (spec later)
- **Common data-table features** for the kitchen list (to be specified): sorting, filtering by status/channel, searching by contact, pagination, timestamps, day grouping.
- **Deferred product (later cycles):** online payment — **PayPal + Google Pay via a processor like Stripe** (Google Pay is a wallet on top of a processor; Apple Pay is likely skipped — Apple's $99/yr developer account is too much for a small restaurant) — plus "Re-Order My Usual"/favorites, customer order history, WhatsApp-driven ordering (text an order from the webhook).

### M4 — Hardening
Rate limiting (API Gateway + Lambda), Meta API retries with exponential backoff + dead-letter queue, SES delivery/ bounce handling, CloudWatch alarms/budget alert, rotate secrets, webhook error reports, kill-switch for the auto-reply.

---

## 10. Edge Cases & Error Handling

### Webhook layer
- **Verification handshake fails** → return 403; don't echo the challenge.
- **Signature missing/invalid** → **403, never process** (prevents spoofed messages). `timingSafeEqual` comparison.
- **Malformed JSON** → 400; don't crash.
- **Meta redelivery / duplicate message** → idempotent via `message.id` (M1). Ack 200 fast so Meta doesn't retry.
- **Non-text messages** (images, reactions, interactive buttons) → ack + log, skip (M0); M1+ stores them as conversation history.
- **Status updates** (`statuses[]`: sent/delivered/read/failed) → ignored (they arrive on the same webhook).
- **Outbound/self messages** → never auto-reply (loop guard: `direction === "outbound"` + `BUSINESS_WA_ID`).

### Notification layer (WhatsApp + email, M2)
- **WhatsApp 24h window**: the pickup notification always lands inside the window the customer's order/message opened — the customer just interacted, so free-form text is allowed and free. After the window closes we simply **don't send** (no templates — see §1). A `131047`-style out-of-window error is a bug, not a reason to add templates.
- **Email deliverability**: verify the SES identity (SPF/DKIM) so mail isn't spam-filtered. Bad/misspelled email → SES returns an error or a bounce; log it and leave the order "not notified" so the kitchen can retry or phone.
- **Invalid/off-network WhatsApp number** → Meta errors; mark the notification failed; keep the order visible as not-notified.
- **Notify is not atomic**: set `NotifiedAt`/`PickupInMinutes` only *after* the send call resolves successfully; if the send fails, don't claim the customer was notified.
- **Double-tap on a timeframe button** → idempotent via a condition expression (`NotifiedAt` must be null) so staff can't re-send by accident; the UI also disables the buttons after notifying.
- **Contact missing/garbled** → reject at order time (server-side validation, not just client-side).

### Meta API layer
- **Rate limits / 429**: tiers per phone number; honor `Retry-After`; exponential backoff (M4); log + continue otherwise.
- **5xx / transient failures**: retry with backoff (M4); M0 logs and returns 200 (message acknowledged, send lost — acceptable at M0 scale, fixed in M4 via DLQ).
- **Token expiry**: system-user tokens are permanent; app-level tokens expire (~24h) — always use a permanent/system-user token.
- **Unregistered/incorrect phone format**: always E.164 (`4915…`) — Meta uses `wa_id` without `+`.

### Email / SES (M2)
- SES has a daily sending quota + max send rate (defaults are comfortably above restaurant volume — a few dozen notifications/day).
- Bounce/complaint notifications: at minimum log them; decide in M4 whether to hook bounce notifications to flag "not actually delivered."

### Lambda / API Gateway
- **Timeouts**: webhook handler must ack < ~10s; set Lambda `timeout: 10`. Heavy work moves to async queues in M4.
- **Payload size**: API Gateway 10MB limit; WhatsApp media references arrive as URLs, not payloads — fine.
- **Cold starts**: negligible at this scale; keep handler init light (no top-level I/O).

### DynamoDB (M1+)
- On-demand mode → no throttling under normal restaurant volume; if throttled, retry with backoff.
- Hot partitions (a single `STATUS#` GSI key, e.g. all Pending orders) → the GSI key is coarse but fine at this scale; the kitchen query is a single status range, newest first.
- Use condition expressions (e.g. only update `ORDER#…` if `Status` is `Pending`, or `NotifiedAt` is null) to prevent double-handling.

### Auth (M2)
- **Staff token** (recommended): a long random `STAFF_TOKEN` env var compared in constant time; the kitchen SPA keeps it in sessionStorage and sends it as a header. Simple for a family tool.
- **`ALLOWED_EMAILS`** (if Google OAuth): comma-separated whitelist; never wildcard; verify against Google's `email_verified`.
- Order intake is **public by design** — no auth, but server-side validation limits abuse (order size caps, contact validation, rate limit).

### Ops
- Secrets only in Lambda env vars / SSM / GitHub Secrets — never in the repo.
- CloudWatch logs per function; `META_ACCESS_TOKEN`/`STAFF_TOKEN` redacted from logs.
- AWS Budget alarm at a few €/month so a mistake can't silently bill.

---

## 11. Cost Estimate

| Item | Cost |
| :--- | :--- |
| Lambda (a few hundred invocations/day) | $0 (1M free req/mo) |
| API Gateway (REST API) | $0 (1M free req/mo) |
| DynamoDB on-demand | ≈ $0 (25 GB free tier, pay-per-request) |
| SES email | $0 up to 3,000 messages/month (restaurant volume is well under) |
| Meta WhatsApp Cloud API | **Free** — user-initiated conversations + free-form replies within the 24h window (we never send out-of-window or template messages) |
| **Total baseline** | **≈ $0/month** |

---

## 12. Open Decisions (resolve as we iterate)

1. **Staff auth (resolved 2026-08-18):** **Google OAuth** against a single `ADMIN_EMAIL` (not the shared token) — the owner wanted a real login to identify users and protect web feature-toggles on `/dashboard`. Implemented: `auth` Lambda (OAuth code flow, id_token JWKS verification, opaque 7-day sessions in the table with TTL, `ADMIN_EMAIL` gate at mint and at write) + `toggle` Lambda (`POST /toggle`, Bearer session). "Staff grows" later → extend the email allowlist to a list rather than switching mechanisms.
2. **Order item model**: structured products selected from the menu (decided direction) — but whether items come from a hardcoded list, a config file, or the existing menu PDF is open. Affects the order form.
3. **SES from-address**: `bestellung@tong-tong.eu` vs a subdomain — trivial, pick during M2 SES setup.
4. **Single HTTP API vs one per function**: M0/M2 use SAM's implicit REST API with per-path integrations (preferred — one URL, one auth layer).
5. **Kitchen dashboard placement**: separate `kitchen/` SPA (preferred — keeps build/publish isolated from the public site) vs a `/kitchen` route on the existing site.
6. **Data-table feature set** for the kitchen list — to be specified before M3.
7. **Online payment** (later cycle, not v1): likely **PayPal + Google Pay via Stripe** (Google Pay needs a processor underneath). **Apple Pay is probably out** — it requires Apple's $99/yr developer account, too much for a small restaurant. Largest single scope add available; keep out of v1.
8. **Feature toggle for online ordering (resolved 2026-08-17):** gated by a **server-side flag in DynamoDB**, not a client-side one. Client-side toggles (runtime JSON from S3, build-time const, localStorage) are public and trivially bypassable — they can hide UI but can never stop a direct `POST /api/orders`, so they can't protect the order email. The authoritative gate is a check inside the `orders` Lambda (M2): read `orderingEnabled` from a config item (`PK='config'`, `SK='ordering'`) at request time; when **off** → `403`, no order write, no notification. When **on**, the UI entry points (nav link, Menu CTA, `/order` route) are shown; when off they're hidden or 404. Flip is a single `aws dynamodb put-item` — no deploy. Built in from day one when M2 lands; nothing client-side before that (the `/order` placeholder on `dev` is inert until M2).
