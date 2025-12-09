// supabase-client.js - Полный клиент для работы с Supabase

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.useLocalStorage = false;
        this.connectionAttempts = 0;
    }
    
    // Инициализация клиента
    async init() {
        console.log('Ініціалізація Supabase клієнта...');
        
        try {
            // 1. Проверяем наличие конфигурации
            if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.key) {
                console.warn('Конфігурація Supabase не знайдена або неповна');
                console.log('Використовуємо локальне сховище (localStorage)');
                this.useLocalStorage = true;
                this.initLocalStorage();
                return false;
            }
            
            // 2. Проверяем наличие Supabase SDK
            if (typeof supabase === 'undefined') {
                console.error('Supabase SDK не завантажено!');
                console.log('Перевірте підключення скрипта Supabase в index.html');
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
                        persistSession: true,
                        autoRefreshToken: true
                    }
                }
            );
            
            // 4. Проверяем соединение (пробуем получить версию)
            console.log('Перевірка з\'єднання з Supabase...');
            const { data, error } = await this.client.from('teams').select('count').limit(1);
            
            if (error) {
                console.warn('Supabase недоступен:', error.message);
                console.log('Спробуємо працювати з локальним сховищем');
                this.useLocalStorage = true;
                this.initLocalStorage();
                return false;
            }
            
            // 5. Подключение успешно
            this.isConnected = true;
            this.connectionAttempts = 0;
            console.log('✅ Supabase підключено успішно!');
            
            // 6. Инициализируем данные
            await this.initializeDefaultData();
            
            // 7. Синхронизируем локальные данные
            await this.syncLocalData();
            
            return true;
            
        } catch (error) {
            console.error('Критична помилка підключення до Supabase:', error);
            this.useLocalStorage = true;
            this.initLocalStorage();
            return false;
        }
    }
    
    // Инициализация данных по умолчанию
    async initializeDefaultData() {
        try {
            console.log('Перевірка наявності початкових даних...');
            
            // Проверяем, есть ли команды
            const { data: teams, error } = await this.client.from('teams').select('*');
            
            if (error) throw error;
            
            // Если команд нет, создаем их
            if (!teams || teams.length === 0) {
                console.log('Створюємо початкові дані в Supabase...');
                
                const teamsData = [
                    { id: 1, name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal" },
                    { id: 2, name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal" },
                    { id: 3, name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal" },
                    { id: 4, name: "4-та команда (старша)", color: "#96CEB4", type: "str" },
                    { id: 5, name: "5-та команда (старша)", color: "#FFEAA7", type: "str" },
                    { id: 6, name: "6-та команда (старша)", color: "#DDA0DD", type: "str" }
                ];
                
                // Вставляем все команды одной операцией
                const { error: insertError } = await this.client
                    .from('teams')
                    .insert(teamsData);
                    
                if (insertError) throw insertError;
                
                console.log('✅ Створено 6 команд в Supabase');
                
                // Создаем тестовые данные для первой команды
                await this.client
                    .from('teams')
                    .update({
                        members: [
                            { id: '1', name: 'Петро Коваль', callSign: 'Командир', rank: 'Старшина', role: 'command' },
                            { id: '2', name: 'Іван Сидоренко', callSign: 'Заступник', rank: 'Сержант', role: 'deputy' },
                            { id: '3', name: 'Олексій Мельник', callSign: 'Сокіл', rank: 'Рядовий', role: 'soldier' }
                        ],
                        notifications: [
                            { 
                                id: '1', 
                                title: 'Ласкаво просимо!', 
                                message: 'Вітаємо в команді 1. Перше заняття завтра о 16:00.', 
                                date: new Date().toISOString(), 
                                author: 'Командир' 
                            }
                        ],
                        tasks: [],
                        absences: []
                    })
                    .eq('id', 1);
                
                // Создаем глобальное уведомление
                await this.client.from('global_notifications').insert({
                    title: 'Вітання з початком навчання!',
                    message: 'Ласкаво просимо до гуртка "Хортинг". Бажаємо успіхів у навчанні! Заняття: понеділок, середа (16:00-19:00), субота (12:00-16:00)',
                    author: 'Адміністратор'
                });
                
                console.log('✅ Початкові дані створено успішно');
            } else {
                console.log(`✅ В Supabase вже є ${teams.length} команд`);
            }
            
        } catch (error) {
            console.error('Помилка створення початкових даних:', error);
        }
    }
    
    // Инициализация localStorage
    initLocalStorage() {
        console.log('Ініціалізація локального сховища...');
        
        // Проверяем, есть ли уже данные
        if (!localStorage.getItem('supabase_initialized')) {
            console.log('Створюємо початкові дані в localStorage...');
            
            const defaultTeams = {
                1: {
                    id: 1,
                    name: "1-ша команда (молодша)",
                    color: "#FF6B6B",
                    type: "mal",
                    members: [
                        { id: '1', name: 'Петро Коваль', callSign: 'Командир', rank: 'Старшина', role: 'command' },
                        { id: '2', name: 'Іван Сидоренко', callSign: 'Заступник', rank: 'Сержант', role: 'deputy' },
                        { id: '3', name: 'Олексій Мельник', callSign: 'Сокіл', rank: 'Рядовий', role: 'soldier' }
                    ],
                    notifications: [
                        { 
                            id: '1', 
                            title: 'Ласкаво просимо!', 
                            message: 'Вітаємо в команді 1. Перше заняття завтра о 16:00.', 
                            date: new Date().toISOString(), 
                            author: 'Командир' 
                        }
                    ],
                    tasks: [],
                    absences: []
                },
                2: { id: 2, name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal", members: [], notifications: [], tasks: [], absences: [] },
                3: { id: 3, name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal", members: [], notifications: [], tasks: [], absences: [] },
                4: { id: 4, name: "4-та команда (старша)", color: "#96CEB4", type: "str", members: [], notifications: [], tasks: [], absences: [] },
                5: { id: 5, name: "5-та команда (старша)", color: "#FFEAA7", type: "str", members: [], notifications: [], tasks: [], absences: [] },
                6: { id: 6, name: "6-та команда (старша)", color: "#DDA0DD", type: "str", members: [], notifications: [], tasks: [], absences: [] }
            };
            
            // Сохраняем команды
            Object.keys(defaultTeams).forEach(teamId => {
                this.saveLocalData(`team_${teamId}`, defaultTeams[teamId]);
            });
            
            // Глобальные уведомления
            this.saveLocalData('global_notifications', [
                {
                    id: '1',
                    title: 'Вітання з початком навчання!',
                    message: 'Ласкаво просимо до гуртка "Хортинг". Бажаємо успіхів у навчанні!',
                    date: new Date().toISOString(),
                    author: 'Адміністратор'
                }
            ]);
            
            // Сообщения админу
            this.saveLocalData('admin_messages', []);
            
            localStorage.setItem('supabase_initialized', 'true');
            console.log('✅ Локальне сховище ініціалізовано');
        }
    }
    
    // ==================== ОСНОВНЫЕ МЕТОДЫ ====================
    
    // Получить команду
    async getTeam(teamId) {
        // Если используем localStorage
        if (this.useLocalStorage) {
            const team = this.getLocalData(`team_${teamId}`);
            return team || null;
        }
        
        // Пытаемся получить из Supabase
        try {
            const { data, error } = await this.client
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();
                
            if (error) {
                // Если ошибка, пробуем получить из localStorage
                const localTeam = this.getLocalData(`team_${teamId}`);
                if (localTeam) {
                    console.log(`Використовуємо локальні дані для команди ${teamId}`);
                    return localTeam;
                }
                throw error;
            }
            
            // Сохраняем в localStorage для быстрого доступа
            this.saveLocalData(`team_${teamId}`, data);
            
            return data;
            
        } catch (error) {
            console.error(`Помилка отримання команди ${teamId}:`, error.message);
            return this.getLocalData(`team_${teamId}`) || null;
        }
    }
    
    // Сохранить команду
    async saveTeam(teamId, teamData) {
        // Всегда сохраняем в localStorage (кеш)
        this.saveLocalData(`team_${teamId}`, teamData);
        
        // Если Supabase подключен, сохраняем и туда
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const dataToSave = {
                    ...teamData,
                    id: teamId,
                    updated_at: new Date().toISOString()
                };
                
                const { error } = await this.client
                    .from('teams')
                    .upsert(dataToSave, { onConflict: 'id' });
                    
                if (error) throw error;
                
                console.log(`✅ Команда ${teamId} збережена в Supabase`);
                return true;
                
            } catch (error) {
                console.error(`Помилка збереження команди ${teamId} в Supabase:`, error.message);
                
                // Если ошибка сети, переключаемся на localStorage
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    this.useLocalStorage = true;
                    console.log('Перемикаємось на локальний режим');
                }
                
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
        
        // Пытаемся получить из Supabase
        try {
            const { data, error } = await this.client
                .from('teams')
                .select('*')
                .order('id');
                
            if (error) throw error;
            
            // Сохраняем в localStorage для быстрого доступа
            data.forEach(team => {
                this.saveLocalData(`team_${team.id}`, team);
            });
            
            // Конвертируем в объект
            const teamsObj = {};
            data.forEach(team => {
                teamsObj[team.id] = team;
            });
            
            return teamsObj;
            
        } catch (error) {
            console.error('Помилка отримання всіх команд:', error.message);
            
            // Возвращаем из localStorage
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
                
            if (error) throw error;
            
            // Сохраняем в localStorage
            this.saveLocalData('global_notifications', data);
            
            return data;
            
        } catch (error) {
            console.error('Помилка отримання глобальних сповіщень:', error.message);
            return this.getLocalData('global_notifications') || [];
        }
    }
    
    async addGlobalNotification(notificationData, author = 'Адміністратор') {
        const newNotification = {
            ...notificationData,
            author: author,
            created_at: new Date().toISOString()
        };
        
        // Сохраняем локально
        const localNotifications = this.getLocalData('global_notifications') || [];
        localNotifications.unshift(newNotification); // Добавляем в начало
        this.saveLocalData('global_notifications', localNotifications);
        
        // Сохраняем в Supabase
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('global_notifications')
                    .insert(newNotification);
                    
                if (error) throw error;
                
                console.log('✅ Глобальне сповіщення додано в Supabase');
                return true;
                
            } catch (error) {
                console.error('Помилка додавання глобального сповіщення:', error.message);
                return false;
            }
        }
        
        return true;
    }
    
    async deleteGlobalNotification(id) {
        // Удаляем локально
        const localNotifications = this.getLocalData('global_notifications') || [];
        const filtered = localNotifications.filter(n => n.id !== id);
        this.saveLocalData('global_notifications', filtered);
        
        // Удаляем из Supabase
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('global_notifications')
                    .delete()
                    .eq('id', id);
                    
                if (error) throw error;
                
                console.log(`✅ Сповіщення ${id} видалено з Supabase`);
                return true;
                
            } catch (error) {
                console.error('Помилка видалення сповіщення:', error.message);
                return false;
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
                
            if (error) throw error;
            
            // Сохраняем в localStorage
            this.saveLocalData('admin_messages', data);
            
            return data;
            
        } catch (error) {
            console.error('Помилка отримання повідомлень адміну:', error.message);
            return this.getLocalData('admin_messages') || [];
        }
    }
    
    async addAdminMessage(message, fromTeam) {
        const newMessage = {
            message: message,
            from_team: fromTeam,
            is_read: false,
            created_at: new Date().toISOString()
        };
        
        // Сохраняем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        localMessages.unshift(newMessage);
        this.saveLocalData('admin_messages', localMessages);
        
        // Сохраняем в Supabase
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('admin_messages')
                    .insert(newMessage);
                    
                if (error) throw error;
                
                console.log('✅ Повідомлення адміну додано в Supabase');
                return true;
                
            } catch (error) {
                console.error('Помилка додавання повідомлення адміну:', error.message);
                return false;
            }
        }
        
        return true;
    }
    
    async markMessageAsRead(id) {
        // Обновляем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        const messageIndex = localMessages.findIndex(m => m.id === id);
        if (messageIndex !== -1) {
            localMessages[messageIndex].is_read = true;
            this.saveLocalData('admin_messages', localMessages);
        }
        
        // Обновляем в Supabase
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('admin_messages')
                    .update({ is_read: true })
                    .eq('id', id);
                    
                if (error) throw error;
                
                console.log(`✅ Повідомлення ${id} позначено як прочитане`);
                return true;
                
            } catch (error) {
                console.error('Помилка оновлення повідомлення:', error.message);
                return false;
            }
        }
        
        return true;
    }
    
    async markAllMessagesAsRead() {
        // Обновляем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        localMessages.forEach(m => m.is_read = true);
        this.saveLocalData('admin_messages', localMessages);
        
        // Обновляем в Supabase
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('admin_messages')
                    .update({ is_read: true })
                    .eq('is_read', false);
                    
                if (error) throw error;
                
                console.log('✅ Всі повідомлення позначено як прочитані');
                return true;
                
            } catch (error) {
                console.error('Помилка оновлення всіх повідомлень:', error.message);
                return false;
            }
        }
        
        return true;
    }
    
    async deleteAdminMessage(id) {
        // Удаляем локально
        const localMessages = this.getLocalData('admin_messages') || [];
        const filtered = localMessages.filter(m => m.id !== id);
        this.saveLocalData('admin_messages', filtered);
        
        // Удаляем из Supabase
        if (!this.useLocalStorage && this.isConnected) {
            try {
                const { error } = await this.client
                    .from('admin_messages')
                    .delete()
                    .eq('id', id);
                    
                if (error) throw error;
                
                console.log(`✅ Повідомлення ${id} видалено з Supabase`);
                return true;
                
            } catch (error) {
                console.error('Помилка видалення повідомлення:', error.message);
                return false;
            }
        }
        
        return true;
    }
    
    async getUnreadCount() {
        const messages = await this.getAdminMessages();
        return messages.filter(m => !m.is_read).length;
    }
    
    // Синхронизация локальных данных с Supabase
    async syncLocalData() {
        if (this.useLocalStorage || !this.isConnected) return;
        
        console.log('Синхронізація локальних даних з Supabase...');
        
        try {
            // Синхронизируем команды
            for (let i = 1; i <= 6; i++) {
                const localTeam = this.getLocalData(`team_${i}`);
                if (localTeam) {
                    await this.saveTeam(i, localTeam);
                }
            }
            
            console.log('✅ Локальні дані синхронізовано');
            
        } catch (error) {
            console.error('Помилка синхронізації:', error.message);
        }
    }
    
    // ==================== ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ====================
    
    getLocalData(key) {
        const data = localStorage.getItem(`supabase_${key}`);
        return data ? JSON.parse(data) : null;
    }
    
    saveLocalData(key, data) {
        localStorage.setItem(`supabase_${key}`, JSON.stringify(data));
    }
    
    // Экспорт всех данных
    exportAllData() {
        const data = {
            teams: {},
            globalNotifications: this.getLocalData('global_notifications') || [],
            adminMessages: this.getLocalData('admin_messages') || [],
            timestamp: new Date().toISOString()
        };
        
        for (let i = 1; i <= 6; i++) {
            const team = this.getLocalData(`team_${i}`);
            if (team) data.teams[i] = team;
        }
        
        return data;
    }
    
    // Импорт данных
    importAllData(data) {
        try {
            // Импортируем команды
            Object.keys(data.teams || {}).forEach(teamId => {
                this.saveLocalData(`team_${teamId}`, data.teams[teamId]);
            });
            
            // Импортируем уведомления
            if (data.globalNotifications) {
                this.saveLocalData('global_notifications', data.globalNotifications);
            }
            
            // Импортируем сообщения
            if (data.adminMessages) {
                this.saveLocalData('admin_messages', data.adminMessages);
            }
            
            console.log('✅ Дані успішно імпортовано');
            return true;
            
        } catch (error) {
            console.error('Помилка імпорту даних:', error);
            return false;
        }
    }
}

// Создаем и экспортируем глобальный клиент
const supabaseClient = new SupabaseClient();
window.supabaseClient = supabaseClient;

console.log('Supabase клієнт готовий до використання');
