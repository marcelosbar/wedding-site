# Agent Instructions

This document contains only the essential, day-to-day information needed to work on this project: stack overview, commands, and hard constraints. It is intentionally concise. Topic-specific details (security rules, testing, assets, dependencies) live in the `docs/` guides listed at the bottom — read those only when working on the relevant area.

## Project Overview
This is a wedding website for Lorena and Marcelo featuring an external RSVP link and a "Honeymoon Competition" scoreboard (Disney vs. Cote D'Azur).

## Package Manager & Tooling
- **Package Manager**: **pnpm** (specifically version `9.15.4`, enforced via a `preinstall` script).
- **Core Commands**:
  - `pnpm dev`: Concurrently starts the Vite development server and the Firebase Emulator Suite (Auth and Firestore).
  - `pnpm run test:integration`: Executes Firestore security rules tests against a temporary emulator instance.
  - `pnpm run preview:secure`: Builds the project and runs it in the full Firebase Emulator suite to verify CSP headers.
- **Emulator Port Collisions**: Do not run `pnpm run test:integration` while `pnpm dev` is active; the Firestore emulator instances will collide on port `8080`. Always stop the local development server before executing integration tests.
- **CI/CD Pipeline Monitoring**: The GitHub Actions pipeline typically takes 3 minutes to complete. When monitoring PR checks, schedule timers for at least 180 seconds (3 minutes) to avoid premature/unnecessary checkups.
- **Seeding Test Data**: Use `node scripts/seed-messages.mjs` to seed the local emulator with guest messages for testing the carousel.

## Development Constraints
- **Language**: All source code, comments, variables, and commits must be in **English**. All user-facing UI text (HTML, alerts) must be in **Portuguese (pt-BR)**.
- **Frontend**: Vanilla HTML, CSS, and JS. Do not introduce JS frameworks (React, Vue) or Tailwind CSS.
- **Backend**: Firebase Firestore (tracking honeymoon competition points).
- **CSP**: Content Security Policy is strictly configured in `firebase.json` without `'unsafe-inline'`. No inline styles or script event handlers are allowed.
- **Database & Previews**: The production Firebase API key has strict HTTP Referrer restrictions. The `*.web.app/*` wildcard is explicitly blocked to protect production integrity, and no separate staging project has been created yet. As a result, database operations (Firestore, Auth, Installations) will fail with 403 Forbidden in PR preview URLs. All database features must be tested locally using the Firebase Emulator Suite.

## Topic-Specific Guides
Read these documents when working on the specific area — do not read them all upfront.
- [Security & Firebase Rules](docs/security.md): Read when changing CSP, Firestore rules, admin auth, or Cloud Functions data flow.
- [Dependencies & Security Alerts](docs/dependencies.md): Read when handling Dependabot alerts, updating transitive dependencies, or managing `pnpm.overrides`.
- [Testing & Quality Assurance](docs/testing.md): Read when writing or running tests, checking coverage targets, or using SonarQube.
- [Static Assets & CDN Management](docs/assets.md): Read when adding or updating images, videos, or any CDN-hosted assets.
- [UI & Responsive Design](docs/ui_design.md): Read when changing layout, CSS theme tokens, fonts, modals, or viewport scaling.
