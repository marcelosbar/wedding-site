# Agent Instructions

This document serves as a guide for any AI Agent (like myself) working on this repository in the future.

## Project Context
This is a wedding website for Lorena and Marcelo. The primary goal is to provide a beautiful, seamless experience for their guests to RSVP and participate in a "Honeymoon Competition" (Disney vs. Cote D'Azur).

## Technical Guidelines
1. **Frontend First**: The site is built with Vanilla HTML, CSS, and JS. Do not introduce heavy frameworks like React or Vue unless explicitly requested by the user, as the current architecture relies on Vite building standard vanilla web assets.
2. **Language Constraints**: 
   - All source code, variables, and comments should be written in **English** (for the user's GitHub portfolio).
   - All user-facing UI text (HTML, alerts) must be written in **Portuguese (pt-BR)**.
3. **Styling**: We are using Vanilla CSS (`style.css`). Do not use Tailwind CSS. Maintain the established color palette (Blue, Orange, Yellow, White) and modern design elements (glassmorphism, CSS variables, `Inter` and `Playfair Display` fonts).
4. **Backend**: Firebase Firestore is used for backend operations (specifically tracking points for the honeymoon competition). Ensure any new backend feature utilizes this existing Firebase setup.
5. **Code Quality (SonarQube/SonarLint)**: The user has SonarQube/SonarLint installed in their IDE. Ensure all generated code strictly follows modern JavaScript/HTML/CSS best practices to avoid triggering linting warnings (e.g., use `Number.parseInt`, avoid deprecated functions like `execCommand`, prefer direct `undefined` checks over `typeof`, and use `globalThis`). Always fix any surfaced warnings immediately.

## Current State
- The UI is complete and tested.
- PIX checkout is functional on the frontend.
- A local simulation of points works, but it requires the user to insert real Firebase credentials into `firebase.js` to enable real-time sync.
- Admin panel is located at `admin.html`.
