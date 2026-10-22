#!/usr/bin/env bash
# Verifies that docs/shared/ is identical in both repositories.
# Expects the two repos side by side:
#   <parent>/rajat_crm_node_backend
#   <parent>/rajat_crm_native_frontend
# Usage (from either repo root): scripts/check-shared-docs.sh
# Exit code 0 = identical, 1 = differences found, 2 = sibling repo not found.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT="$(dirname "$HERE")"
case "$(basename "$HERE")" in
  rajat_crm_node_backend)    OTHER="$PARENT/rajat_crm_native_frontend" ;;
  rajat_crm_native_frontend) OTHER="$PARENT/rajat_crm_node_backend" ;;
  *) echo "Run this from rajat_crm_node_backend or rajat_crm_native_frontend." >&2; exit 2 ;;
esac

if [ ! -d "$OTHER/docs/shared" ]; then
  echo "Sibling repo not found at $OTHER (or it has no docs/shared)." >&2
  echo "Copy docs/shared/ to the other repository by hand and tell the owner." >&2
  exit 2
fi

if diff -ru "$HERE/docs/shared" "$OTHER/docs/shared"; then
  echo "docs/shared is identical in both repositories."
  exit 0
fi
echo "" >&2
echo "docs/shared differs between the repositories (diff above)." >&2
echo "Apply the same change in both, e.g.: cp -r \"$HERE/docs/shared/.\" \"$OTHER/docs/shared/\"" >&2
exit 1
