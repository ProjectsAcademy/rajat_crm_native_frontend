# Infrastructure and Deployment

No secrets belong in this file. Credentials live only in `.env` files on the
server and in GitHub environment secrets.

## 1. The server

- Oracle Cloud VM (Ubuntu, user `ubuntu`). It also hosts **other, unrelated
  projects** behind the same nginx (Parikshasetu, GST Vault, a drive API).
  Check which project you are touching before editing anything shared
  (nginx, PATH, SSH keys, pm2).
- Node.js is installed with **nvm** (`~/.nvm`, Node 22). Non-interactive SSH
  does not load `~/.bashrc`, so scripts run over SSH must source nvm
  themselves: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`. Missing
  this gives `npm: command not found` (happened on the first automatic
  deploy).

### Backend checkouts on the server

| | Path | Branch | pm2 process | Port | Domain |
|---|---|---|---|---|---|
| Production | `/home/ubuntu/user/rajatCrmNative/backend` | `main` | `crm-backend` | 3000 | `prod-api.urjaradiant.com` |
| Development | `/home/ubuntu/user/rajatCrmNative/devBackend` | `dev_01` | `dev-crm-backend` | 3001 | `dev-api.urjaradiant.com` |

Each folder has its own `.env` (database URLs, JWT secret, MinIO, RBAC flags,
WhatsApp) — not in git.

### nginx and Cloudflare

- nginx sites `crm-prod-api` and `crm-dev-api` in `/etc/nginx/sites-available/`
  proxy to ports 3000/3001. They are **HTTP-only on purpose**.
- Cloudflare SSL/TLS mode for `urjaradiant.com` is **Flexible**: Cloudflare
  terminates HTTPS and talks plain HTTP to the server. Do not add a
  certificate / port 443 block for these sites unless you also switch
  Cloudflare to Full/Full (strict).
- When cloning one site file into another, double-check `server_name`; a
  copy once kept the dev hostname and silently misrouted traffic
  (`nginx -t` does not catch duplicate server names).

## 2. Backend deployment

### `update.sh`

Each server checkout has an `update.sh` that runs, stopping at the first
failure: `git pull origin <branch>` → `npm install` → `npx prisma migrate
deploy` → `npx prisma generate` → `npm run build` → `pm2 restart <name>`.
pm2 is restarted last, so a failed step never takes the running API down.

The repository contains a generic `update.sh` (detects the branch, picks the
pm2 name). **The server copies have local edits** (nvm sourcing, branch
pinning). Do not change the tracked `update.sh` without the owner — a changed
tracked file makes `git pull` on the server fail with a conflict.

### GitHub Actions (`.github/workflows/deploy.yml`, backend repo only)

- **Push to `dev_01`** → job `deploy-dev` runs automatically: SSH into the
  server and run `update.sh` in the dev folder.
- **Push to `main` does NOT deploy.** Production deploy: GitHub → Actions →
  "Deploy Backend" → **Run workflow** → branch `main` → Run. This manual step
  replaces "required reviewers", which this GitHub plan does not offer.
- Environments `development_01` and `production_main` hold the secrets
  `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`,
  `DEPLOY_PATH` (absolute path, no `~`). Each environment only accepts its own
  branch.
- Verify a deploy really landed: on the server `cd <path> && git log -1
  --oneline`, and `pm2 list` / `pm2 logs <name>`.

### One-time server setup for WhatsApp invoice PDFs

`npm install` does not download Playwright's browser and `update.sh` does not
install it. In each checkout that should send WhatsApp invoices, run once:

```bash
npx playwright install --with-deps chromium   # may ask for sudo (system libraries)
```

The browser is stored per Linux user in `~/.cache/ms-playwright` (done on
the server for user `ubuntu` on 2026-10-27, Chromium build 1234 for
Playwright 1.62; the production checkout passed the check below on
2026-10-28). Both checkouts run as `ubuntu`, so production can use the
same download as long as its `playwright` version matches; after a Playwright
upgrade, run the install again. Quick check that PDFs work, without sending
anything (in the checkout folder):

```bash
node -e "require('playwright').chromium.launch({args:['--no-sandbox']}).then(async b=>{const p=await b.newPage();await p.setContent('<h1>ok</h1>');console.log('PDF bytes:',(await p.pdf()).length);await b.close()}).catch(e=>console.error('FAILED:',e.message))"
```

Then set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_TEMPLATE_NAME=invoice_share`, `WHATSAPP_TEMPLATE_LANG=en` in that
checkout's `.env` and `pm2 restart <name>`. Without Chromium the send button
returns "The PDF engine (Chromium) is not installed on this server".

Automatic payment reminders: `WHATSAPP_REMINDERS_ENABLED=true` in the `.env`
of ONE server (production once it is live; never on two servers), then
`pm2 restart <name>`. The log shows `[payment-reminders] automatic reminders
ENABLED` at start. Reminders go only to customers someone switched them on
for in the ledger screen. Dev and prod have separate databases, so a
customer switched on in the dev app concerns dev data only.

### WhatsApp Business (Meta) setup — which account to use

Recorded 2026-10-27. These IDs are not secrets; the token is (it lives only in
the servers' `.env`).

| Item | Value |
|---|---|
| Meta business portfolio | Rajat Electric Decoration & Power Point (business verification: Verified) |
| WhatsApp Business Account (WABA, "Messaging account") | "Rajat Electricals", ID `1763205934724539` |
| Production number | +91 96859 03733, display name "Rajat Electricals", `WHATSAPP_PHONE_NUMBER_ID` `1436335366229383`. Added and registered 2026-10-28; its two-step verification PIN is kept by the owner (never in the repos). The number customers are given |
| Development number | +91 97550 63737, display name "Rajat Electricals", `WHATSAPP_PHONE_NUMBER_ID` `1368505093020145`. The first number (2026-10-27); dev server only since 2026-10-28 — do not give it to customers |
| Messaging limit | Set for the whole business portfolio, shared by both numbers (`TIER_250` = 250 different people per 24 h on 2026-10-28) |
| Developer app | `rajatcrmAppForWp`, App ID `1990145641680838` |
| Token | permanent token of system user `rajat_crm_api_admin` (Admin), permissions `whatsapp_business_messaging` + `whatsapp_business_management` |
| Templates | All Utility, English (`en`), in the WABA above. `invoice_share` APPROVED (checked 2026-10-28); `order_confirmation`, `payment_received`, `payment_reminder` approved (owner, 2026-10-28); `account_statement_pdf` to be submitted; `account_statement` (no Document header) unused. Texts and variables: FEATURES.md "WhatsApp messages to customers" |
| Billing | **Prepaid "Available funds" in INR**, topped up manually (Meta Business Suite → Billing & payments → Accounts → Rajat Electricals → Add funds). Indian-issued credit/debit cards are rejected by Meta ("India credit cards are currently not supported", 2026-10-27). Meta deducts about once a day; when the balance runs out, sends fail with code 131042. First top-up ₹100 on 2026-10-27 |

Several duplicate WABAs (and a Meta-provided +1 number) were created by
repeated setup attempts and deleted on 2026-10-27. Meta's own "Test WhatsApp
Business Account" with test number +1 555-675-2130 remains and is harmless.
Do NOT use the developer app's "Register your WhatsApp phone number" wizard
for this number — it tries to add a new number ("already registered").

Read-only checks (run in a terminal, never paste the token anywhere else):

```bash
TOKEN=$(grep '^WHATSAPP_ACCESS_TOKEN=' .env | cut -d= -f2- | tr -d '"')   # in a checkout folder; prints nothing
curl -s "https://graph.facebook.com/v21.0/1763205934724539/phone_numbers" -H "Authorization: Bearer $TOKEN"
curl -s "https://graph.facebook.com/v21.0/1763205934724539/message_templates?name=invoice_share" -H "Authorization: Bearer $TOKEN"
```

The first must show `platform_type: CLOUD_API` for both numbers above;
the second shows the template `status` (`APPROVED` before sending works).

Adding a number (done 2026-10-28 for the production number): WhatsApp
Manager → Phone numbers → **Add phone number** (not "Connect WhatsApp
account") in the "Rajat Electricals" account → display name → OTP by SMS or
call (the SIM must not be active in a WhatsApp app). The number then shows
"Pending" until it is registered for the Cloud API with a six-digit PIN the
owner chooses — it becomes the number's two-step verification PIN; keep it
safe, re-registering needs it:

```bash
curl -s -X POST "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/register" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"messaging_product":"whatsapp","pin":"<PIN>"}'
```

Templates belong to the WhatsApp Business Account, so every approved template
works from every number in it.

### WhatsApp bot webhook (incoming messages)

Production and dev have separate databases, so each has its own number and
answers only that number: the bot ignores messages whose
`metadata.phone_number_id` is not the server's `WHATSAPP_PHONE_NUMBER_ID`.
Meta sends a number's messages to the number's own callback URL when it has
one (a "webhook override"), otherwise to the app's callback URL. Set up on
2026-10-28:

| Number | Messages go to | Server `.env` |
|---|---|---|
| Production +91 96859 03733 | override on the number → `https://prod-api.urjaradiant.com/api/whatsapp/webhook` | production: that number's ID, `WHATSAPP_BOT_ENABLED=true` |
| Development +91 97550 63737 | the app's callback URL → `https://dev-api.urjaradiant.com/api/whatsapp/webhook` | dev: that number's ID, `WHATSAPP_BOT_ENABLED=true`, `WHATSAPP_ALLOWED_RECIPIENTS=<test numbers>` |

Both servers use the same token and app secret. Never put the production
number's ID in the dev `.env`: dev would send from the production number.
The dev `.env` also sets `WHATSAPP_ALLOWED_RECIPIENTS` (the owner's and the
team's numbers, comma-separated, 10 digits or with +91): dev then sends only
to them, and its bot tells anyone else to use the production number. The
startup line in `pm2 logs` ends with `recipients 3 test number(s) only` on dev
and `recipients all` on production.

1. Server `.env`: `WHATSAPP_WEBHOOK_VERIFY_TOKEN=<random, e.g. openssl rand
   -hex 16 — a different one per server>`, `WHATSAPP_APP_SECRET=<Meta app →
   App settings → Basic → App secret>`, `WHATSAPP_BOT_ENABLED=true`;
   `pm2 restart <name>`. Check from outside, in that checkout's folder (prints
   `ok`; `Forbidden` = wrong token, for example read from the other
   checkout's `.env`):
   ```bash
   VT=$(grep '^WHATSAPP_WEBHOOK_VERIFY_TOKEN=' .env | cut -d= -f2-)
   curl -s "https://prod-api.urjaradiant.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$VT&hub.challenge=ok"
   ```
2. Point the number at its server:
   - App callback URL (the dev number today): Meta developer app
     `rajatcrmAppForWp` → WhatsApp → Configuration → Webhook: Callback URL,
     Verify token = that server's token → "Verify and save". Then subscribe
     the webhook field **messages** (set on the app; overrides use it too).
   - A number's override (the production number today), with `TOKEN` and
     `VT` read from the production `.env`:
     ```bash
     curl -s -X POST "https://graph.facebook.com/v21.0/1436335366229383" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"webhook_configuration\":{\"override_callback_uri\":\"https://prod-api.urjaradiant.com/api/whatsapp/webhook\",\"verify_token\":\"$VT\"}}"
     curl -s "https://graph.facebook.com/v21.0/1436335366229383?fields=webhook_configuration" -H "Authorization: Bearer $TOKEN"
     ```
     The check shows `phone_number` (the override) and `application` (the
     app's URL). Posting an empty `override_callback_uri` removes the override.
3. Make sure the WhatsApp Business Account sends events to the app (once):
   ```bash
   curl -s -X POST "https://graph.facebook.com/v21.0/1763205934724539/subscribed_apps" -H "Authorization: Bearer $TOKEN"
   curl -s "https://graph.facebook.com/v21.0/1763205934724539/subscribed_apps" -H "Authorization: Bearer $TOKEN"
   ```
4. Test from a phone whose number is saved on a customer in that
   environment's database: send "hi" to that environment's number → menu with three buttons. `pm2 logs <name>` shows
   `[whatsapp-webhook]` / `[whatsapp-bot]` lines on problems.
5. Troubleshooting, in order:
   - After every restart `pm2 logs` prints `[whatsapp-webhook] bot ENABLED/disabled;
     app secret set/MISSING; ...` — fix anything MISSING/disabled first.
   - No `POST /api/whatsapp/webhook` lines at all when you send a message →
     Meta is not delivering. First ask Meta what the app is subscribed to:
     ```bash
     curl -s "https://graph.facebook.com/v21.0/1990145641680838/subscriptions?access_token=1990145641680838|$APP_SECRET"
     ```
     The entry must list `"fields": [{"name": "messages", ...}]`. On
     2026-10-27 it showed the callback URL and `active: true` but NO fields —
     Meta then sends nothing. Subscribe the field (UI: WhatsApp → Configuration
     → Webhook fields → messages → Subscribe, or `POST
     /1990145641680838/subscriptions` with `object=whatsapp_business_account`,
     `callback_url`, `fields=messages`, `verify_token`, app access token). Also use
     the field's **Test** button (a test POST must appear in the logs; it is
     ignored by the bot because its phone number id differs), check
     `subscribed_apps`, and put the app in **Live** mode (may need a privacy
     policy URL in App settings → Basic).
   - `POST ... 401` → wrong `WHATSAPP_APP_SECRET`; `503` → it is missing.
   - `POST ... 200` → look at the `whatsapp_messages` rows (kind/status/error).

### Releasing to production (backend)

1. Everything merged and tested on `dev_01` / dev API.
2. Pull request `dev_01` → `main`, merge.
3. Run the "Deploy Backend" workflow on `main` (this applies pending
   migrations to the production database).
4. Then release the frontend for production (below) — never ship a frontend
   that calls API routes production does not have yet.

## 3. Frontend deployment

### Android / iOS (EAS Build)

Run from `rajat_crm_native_frontend/` (builds on Expo's servers):

```bash
eas build --platform android --profile preview      # "(Dev) Rajat CRM", talks to dev-api
eas build --platform android --profile production   # "Rajat CRM", talks to prod-api
```

Profiles are in `eas.json` (each sets `EXPO_PUBLIC_API_URL`); app name,
package id and icon colour come from `app.config.js` (`EAS_BUILD_PROFILE`).
Both apps can be installed on one phone. Builds are listed under the Expo
account's `crm-mobile` project. More: `rajat_crm_native_frontend/APK_BUILDS.md`.

### Web

- Build: `npm run build:web` (`npx expo export --platform web`, output
  `dist/`). `EXPO_PUBLIC_API_URL` is baked in at build time.
- Hosting: the web build was set up on **Netlify** (commit `d0ce897`,
  2026-05-27: `EXPO_PUBLIC_API_URL` is set in the Netlify site's environment
  variables). The dev web app is reachable at `dev-crm.urjaradiant.com`.
  **Owner to confirm and record here:** current host for dev and prod web,
  which branch each site builds from, and whether builds are automatic.

## 4. Database (Supabase PostgreSQL)

- `DATABASE_URL`: pooled connection (port 6543, `pgbouncer=true`) used by the
  app. `DIRECT_URL`: direct/session connection (port 5432) used by
  `prisma migrate`.
- The Supabase pooler allows **15 connections total** (per Supabase project;
  whether dev and prod are in one project is not recorded).
  `src/lib/prisma.ts` adds `connection_limit=5&pool_timeout=10` unless the URL
  sets its own limit.
- Dev and prod use **different databases** — confirmed 2026-10-28: their
  `DIRECT_URL`s differ, and a backup of each showed production without the
  three tables that the not-yet-released migrations create (80 vs 77 tables).
  A migration still reaches production data at the next release: keep
  migrations additive.
- **Backup before a production release.** Supabase runs PostgreSQL 17 and
  `pg_dump` 16 refuses it ("server version mismatch"). Once per machine:
  `sudo apt install -y postgresql-common`,
  `sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y`,
  `sudo apt install -y postgresql-client-17`. Then, without writing the URL
  to a file or the shell history:
  ```bash
  read -rs DB_URL      # paste the production DIRECT_URL (without quotes); nothing is shown
  /usr/lib/postgresql/17/bin/pg_dump "$DB_URL" -Fc -f ~/crm-prod-$(date +%F).dump
  unset DB_URL
  /usr/lib/postgresql/17/bin/pg_restore --list ~/crm-prod-$(date +%F).dump | grep -c "TABLE DATA"
  ```
  Use the PRODUCTION URL (server checkout `backend/.env`) — a developer
  machine's `.env` points at the dev database. Keep dump files outside the
  repositories (they contain customer data). Last backup: 2026-10-28
  (554 KB, 77 tables), before the release of 37 backend commits.
- Migrations: create with `prisma migrate diff` / `migrate dev --create-only`
  against a local throwaway database (LOCAL_DEV_AND_TESTING.md), commit the
  SQL, and let `update.sh` apply it with `prisma migrate deploy`.
- If `migrate deploy` fails with **P3018** ("already exists") because a
  migration was applied by other means, mark it applied without changing the
  schema: `npx prisma migrate resolve --applied <migration_name>` (done once
  for `20260821000001_baseline_purchase_item_description_unit` on production).

## 5. Incident history — read before "fixing" something that looks wrong

- **2026-09-16 — connection pool exhaustion, dev and prod down.** Every route
  file created its own `PrismaClient` (about 22 pools) against the 15-slot
  Supabase pooler: `FATAL: max clients reached in session mode`. Node crashed
  on the unhandled rejection and pm2 crash-looped. Fixed by the single shared
  client in `src/lib/prisma.ts`. It was reverted once by mistake (blamed on an
  unrelated SSL problem) and restored on 2026-09-18. If `grep -rl "new
  PrismaClient()" src/` returns anything besides `src/lib/prisma.ts`, the bug
  is back.
- **Same day — dev API unreachable** for a separate reason: the nginx /
  Cloudflare Flexible setup described above. Two independent problems; check
  the Prisma pattern AND the HTTP path (DNS → Cloudflare → nginx → pm2)
  separately.
- **2026-09-12 — document number deadlock.** Numbers were `count()+1`, which
  collides permanently after a delete. Orders/invoices/estimates now use the
  month-prefix max lookup.
- **First auto-deploy failed** with `npm: command not found` — nvm not loaded
  in non-interactive SSH (see section 1).
- **P3018 on production** — see section 4.

## 6. Quick reference (on the server)

```bash
pm2 list                         # what is running, restarts, uptime
pm2 logs dev-crm-backend         # or crm-backend
pm2 describe <name>
cd <checkout path> && git log -1 --oneline   # confirm deployed commit
sudo nginx -t && sudo systemctl reload nginx
sudo tail -100 /var/log/nginx/error.log
```

SSH access: a personal login key for the developer, and one deploy key used by
GitHub Actions (its private half is the `DEPLOY_SSH_KEY` secret). Other keys
on the box belong to other projects. Never delete a key without checking
`/var/log/auth.log` for recent use and asking the owner.
