# Testing and Quality Assurance

This document covers the testing frameworks (Vitest), coverage requirements, and code quality standards (SonarQube) for the project.

## 1. Testing Frameworks
The project uses **Vitest** for all testing:
- **Unit Tests**: Run in a JSDOM browser-like environment. Configured in [vite.config.js](../vite.config.js). Use `pnpm test` (single run) or `pnpm test:watch` (interactive).
- **Integration Tests**: Run in Node against the local Firestore Emulator. Configured in [vitest.integration.config.js](../vitest.integration.config.js). Requires **Java (JDK/JRE 8+)**. Use `pnpm test:integration` — never while `pnpm dev` is running (port collision on 8080).

## 2. Coverage Requirements
To satisfy the SonarCloud Quality Gate in CI/CD (GitHub Actions), we enforce strict coverage requirements:
- **Minimum Target**: Keep both **statement coverage** and **branch coverage above 80%**.
- **Rule**: When adding or modifying business logic, always write or update corresponding tests in the `tests/` directory to maintain coverage levels.

## 3. Code Quality (SonarQube / SonarLint)
All code must follow modern JavaScript/HTML/CSS best practices to prevent linting and quality gate failures. Proactively adhere to the following:
- **Deprecated APIs**: Avoid deprecated features like `document.execCommand`.
- **Parsing**: Prefer `Number.parseInt` over `parseInt`.
- **Type Checking**: Prefer direct comparisons against `undefined` (e.g., `x === undefined`) instead of `typeof x === 'undefined'`.
- **Globals**: Reference the global scope via `globalThis` rather than `window` or `self`.

## 4. SonarQube CLI Integration
For local code quality checks and issue inspection, you can use the official **SonarQube CLI** (`sonar` command):
- **List PR Issues**:
  ```bash
  sonar list issues -p wedding-site --pull-request <pr_id>
  ```
- **Reference**: Detailed usage is described in the SonarQube CLI context file at `cli.sonarqube.com/llms.txt`.
