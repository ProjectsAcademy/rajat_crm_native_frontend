# AGENTS.md — Start Here (Frontend)

This file is the entry point for every AI assistant and every new developer.
Read it completely before doing anything else in this repository.

## What this repository is

`rajat_crm_native_frontend` is the app of a custom CRM for **Rajat
Electricals** (event lighting/decoration rentals and electrical contracting,
Indore, India): Expo SDK 54, React Native 0.81, Expo Router, TypeScript,
Zustand, Axios. One codebase ships as an Android app (main use), an iOS build
and a web app. It is one of TWO repositories:

- `rajat_crm_native_frontend` — this repo, the app.
- `rajat_crm_node_backend` — the REST API (`/api/*`) this app calls. Usually
  checked out next to this one.

The documentation in `docs/shared/` describes the WHOLE system (including
the backend, server and database) and is mirrored identically in both
repositories, so this repo alone is enough to understand everything.

## How to start a task (read little, search a lot)

Reading every document before every task wastes time and context. Instead:

1. Read `docs/shared/RULES.md` (always — breaking it has caused outages) and
   the rule summary below.
2. Search `docs/shared/CODE_MAP.md` for the module, endpoint, screen,
   component or table. It is generated from the code and `npm run verify`
   fails when it is stale, so trust it. Open only the files and line ranges
   it names.
3. Search `docs/shared/KNOWN_ISSUES_AND_PENDING.md` and
   `docs/shared/FEATURES.md` for the module; read only the matching sections.
4. Read more only when the task needs it:

   | The task touches | Also read |
   |---|---|
   | How a screen or component looks or behaves | `docs/FRONTEND_UI_RULES.md`, `docs/FRONTEND_REFERENCE.md` §9 "Layout patterns" and §10 "Gotchas" |
   | API calls and types | only the API object you need in `services/api.ts` (CODE_MAP gives its line) |
   | Printing, PDFs / uploads | `docs/FRONTEND_REFERENCE.md` §6 / §7 |
   | Money screens: orders, payments, invoices, ledger | `docs/shared/ARCHITECTURE.md` "Money flow" |
   | Permissions, a new module | `docs/shared/ARCHITECTURE.md` "Permissions (RBAC)", "Common tasks" below |
   | Releasing (APK, web) | `docs/shared/INFRASTRUCTURE_AND_DEPLOY.md` §3, `APK_BUILDS.md` |
   | Running the app locally | `docs/shared/LOCAL_DEV_AND_TESTING.md` §2–3 |

5. History: the top two entries of `docs/shared/WORK_LOG.md`, or search it
   for the module — do not read it whole.
6. In any file longer than ~300 lines, search first and read only the range
   you need.
7. Finish with `docs/shared/DOCUMENTATION_PROTOCOL.md` §3 and `npm run verify`
   (it tells you when to run `npm run map`).

To understand the whole system (new developer, or a "how does it work"
question): `docs/shared/README.md` has the full reading order.
Opened from the parent folder with both repos? See `docs/shared/WORKSPACE_GUIDE.md`
(and run `scripts/setup-workspace-root.sh` to write the workspace guide files).

## The rules you are most likely to break (full list: RULES.md)

1. Work on branch `dev_01`. Never commit to `main`. Never amend, rebase or
   force-push — the owner pushes from the same checkout.
2. Many screens/forms have **separate web and native layouts** (e.g.
   `OrderFormSheet.tsx`). Change and check both; check web at phone width too.
3. Web TextInputs use `Platform.select({ web: { outlineStyle: 'none' } })`;
   this causes the known TypeScript error baseline — do not "fix" it, do not
   raise the count.
4. No native `<select>`: use `SearchPickerModal` / `DatePickerModal` /
   `MonthYearPickerModal`.
5. `Alert.alert` does nothing on web — use `utils/dialogs.ts`.
6. Gate every button with its action (`useCan()`), menus with `canOpen`,
   module layouts with `useFeatureGuard`; the backend enforces.
7. Keep `utils/invoiceHtml.ts` in sync with the backend's
   `src/utils/invoicePdf.ts`.
8. Uploads use XHR (`useMediaUpload`), never axios.
9. English only in code, UI text, comments, commits and docs.
10. Every task ends with documentation (below). Undocumented work is
    unfinished work.

## Where things are

| Need | Look at |
|---|---|
| Which screen calls which API, which component is used where | `docs/shared/CODE_MAP.md` (search it) |
| Routes / screens | `app/(app)/<module>/` (`_layout.tsx`, `index.tsx`, `[id].tsx`) |
| Tabs and hidden stacks | `app/(app)/_layout.tsx` |
| API calls and types | `services/api.ts` |
| Login state, permissions | `store/auth.ts`, `hooks/useFeatureGuard.ts` |
| Forms | `components/*FormSheet.tsx`, `components/*Sheet.tsx` |
| Print / PDF | `utils/invoiceHtml.ts`, `utils/ledgerHtml.ts`, `utils/printHtml.ts` |
| Colours | `constants/colors.ts` |
| Breadcrumb / back targets | `constants/moduleHubs.ts` |

## Common tasks

- **New screen in a module**: add the file under `app/(app)/<module>/`,
  register it in that module's `_layout.tsx` if it needs options, keep the
  list/detail patterns in FRONTEND_REFERENCE.md §9.
- **New module**: backend route + feature key first (other repo), then
  `app/(app)/<module>/_layout.tsx` with `useFeatureGuard`, a hidden
  `Tabs.Screen` in `app/(app)/_layout.tsx`, a hub card, `MODULE_HUBS` entry,
  an API object and types in `services/api.ts`.
- **Backend shape changed**: update the types and API object in
  `services/api.ts` in the same task.
- **Release**: see INFRASTRUCTURE_AND_DEPLOY.md §3 (EAS for APKs, `npm run
  build:web` for web). Release the backend first if the app needs new
  endpoints. Ask the owner first.

## Definition of done (summary of DOCUMENTATION_PROTOCOL.md)

1. `npx tsc --noEmit 2>&1 | grep -c "error TS"` not above the baseline; UI
   exercised (web wide + phone width; native layout reviewed/tested);
   untested parts stated.
2. `docs/FRONTEND_REFERENCE.md`, FEATURES / KNOWN_ISSUES updated where your
   change made them stale.
3. New entry at the top of `docs/shared/WORK_LOG.md`.
4. `docs/shared/` copied to the backend repo; `scripts/check-shared-docs.sh`
   reports no differences.
5. Commit on `dev_01` (English message). If you cannot push, give the owner
   the exact push commands.
6. `npm run verify` (checks both repos, including the backend API tests) ends
   with `PASSED`. Fix failures with new commits; mention its warnings in your
   report.

## Working with the owner

The owner (developer) and the client often write in Hinglish. Reply to them in
the language they use, but everything written into the repository is English.
Ask before irreversible or outward-facing actions (releases, deleting data,
sending WhatsApp messages).
