// supabase-config.js - ПРОСТОЙ ФАЙЛ
console.log('Завантаження конфігурації...');

// Конфигурация Supabase (замени на свои реальные данные)
window.SUPABASE_CONFIG = {
    url: 'https://zgumvczkfaracjqvdjzm.supabase.co',  // Замени на свой URL
    key: 'sb_publishable_02yXlmq8Tdob9mCplLOcOg_amQO8c0k'  // Замени на свой ключ
};

// Если Supabase SDK не загружен, выводим предупреждение
if (typeof supabase === 'undefined') {
    console.warn('Supabase SDK не завантажений! Перевірте підключення в index.html');
}

console.log('Конфігурація завантажена');
