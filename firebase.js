import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, getDocs } from "firebase/firestore";

// TODO: Replace this with your actual Firebase config
// Go to Firebase Console -> Project Settings -> General -> Web App Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper collections
export const transactionsRef = collection(db, "transactions");
export { addDoc, onSnapshot, query, getDocs };
