# Agent Instructions

This document serves as a guide for any AI Agent (like myself) working on this repository in the future.

## Project Context
This is a wedding website for Lorena and Marcelo. The primary goal is to provide a beautiful, seamless experience for their guests to RSVP and participate in a "Honeymoon Competition" (Disney vs. Cote D'Azur).

## Technical Guidelines
1. **Frontend First**: The site is built with Vanilla HTML, CSS, and JS. Do not introduce heavy frameworks like React or Vue unless explicitly requested by the user. The project uses a standard **Vite structure**, where all source code (HTML, CSS, JS modules) must live inside the `src/` directory. The `main.js` serves as an orchestrator for smaller modules like `cart.js` and `pix.js`.
2. **Language Constraints**: 
   - All source code, variables, and comments should be written in **English** (for the user's GitHub portfolio).
   - All user-facing UI text (HTML, alerts) must be written in **Portuguese (pt-BR)**.
3. **Styling**: We are using Vanilla CSS (`src/css/style.css`). Do not use Tailwind CSS. Maintain the established color palette (Blue, Orange, Yellow, White) and modern design elements (glassmorphism, CSS variables, `Inter` and `Playfair Display` fonts). **No inline styles are allowed** (never use `style="..."` attributes or `<style>` blocks in HTML; always use CSS classes).
4. **Backend**: Firebase Firestore is used for backend operations (specifically tracking points for the honeymoon competition). Ensure any new backend feature utilizes this existing Firebase setup.
5. **Code Quality (SonarQube/SonarLint)**: The user has SonarQube/SonarLint installed in their IDE. Ensure all generated code strictly follows modern JavaScript/HTML/CSS best practices to avoid triggering linting warnings (e.g., use `Number.parseInt`, avoid deprecated functions like `execCommand`, prefer direct `undefined` checks over `typeof`, and use `globalThis`). Always fix any surfaced warnings immediately.
6. **Test Coverage**: The project uses **Vitest** with **JSDOM** for unit testing. The CI/CD pipeline (GitHub Actions) runs tests and uploads coverage reports to **SonarCloud**. When adding or modifying business logic, **always write or update corresponding tests** in unit files to maintain both statement coverage and branch coverage above 80% (as required by SonarCloud's Quality Gate). Run `npm run test` locally before committing to verify.
7. **CI/CD Security (Action Pinning)**: To protect against supply-chain attacks and ensure build reproducibility, always pin GitHub Actions in workflow files to a specific, immutable git commit SHA (e.g. `uses: trufflesecurity/trufflehog@a94d152bf65bebf5baa486d3d4dfee520af2ceed`) rather than using mutable tags or branch names (like `@main` or `@v3`). Document the friendly version in a comment beside it.
8. **Strict Security Constraints (CSP & Rules)**:
   - The project enforces a strict Content Security Policy **without `'unsafe-inline'`** for both scripts and styles in `firebase.json`.
   - Never write inline event handlers (`onclick`, `onload`, etc.) or inline styling attributes/blocks. All events must be dynamically attached using `addEventListener` in JS modules.
   - A regression test suite exists in `tests/security.test.js` to enforce these HTML and CSP constraints; ensure this test passes.
   - Firestore security rules (`firestore.rules`) enforce a cap of `totalAmount <= 5000` to prevent scoreboard manipulation, restrict transaction updates strictly to the `status` field, and require `email_verified == true` for admin authentication.
9. **Git & Branch Strategy**: Always create new branches or worktrees based on the most up-to-date version of `main` from origin (`origin/main`). Always fetch remote changes (`git fetch origin`) before branching to ensure a clean, current baseline.
10. **Static Assets & Performance Optimization (ImageKit CDN)**: All high-resolution images for gifts, backgrounds, and destinations are hosted on the **ImageKit.io** CDN (ID: `vfxvr8vqa`) under the `wedding-site/` folder to avoid Firebase Hosting bandwidth limits. Never upload raw images directly to the `public/images/` repository folder. If you need to add new images, upload them to the ImageKit dashboard and use their CDN URLs in the HTML.
    - **Performance Best Practices**:
      - *Large Backgrounds/Hero Assets*: Implement responsive `<img srcset="..." sizes="..." />` using ImageKit width transformations (e.g., `?tr=w-600`, `?tr=w-1000`, `?tr=w-1600`) to match client viewports and optimize page weight.
      - *Fixed Display Elements*: Always request exact display-width transformations. For example, append `?tr=w-200` for logos (displayed at max width ~200px) and `?tr=w-500` for destination cards (displayed at max width ~500px). Do not fetch full-resolution images for small containers.
      - *Local Copies*: Any raw mock images used during design iterations must be placed in a directory ignored by Git (e.g., `imagekit-to-upload/`) and uploaded to the ImageKit CDN. No local mock images are allowed in production code.
11. **Documentation Maintenance**: At the end of any feature implementation, configuration change, or script update, always review and update the project documentation (such as `README.md`) to ensure setup, testing, and deployment instructions are kept fully up to date.
12. **Continuous Improvement of Guidelines**: Proactively propose updates to this `AGENTS.md` file whenever you discover new repository quirks, security gotchas, emulator requirements, or testing best practices during your task. Focus updates on high-leverage guidelines that cannot be easily enforced by automated tests or linters to prevent documentation clutter.
13. **Responsive Design and UI Layering Best Practices**:
    - *Script Font Proportions*: Script typefaces (like `Pinyon Script`) appear visually smaller than blocky serif or sans-serif fonts at equivalent font-sizes. Always ensure they have significantly larger font-sizes on mobile (`clamp(3.6rem, 12vw, 4.5rem)` or `3.2rem` minimum) so they remain the proud protagonists of the page and don't get drowned out by bold numbers (like countdown values) or uppercase dates.
    - *Proportional Height Scaling*: When compressing sections for short viewports (like laptops, landscape tablets, or smart displays using `@media (max-height)`), scale down all text elements, paddings, and components (e.g. countdown cards) proportionally. If only the title is reduced, the details will look disproportionately large.
    - *Z-Index Stacking with Modals*: Keep fixed floating elements (like the floating cart) at a `z-index` lower than the backdrop overlays of modals (`1050` vs overlay backdrop `1100`). This ensures the floating buttons go behind the backdrop when a modal is open, preventing them from overlapping footer buttons inside the modal on small screens.


## Current State
- The UI is complete and tested.
- PIX checkout is functional on the frontend.
- Firebase credentials are injected via environment variables (`.env` locally, GitHub Secrets in CI).
- Admin panel is located at `admin.html`, protected by Google Sign-In with an email allowlist stored in Firestore (`/config/admins`).
- CI/CD pipeline runs Vitest + SonarCloud before deploying to Firebase Hosting.
- Security headers (CSP, HSTS, X-Frame-Options) are configured in `firebase.json` (including `https://ik.imagekit.io` whitelist).
- Static images have been offloaded to ImageKit CDN to preserve Hosting bandwidth.

## SonarQube CLI Integration
For local code quality checks and issue inspection, developers and AI agents can use the official **SonarQube CLI** (`sonar` command).
- **List PR Issues**: Run `sonar list issues -p wedding-site --pull-request <pr_id>` to fetch open issues for a pull request.
- **Reference**: Refer to the SonarQube CLI LLM context file at [cli.sonarqube.com/llms.txt](https://cli.sonarqube.com/llms.txt) for detailed CLI usage instructions and configurations.
