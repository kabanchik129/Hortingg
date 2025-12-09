// supabase-config.js
// ЗАМЕНИТЕ эти значения на свои из панели Supabase
const SUPABASE_CONFIG = {
    url: 'https://zgumvczkfaracjqvdjzm.supabase.co',  // ваш Supabase URL
    key: 'sb_publishable_02yXlmq8Tdob9mCplLOcOg_amQO8c0k'          // ваш public anon key
};

// Экспортируем
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
console.log('Supabase конфігурація завантажена');
