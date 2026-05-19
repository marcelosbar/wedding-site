import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Configuração via variáveis de ambiente (.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper collections
export const transactionsRef = collection(db, "transactions");

let authInstance = null;
let providerInstance = null;

try {
  // getAuth throws if the API key is invalid or missing, breaking the whole app
  if (firebaseConfig.apiKey) {
    authInstance = getAuth(app);
    providerInstance = new GoogleAuthProvider();
  }
} catch (e) {
  console.warn("Firebase Auth desabilitado: Chave de API inválida ou ausente.", e.message);
}

export const auth = authInstance;
export const googleProvider = providerInstance;
export { addDoc, onSnapshot, query, getDocs } from "firebase/firestore";
