# Documentation Protocol — Mandatory for Every Task

Anyone (person or AI) who changes this project must leave it documented so
the next person can continue without guessing. A task is NOT finished until
the steps below are done. No exceptions, including "small" fixes.

## 1. Before you start

1. Read `AGENTS.md`, `docs/shared/RULES.md`,
   `docs/shared/KNOWN_ISSUES_AND_PENDING.md`, and the docs for the area you
   will touch (FEATURES.md section, BACKEND_REFERENCE / FRONTEND_REFERENCE).
2. Read the last entries of `docs/shared/WORK_LOG.md`.
3. `git status -sb` in both repos: be on `dev_01`, know what is uncommitted
   and whether you are ahead/behind `origin`.
4. If the docs and the code disagree, trust the code, and fix the doc as part
   of your task.

## 2. While you work

- Leave short comments in code that explain **why** (business rule, incident,
  constraint), not what the line does.
- If you make a decision with the owner (a business rule, a trade-off), write
  it down in FEATURES.md with the date.

## 3. When you finish — Definition of Done

1. **Verify** (LOCAL_DEV_AND_TESTING.md §4) and note what you could not test.
2. **Update the reference docs that your change made stale:**

   | You changed... | Update |
   |---|---|
   | API route, request/response shape, permission key | `docs/BACKEND_REFERENCE.md` (backend repo) and the API table in `docs/FRONTEND_REFERENCE.md` (frontend repo) |
   | Prisma schema / migration | `docs/BACKEND_REFERENCE.md` models section; `docs/shared/ARCHITECTURE.md` if relations or money flow changed |
   | Screen, component, store, navigation | `docs/FRONTEND_REFERENCE.md` |
   | Business rule or behaviour users see | `docs/shared/FEATURES.md` |
   | Server, deploy, env vars, database setup | `docs/shared/INFRASTRUCTURE_AND_DEPLOY.md`, `.env.example` |
   | Found a bug / left something unfinished / finished a pending item | `docs/shared/KNOWN_ISSUES_AND_PENDING.md` |
   | A new rule everyone must follow | `docs/shared/RULES.md` |

3. **Add a WORK_LOG.md entry** (newest at the top) using the template below.
4. **Mirror `docs/shared/`** into the other repository (identical files), then
   run `scripts/check-shared-docs.sh` in either repo — it must report no
   differences. If the other repository is not available to you, say so in the
   work log entry and in your final message so the owner can copy the files.
5. **Commit** on `dev_01` with a clear English message (what changed and why).
   Code and its doc updates go in the same commit or consecutive commits.
   Never amend or force-push. If you cannot push (no credentials), list the
   exact push commands for the owner.
6. **Report** to the owner: what changed, how it was tested, what was not
   tested, anything they must do (push, deploy, set env vars, grant
   permissions).

## 4. WORK_LOG entry template

```markdown
## YYYY-MM-DD — <short title>

- **Request:** what the owner/client asked for, in one or two lines.
- **Done by:** <tool/model or person>
- **Changes:** backend `dev_01` <commit hash(es)>; frontend `dev_01` <commit hash(es)>.
  Key files: ...
- **Database:** migration `<name>` (additive? data changes?) — or "none".
- **Decisions:** business rules or trade-offs agreed, with reasons.
- **Tested:** how (API calls, UI at which widths, devices) and with what data.
- **Not tested / risks:** ...
- **Deploy status:** pushed? dev deployed? production?
- **Follow-ups:** what is left (also added to KNOWN_ISSUES_AND_PENDING.md).
```

## 5. Style for all docs

- English, plain and specific. Name the file, function, table or command.
- Write dates as YYYY-MM-DD. Say "as of <date>" for anything that can change.
- No secrets, tokens, passwords, connection strings or real customer data.
- Prefer updating an existing section over adding a new file. If you must add
  a doc file, link it from `docs/shared/README.md` (shared) or `AGENTS.md`
  (repo-specific).
