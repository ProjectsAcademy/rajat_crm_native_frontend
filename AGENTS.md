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

## Mandatory reading order (before any change)

1. `docs/shared/PROJECT_OVERVIEW.md` — what, who, why, environments.
2. `docs/shared/RULES.md` — non-negotiable rules.
3. `docs/shared/KNOWN_ISSUES_AND_PENDING.md` — open work, known bugs, the
   TypeScript error baseline, things that look wrong on purpose.
4. `docs/shared/ARCHITECTURE.md` — how the system works.
5. `docs/FRONTEND_REFERENCE.md` — this repo: structure, routing, API layer,
   components, patterns.
6. `docs/FRONTEND_UI_RULES.md` — the owner's mandatory UI engineering rules.
7. The section of `docs/shared/FEATURES.md` for the module you will touch.
8. Before testing or releasing: `docs/shared/LOCAL_DEV_AND_TESTING.md`,
   `docs/shared/INFRASTRUCTURE_AND_DEPLOY.md`, `APK_BUILDS.md`.
9. Before finishing: `docs/shared/DOCUMENTATION_PROTOCOL.md`.

Index of all docs: `docs/shared/README.md`. History: `docs/shared/WORK_LOG.md`.
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
6. Gate UI with `userHasFeature` / `useFeatureGuard`; the backend enforces.
7. Keep `utils/invoiceHtml.ts` in sync with the backend's
   `src/utils/invoicePdf.ts`.
8. Uploads use XHR (`useMediaUpload`), never axios.
9. English only in code, UI text, comments, commits and docs.
10. Every task ends with documentation (below). Undocumented work is
    unfinished work.

## Where things are

| Need | Look at |
|---|---|
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
