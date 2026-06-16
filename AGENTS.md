# Agent Instructions

This document is the primary entrypoint of instructions for AI Agents working on this project. For global development instructions, see [GEMINI.md](file:///C:/Users/marce/.gemini/GEMINI.md).

## Project Overview
This is a wedding website for Lorena and Marcelo featuring an RSVP system and a "Honeymoon Competition" scoreboard (Disney vs. Cote D'Azur).

## Package Manager & Tooling
- **Package Manager**: **pnpm** (specifically version `9.15.4`, enforced via a `preinstall` script).
- **Core Commands**:
  - `pnpm dev`: Concurrently starts the Vite development server and the Firebase Emulator Suite (Auth and Firestore).
  - `pnpm run test:integration`: Executes Firestore security rules tests against a temporary emulator instance.
  - `pnpm run preview:secure`: Builds the project and runs it in the full Firebase Emulator suite to verify CSP headers.

## Development Constraints
- **Language**: All source code, comments, variables, and commits must be in **English**. All user-facing UI text (HTML, alerts) must be in **Portuguese (pt-BR)**.
- **Frontend**: Vanilla HTML, CSS, and JS. Do not introduce JS frameworks (React, Vue) or Tailwind CSS.
- **Backend**: Firebase Firestore (tracking honeymoon competition points).
- **CSP**: Content Security Policy is strictly configured in `firebase.json` without `'unsafe-inline'`. No inline styles or script event handlers are allowed.
- **Database & Previews**: The production Firebase API key has strict HTTP Referrer restrictions. The `*.web.app/*` wildcard is explicitly blocked to protect production integrity, and no separate staging project has been created yet. As a result, database operations (Firestore, Auth, Installations) will fail with 403 Forbidden in PR preview URLs. All database features must be tested locally using the Firebase Emulator Suite.

## Topic-Specific Guides
Refer to the following documents for comprehensive technical standards:
- [Security & Firebase Rules](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/docs/security.md): Detailed CSP constraints, Firestore security rules validation, and admin verification.
- [Testing & Quality Assurance](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/docs/testing.md): Unit and integration tests, code coverage targets, and SonarQube CLI parameters.
- [Static Assets & CDN Management](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/docs/assets.md): ImageKit.io CDN integration, responsive size transformations, and local assets directory rules.
- [UI & Responsive Design](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/docs/ui_design.md): Vanilla CSS theme details, script font adjustments, viewport height scaling, and modal stacking indexes.
