// supabase-client.js - Упрощенный клиент для работы с Supabase
class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.useLocalStorage = false;
    }
    
    // Инициализация клиента
    async init() {
        console.log('Ініціалізація Supabase клієнта...');
        
        try {
            // 1. Проверяем наличие конфигурации
            if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.key) {
                console.warn('Конфігурація Supabase не знайдена або неповна');
                console.log('⚠️ Використовуємо локальне сховище (localStorage)');
                this.useLocalStorage = true;
                this.initLocalStorage();
                return false;
            }
            
            // 2. Проверяем наличие Supabase SDK
            if (typeof supabase === 'undefined') {
                console.error('Supabase SDK не завантажено!');
                console.log('⚠️ Перевірте підключення скрипта Supabase в index.html');
                console.log('⚠️ Використовуємо локальне сховище');
                this.useLocalStorage = true;
                this.initLocalStorage();
                return false;
            }
            
            // 3. Создаем клиент
            console.log('Створюємо Supabase клієнт...');
            this.client = supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key,
                {
                    auth: {
                        persistSession: false
                    },
                    global: {
                        headers: {
                            'apikey': window.SUPABASE_CONFIG.key
                        }
                    }
                }
            );
            
            // 4. Проверяем соединение простым запросом
            console.log('Перевірка з\'єднання з Supabase...');
            
            // Пробуем получить количество команд (простой запрос)
            const { data, error } = await this.client
                .from('teams')
                .select('id')
                .limit(1)
                .catch(err => {
                    console.warn('Помилка підключення:', err.message);
                    return { data: null, error: err };
                });
            
            if (error) {
                console.warn('Supabase недоступен:', error.message);
                console.log('⚠️ Можливі причини:');
                console.log('1. Немає інтернет-з\'єднання');
                console.log('2. Неправильний URL або ключ');
                console.log('3. Проблеми з CORS (працюєте з GitHub Pages?)');
                console.log('⚠️ Використовуємо локальне сховище');
                this.useLocalStorage = true;
                this.initLocalStorage();
                return false;
            }
            
            // 5. Подключение успешно
            this.isConnected = true;
            console.log('✅ Supabase підключено успішно!');
            
            // 6. Проверяем наличие данных
            await this.checkAndInitializeData();
            
            return true;
            
        } catch (error) {
            console.error('Критична помилка підключення до Supabase:', error);
            this.useLocalStorage = true;
            this.initLocalStorage();
            return false;
        }
    }
    
    // Проверка и инициализация данных
    async checkAndInitializeData() {
        try {
            // Проверяем, есть ли команды в базе
            const { data: teams, error } = await this.client
                .from('teams')
                .select('*')
                .order('id');
            
            if (error) {
                console.error('Помилка перевірки даних:', error);
                return;
            }
            
            // Если команд меньше 6, создаем недостающие
            if (!teams || teams.length < 6) {
                console.log('Створюємо початкові команди...');
                const teamsData = [];
                
                for (let i = 1; i <= 6; i++) {
                    // Проверяем, существует ли уже команда с таким ID
                    const existingTeam = teams?.find(t => t.id === i);
                    
                    if (!existingTeam) {
                        const teamConfig = {
                            1: { name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal" },
                            2: { name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal" },
                            3: { name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal" },
                            4: { name: "4-та команда (старша)", color: "#96CEB4", type: "str" },
                            5: { name: "5-та команда (старша)", color: "#FFEAA7", type: "str" },
                            6: { name: "6-та команда (старша)", color: "#DDA0DD", type: "str" }
                        }[i];
                        
                        teamsData.push({
                            id: i,
                            name: teamConfig.name,
                            color: teamConfig.color,
                            type: teamConfig.type,
                            members: [],
                            notifications: [],
                            tasks: [],
                            absences: []
                        });
                    }
                }
                
                if (teamsData.length > 0) {
                    const { error: insertError } = await this.client
                        .from('teams')
                        .insert(teamsData);
                    
                    if (insertError) {
                        console.error('Помилка створення команд:', insertError);
                    } else {
                        console.log(`✅ Створено ${teamsData.length} команд`);
                    }
                }
            } else {
                console.log(`✅ В базі вже є ${teams.length} команд`);
            }
            
        } catch (error) {
            console.error('Помилка ініціалізації даних:', error);
        }
    }
    
    // Инициализация localStorage
    initLocalStorage() {
        console.log('Ініціалізація локального сховища...');
        
        // Проверяем, есть ли уже данные
        if (!localStorage.getItem('horting_initialized')) {
            console.log('Створюємо початкові дані в localStorage...');
            
            // Создаем пустые команды
            const defaultTeams = {};
            for (let i = 1; i <= 6; i++) {
                const teamConfig = {
                    1: { name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal" },
                    2: { name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal" },
                    3: { name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal" },
                    4: { name: "4-та команда (старша)", color: "#96CEB4", type: "str" },
                    5: { name: "5-та команда (старша)", color: "#FFEAA7", type: "str" },
                    6: { name: "6-та команда (старша)", color: "#DDA0DD", type: "str" }
                }[i];
                
                defaultTeams[i] = {
                    id: i,
                    name: teamConfig.name,
                    color: teamConfig.color,
                    type: teamConfig.type,
                    members: [],
                    notifications: [],
                    tasks: [],
                    absences: []
                };
            }
            
            // Сохраняем команды в localStorage
            for (const teamId in defaultTeams) {
                this.saveLocalData(`team_${teamId}`, defaultTeams[teamId]);
            }
            
            // Создаем пустые коллекции
            this.saveLocalData('global_notifications', []);
            this.saveLocalData('admin_messages', []);
            
            localStorage.setItem('horting_initialized', 'true');
            console.log('✅ Локальне сховище ініціалізовано');
        }
    }
    
    // ==================== ОСНОВНЫЕ МЕТОДЫ ====================
    
    // Получить команду
    async getTeam(teamId) {
        // Если используем localStorage
        if (this.useLocalStorage) {
            return this.getLocalData(`team_${teamId}`);
        }
        
        try {
            const { data, error } = await this.client
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();
            
            if (error) {
                console.warn(`Помилка отримання команди ${teamId}:`, error.message);
                // Возвращаем из localStorage если есть
                return this.getLocalData(`team_${teamId}`);
            }
            
            // Сохраняем в localStorage для кеша
            this.saveLocalData(`team_${teamId}`, data);
            
            return data;
            
        } catch (error) {
            console.error(`Помилка при отриманні команди ${teamId}:`, error);
            return this.getLocalData(`team_${teamId}`);
        }
    }
    
    // Сохранить команду
    async saveTeam(teamId, teamData) {
        // Всегда сохраняем в localStorage (кеш)
        this.saveLocalData(`team_${teamId}`, teamData);
        
        // Если Supabase подключен, сохраняем и туда
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('teams')
                    .upsert(teamData, { onConflict: 'id' });
                
                if (error) {
                    console.error(`Помилка збереження команди ${teamId}:`, error);
                    return false;
                }
                
                console.log(`✅ Команда ${teamId} збережена в Supabase`);
                return true;
                
            } catch (error) {
                console.error(`Помилка збереження команди ${teamId}:`, error);
                return false;
            }
        }
        
        return true;
    }
    
    // Получить все команды
    async getTeams() {
        // Если используем localStorage
        if (this.useLocalStorage) {
            const teams = {};
            for (let i = 1; i <= 6; i++) {
                const team = this.getLocalData(`team_${i}`);
                if (team) teams[i] = team;
            }
            return teams;
        }
        
        try {
            const { data, error } = await this.client
                .from('teams')
                .select('*')
                .order('id');
            
            if (error) {
                console.error('Помилка отримання команд:', error);
                // Возвращаем из localStorage
                const teams = {};
                for (let i = 1; i <= 6; i++) {
                    const team = this.getLocalData(`team_${i}`);
                    if (team) teams[i] = team;
                }
                return teams;
            }
            
            // Сохраняем в localStorage для кеша
            const teamsObj = {};
            data.forEach(team => {
                teamsObj[team.id] = team;
                this.saveLocalData(`team_${team.id}`, team);
            });
            
            return teamsObj;
            
        } catch (error) {
            console.error('Помилка при отриманні всіх команд:', error);
            const teams = {};
            for (let i = 1; i <= 6; i++) {
                const team = this.getLocalData(`team_${i}`);
                if (team) teams[i] = team;
            }
            return teams;
        }
    }
    
    // Глобальные уведомления
    async getGlobalNotifications() {
        if (this.useLocalStorage) {
            return this.getLocalData('global_notifications') || [];
        }
        
        try {
            const { data, error } = await this.client
                .from('global_notifications')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Помилка отримання глобальних сповіщень:', error);
                return this.getLocalData('global_notifications') || [];
            }
            
            // Сохраняем в localStorage для кеша
            this.saveLocalData('global_notifications', data);
            
            return data;
            
        } catch (error) {
            console.error('Помилка при отриманні глобальних сповіщень:', error);
            return this.getLocalData('global_notifications') || [];
        }
    }
    
    async addGlobalNotification(notificationData, author = 'Адміністратор') {
        const newNotification = {
            ...notificationData,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            author: author,
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        // Сохраняем локально
        const localNotifications = this.getLocalData('global_notifications') || [];
        localNotifications.unshift(newNotification);
        this.saveLocalData('global_notifications', localNotifications);
        
        // Сохраняем в Supabase если подключены
        if (!this.useLocalStorage && this.isConnected) {
            try {
                // Убираем временный id для Supabase
                const { id, ...supabaseData } = newNotification;
                
                const { error } = await this.client
                    .from('global_notifications')
                    .insert(supabaseData);
                
                if (error) {
                    console.error('Помилка додавання глобального сповіщення:', error);
                } else {
                    console.log('✅ Глобальне сповіщення додано в Supabase');
                }
                
            } catch (error) {
                console.error('Помилка додавання глобального сповіщення:', error);
            }
        }
        
        return true;
    }
    
    async deleteGlobalNotification(id) {
        // Удаляем локально
        const localNotifications = this.getLocalData('global_notifications') || [];
        const filtered = localNotifications.filter(n => n.id !== id);
        this.saveLocalData('global_notifications', filtered);
        
        // Удаляем из Supabase если подключены
        if (!this.useLocalStorage && this.isConnected) {
            try {
                // Если это наш временный id, пропускаем удаление из Supabase
                if (!id.startsWith('notif_')) {
                    const { error } = await this.client
                        .from('global_notifications')
                        .delete()
                        .eq('id', id);
                    
                    if (error) {
                        console.error('Помилка видалення сповіщення:', error);
                    }
                }
                
            } catch (error) {
                console.error('Помилка видалення сповіщення:', error);
            }
        }
        
        return true;
    }
    
    // Сообщения админу
    async getAdminMessages() {
        if (this.useLocalStorage) {
            return this.getLocalData('admin_messages') || [];
        }
        
        try {
            const { data, error } = await this.client
                .from('admin_messages')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Помилка отримання повідомлень адміну:', error);
                return this.getLocalData('admin_messages') || [];
            }
            
            // Сохраняем в localStorage для кеша
            this.saveLocalData('admin_messages', data);
            
            return data;
            
        } catch (error) {
            console.error('Помилка при отриманні повідомлень адміну:', error);
            return this.getLocalData('admin_messages') || [];
        }
    }
    
    async addAdminMessage(message, fromTeam) {
        const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: message,
            fromTeam: fromTeam,
            from_team: fromTeam,
            read: false,
            is_read: false,
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        // Сохраняем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        localMessages.unshift(newMessage);
        this.saveLocalData('admin_messages', localMessages);
        
        // Сохраняем в Supabase если подключены
        if (!this.useLocalStorage && this.isConnected) {
            try {
                // Убираем временный id и лишние поля для Supabase
                const { id, fromTeam, read, date, ...supabaseData } = newMessage;
                
                const { error } = await this.client
                    .from('admin_messages')
                    .insert(supabaseData);
                
                if (error) {
                    console.error('Помилка додавання повідомлення адміну:', error);
                } else {
                    console.log('✅ Повідомлення адміну додано в Supabase');
                }
                
            } catch (error) {
                console.error('Помилка додавання повідомлення адміну:', error);
            }
        }
        
        return true;
    }
    
    async markMessageAsRead(id) {
        // Обновляем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        const messageIndex = localMessages.findIndex(m => m.id === id);
        if (messageIndex !== -1) {
            localMessages[messageIndex].read = true;
            localMessages[messageIndex].is_read = true;
            this.saveLocalData('admin_messages', localMessages);
        }
        
        // Обновляем в Supabase если подключены и это не наш временный id
        if (!this.useLocalStorage && this.isConnected && !id.startsWith('msg_')) {
            try {
                const { error } = await this.client
                    .from('admin_messages')
                    .update({ is_read: true })
                    .eq('id', id);
                
                if (error) {
                    console.error('Помилка оновлення повідомлення:', error);
                }
                
            } catch (error) {
                console.error('Помилка оновлення повідомлення:', error);
            }
        }
        
        return true;
    }
    
    async markAllMessagesAsRead() {
        // Обновляем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        localMessages.forEach(m => {
            m.read = true;
            m.is_read = true;
        });
        this.saveLocalData('admin_messages', localMessages);
        
        // Обновляем в Supabase если подключены
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('admin_messages')
                    .update({ is_read: true })
                    .eq('is_read', false);
                
                if (error) {
                    console.error('Помилка оновлення всіх повідомлень:', error);
                }
                
            } catch (error) {
                console.error('Помилка оновлення всіх повідомлень:', error);
            }
        }
        
        return true;
    }
    
    async deleteAdminMessage(id) {
        // Удаляем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        const filtered = localMessages.filter(m => m.id !== id);
        this.saveLocalData('admin_messages', filtered);
        
        // Удаляем из Supabase если подключены и это не наш временный id
        if (!this.useLocalStorage && this.isConnected && !id.startsWith('msg_')) {
            try {
                const { error } = await this.client
                    .from('admin_messages')
                    .delete()
                    .eq('id', id);
                
                if (error) {
                    console.error('Помилка видалення повідомлення:', error);
                }
                
            } catch (error) {
                console.error('Помилка видалення повідомлення:', error);
            }
        }
        
        return true;
    }
    
    async getUnreadCount() {
        const messages = await this.getAdminMessages();
        return messages.filter(m => !m.read && !m.is_read).length;
    }
    
    // ==================== ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ====================
    
    getLocalData(key) {
        try {
            const data = localStorage.getItem(`horting_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Помилка читання ${key} з localStorage:`, error);
            return null;
        }
    }
    
    saveLocalData(key, data) {
        try {
            localStorage.setItem(`horting_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error(`Помилка збереження ${key} в localStorage:`, error);
        }
    }
}

// Создаем и экспортируем глобальный клиент
const supabaseClient = new SupabaseClient();
window.supabaseClient = supabaseClient;

console.log('Supabase клієнт готовий до використання');
