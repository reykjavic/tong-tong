# backend/ — Serverless WhatsApp system

Serverless backend for the WhatsApp ordering & kitchen system (see [SCOPE.md](../SCOPE.md)).
This README is the **Milestone 0 runbook**: Meta setup → deploy → test the
"send a message, get an auto-reply" webhook.

## What exists now (M0)

```
backend/
├── template.yaml                 # SAM template — webhook, config, auth, toggle lambdas
├── README.md                     # this runbook
├── .env.whatsapp                 # LOCAL secrets (gitignored) — create from .example
├── .env.whatsapp.example         # committed template
├── .env.google                   # LOCAL secrets (gitignored) — create from .example
├── .env.google.example           # committed template
└── lambdas/
    ├── whatsapp-webhook/
    │   └── index.mjs             # webhook (verify + auto-reply)
    ├── config/
    │   └── index.mjs             # GET /config — public feature toggles
    ├── auth/
    │   └── index.mjs             # Google OAuth login + admin sessions
    └── toggle/
        └── index.mjs             # POST /toggle — admin-gated web toggle
```

The Lambda is a single self-contained `index.mjs` (zero npm dependencies, Node 18+
global `fetch`). Deployment is [AWS SAM](https://aws.amazon.com/serverless/sam/):
`backend/template.yaml` declares the function, its `GET`/`POST /webhook/whatsapp`
route, env vars and stage, and the deploy script does `sam build` + `sam deploy`.

## Prerequisites

- **AWS SAM CLI** installed ([`pipx install aws-sam-cli`](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) or your OS package manager).
- AWS CLI authenticated with rights to deploy Lambda + API Gateway and create an
  S3 artifacts bucket (region `eu-central-1`).
- A **Meta developer account** + a **WhatsApp Business account** with access to a
  WhatsApp number (a Meta-provided *test number* is fine for M0 — messaging via the
  Cloud API within the 24h conversation window is free).

## Step 1 — Meta dashboard setup (get the tokens)

1. Go to **developers.facebook.com** → create an app (type *Business*).
2. In the app: **Add product → WhatsApp**.
3. **WhatsApp → API Setup**: this shows your `Phone number ID` and a *temporary*
   access token. Add a **system user** (Business Settings → System users) or use
   **"Generate token"** with `whatsapp_business_messaging` + `whatsapp_business_management`
   permissions to get a **permanent** token. Put the values in `backend/.env.whatsapp`:
   - `PHONE_NUMBER_ID` → the numeric phone-number ID
   - `META_ACCESS_TOKEN` → the permanent token
4. **App settings → Basic**: copy the **App secret** → `APP_SECRET`.
5. Invent a random `VERIFY_TOKEN` (e.g. a long password). You'll reuse it in Step 3.
6. (Optional but recommended) note the number to reply from in `BUSINESS_WA_ID`
   if you want the loop guard.

## Step 2 — Local secrets + deploy

```bash
cp backend/.env.whatsapp.example backend/.env.whatsapp
# ... fill in the four required values ...

./scripts/deploy-backend.sh
```

The script reads `backend/.env.whatsapp`, builds the SAM app, and deploys it as
the `tong-tong-backend` stack (role, Lambda, API Gateway route, env vars). Rerun it
after any change to `backend/lambdas/*` or `backend/template.yaml`. The deploy
output (or `aws cloudformation describe-stacks`) shows the **WebhookUrl**:

```
https://<api-id>.execute-api.eu-central-1.amazonaws.com/Prod/webhook/whatsapp
```

## Step 3 — Configure the webhook in Meta

1. Meta App Dashboard → **Webhooks → WhatsApp → Configure**.
2. **Callback URL** = the WebhookUrl printed by the deploy.
3. **Verify token** = your `VERIFY_TOKEN`.
4. Click **Verify and save** — Meta performs the GET handshake; success means the
   Lambda returned your `hub.challenge`.
5. Back on the Webhooks page, **subscribe** to the `messages` field (this is the
   one the handler reads).

## Step 4 — Test

1. Send a WhatsApp message to the number (from any phone).
2. The bot replies with `AUTO_REPLY_TEXT` (or echoes your message if unset).

To test the webhook without a phone, POST a fake Meta payload with a valid HMAC:

```bash
SECRET=your_app_secret
BODY='{"object":"whatsapp_business_account","entry":[{"id":"0","changes":[{"value":{"messages":[{"from":"491501234567","id":"wamid.test","type":"text","text":{"body":"Hallo"},"direction":"inbound"}]},"field":"messages"}]}]}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')"
curl -i -X POST 'https://<api-id>.execute-api.eu-central-1.amazonaws.com/Prod/webhook/whatsapp' \
  -H "X-Hub-Signature-256: $SIG" -H 'Content-Type: application/json' \
  -d "$BODY"
```

You should get `200 OK` and see a "replying to …" log line in the Lambda's CloudWatch
log group. A POST without a valid signature must return **403**.

## Admin dashboard — Google OAuth login

The site's `/dashboard` (React admin panel) logs in via Google OAuth. The backend
runs the flow: `/auth/login` 302s to Google, `/auth/google/callback` exchanges the
code, verifies the id_token, **gates on `ADMIN_EMAIL`** (default `247reyk@gmail.com`),
and mints an opaque 7-day session. `/auth/me`, `/auth/logout` and `/toggle` take the
session as `Authorization: Bearer`. No cookies — the SPA stores the token in
`localStorage` and sends it in a header, so there is no CSRF surface.

### Google Cloud Console setup (one-time)

1. [console.cloud.google.com](https://console.cloud.google.com) → project → **OAuth
   consent screen** (External): app name `Tong Tong Admin`, scopes `openid` + `email`,
   **add the admin email as a test user** (must equal `ADMIN_EMAIL`). Keep in Testing.
2. **Credentials → Create OAuth client → Web application**. Register:
   - **Authorized redirect URI**: `https://<api-id>.execute-api.eu-central-1.amazonaws.com/Prod/auth/google/callback`
     — the *critical* value; re-register it whenever the stack's API id changes
     (it is stable across redeploys, only changes if the stack is recreated).
   - **Authorized JavaScript origins**: the SPA origin (e.g. `https://d22hrnca27jxah.cloudfront.net`).
3. Copy the **Client ID** + **Client secret** into `backend/.env.google`:
   ```bash
   cp backend/.env.google.example backend/.env.google   # fill in the two values
   ```
4. `./scripts/deploy-backend.sh` — the script passes the google values as
   CloudFormation params. Missing file → the auth Lambda deploys **inert**
   (login returns 503), never a deploy failure.

### Smoke tests

```bash
AUTH=$(aws cloudformation describe-stacks --stack-name tong-tong-backend --profile tong-tong \
  --region eu-central-1 --query 'Stacks[0].Outputs[?OutputKey==`AuthUrl`].OutputValue' --output text)
curl -i "$AUTH?next=/dashboard"        # 302 -> accounts.google.com with client_id + state
curl -i "${AUTH%%login}me"             # 401 (no session)
curl -i -X POST "${AUTH%%login}toggle" -H 'Content-Type: application/json' -d '{"feature":"ordering","enabled":true}'  # 401
```

To test a real session without a browser, insert one and call `/toggle` with it
(replaces the web toggle for a CLI flip):

```bash
TOKEN=$(openssl rand -base64 32 | tr '/+' '_-' | tr -d '=')
aws dynamodb put-item --table-name RestaurantData --profile tong-tong --region eu-central-1 \
  --item "{\"PK\":{\"S\":\"session\"},\"SK\":{\"S\":\"$TOKEN\"},\"email\":{\"S\":\"247reyk@gmail.com\"},\"TTL\":{\"N\":\"$(($(date +%s)+86400))\"}}"
curl -i -X POST "${AUTH%%login}toggle" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"feature":"ordering","enabled":false}'
```

### Security notes (admin dashboard)

- Only `ADMIN_EMAIL` ever gets a session (checked at callback mint **and** again at
  `/toggle`). Non-admin Google accounts are redirected back without a token.
- The Google id_token is verified end-to-end: RS256 signature against Google's JWKS,
  plus `iss` / `aud` / `exp` / `email_verified`. The `access_token` is ignored.
- Sessions are opaque random tokens with DynamoDB TTL (7 days) — revocable by
  deleting the item, no JWT library, no cookies.
- Secrets (`GOOGLE_CLIENT_SECRET`) are `NoEcho` CloudFormation params from the
  gitignored `.env.google` — same pipeline as the WhatsApp secrets.

## Troubleshooting

| Symptom | Likely cause / fix |
| :------ | :----------------- |
| Webhook "verify" fails in Meta | `VERIFY_TOKEN` mismatch, or you changed the env file but didn't redeploy (`./scripts/deploy-backend.sh`) |
| No reply arrives | Webhook not subscribed to `messages`; or the number is a test number the sender can't reach; check Lambda logs |
| Reply never lands but logs say 200 | `META_ACCESS_TOKEN` expired or lacks permissions; check the "Meta send failed" log line |
| Bot replies to its own messages / loop | Set `BUSINESS_WA_ID`; confirm the handler's `direction === "outbound"` guard |
| Signature check rejects Meta's real POSTs | `APP_SECRET` wrong; body must be hashed as received (don't re-encode JSON) |

## Security notes (M0)

- Every POST is HMAC-verified against `APP_SECRET` — never disable this.
- Secrets live only in `backend/.env.whatsapp` (gitignored) and are passed to
  CloudFormation as `NoEcho` parameters — never committed, never in `samconfig.toml`.
- The webhook returns 403 before doing anything on bad signatures, so a spoofed
  "message" never triggers a send.

## Next milestones (see SCOPE.md)

- **M1** — store inbound messages in DynamoDB (idempotent via `message.id`), CI
  deploy (`deploy-lambda.yml`) via GitHub Actions.
- **M2** — kitchen dashboard (orders list + prep-time buttons that WhatsApp the
  customer). Google OAuth login + web feature-toggles are already in (see above).
- **M3** — customer ordering + "Re-Order My Usual".
- **M4** — hardening (retries/DLQ, rate limits, alarms, budget alert).
