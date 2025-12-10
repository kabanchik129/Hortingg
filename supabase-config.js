// supabase-config.js - ПРОСТОЙ ФАЙЛ
console.log('Завантаження конфігурації...');

// Конфигурация Supabase (замени на свои реальные данные)
window.SUPABASE_CONFIG = {
    url: 'https://zgumvczkfaracjqvdjzm.supabase.co',  // Замени на свой URL
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpndW12Y3prZmFyYWNqcXZkanptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY0NjcsImV4cCI6MjA4MDg2MjQ2N30.H8yUfSceeXgrm75ra5ORlj9on8t80Y8APzH4k3OeF1o'  // Замени на свой ключ
};

// Если Supabase SDK не загружен, выводим предупреждение
if (typeof supabase === 'undefined') {
    console.warn('Supabase SDK не завантажений! Перевірте підключення в index.html');
}

console.log('Конфігурація завантажена');
