// lib/firebase.js
// Inisialisasi Firebase. Nilai config di bawah AMAN untuk dimasukkan ke kode
// (bukan rahasia) — keamanan dijaga oleh Security Rules di sisi Firebase.
//
// GANTI 6 nilai "MASUKKAN_..." dengan punya Anda dari Firebase Console.
// (Tidak memakai Storage — gambar disimpan di Firestore.)

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBFkLJ378c_iydkUrBnlTl-7CBDTAkq1uM",
  authDomain: "medmind-7d21a.firebaseapp.com",
  projectId: "medmind-7d21a",
  storageBucket: "medmind-7d21a.firebasestorage.app",
  messagingSenderId: "685248666536",
  appId: "1:685248666536:web:70b9a35b65452f94651b9d",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
