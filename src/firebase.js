// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// 1. Ubah import Firestore untuk menambahkan fungsi offline persistence
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// 2. MENGAKTIFKAN OFFLINE PERSISTENCE (Menggantikan getFirestore)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Ekspor layanan Auth (Login) dan Storage agar bisa digunakan di file lain
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;