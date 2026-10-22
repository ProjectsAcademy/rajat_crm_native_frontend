# Local Development and Safe Testing

Expected folder layout (both repos side by side):

```
crmNative/
  rajat_crm_node_backend/
  rajat_crm_native_frontend/
```

## 1. Backend

```bash
cd rajat_crm_node_backend
npm install
# create .env (see docs/BACKEND_REFERENCE.md "Environment variables")
npx prisma generate
npm run dev            # nodemon + ts-node, port from PORT
npx tsc --noEmit       # must print nothing (0 errors)
```

**Warning:** a `.env` copied from a server points at the real Supabase
database. `npm run dev` with it reads and WRITES real data, and any `prisma
migrate` command uses `DIRECT_URL` on that database. Use the safe setup below
for anything other than reading.

## 2. Frontend

```bash
cd rajat_crm_native_frontend
npm install
# .env: EXPO_PUBLIC_API_URL=http://localhost:<backend port>
npx expo start --web    # web
npx expo start          # Expo Go / dev client on a phone (use the PC's LAN IP in the URL)
npx tsc --noEmit 2>&1 | grep -c "error TS"   # must not exceed the baseline (KNOWN_ISSUES C)
```

`EXPO_PUBLIC_*` values are baked in at build time; after changing `.env`,
restart with `npx expo start --clear`.

## 3. Safe end-to-end test setup (no real data touched)

This is how features have been verified so far (Linux machine with
PostgreSQL 16 binaries and Chromium installed).

1. **Throwaway database** (in a temp folder):
   ```bash
   PGB=/usr/lib/postgresql/16/bin
   $PGB/initdb -D /tmp/crm-test/pgdata -U postgres --auth=trust -E UTF8
   $PGB/pg_ctl -D /tmp/crm-test/pgdata -l /tmp/crm-test/pg.log \
     -o "-p 55432 -c unix_socket_directories='' -c listen_addresses=localhost" start
   $PGB/psql -h localhost -p 55432 -U postgres -c "create database crm_test"
   ```
2. **Apply migrations — override BOTH URLs** (otherwise Prisma uses the real
   `DIRECT_URL` from `.env`):
   ```bash
   L="postgresql://postgres@localhost:55432/crm_test"
   DATABASE_URL=$L DIRECT_URL=$L npx prisma migrate deploy
   ```
   To test a data migration, apply all older migrations first, seed, then
   apply the new one.
3. **Seed synthetic data only** with SQL (customers named `TEST ...`, phones
   `9000000001`, ...). Never copy real customer rows into a test database.
   Include edge cases: partial payments, overpaid, cancelled, future-dated
   orders, etc.
4. **Test user and token**: insert a `users` row with `is_superuser=true`, and
   run the backend with a local secret so tokens cannot work anywhere else:
   ```bash
   PORT=3001 DATABASE_URL=$L DIRECT_URL=$L JWT_SECRET=local-test-secret npx ts-node src/server.ts
   node -e "console.log(require('jsonwebtoken').sign({id:1,username:'test',email:'t@example.com',isStaff:true,isSuperuser:true},'local-test-secret',{expiresIn:'2h'}))"
   ```
   Port 3001 because the frontend `.env` usually points at
   `http://localhost:3001`.
5. **API checks** with `curl -H "Authorization: Bearer <token>"`: happy path,
   validation errors (400), not found (404), and the numbers (totals,
   balances) against values worked out by hand.
6. **UI checks**: `CI=1 BROWSER=none npx expo start --web --port 8099 --clear`.
   `CI=1` turns OFF file watching — restart after every edit or you will test
   an old bundle. Drive the UI with Playwright (installed in the backend's
   `node_modules`, launch with `executablePath: '/usr/bin/chromium'`), put the
   token in `localStorage.auth_token` before the page loads, and screenshot at
   1280 px and 390 px widths.
7. **Clean up**: stop the backend/Expo processes and `pg_ctl ... stop`.

## 4. Verification checklist before calling a task done

- [ ] Backend `npx tsc --noEmit` → 0 errors.
- [ ] Frontend `npx tsc --noEmit` error count ≤ baseline, and none in files you
      touched except the known `outlineStyle` pattern.
- [ ] New/changed API endpoints exercised (success + failure cases).
- [ ] UI checked on web wide and phone-width; native layout branch reviewed
      (and tested on a device/emulator when possible).
- [ ] Migration (if any) applied on a throwaway database, and `prisma migrate
      diff --from-url <test db> --to-schema-datamodel prisma/schema.prisma
      --exit-code` reports no drift.
- [ ] Docs and WORK_LOG.md updated (DOCUMENTATION_PROTOCOL.md).
- [ ] The final report says what was NOT tested.
