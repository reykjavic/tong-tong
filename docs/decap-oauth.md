# Decap CMS – GitHub OAuth provider (AWS Lambda + API Gateway)

This guide sets up the OAuth bridge that lets the Decap CMS admin at
`/admin/` authenticate with GitHub and push post edits straight to the
`reykjavic/tong-tong` repository. The site itself stays on AWS; the provider
is a small HTTPS endpoint backed by Lambda + API Gateway.

Why this is needed: Decap's `github` backend runs entirely in the browser. It
cannot hold a GitHub credential itself, so it opens a popup to an HTTPS
endpoint (this Lambda) that performs the OAuth handshake and hands the token
back via `postMessage`. GitHub requires the callback URL to be HTTPS, which
the API Gateway invoke URL provides.

**The handshake protocol matters.** Decap's `NetlifyAuthenticator`
(`decap-cms-lib-auth/src/netlify-auth.js`) expects a two-phase exchange, not a
one-shot `postMessage`:

1. The `/callback` page posts `authorizing:github` to the opener (admin window).
2. Decap echoes `authorizing:github` back.
3. The `/callback` page then posts
   `authorization:github:success:{"token":...,"provider":"github"}` and closes.

If the popup closes without the admin logging in, the provider is almost
certainly sending the token in the wrong shape (e.g. a bare object) or skipping
the handshake — Decap's listener only accepts the `authorization:github:...`
string format. The handler in `decap-oauth/index.mjs` implements this exactly.

**The site's runtime post fetching does NOT depend on this.** It reads public
content from the GitHub API / raw.githubusercontent.com with no auth. The
admin (writing back) is the only part that needs the OAuth provider.

## Prerequisites

- An AWS account and region `eu-central-1` (matches the S3 bucket).
- Admin access to the GitHub account that owns `reykjavic/tong-tong`.

## 1. Create the GitHub OAuth App

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Application name: `Tong Tong CMS`.
3. Homepage URL: `https://d2p14i2rhwc3q2.cloudfront.net/`.
4. **Authorization callback URL:** `https://<API-GATEWAY-ID>.execute-api.eu-central-1.amazonaws.com/callback`
   — you'll need the gateway ID from step 3, so create the gateway first if
   you want to enter it now, otherwise come back and edit this later.
5. Register, then copy the **Client ID** and generate + copy the **Client Secret**.

The callback URL in the app **must exactly match** the redirect URI the Lambda
builds (`https://<gateway-domain>/callback`). If they differ, GitHub shows an
"incorrect redirect_uri" error.

## 2. Create the Lambda function

Handler source: [`decap-oauth/index.mjs`](../decap-oauth/index.mjs) (Node 20,
ES module, uses global `fetch` — no extra layers or dependencies).

1. AWS Console → **Lambda → Create function → Author from scratch**.
2. Name: `decap-oauth`. Runtime: **Node.js 20.x**. Architecture: x86_64.
3. Create the function, then replace the inline code with the contents of
   `decap-oauth/index.mjs`.
4. **Configuration → Environment variables**: add
   - `GITHUB_CLIENT_ID` = your Client ID
   - `GITHUB_CLIENT_SECRET` = your Client Secret
5. **Configuration → General configuration → Edit** → Timeout: `10 sec`
   (default 3 sec is usually enough, 10 gives headroom for the token exchange).

## 3. Create the API Gateway (HTTP API)

1. AWS Console → **API Gateway → Create API → HTTP API → Build**.
2. Name: `decap-oauth`. 
3. **Configure routes:** use a catch-all. Add route `$default` and set its
   integration to **Lambda** → select `decap-oauth`. (Alternatively add
   explicit `GET /auth` and `GET /callback` routes to the same integration —
   the handler branches on the path.)
4. **CORS:** Enable CORS on the route with `Allow origins: *`,
   `Allow methods: GET,OPTIONS`, `Allow headers: Content-Type,Authorization`.
5. **Deploy:** create a stage (e.g. `$default` or `prod`). The invoke URL is
   `https://<API-GATEWAY-ID>.execute-api.eu-central-1.amazonaws.com`.

Keep the **stage name** in mind: with HTTP API, the default stage `$default`
is served at the root of the invoke URL (`https://<id>.execute-api….com/`).
If you deploy to a named stage like `prod`, the URL becomes
`https://<id>.execute-api….com/prod/...`. The Lambda builds
`redirect_uri = https://<domain>/callback`, and the handler matches paths
`/auth` and `/callback`, so **use the `$default` stage** (or include the stage
prefix in the GitHub OAuth app callback and configure the routes accordingly).

## 4. Wire up the site admin

1. In [`public/admin/config.yml`](../public/admin/config.yml), replace the
   `base_url` placeholder with the API Gateway invoke URL
   (`https://<API-GATEWAY-ID>.execute-api.eu-central-1.amazonaws.com`).
2. Commit and deploy the site (push to `main` → GitHub Actions rebuilds S3).
3. `site_domain` is intentionally omitted — Decap falls back to the current
   hostname, so the admin works on
   `https://d2p14i2rhwc3q2.cloudfront.net/admin/` automatically.

## 5. Test the loop

1. Open `https://d2p14i2rhwc3q2.cloudfront.net/admin/`.
2. Click **Login with GitHub** → the popup completes the OAuth flow and closes.
3. Create/edit a post (title, date, optional image, markdown body) → **Save**.
4. Confirm the commit appears on `github.com/reykjavic/tong-tong` under
   `content/posts/` (and `public/images/` for uploaded images).
5. Reload the homepage — the new post shows up within seconds, **without a
   deploy** (the site fetches posts from GitHub at runtime).

## Troubleshooting

- **"Incorrect redirect_uri"** → the callback URL registered in the GitHub
  OAuth app must equal `https://<gateway-domain>/callback` exactly (including
  the stage prefix if you didn't use `$default`).
- **Popup closes but login doesn't complete** → this is usually the handshake
  protocol mismatch, not an origin issue. The `/callback` page must send the
  `authorization:github:success:<json>` string (see "The handshake protocol"
  above) after the `authorizing:github` echo. A bare `{ token }` object or a
  one-shot postMessage is silently ignored by Decap. Check the Lambda
  CloudWatch logs to confirm the token exchange succeeded, and that the
  handler's `site_id`/origin matches the admin's host (both HTTPS for
  production).
- **Admin shows "Failed to load entries"** → verify `GITHUB_CLIENT_ID` /
  `GITHUB_CLIENT_SECRET` env vars and that the token exchange (`/callback`)
  returns 200.
- **Localhost testing note:** the popup posts back to `https://<site_domain>`.
  A local dev admin at `http://localhost:5173` has an http-vs-https origin
  mismatch, so the primary test path is the deployed HTTPS admin.
