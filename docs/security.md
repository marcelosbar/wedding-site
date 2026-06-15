# Security and Firebase Rules

This document outlines the security controls, Content Security Policy (CSP) enforcement, and database security rules for the wedding website project.

## 1. Content Security Policy (CSP)
The project enforces a strict Content Security Policy (configured in `firebase.json`) that disables `'unsafe-inline'` for scripts and styles.
- **Scripts**: No inline script tags (`<script>...</script>`) or inline event handlers (e.g., `onclick="..."`, `onload="..."`) are allowed. All events must be attached dynamically in JS modules using `addEventListener`.
- **Styles**: No inline style attributes (e.g., `style="..."`) or `<style>` blocks are allowed in HTML files. All styling must be declared via CSS classes in external stylesheets (e.g., `src/css/style.css`).
- **External Connections**: The CSP includes a whitelist for Firebase APIs and the ImageKit CDN (`https://ik.imagekit.io`).
- **Regression Testing**: A dedicated regression test suite exists in [security.test.js](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/tests/security.test.js) to programmatically scan HTML files and verify that no inline styling, inline event handlers, or inline script blocks are present.

## 2. Firestore Security Rules
Database access is secured by rules defined in [firestore.rules](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/firestore.rules).
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

## 4. Cloud Functions & Secure Data Separation
To protect guests' privacy and optimize read quotas:
- **Transactions Collection**: Restricted to admin-only reads. Public users cannot query `/transactions` directly.
- **Scoreboard Totals**: Calculated server-side by the `onTransactionWritten` Cloud Function in the `functions/` folder. Public clients read from the single document `/scoreboard/totals`.
- **Public Messages**: Publicly readable messages are securely copied by the Cloud Function to a `/publicMessages` collection (filtering for approved, public messages only).
- **Pagination**: The carousel fetches `/publicMessages` with a limit of 10 and uses cursor queries (`startAfter`) for lazy loading. The admin panel paginates transactions (limit 20).
