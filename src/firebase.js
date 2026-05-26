// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// 1. Ubah import Firestore untuk menambahkan fungsi offline persistence
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyAKAPgZJXZLc8MgfbpDsub1Tz5y-wmU_6Q",
  authDomain: "warta-pelayanansh.firebaseapp.com",
  projectId: "warta-pelayanansh",
  storageBucket: "warta-pelayanansh.firebasestorage.app",
  messagingSenderId: "566499882318",
  appId: "1:566499882318:web:96c39866837ea63b18da1f"
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