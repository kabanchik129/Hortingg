// firebase-config.js - УПРОЩЕННАЯ ВЕРСИЯ
// Если Firebase не нужен или не работает, можно использовать эту версию

// Проверяем, не определена ли уже конфигурация
if (!window.firebaseConfig) {
    console.log('Используем локальную конфигурацию Firebase');
    
    // Тестовая конфигурация (для разработки)
    window.firebaseConfig = {
 apiKey : "AIzaSyBIG0qp7QJt7S4dvwMHpuqsjyJ7kkyR64A" , 
  authDomain : "hortingg.firebaseapp.com" , 
  databaseURL : "https://hortingg-default-rtdb.firebaseio.com" , 
  projectId : "hortingg" , 
  storageBucket : "hortingg.firebasestorage.app" , 
  messagingSenderId : "374849935944" , 
  appId : "1:374849935944:web:6fb3266c2c3eb099af167d" , 
  MeasurementId : "G-RK4SP2RZWE" 
    };
    
    // Отключаем реальные запросы к Firebase
    window.firebaseDisabled = true;
}

console.log('Конфигурация Firebase завантажена');
