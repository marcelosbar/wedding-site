import { initializeApp } from "firebase/app";
import { getFirestore, collection, connectFirestoreEmulator, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";

// Configuração via variáveis de ambiente (.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "lorenaemarcelo2026",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id"
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

// Connect to Emulators locally in development or preview mode
const isLocalhost = globalThis.window !== undefined && 
  (globalThis.window.location.hostname === 'localhost' || globalThis.window.location.hostname === '127.0.0.1');
const isTest = import.meta.env.MODE === 'test';

if (isLocalhost && !isTest) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log("Conectado ao Emulador do Firestore (porta 8080)");
    if (authInstance) {
      connectAuthEmulator(authInstance, 'http://localhost:9099');
      console.log("Conectado ao Emulador do Firebase Auth (porta 9099)");
    }

    // Auto-seed admin document for local testing
    const adminDocRef = doc(db, 'config', 'admins');
    try {
      await setDoc(adminDocRef, { emails: ['admin@test.com'] });
      console.log('Banco local auto-semeado com admin@test.com');
    } catch (err) {
      if (err.code !== 'permission-denied') {
        console.warn('Erro ao auto-semear documento de admin no banco local:', err);
      }
    }

  } catch (err) {
    console.warn("Falha ao conectar aos emuladores do Firebase:", err);
  }
}

export const auth = authInstance;
export const googleProvider = providerInstance;
export { addDoc, onSnapshot, query, getDocs } from "firebase/firestore";
