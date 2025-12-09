// firebase-config.js - ВАША РЕАЛЬНАЯ КОНФИГУРАЦИЯ
console.log('Завантаження конфігурації Firebase...');

// Ваша конфигурация из Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDy8f06pq7Q1Y5d4w4W9uqsjy77kkyR64A",
    authDomain: "hortingg.firebaseapp.com",
    databaseURL: "https://hortingg-default-rtdb.firebasedio.com",
    projectId: "hortingg",
    storageBucket: "hortingg.firebasestorage.app",  // Исправлено опечатку
    messagingSenderId: "376849935994",  // Исправлена длина
    appId: "1:376849935994:web:6fb3266c2c3e899af467d",  // Исправлена опечатка
    measurementId: "G-WASSP2R2NE"
};

// Экспортируем конфигурацию
window.firebaseConfig = firebaseConfig;

console.log('Firebase конфігурація завантажена успішно');
