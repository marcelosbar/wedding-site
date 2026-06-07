# Lorena & Marcelo's Wedding Website

Welcome to the source code of Lorena and Marcelo's wedding website. This is a fast, responsive, and beautifully designed web application built with modern vanilla web technologies.

## Features

- **Responsive Design**: Looks great on both desktop and mobile devices.
- **Modern Aesthetics**: Features glassmorphism, smooth micro-animations, and a curated color palette (Blue, Orange, Yellow, White).
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

1. **Prerequisites**
   Ensure you have the following installed on your machine:
   - **Node.js** (v18 or higher recommended)
   - **Java (JDK or JRE)** (Java 8 or higher). This is required to execute the Firebase Local Emulator Suite (Auth & Firestore).

2. **Install Dependencies**
   Run the following command to install the project dependencies:
   ```bash
   npm install
   ```

2. **Firebase Configuration**
   Open `firebase.js` and replace the placeholder `firebaseConfig` with your actual Firebase credentials.

3. **Start the Dev Server with Emulators**
   ```bash
   npm run dev
   ```
   This spins up the Vite dev server (port 5173) and the Firebase Emulators (Auth on port 9099, Firestore on port 8080) concurrently.
   - The site will be available at `http://localhost:5173/`.
   - The admin panel will be available at `http://localhost:5173/admin.html`.

4. **Local Admin Authentication**
   - Click the "Entrar com o Google" button on the Admin page.
   - The Firebase Auth Emulator pop-up will appear. Enter `admin@test.com` to log in.
   - The database is automatically seeded with a `/config/admins` document to grant admin permissions to `admin@test.com` on startup.

5. **Security & CSP Verification**
   To test the production build with strict security headers (Content Security Policy, HSTS, etc.) configured in `firebase.json`:
   ```bash
   npm run preview:secure
   ```
   This builds the site and starts the full Firebase Emulator suite (including the Hosting emulator on port 5000). Visit `http://localhost:5000/admin.html` to verify security compliance.

## Deployment

This project is configured to be hosted on **Firebase Hosting**.

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```
2. **Login and Initialize**
   ```bash
   firebase login
   firebase init hosting # (Select your project and DO NOT overwrite index.html)
   ```
3. **Build and Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

## License & Disclaimer

This project is a personal, strictly non-commercial wedding website built exclusively for Lorena and Marcelo's private wedding celebration.

**Disclaimer:** This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with The Walt Disney Company, Disney Enterprises, Inc., or any of their subsidiaries or affiliates. All Disney-related names, marks, emblems, and images are registered trademarks of their respective owners. The use of any trademarks or copyrighted materials is purely symbolic, for personal demonstration, and private celebration purposes.
