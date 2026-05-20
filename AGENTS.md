# Agent Instructions

This document serves as a guide for any AI Agent (like myself) working on this repository in the future.

## Project Context
This is a wedding website for Lorena and Marcelo. The primary goal is to provide a beautiful, seamless experience for their guests to RSVP and participate in a "Honeymoon Competition" (Disney vs. Cote D'Azur).

## Technical Guidelines
1. **Frontend First**: The site is built with Vanilla HTML, CSS, and JS. Do not introduce heavy frameworks like React or Vue unless explicitly requested by the user. The project uses a standard **Vite structure**, where all source code (HTML, CSS, JS modules) must live inside the `src/` directory. The `main.js` serves as an orchestrator for smaller modules like `cart.js` and `pix.js`.
2. **Language Constraints**: 
   - All source code, variables, and comments should be written in **English** (for the user's GitHub portfolio).
   - All user-facing UI text (HTML, alerts) must be written in **Portuguese (pt-BR)**.
3. **Styling**: We are using Vanilla CSS (`src/css/style.css`). Do not use Tailwind CSS. Maintain the established color palette (Blue, Orange, Yellow, White) and modern design elements (glassmorphism, CSS variables, `Inter` and `Playfair Display` fonts).
4. **Backend**: Firebase Firestore is used for backend operations (specifically tracking points for the honeymoon competition). Ensure any new backend feature utilizes this existing Firebase setup.
5. **Code Quality (SonarQube/SonarLint)**: The user has SonarQube/SonarLint installed in their IDE. Ensure all generated code strictly follows modern JavaScript/HTML/CSS best practices to avoid triggering linting warnings (e.g., use `Number.parseInt`, avoid deprecated functions like `execCommand`, prefer direct `undefined` checks over `typeof`, and use `globalThis`). Always fix any surfaced warnings immediately.
6. **Test Coverage**: The project uses **Vitest** with **JSDOM** for unit testing. The CI/CD pipeline (GitHub Actions) runs tests and uploads coverage reports to **SonarCloud**. When adding or modifying business logic, **always write or update corresponding tests** in `main.test.js` to maintain coverage above 80%. Run `npm run test` locally before committing to verify.
7. **CI/CD Security (Action Pinning)**: To protect against supply-chain attacks and ensure build reproducibility, always pin GitHub Actions in workflow files to a specific, immutable git commit SHA (e.g. `uses: trufflesecurity/trufflehog@a94d152bf65bebf5baa486d3d4dfee520af2ceed`) rather than using mutable tags or branch names (like `@main` or `@v3`). Document the friendly version in a comment beside it.

## Current State
- The UI is complete and tested.
- PIX checkout is functional on the frontend.
- Firebase credentials are injected via environment variables (`.env` locally, GitHub Secrets in CI).
- Admin panel is located at `admin.html`, protected by Google Sign-In with an email allowlist stored in Firestore (`/config/admins`).
- CI/CD pipeline runs Vitest + SonarCloud before deploying to Firebase Hosting.
- Security headers (CSP, HSTS, X-Frame-Options) are configured in `firebase.json`.
