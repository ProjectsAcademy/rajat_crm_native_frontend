# Building the Client APKs

Two separate apps, built from the same codebase, safe to install on the same phone at once.

## Commands

Run from `rajat_crm_native_frontend/`:

```bash
eas build --platform android --profile preview     # → Rajat CRM (Dev)
eas build --platform android --profile production  # → Rajat CRM
```

## What each build produces

| | Preview | Production |
|---|---|---|
| App name on phone | Rajat CRM (Dev) | Rajat CRM |
| Package ID | `com.rajatelectricals.crm.dev` | `com.rajatelectricals.crm` |
| Icon background | copper | navy |
| API it talks to | `dev-api.urjaradiant.com` | `prod-api.urjaradiant.com` |
| Output | `.apk` (directly installable) | `.apk` (directly installable) |

## Getting the file onto the phone

1. Run the command — it builds on Expo's servers, not this machine (~10–20 min).
2. When it finishes, the terminal prints a download link and a **QR code**.
3. Scan the QR code directly on the client's phone to install — no laptop transfer needed.
4. Every build also stays listed at `expo.dev/accounts/vivek-bhawsar/projects/crm-mobile/builds` if you need the link again later.

## Notes

- Already logged into `eas-cli` as `vivek-bhawsar` — no login step needed.
- Both apps can be installed side by side; installing one never overwrites the other.
- Each cloud build uses your EAS account's build minutes.
