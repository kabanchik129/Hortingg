// firebase-config.js
// Конфигурация Firebase (ЗАМЕНИТЕ НА СВОИ ДАННЫЕ!)

const firebaseConfig = {
    apiKey: "AIzaSyBIG0qp7QJt7S4dvwMHpuqsjyJ7kkyR64A",
    authDomain: "hortingg.firebaseapp.com",
    databaseURL: "https://hortingg-default-rtdb.firebaseio.com",
    projectId: "hortingg",
    storageBucket: "hortingg.firebasestorage.app",
    messagingSenderId: "374849935944",
    appId: "1:374849935944:web:d288624d41b0cb07af167d",
    measurementId: "G-3W9H6TT4NL"
};

// Экспортируем конфигурацию для использования в script.js
window.firebaseConfig = firebaseConfig;

console.log('Firebase конфигурация завантажена');
