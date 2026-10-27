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

Then set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_TEMPLATE_NAME=invoice_share`, `WHATSAPP_TEMPLATE_LANG=en` in that
checkout's `.env` and `pm2 restart <name>`. Without Chromium the send button
returns "The PDF engine (Chromium) is not installed on this server".

### WhatsApp Business (Meta) setup — which account to use

Recorded 2026-10-27. These IDs are not secrets; the token is (it lives only in
the servers' `.env`).

| Item | Value |
|---|---|
| Meta business portfolio | Rajat Electric Decoration & Power Point (business verification: Verified) |
| WhatsApp Business Account (WABA, "Messaging account") | "Rajat Electricals", ID `1763205934724539` |
| Business number | +91 97550 63737, display name "Rajat Electricals" |
| `WHATSAPP_PHONE_NUMBER_ID` | `1368505093020145` |
| Developer app | `rajatcrmAppForWp` |
| Token | permanent token of system user `rajat_crm_api_admin` (Admin), permissions `whatsapp_business_messaging` + `whatsapp_business_management` |
| Template | `invoice_share`, Utility, English (`en`) — lives in the WABA above |
| Billing | **Prepaid "Available funds" in INR**, topped up manually (Meta Business Suite → Billing & payments → Accounts → Rajat Electricals → Add funds). Indian-issued credit/debit cards are rejected by Meta ("India credit cards are currently not supported", 2026-10-27). Meta deducts about once a day; when the balance runs out, sends fail with code 131042. First top-up ₹100 on 2026-10-27 |

Several duplicate WABAs (and a Meta-provided +1 number) were created by
repeated setup attempts and deleted on 2026-10-27. Meta's own "Test WhatsApp
Business Account" with test number +1 555-675-2130 remains and is harmless.
Do NOT use the developer app's "Register your WhatsApp phone number" wizard
for this number — it tries to add a new number ("already registered").

Read-only checks (run in a terminal, never paste the token anywhere else):

```bash
curl -s "https://graph.facebook.com/v21.0/1763205934724539/phone_numbers" -H "Authorization: Bearer $TOKEN"
curl -s "https://graph.facebook.com/v21.0/1763205934724539/message_templates?name=invoice_share" -H "Authorization: Bearer $TOKEN"
```

The first must show `platform_type: CLOUD_API` and the phone number ID above;
the second shows the template `status` (`APPROVED` before sending works).

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
- The Supabase pooler allows **15 connections total**, shared by dev and
  prod. `src/lib/prisma.ts` adds `connection_limit=5&pool_timeout=10` unless
  the URL sets its own limit.
- Dev and prod draw from the same Supabase project and **may use the same
  database** (not confirmed). Treat every migration as if it lands on
  production data.
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
