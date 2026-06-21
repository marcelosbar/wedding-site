# Dependencies & Security Alerts

This document covers dependency management patterns, Dependabot workflows, and how to handle transitive vulnerability alerts in this project.

## 1. How Dependabot Works Here

Dependabot is configured in [.github/dependabot.yml](../.github/dependabot.yml) for `npm` (root `/`) and `github-actions`. It opens PRs automatically for **direct** dependency updates, but **cannot** create PRs for transitive (indirect) dependencies — those require manual intervention.

When a Dependabot alert appears without a corresponding PR, it means the vulnerable package is a transitive dependency. See section 3 for how to handle those.

## 2. Transitive Dependency Vulnerabilities — Decision Guide

When a Dependabot alert has no auto-fix PR, evaluate using this checklist:

1. **Is it dev-only?** Run `pnpm why <pkg>` — if the chain goes through a `devDependency`, it never reaches production.
2. **Is the vulnerable code path exercised?** Check if the specific vulnerable API (e.g. a specific function with a specific argument) is actually called.
3. **Can it be fixed via override?** Try `pnpm.overrides` — but verify with `pnpm test` that nothing breaks.
4. **If not fixable:** Dismiss the alert on GitHub with a clear justification.

## 3. Active pnpm.overrides

The following overrides were added to force patched versions of transitive dependencies that upstream packages haven't updated yet. **Remove each entry once `pnpm why <pkg>` no longer shows the vulnerable version without the override.**

| File | Package | Override | Fixes | Remove when |
|---|---|---|---|---|
| [package.json](../package.json) | `uuid` | `>=11.1.1` | CVE-2026-41907 (via `firebase-tools` → `gaxios`) | `firebase-tools` updates `gaxios` to pull `uuid >= 11.1.1` natively |
| [functions/package.json](../functions/package.json) | `uuid` | `>=11.1.1` | CVE-2026-41907 (via `firebase-admin` → `gaxios`, `cloudevents`) | `firebase-admin` updates its transitive deps to pull `uuid >= 11.1.1` natively |

## 4. Dismissed Alerts

Alerts dismissed intentionally — do not re-open without re-evaluating.

| Alert | Package | CVE | Reason |
|---|---|---|---|
| #11, #12 | `undici` | CVE-2026-9678, CVE-2026-9697 | Dev-only via `jsdom` (test environment). Not fixable via override — `jsdom@29.1.1` uses undici internal APIs (`wrap-handler.js`) incompatible with `undici >= 8.x`. Revisit when a new major version of `jsdom` is released. |
| #7 | `js-yaml` | CVE-2026-53550 | Dev-only via `firebase-tools` internals. Only processes trusted local Firebase config files, never user-supplied YAML. |
| #2 | `uuid` | CVE-2026-41907 | Dev-only via `firebase-tools`. Fixed in root via `pnpm.overrides` above; this alert refers to the `package-lock.json` manifest which is not used by pnpm. |
