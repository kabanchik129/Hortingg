// telegram-horting-storage.js
class TelegramHortingStorage {
    constructor() {
        this.botToken = '7672651709:AAGmYUj6Z8ifamx69EfKbbOJ8dCjNYPIO9s'; // Получите у @BotFather
        this.chatId = '1044367167'; // Ваш ID чата с ботом
        this.storagePrefix = 'HORTING_'; // Префикс для ключей
        this.isConnected = false;
        this.useLocalStorage = true;
        this.messageHistory = [];
        this.maxMessageLength = 4000; // Лимит Telegram
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    
    async init() {
        console.log("🚀 Ініціалізація Horting Telegram Storage...");
        
        // Проверяем наличие токена
        if (!this.botToken || this.botToken === '7672651709:AAGmYUj6Z8ifamx69EfKbbOJ8dCjNYPIO9s') {
            console.warn("⚠️ Токен бота не налаштовано");
            return this.enableLocalStorage();
        }
        
        // Проверяем подключение к Telegram API
        const connected = await this.testConnection();
        
        if (connected) {
            console.log("✅ Telegram Storage підключено");
            this.isConnected = true;
            
            // Загружаем историю сообщений
            await this.loadMessageHistory();
            
            // Инициализируем данные если нужно
            await this.initializeDefaultData();
            
        } else {
            console.warn("⚠️ Telegram недоступен — використовуємо localStorage");
            this.enableLocalStorage();
        }
        
        return this.isConnected;
    }
    
    async testConnection() {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/getMe`
            );
            const data = await response.json();
            return data.ok === true;
        } catch (error) {
            console.warn("Помилка підключення до Telegram:", error);
            return false;
        }
    }

    // ==================== СОХРАНЕНИЕ КОМАНД ====================
    
    async saveTeam(teamId, teamData) {
        const key = `TEAM_${teamId}`;
        const dataToSave = {
            id: teamId,
            ...teamData,
            lastUpdated: new Date().toISOString(),
            _version: (teamData._version || 0) + 1
        };
        
        // Сохраняем локально для скорости
        this.saveToLocalStorage(key, dataToSave);
        
        // Сохраняем в Telegram для синхронизации
        if (this.isConnected) {
            await this.saveToTelegram(key, dataToSave);
        }
        
        // Отправляем уведомление об изменении
        await this.sendNotification(
            `🔄 Оновлено команду: ${teamData.name || `Команда ${teamId}`}`,
            'team'
        );
        
        return true;
    }
    
    async getTeam(teamId) {
        const key = `TEAM_${teamId}`;
        
        // 1. Пробуем получить из кеша (память)
        if (this.messageHistory[key]) {
            return this.messageHistory[key];
        }
        
        // 2. Пробуем получить из Telegram
        if (this.isConnected) {
            const telegramData = await this.loadFromTelegram(key);
            if (telegramData) {
                this.saveToLocalStorage(key, telegramData);
                this.messageHistory[key] = telegramData;
                return telegramData;
            }
        }
        
        // 3. Пробуем получить из localStorage
        const localData = this.getFromLocalStorage(key);
        if (localData) {
            this.messageHistory[key] = localData;
            return localData;
        }
        
        // 4. Возвращаем дефолтную команду если ничего нет
        return this.getDefaultTeam(teamId);
    }
    
    async getAllTeams() {
        const teams = {};
        
        for (let i = 1; i <= 6; i++) {
            teams[i] = await this.getTeam(i);
        }
        
        return teams;
    }
    
    // ==================== УПРАВЛЕНИЕ ЧЛЕНАМИ КОМАНД ====================
    
    async addTeamMember(teamId, memberData) {
        const team = await this.getTeam(teamId);
        
        if (!team.members) {
            team.members = [];
        }
        
        // Проверяем, нет ли уже такого участника
        const existingIndex = team.members.findIndex(m => 
            m.id === memberData.id || m.name === memberData.name
        );
        
        if (existingIndex >= 0) {
            // Обновляем существующего
            team.members[existingIndex] = {
                ...team.members[existingIndex],
                ...memberData,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Добавляем нового
            team.members.push({
                ...memberData,
                id: memberData.id || `member_${Date.now()}`,
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // Сохраняем команду
        await this.saveTeam(teamId, team);
        
        await this.sendNotification(
            `👤 ${memberData.name || 'Новий учасник'} доданий до команди ${team.name}`,
            'success'
        );
        
        return true;
    }
    
    async removeTeamMember(teamId, memberId) {
        const team = await this.getTeam(teamId);
        
        if (team.members) {
            const memberIndex = team.members.findIndex(m => m.id === memberId);
            
            if (memberIndex >= 0) {
                const removedMember = team.members[memberIndex];
                team.members.splice(memberIndex, 1);
                
                await this.saveTeam(teamId, team);
                
                await this.sendNotification(
                    `❌ ${removedMember.name || 'Учасник'} видалений з команди ${team.name}`,
                    'warning'
                );
                
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== ЗАДАЧИ ====================
    
    async addTeamTask(teamId, taskData) {
        const team = await this.getTeam(teamId);
        
        if (!team.tasks) {
            team.tasks = [];
        }
        
        const task = {
            id: `task_${Date.now()}`,
            ...taskData,
            teamId: teamId,
            createdAt: new Date().toISOString(),
            status: 'active',
            completed: false
        };
        
        team.tasks.push(task);
        
        await this.saveTeam(teamId, team);
        
        // Сохраняем задачу отдельно для глобального доступа
        await this.saveToTelegram(`TASK_${task.id}`, task);
        
        await this.sendNotification(
            `📋 Нова задача: "${taskData.title}" для команди ${team.name}`,
            'task'
        );
        
        return task.id;
    }
    
    async completeTeamTask(teamId, taskId) {
        const team = await this.getTeam(teamId);
        
        if (team.tasks) {
            const taskIndex = team.tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex >= 0) {
                team.tasks[taskIndex].completed = true;
                team.tasks[taskIndex].completedAt = new Date().toISOString();
                team.tasks[taskIndex].status = 'completed';
                
                await this.saveTeam(teamId, team);
                
                await this.sendNotification(
                    `✅ Завершено задачу: "${team.tasks[taskIndex].title}" в команді ${team.name}`,
                    'success'
                );
                
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== ОТСУТСТВИЯ (ABSENCES) ====================
    
    async addAbsence(teamId, absenceData) {
        const team = await this.getTeam(teamId);
        
        if (!team.absences) {
            team.absences = [];
        }
        
        const absence = {
            id: `absence_${Date.now()}`,
            ...absenceData,
            teamId: teamId,
            reportedAt: new Date().toISOString(),
            status: 'active'
        };
        
        team.absences.push(absence);
        
        await this.saveTeam(teamId, team);
        
        await this.sendNotification(
            `🏥 Відсутність: ${absenceData.memberName || 'Учасник'} в команді ${team.name} з ${absenceData.startDate} по ${absenceData.endDate || 'не визначено'}`,
            'warning'
        );
        
        return absence.id;
    }
    
    // ==================== ГЛОБАЛЬНЫЕ УВЕДОМЛЕНИЯ ====================
    
    async addGlobalNotification(notificationData) {
        const key = `GLOBAL_NOTIFICATION_${Date.now()}`;
        
        const notification = {
            id: key,
            ...notificationData,
            createdAt: new Date().toISOString(),
            readBy: []
        };
        
        // Сохраняем локально
        const notifications = this.getFromLocalStorage('GLOBAL_NOTIFICATIONS') || [];
        notifications.push(notification);
        this.saveToLocalStorage('GLOBAL_NOTIFICATIONS', notifications);
        
        // Сохраняем в Telegram
        if (this.isConnected) {
            await this.saveToTelegram(key, notification);
        }
        
        // Отправляем уведомление всем админам
        await this.sendNotification(
            `📢 ${notificationData.author || 'Адміністратор'}: ${notificationData.title || 'Нове сповіщення'}`,
            'info'
        );
        
        return notification.id;
    }
    
    async getGlobalNotifications() {
        const key = 'GLOBAL_NOTIFICATIONS';
        
        // Пробуем Telegram
        if (this.isConnected) {
            // Загружаем последние 20 уведомлений
            const updates = await this.loadAllFromTelegram('GLOBAL_NOTIFICATION_');
            if (updates.length > 0) {
                this.saveToLocalStorage(key, updates);
                return updates;
            }
        }
        
        // Используем localStorage
        return this.getFromLocalStorage(key) || [];
    }
    
    // ==================== СООБЩЕНИЯ АДМИНИСТРАТОРАМ ====================
    
    async addAdminMessage(messageData, fromTeamId) {
        const key = `ADMIN_MESSAGE_${Date.now()}`;
        
        const team = await this.getTeam(fromTeamId);
        
        const message = {
            id: key,
            ...messageData,
            fromTeamId: fromTeamId,
            fromTeamName: team.name,
            createdAt: new Date().toISOString(),
            isRead: false,
            readAt: null
        };
        
        // Сохраняем локально
        const messages = this.getFromLocalStorage('ADMIN_MESSAGES') || [];
        messages.push(message);
        this.saveToLocalStorage('ADMIN_MESSAGES', messages);
        
        // Сохраняем в Telegram
        if (this.isConnected) {
            await this.saveToTelegram(key, message);
            
            // Отправляем уведомление админам
            await this.sendNotification(
                `📩 НОВЕ ПОВІДОМЛЕННЯ\nВід: ${team.name}\nТекст: ${messageData.message.substring(0, 100)}...`,
                'info'
            );
        }
        
        return message.id;
    }
    
    async getAdminMessages(unreadOnly = false) {
        const messages = this.getFromLocalStorage('ADMIN_MESSAGES') || [];
        
        if (unreadOnly) {
            return messages.filter(m => !m.isRead);
        }
        
        return messages;
    }
    
    async markMessageAsRead(messageId) {
        const messages = this.getFromLocalStorage('ADMIN_MESSAGES') || [];
        const messageIndex = messages.findIndex(m => m.id === messageId);
        
        if (messageIndex >= 0) {
            messages[messageIndex].isRead = true;
            messages[messageIndex].readAt = new Date().toISOString();
            this.saveToLocalStorage('ADMIN_MESSAGES', messages);
            
            // Обновляем в Telegram если есть
            if (this.isConnected && !messageId.startsWith('ADMIN_MESSAGE_')) {
                await this.saveToTelegram(messageId, messages[messageIndex]);
            }
            
            return true;
        }
        
        return false;
    }
    
    // ==================== TELEGRAM API МЕТОДЫ ====================
    
    async saveToTelegram(key, data) {
        try {
            const messageText = this.createDataMessage(key, data);
            
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chatId,
                        text: messageText,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    })
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                this.messageHistory[key] = {
                    data: data,
                    messageId: result.result.message_id,
                    timestamp: new Date().toISOString()
                };
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn("Помилка збереження в Telegram:", error);
            return false;
        }
    }
    
    async loadFromTelegram(key) {
        try {
            // Получаем последние 100 сообщений
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=100`
            );
            
            const result = await response.json();
            
            if (result.ok && result.result) {
                // Ищем последнее сообщение с нашим ключом
                const messages = result.result
                    .map(update => update.message)
                    .filter(msg => msg && msg.text)
                    .reverse();
                
                for (const msg of messages) {
                    if (msg.text.includes(`🔐 KEY: ${key}`)) {
                        const dataMatch = msg.text.match(/📊 DATA: (.+)/s);
                        if (dataMatch) {
                            try {
                                return JSON.parse(dataMatch[1]);
                            } catch (e) {
                                console.warn("Помилка парсингу даних:", e);
                            }
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.warn("Помилка завантаження з Telegram:", error);
            return null;
        }
    }
    
    async loadAllFromTelegram(prefix = '') {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=100`
            );
            
            const result = await response.json();
            const allData = [];
            
            if (result.ok && result.result) {
                const messages = result.result
                    .map(update => update.message)
                    .filter(msg => msg && msg.text);
                
                for (const msg of messages) {
                    if (msg.text.includes('🔐 KEY: ') && 
                        (prefix === '' || msg.text.includes(`KEY: ${prefix}`))) {
                        
                        const keyMatch = msg.text.match(/🔐 KEY: ([^\n]+)/);
                        const dataMatch = msg.text.match(/📊 DATA: (.+)/s);
                        
                        if (keyMatch && dataMatch) {
                            try {
                                allData.push({
                                    key: keyMatch[1],
                                    data: JSON.parse(dataMatch[1]),
                                    timestamp: new Date(msg.date * 1000).toISOString()
                                });
                            } catch (e) {
                                console.warn("Помилка парсингу:", e);
                            }
                        }
                    }
                }
            }
            
            return allData;
        } catch (error) {
            console.warn("Помилка завантаження:", error);
            return [];
        }
    }
    
    // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================
    
    createDataMessage(key, data) {
        const timestamp = new Date().toLocaleString('uk-UA');
        const dataStr = JSON.stringify(data, null, 2);
        
        return `💾 <b>HORTING DATA STORAGE</b>
🔐 <b>KEY:</b> ${key}
⏰ <b>TIME:</b> ${timestamp}
📊 <b>DATA:</b>
<pre>${dataStr}</pre>
🔒 <b>END OF DATA</b>`;
    }
    
    async sendNotification(text, type = 'info') {
        const emojis = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'team': '👥',
            'task': '📋',
            'absence': '🏥',
            'notification': '📢',
            'message': '📩'
        };
        
        const emoji = emojis[type] || '📌';
        const message = `${emoji} <b>HORTING:</b> ${text}\n⏰ ${new Date().toLocaleString('uk-UA')}`;
        
        if (this.isConnected) {
            try {
                await fetch(
                    `https://api.telegram.org/bot${this.botToken}/sendMessage`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: this.chatId,
                            text: message,
                            parse_mode: 'HTML'
                        })
                    }
                );
            } catch (error) {
                console.warn("Помилка відправки сповіщення:", error);
            }
        }
        
        console.log("Notification:", text);
        return true;
    }
    
    async loadMessageHistory() {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=50`
            );
            
            const result = await response.json();
            
            if (result.ok && result.result) {
                result.result.forEach(update => {
                    if (update.message && update.message.text) {
                        const text = update.message.text;
                        if (text.includes('🔐 KEY: ')) {
                            const keyMatch = text.match(/🔐 KEY: ([^\n]+)/);
                            if (keyMatch) {
                                this.messageHistory[keyMatch[1]] = {
                                    messageId: update.message.message_id,
                                    date: new Date(update.message.date * 1000)
                                };
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.warn("Помилка завантаження історії:", error);
        }
    }
    
    // ==================== LOCAL STORAGE МЕТОДЫ ====================
    
    enableLocalStorage() {
        this.useLocalStorage = true;
        this.isConnected = false;
        this.initLocalStorage();
        console.log("📦 Використовується локальне сховище");
        return false;
    }
    
    initLocalStorage() {
        if (localStorage.getItem('horting_telegram_initialized')) return;
        
        console.log("🛠 Ініціалізація локального сховища...");
        
        // Создаем базовые команды
        for (let i = 1; i <= 6; i++) {
            this.saveToLocalStorage(`TEAM_${i}`, this.getDefaultTeam(i));
        }
        
        // Инициализируем другие коллекции
        this.saveToLocalStorage('GLOBAL_NOTIFICATIONS', []);
        this.saveToLocalStorage('ADMIN_MESSAGES', []);
        
        localStorage.setItem('horting_telegram_initialized', 'true');
        console.log("✅ Локальне сховище готове");
    }
    
    saveToLocalStorage(key, value) {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(value));
        } catch (error) {
            console.warn("Помилка збереження в localStorage:", error);
        }
    }
    
    getFromLocalStorage(key) {
        try {
            const item = localStorage.getItem(this.storagePrefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.warn("Помилка читання з localStorage:", error);
            return null;
        }
    }
    
    removeFromLocalStorage(key) {
        localStorage.removeItem(this.storagePrefix + key);
    }
    
    // ==================== ДЕФОЛТНЫЕ ДАННЫЕ ====================
    
    getDefaultTeam(id) {
        const teams = {
            1: { id: 1, name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal", members: [], tasks: [], absences: [], notifications: [] },
            2: { id: 2, name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal", members: [], tasks: [], absences: [], notifications: [] },
            3: { id: 3, name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal", members: [], tasks: [], absences: [], notifications: [] },
            4: { id: 4, name: "4-та команда (старша)", color: "#96CEB4", type: "str", members: [], tasks: [], absences: [], notifications: [] },
            5: { id: 5, name: "5-та команда (старша)", color: "#FFEAA7", type: "str", members: [], tasks: [], absences: [], notifications: [] },
            6: { id: 6, name: "6-та команда (старша)", color: "#DDA0DD", type: "str", members: [], tasks: [], absences: [], notifications: [] }
        };
        
        return teams[id] || {
            id: id,
            name: `Команда ${id}`,
            color: "#CCCCCC",
            type: "unknown",
            members: [],
            tasks: [],
            absences: [],
            notifications: []
        };
    }
    
    async initializeDefaultData() {
        // Проверяем, есть ли данные о командах
        let needsInitialization = false;
        
        for (let i = 1; i <= 6; i++) {
            const team = await this.getTeam(i);
            if (!team.name || team.name === `Команда ${i}`) {
                needsInitialization = true;
                break;
            }
        }
        
        if (needsInitialization && this.isConnected) {
            console.log("🛠 Створюємо стартові дані в Telegram...");
            
            for (let i = 1; i <= 6; i++) {
                const defaultTeam = this.getDefaultTeam(i);
                await this.saveTeam(i, defaultTeam);
            }
            
            await this.sendNotification("🚀 Систему ініціалізовано з базовими даними", 'success');
        }
    }
    
    // ==================== ЭКСПОРТ/ИМПОРТ ====================
    
    async exportAllData() {
        const allData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            teams: {},
            notifications: this.getFromLocalStorage('GLOBAL_NOTIFICATIONS') || [],
            messages: this.getFromLocalStorage('ADMIN_MESSAGES') || []
        };
        
        // Собираем данные команд
        for (let i = 1; i <= 6; i++) {
            allData.teams[i] = await this.getTeam(i);
        }
        
        return allData;
    }
    
    async importData(data) {
        if (!data || !data.teams) {
            throw new Error("Невірний формат даних для імпорту");
        }
        
        console.log("🔄 Імпорт даних...");
        
        // Импортируем команды
        for (const [teamId, teamData] of Object.entries(data.teams)) {
            await this.saveTeam(parseInt(teamId), teamData);
        }
        
        // Импортируем уведомления
        if (data.notifications) {
            this.saveToLocalStorage('GLOBAL_NOTIFICATIONS', data.notifications);
        }
        
        // Импортируем сообщения
        if (data.messages) {
            this.saveToLocalStorage('ADMIN_MESSAGES', data.messages);
        }
        
        await this.sendNotification("🔄 Імпорт даних успішно завершено", 'success');
        
        return true;
    }
    
    // ==================== СИНХРОНИЗАЦИЯ ====================
    
    async syncAllData() {
        if (!this.isConnected) {
            console.warn("⚠️ Немає підключення для синхронізації");
            return false;
        }
        
        console.log("🔄 Синхронізація даних з Telegram...");
        
        try {
            // Загружаем все данные из Telegram
            const telegramData = await this.loadAllFromTelegram();
            
            // Обновляем локальные данные
            telegramData.forEach(item => {
                if (item.key.startsWith('TEAM_')) {
                    this.saveToLocalStorage(item.key, item.data);
                } else if (item.key.startsWith('GLOBAL_NOTIFICATION_')) {
                    const notifications = this.getFromLocalStorage('GLOBAL_NOTIFICATIONS') || [];
                    const existingIndex = notifications.findIndex(n => n.id === item.key);
                    if (existingIndex >= 0) {
                        notifications[existingIndex] = item.data;
                    } else {
                        notifications.push(item.data);
                    }
                    this.saveToLocalStorage('GLOBAL_NOTIFICATIONS', notifications);
                }
            });
            
            console.log("✅ Синхронізація завершена");
            await this.sendNotification("🔄 Дані синхронізовано з Telegram", 'success');
            
            return true;
        } catch (error) {
            console.error("❌ Помилка синхронізації:", error);
            return false;
        }
    }
    
    // ==================== ОЧИСТКА ====================
    
    clearLocalData() {
        // Очищаем только наши данные
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                localStorage.removeItem(key);
            }
        });
        
        localStorage.removeItem('horting_telegram_initialized');
        this.messageHistory = {};
        
        console.log("🧹 Локальні дані очищено");
        return true;
    }
}

// Создаем глобальный инстанс
window.HortingTelegramStorage = new TelegramHortingStorage();
