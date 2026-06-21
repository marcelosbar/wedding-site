# Security and Firebase Rules

This document covers all access control mechanisms in the project: Content Security Policy (CSP), Firestore security rules, admin authentication, and Cloud Functions data access restrictions.

## 1. Content Security Policy (CSP)
The project enforces a strict Content Security Policy (configured in `firebase.json`) that disables `'unsafe-inline'` for scripts and styles.
- **Scripts**: No inline script tags (`<script>...</script>`) or inline event handlers (e.g., `onclick="..."`, `onload="..."`) are allowed. All events must be attached dynamically in JS modules using `addEventListener`.
- **Styles**: No inline style attributes (e.g., `style="..."`) or `<style>` blocks are allowed in HTML files. All styling must be declared via CSS classes in external stylesheets (e.g., `src/css/style.css`).
- **External Connections**: The CSP includes a whitelist for Firebase APIs and the ImageKit CDN (`https://ik.imagekit.io`).
- **Regression Testing**: A dedicated regression test suite exists in [security.test.js](../tests/security.test.js) to programmatically scan HTML files and verify that no inline styling, inline event handlers, or inline script blocks are present.

## 2. Firestore Security Rules
Database access is secured by rules defined in [firestore.rules](../firestore.rules).
- **Scoreboard Validation**: Enforces a cap of `totalAmount <= 5000` to prevent scoreboard manipulation during the honeymoon competition.
- **Transactions**: Restricts transaction updates strictly to modifying the `status` field.
- **Admin Authorization**: Requires `email_verified == true` on the Google Auth token for admin actions.
- **Integration Testing**: Security rules are validated using Firestore local emulator tests in `tests/integration/`. Run them via:
  ```bash
  pnpm run test:integration
  ```

## 3. Admin Panel Protection
- **Location**: The admin interface is at `admin.html`.
- **Authentication**: Protected by Firebase Google Sign-In.
- **Allowlist**: Admin permissions are verified against a whitelist stored in Firestore under `/config/admins`.

## 4. Cloud Functions & Data Access Restrictions
The Cloud Functions enforce access boundaries to protect guest privacy:
- **Transactions Collection**: Restricted to admin-only reads via Firestore rules. Public clients cannot query `/transactions` directly.
- **Scoreboard Totals**: Public clients read only the pre-aggregated `/scoreboard/totals` document — never raw transaction data.
- **Public Messages**: Only approved, explicitly public messages are copied to `/publicMessages` by the Cloud Function. Raw guest messages in `/messages` are not publicly readable.
