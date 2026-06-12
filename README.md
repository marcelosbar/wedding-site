# Lorena & Marcelo's Wedding Website

Welcome to the source code of Lorena and Marcelo's wedding website. This is a fast, responsive, and beautifully designed web application built with modern vanilla web technologies.

## Features

- **Responsive Design**: Looks great on both desktop and mobile devices.
- **Modern Aesthetics**: Features glassmorphism, smooth micro-animations, and a curated color palette (Blue, Orange, Yellow, White).
- **Countdown Timer**: A beautiful glassmorphic countdown timer on the hero section showing the days, hours, minutes, and seconds left until the big day, with a custom post-event state.
- **Honeymoon Competition**: A built-in cart and points system where guests can "vote" on the honeymoon destination by choosing gifts.
- **PIX Integration**: Generates a dynamic PIX QR Code for easy payments.
- **Hidden Admin Panel**: A secure area to review and validate guest contributions.
- **RSVP**: Integration with the Assessoria VIP platform.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS (CSS Variables), Vanilla JavaScript (ESModules)
- **Build Tool**: Vite
- **Image CDN**: ImageKit.io (for automated image optimization and delivery)
- **Backend/Database**: Firebase Firestore (for real-time competition points)
- **Dependencies**: `qrcode` (for PIX generation), `firebase`

## Local Development

To run this project locally, follow these steps:

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **Java (JDK or JRE)** (Java 8 or higher). This is required to execute the Firebase Local Emulator Suite (Auth & Firestore).

### 2. Install Dependencies
Run the following command to install the project dependencies:
```bash
npm install
```

### 3. Firebase Configuration
For local development with the Firebase Emulator Suite, **no configuration is required** out of the box (it uses the `demo-wedding-site` project ID and mock credentials automatically).

If you need to connect to your live production/cloud database from your local machine:
- Copy the `.env.example` file to a new file named `.env`.
- Replace the placeholders with your actual Firebase credentials.

### 4. Start the Dev Server with Emulators
```bash
npm run dev
```
This spins up the Vite dev server (port 5173) and the Firebase Emulators (Auth on port 9099, Firestore on port 8080) concurrently.
- The site will be available at `http://localhost:5173/`.
- The admin panel will be available at `http://localhost:5173/admin.html`.

### 5. Local Admin Authentication
- Click the "Entrar com o Google" button on the Admin page.
- The Firebase Auth Emulator pop-up will appear. Enter `admin@test.com` to log in.
- The database is automatically seeded with a `/config/admins` document to grant admin permissions to `admin@test.com` on startup.

### 6. Security & CSP Verification
To test the production build with strict security headers (Content Security Policy, HSTS, etc.) configured in `firebase.json`:
```bash
npm run preview:secure
```
This builds the site and starts the full Firebase Emulator suite (including the Hosting emulator on port 5000). Visit `http://localhost:5000/admin.html` to verify security compliance.

## Running Tests

This project uses **Vitest** with **JSDOM** and **v8** for code coverage.

### Unit Tests
Runs the full unit test suite (9 files, JSDOM environment) and outputs the code coverage report:
```bash
npm run test
```
To run tests in interactive watch mode:
```bash
npm run test:watch
```

### Integration Tests
Runs the Firestore Security Rules integration tests against the Firebase Emulator. Requires **Java** (JDK/JRE 8+) installed:
```bash
npm run test:integration
```
This command automatically starts the Firestore Emulator, runs the tests in `tests/integration/`, and shuts down the emulator when done. These tests validate that the `firestore.rules` correctly enforce access control (e.g., the R$ 5,000 cap, admin-only updates, field validation).

## Architecture & Security Notes

- **Content Security Policy (CSP)**: The project enforces a strict Content Security Policy (configured in `firebase.json`) that disables `'unsafe-inline'` for scripts and styles. All styles must live in external CSS files, and all event handlers must be attached dynamically in JS modules. Compliance is verified locally via `tests/security.test.js`.
- **Static Assets & Performance Optimization**: To conserve hosting bandwidth, high-resolution images and decorative design assets are offloaded to the **ImageKit.io** CDN (ID: `vfxvr8vqa`) under the `wedding-site/` folder. Avoid committing large image files to the repository.
  - *Responsive Images*: The hero background (`hero-scene.jpg`) utilizes standard browser `srcset` and `sizes` combined with ImageKit real-time transformation parameters (`?tr=w-[width]`) to serve optimized sizes (600w, 1000w, 1600w) dynamically based on viewport width.
  - *Asset Sizing*: Fixed display components request customized widths to avoid downloading large source files (e.g., `?tr=w-200` for the navigation logo and `?tr=w-500` for destination cards).
  - *Typography*: The custom typography (`Montserrat` and `Playfair Display`) is integrated locally under `src/fonts/` and loaded dynamically via stylesheet rules.

## Deployment

### CI/CD (Automated)
This project uses GitHub Actions for automated deployment. Any commit pushed or merged to `main` is automatically built and deployed to Firebase Hosting. Opening a pull request automatically generates a temporary staging/preview environment.

### Manual Deployment (Fallback)
If manual deployment is necessary:
1. Ensure the Firebase CLI is installed: `npm install -g firebase-tools`
2. Run the build and deploy commands:
   ```bash
   npm run build
   firebase deploy
   ```

## License & Disclaimer

This project is a personal, strictly non-commercial wedding website built exclusively for Lorena and Marcelo's private wedding celebration.

**Disclaimer:** This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with The Walt Disney Company, Disney Enterprises, Inc., or any of their subsidiaries or affiliates. All Disney-related names, marks, emblems, and images are registered trademarks of their respective owners. The use of any trademarks or copyrighted materials is purely symbolic, for personal demonstration, and private celebration purposes.
