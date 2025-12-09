// supabase-config.js - ПРОСТОЙ ФАЙЛ
console.log('Завантаження конфігурації...');

// Если не хотите использовать Supabase, просто оставьте это
window.SUPABASE_CONFIG = {
    url: 'https://zgumvczkfaracjqvdjzm.supabase.co',  // Замените на реальный URL
    key: 'sb_publishable_02yXlmq8Tdob9mCplLOcOg_amQO8c0k'                    // Замените на реальный ключ
};

// Инициализируем пустой клиент если Supabase не загрузился
if (!window.supabaseClient) {
    console.log('Створюємо локальний клієнт...');
    
    window.supabaseClient = {
        async init() {
            console.log('Локальний клієнт ініціалізовано');
            return false; // Возвращаем false для локального режима
        },
        
        async getTeam(teamId) {
            const data = localStorage.getItem(`team_${teamId}`);
            return data ? JSON.parse(data) : null;
        },
        
        async saveTeam(teamId, teamData) {
            localStorage.setItem(`team_${teamId}`, JSON.stringify(teamData));
            return true;
        }
    };
}

console.log('Конфігурація завантажена');
