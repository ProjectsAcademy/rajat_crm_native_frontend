# Project Documentation — Index

> **These files are MIRRORED.** Everything in `docs/shared/` exists as an
> identical copy in BOTH repositories:
>
> - `rajat_crm_node_backend/docs/shared/`
> - `rajat_crm_native_frontend/docs/shared/`
>
> Whenever you change any file in this folder, make the exact same change in
> the other repository, then run `scripts/check-shared-docs.sh` (see
> [DOCUMENTATION_PROTOCOL.md](DOCUMENTATION_PROTOCOL.md)). The point of the
> mirror is that a reader who has only ONE of the two repos still gets the
> full picture of the whole system.

## Read in this order

| # | File | What it gives you | When |
|---|---|---|---|
| 1 | [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | What the product is, who uses it, the two repos, environments, glossary | Always, first |
| 2 | [RULES.md](RULES.md) | Non-negotiable DO / DON'T rules. Breaking these has caused real outages | Always, before touching anything |
| 3 | [KNOWN_ISSUES_AND_PENDING.md](KNOWN_ISSUES_AND_PENDING.md) | Open work, tech debt, things that look like bugs but are known | Always, before starting a task |
| 4 | [ARCHITECTURE.md](ARCHITECTURE.md) | How the system works end to end: auth, permissions, data model, money flow | Before any non-trivial change |
| 5 | [FEATURES.md](FEATURES.md) | Business rules and design decisions per module (ledger, orders, invoices, ...) | Before changing a module |
| 6 | [INFRASTRUCTURE_AND_DEPLOY.md](INFRASTRUCTURE_AND_DEPLOY.md) | Server, dev/prod, deploy pipeline, database, migrations, incident history | Before deploying or touching DB/server |
| 7 | [LOCAL_DEV_AND_TESTING.md](LOCAL_DEV_AND_TESTING.md) | Running locally and testing safely without touching real data | Before running or testing anything |
| 8 | [DOCUMENTATION_PROTOCOL.md](DOCUMENTATION_PROTOCOL.md) | How to record your work so the next person/AI can continue | Before finishing ANY task |
| 9 | [WORK_LOG.md](WORK_LOG.md) | Chronological history of what was built, when and why | When you need context on past decisions |
| 10 | [WORKSPACE_GUIDE.md](WORKSPACE_GUIDE.md) | Working with both repos from their parent folder; source of the workspace-root `AGENTS.md` | When your tool opens the parent folder, or on a new machine |

Repository-specific references (not mirrored):

- Backend: `rajat_crm_node_backend/docs/BACKEND_REFERENCE.md`
- Frontend: `rajat_crm_native_frontend/docs/FRONTEND_REFERENCE.md` and
  `rajat_crm_native_frontend/docs/FRONTEND_UI_RULES.md`

## Last full review

2026-10-22 — written from a full audit of both codebases (routes, schema,
screens, deploy workflow, git history). If you find a statement here that no
longer matches the code, the code wins: fix the doc in the same task and note
it in the work log.
