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
- **Backend/Database**: Firebase Firestore (for real-time competition points)
- **Dependencies**: `qrcode` (for PIX generation), `firebase`

## Local Development

To run this project locally, follow these steps:

1. **Install Dependencies**
   Ensure you have Node.js installed, then run:
   ```bash
   npm install
   ```

2. **Firebase Configuration**
   Open `firebase.js` and replace the placeholder `firebaseConfig` with your actual Firebase credentials.

3. **Start the Dev Server**
   ```bash
   npm run dev
   ```
   The site will be available at `http://localhost:5173/`.
   The admin panel will be available at `http://localhost:5173/admin.html` (Default test password: `casamento2026`).

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
