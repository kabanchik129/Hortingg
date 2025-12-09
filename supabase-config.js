// supabase-config.js - ПРОСТОЙ ФАЙЛ
console.log('Завантаження конфігурації...');

// Если не хотите использовать Supabase, просто оставьте это
window.SUPABASE_CONFIG = {
    url: 'https://zgumvczkfaracjqvdjzm.supabase.co',  // Замените на реальный URL
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpndW12Y3prZmFyYWNqcXZkanptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY0NjcsImV4cCI6MjA4MDg2MjQ2N30.H8yUfSceeXgrm75ra5ORlj9on8t80Y8APzH4k3OeF1o'                    // Замените на реальный ключ
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
