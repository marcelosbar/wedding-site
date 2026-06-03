# Security Decisions Log

This document records triaged security scanner findings that have been reviewed,
classified, and — when appropriate — suppressed from automated reports. It serves
as an audit trail so future maintainers understand *why* certain alerts are ignored.

> **Scan tool:** OWASP ZAP 2.17.0 (Full Scan via `zaproxy/action-full-scan`)
> **Suppression file:** [`.zap/rules.tsv`](../.zap/rules.tsv)
> **Last reviewed:** 2026-06-03

---

## Suppressed Alerts

### 1 · Proxy Disclosure (Plugin 40025) — Medium

| Field | Value |
|---|---|
| **ZAP Rule ID** | `40025` |
| **Risk** | Medium (Medium confidence) |
| **Classification** | **False Positive** |
| **Reviewed by** | Marcelo — 2026-06-03 |

**Finding:** ZAP detected a "Varnish" proxy between itself and the origin server
using `TRACE`, `OPTIONS`, and `TRACK` HTTP methods.

**Rationale:** This is Firebase Hosting's CDN edge layer (Google's global
infrastructure). We have no control over these reverse proxies. The `TRACE` method
is not reflected back with request bodies (no XST risk). The "Varnish" fingerprint
is publicly known to be part of Firebase/Fastly's stack and reveals nothing
application-specific.

---

### 2 · Cross-Origin-Embedder-Policy `unsafe-none` (Plugin 90004-2) — Low

| Field | Value |
|---|---|
| **ZAP Rule ID** | `90004` (alert ref `90004-2`) |
| **Risk** | Low (Medium confidence) |
| **Classification** | **Accepted Risk** |
| **Reviewed by** | Marcelo — 2026-06-03 |

**Finding:** COEP is set to `unsafe-none` instead of `require-corp`.

**Rationale:** Setting `require-corp` would break cross-origin resources that do
not set a `Cross-Origin-Resource-Policy` header — specifically Google Fonts
(`fonts.googleapis.com`, `fonts.gstatic.com`) and Firebase SDK endpoints. Since
our site does not use `SharedArrayBuffer` or require cross-origin isolation,
`unsafe-none` is the correct and only viable value.

---

### 3 · Cross-Origin-Opener-Policy `same-origin-allow-popups` (Plugin 90004-3) — Low

| Field | Value |
|---|---|
| **ZAP Rule ID** | `90004` (alert ref `90004-3`) |
| **Risk** | Low (Medium confidence) |
| **Classification** | **Accepted Risk** |
| **Reviewed by** | Marcelo — 2026-06-03 |

**Finding:** COOP should be `same-origin` (stricter).

**Rationale:** The admin panel (`admin.html`) uses Google Sign-In which opens a
popup window for OAuth. `same-origin` would sever the `window.opener` reference
between our page and Google's sign-in popup, breaking authentication.
`same-origin-allow-popups` is the strongest COOP value compatible with Google
Sign-In and is recommended by Google/Firebase.

---

### 4 · Timestamp Disclosure — Unix (Plugin 10096) — Low

| Field | Value |
|---|---|
| **ZAP Rule ID** | `10096` |
| **Risk** | Low (Low confidence) |
| **Classification** | **False Positive** |
| **Reviewed by** | Marcelo — 2026-06-03 |

**Finding:** Numbers like `1732584193` in `firebase-CadF4io5.js` look like Unix
timestamps.

**Rationale:** These are **MD5 hash initialization constants** from RFC 1321
(e.g., `1732584193` = `0x67452301`). They are present in every Firebase SDK
bundle and in virtually every cryptographic library. They are not timestamps
and disclose nothing about the application.

---

### 5 · Re-examine Cache-Control Directives (Plugin 10015) — Informational

| Field | Value |
|---|---|
| **ZAP Rule ID** | `10015` |
| **Risk** | Informational |
| **Classification** | **Not Applicable** |
| **Reviewed by** | Marcelo — 2026-06-03 |

**Rationale:** All content served is public (a wedding website). Hashed assets
use `public, max-age=31536000, immutable`. HTML pages use `no-cache`. No
sensitive or user-specific data is ever returned in HTTP responses.

---

### 6 · Retrieved from Cache (Plugin 10050) — Informational

| Field | Value |
|---|---|
| **ZAP Rule ID** | `10050` |
| **Risk** | Informational |
| **Classification** | **Not Applicable** |
| **Reviewed by** | Marcelo — 2026-06-03 |

**Rationale:** Cache `HIT` indicators are normal Firebase CDN behavior. All
cached content is public and identical for all visitors.

---

### 7–8 · Storable and Cacheable / Non-Cacheable Content (Plugin 10049) — Informational

| Field | Value |
|---|---|
| **ZAP Rule ID** | `10049` |
| **Risk** | Informational |
| **Classification** | **Not Applicable** |
| **Reviewed by** | Marcelo — 2026-06-03 |

**Rationale:** Static assets being cacheable is by design. `robots.txt` and
`sitemap.xml` using `no-cache` (revalidate before serving) is textbook correct.

---

## Review Policy

- This document **must be updated** whenever a new ZAP alert is suppressed.
- All suppressions **must include** a classification and rationale.
- This log should be re-reviewed **annually** or whenever the application's
  architecture changes significantly (e.g., adding user authentication to public
  pages, handling PII in responses).
