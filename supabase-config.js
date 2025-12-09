// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBIG0qp7QJt7S4dvwMHpuqsjyJ7kkyR64A",
  authDomain: "hortingg.firebaseapp.com",
  databaseURL: "https://hortingg-default-rtdb.firebaseio.com",
  projectId: "hortingg",
  storageBucket: "hortingg.firebasestorage.app",
  messagingSenderId: "374849935944",
  appId: "1:374849935944:web:2639f64c46ac022caf167d",
  measurementId: "G-7SSC1ZTPMF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Экспорт для использования
window.db = db;
window.auth = auth;