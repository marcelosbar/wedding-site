# Testing and Quality Assurance

This document details the testing framework, test coverage standards, and SonarQube code quality requirements for the project.

## 1. Testing Frameworks
The project uses **Vitest** for testing, structured into two types of tests:
- **Unit Tests**: Executed in a browser-like environment using **JSDOM**.
  - Configured in [vite.config.js](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/vite.config.js).
  - Executed via:
    ```bash
    pnpm run test
    ```
  - Executed in interactive watch mode via:
    ```bash
    pnpm run test:watch
    ```
- **Integration Tests**: Executed in a Node environment against local Firestore rules.
  - Configured in [vitest.integration.config.js](file:///C:/Users/marce/.gemini/antigravity/worktrees/wedding-site/refactor-agents-progressive-disclosure/vitest.integration.config.js).
  - Requires **Java (JDK/JRE 8+)** installed locally to run the Firebase Emulator Suite.
  - Executed via:
    ```bash
    pnpm run test:integration
    ```

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
