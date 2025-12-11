// telegram-horting-storage.js
class TelegramHortingStorage {
    constructor() {
        // ⚠️ ЗАМЕНИТЕ ЭТИ ДАННЫЕ!
        this.botToken = '7672651709:AAGmYUj6Z8ifamx69EfKbbOJ8dCjNYPIO9s'; // Получите у @BotFather
        this.chatId = '1044367167'; // Ваш ID чата с ботом
        
        this.storagePrefix = 'HORTING_';
        this.isConnected = false;
        this.useLocalStorage = true;
        this.messageHistory = {};
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    
    async init() {
        console.log("🚀 Ініціалізація системи Horting...");
        
        if (!this.botToken || this.botToken === '7672651709:AAGmYUj6Z8ifamx69EfKbbOJ8dCjNYPIO9s') {
            console.warn("⚠️ Токен бота не налаштовано");
            return this.enableLocalStorage();
        }
        
        const connected = await this.testConnection();
        
        if (connected) {
            console.log("✅ Telegram підключено");
            this.isConnected = true;
            
            // Только загружаем историю, НЕ создаем данные
            await this.loadMessageHistory();
            
        } else {
            console.warn("⚠️ Telegram недоступен — localStorage");
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
            return false;
        }
    }

    // ==================== КОМАНДЫ ====================
    
    async saveTeam(teamId, teamData) {
        const key = `TEAM_${teamId}`;
        const dataToSave = {
            id: teamId,
            ...teamData,
            lastUpdated: new Date().toISOString(),
            version: (teamData.version || 0) + 1
        };
        
        this.saveToLocalStorage(key, dataToSave);
        
        if (this.isConnected) {
            await this.saveToTelegram(key, dataToSave);
        }
        
        return true;
    }
    
    async getTeam(teamId) {
        const key = `TEAM_${teamId}`;
        
        // 1. Из кеша
        if (this.messageHistory[key]) {
            return this.messageHistory[key].data;
        }
        
        // 2. Из Telegram
        if (this.isConnected) {
            const telegramData = await this.loadFromTelegram(key);
            if (telegramData) {
                this.saveToLocalStorage(key, telegramData);
                this.messageHistory[key] = { data: telegramData };
                return telegramData;
            }
        }
        
        // 3. Из localStorage
        const localData = this.getFromLocalStorage(key);
        if (localData) {
            this.messageHistory[key] = { data: localData };
            return localData;
        }
        
        // 4. Пустая команда если ничего нет
        return this.getEmptyTeam(teamId);
    }
    
    async getAllTeams() {
        const teams = {};
        
        for (let i = 1; i <= 6; i++) {
            teams[i] = await this.getTeam(i);
        }
        
        return teams;
    }
    
    // ==================== УЧАСТНИКИ КОМАНД ====================
    
    async addTeamMember(teamId, memberData) {
        const team = await this.getTeam(teamId);
        
        if (!team.members) {
            team.members = [];
        }
        
        // Проверяем, нет ли уже участника с таким именем
        const existingIndex = team.members.findIndex(m => 
            m.name.toLowerCase() === memberData.name.toLowerCase()
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
                id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: memberData.name,
                role: memberData.role || 'учасник',
                age: memberData.age || null,
                position: memberData.position || '',
                skills: memberData.skills || [],
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        await this.saveTeam(teamId, team);
        
        // Уведомление в Telegram
        if (this.isConnected) {
            await this.sendToTelegram(
                `👤 Новий учасник: ${memberData.name}\nКоманда: ${team.name}\nРоль: ${memberData.role || 'учасник'}`,
                'team'
            );
        }
        
        return true;
    }
    
    async updateTeamMember(teamId, memberId, updates) {
        const team = await this.getTeam(teamId);
        
        if (team.members) {
            const memberIndex = team.members.findIndex(m => m.id === memberId);
            
            if (memberIndex >= 0) {
                team.members[memberIndex] = {
                    ...team.members[memberIndex],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                
                await this.saveTeam(teamId, team);
                
                if (this.isConnected) {
                    await this.sendToTelegram(
                        `✏️ Оновлено учасника: ${team.members[memberIndex].name}\nКоманда: ${team.name}`,
                        'info'
                    );
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    async removeTeamMember(teamId, memberId) {
        const team = await this.getTeam(teamId);
        
        if (team.members) {
            const memberIndex = team.members.findIndex(m => m.id === memberId);
            
            if (memberIndex >= 0) {
                const removedMember = team.members[memberIndex];
                team.members.splice(memberIndex, 1);
                
                await this.saveTeam(teamId, team);
                
                if (this.isConnected) {
                    await this.sendToTelegram(
                        `❌ Видалено учасника: ${removedMember.name}\nКоманда: ${team.name}`,
                        'warning'
                    );
                }
                
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
            title: taskData.title,
            description: taskData.description || '',
            assignedTo: taskData.assignedTo || [],
            priority: taskData.priority || 'medium',
            status: 'active',
            completed: false,
            createdAt: new Date().toISOString(),
            deadline: taskData.deadline || null,
            teamId: teamId
        };
        
        team.tasks.push(task);
        
        await this.saveTeam(teamId, team);
        
        if (this.isConnected) {
            await this.sendToTelegram(
                `📋 Нова задача: ${task.title}\nКоманда: ${team.name}\nТермін: ${task.deadline || 'не вказано'}`,
                'task'
            );
        }
        
        return task.id;
    }
    
    async updateTaskStatus(teamId, taskId, completed) {
        const team = await this.getTeam(teamId);
        
        if (team.tasks) {
            const taskIndex = team.tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex >= 0) {
                team.tasks[taskIndex].completed = completed;
                team.tasks[taskIndex].status = completed ? 'completed' : 'active';
                team.tasks[taskIndex].completedAt = completed ? new Date().toISOString() : null;
                
                await this.saveTeam(teamId, team);
                
                if (this.isConnected) {
                    const status = completed ? '✅ Завершено' : '🔄 Активна';
                    await this.sendToTelegram(
                        `${status}: ${team.tasks[taskIndex].title}\nКоманда: ${team.name}`,
                        'success'
                    );
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    async deleteTask(teamId, taskId) {
        const team = await this.getTeam(teamId);
        
        if (team.tasks) {
            const taskIndex = team.tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex >= 0) {
                const taskTitle = team.tasks[taskIndex].title;
                team.tasks.splice(taskIndex, 1);
                
                await this.saveTeam(teamId, team);
                
                if (this.isConnected) {
                    await this.sendToTelegram(
                        `🗑️ Видалено задачу: ${taskTitle}\nКоманда: ${team.name}`,
                        'warning'
                    );
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== ОТСУТСТВИЯ ====================
    
    async addAbsence(teamId, absenceData) {
        const team = await this.getTeam(teamId);
        
        if (!team.absences) {
            team.absences = [];
        }
        
        const absence = {
            id: `absence_${Date.now()}`,
            memberId: absenceData.memberId,
            memberName: absenceData.memberName,
            reason: absenceData.reason || '',
            startDate: absenceData.startDate,
            endDate: absenceData.endDate || null,
            status: 'active',
            reportedAt: new Date().toISOString(),
            teamId: teamId
        };
        
        team.absences.push(absence);
        
        await this.saveTeam(teamId, team);
        
        if (this.isConnected) {
            await this.sendToTelegram(
                `🏥 Відсутність: ${absenceData.memberName}\nКоманда: ${team.name}\nПричина: ${absenceData.reason || 'не вказана'}`,
                'absence'
            );
        }
        
        return absence.id;
    }
    
    async resolveAbsence(teamId, absenceId) {
        const team = await this.getTeam(teamId);
        
        if (team.absences) {
            const absenceIndex = team.absences.findIndex(a => a.id === absenceId);
            
            if (absenceIndex >= 0) {
                team.absences[absenceIndex].status = 'resolved';
                team.absences[absenceIndex].resolvedAt = new Date().toISOString();
                
                await this.saveTeam(teamId, team);
                
                if (this.isConnected) {
                    await this.sendToTelegram(
                        `👍 Відсутність завершена: ${team.absences[absenceIndex].memberName}\nКоманда: ${team.name}`,
                        'success'
                    );
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== УВЕДОМЛЕНИЯ ====================
    
    async addGlobalNotification(notificationData) {
        const notifications = this.getFromLocalStorage('NOTIFICATIONS') || [];
        
        const notification = {
            id: `notif_${Date.now()}`,
            title: notificationData.title,
            message: notificationData.message,
            author: notificationData.author || 'Адміністратор',
            targetTeams: notificationData.targetTeams || 'all',
            createdAt: new Date().toISOString(),
            isRead: false
        };
        
        notifications.unshift(notification);
        this.saveToLocalStorage('NOTIFICATIONS', notifications);
        
        if (this.isConnected) {
            await this.saveToTelegram(`NOTIFICATION_${notification.id}`, notification);
            
            await this.sendToTelegram(
                `📢 ${notification.title}\nАвтор: ${notification.author}\n${notification.message.substring(0, 100)}...`,
                'notification'
            );
        }
        
        return notification.id;
    }
    
    async getGlobalNotifications() {
        const notifications = this.getFromLocalStorage('NOTIFICATIONS') || [];
        
        if (this.isConnected && notifications.length === 0) {
            const telegramNotifs = await this.loadAllFromTelegram('NOTIFICATION_');
            if (telegramNotifs.length > 0) {
                const notifData = telegramNotifs.map(item => item.data);
                this.saveToLocalStorage('NOTIFICATIONS', notifData);
                return notifData;
            }
        }
        
        return notifications;
    }
    
    async markNotificationAsRead(notificationId) {
        const notifications = this.getFromLocalStorage('NOTIFICATIONS') || [];
        const notifIndex = notifications.findIndex(n => n.id === notificationId);
        
        if (notifIndex >= 0) {
            notifications[notifIndex].isRead = true;
            notifications[notifIndex].readAt = new Date().toISOString();
            this.saveToLocalStorage('NOTIFICATIONS', notifications);
            return true;
        }
        
        return false;
    }
    
    async deleteNotification(notificationId) {
        const notifications = this.getFromLocalStorage('NOTIFICATIONS') || [];
        const filtered = notifications.filter(n => n.id !== notificationId);
        this.saveToLocalStorage('NOTIFICATIONS', filtered);
        
        if (this.isConnected && !notificationId.startsWith('notif_')) {
            await this.deleteFromTelegram(`NOTIFICATION_${notificationId}`);
        }
        
        return true;
    }
    
    // ==================== СООБЩЕНИЯ АДМИНАМ ====================
    
    async addAdminMessage(messageData) {
        const messages = this.getFromLocalStorage('ADMIN_MESSAGES') || [];
        
        const message = {
            id: `msg_${Date.now()}`,
            message: messageData.message,
            fromTeam: messageData.fromTeam,
            fromTeamId: messageData.fromTeamId,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        
        messages.unshift(message);
        this.saveToLocalStorage('ADMIN_MESSAGES', messages);
        
        if (this.isConnected) {
            await this.saveToTelegram(`ADMIN_MSG_${message.id}`, message);
            
            await this.sendToTelegram(
                `📩 Повідомлення адміністратору\nВід: ${messageData.fromTeam}\nТекст: ${messageData.message.substring(0, 100)}...`,
                'message'
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
    
    async markAdminMessageAsRead(messageId) {
        const messages = this.getFromLocalStorage('ADMIN_MESSAGES') || [];
        const msgIndex = messages.findIndex(m => m.id === messageId);
        
        if (msgIndex >= 0) {
            messages[msgIndex].isRead = true;
            messages[msgIndex].readAt = new Date().toISOString();
            this.saveToLocalStorage('ADMIN_MESSAGES', messages);
            return true;
        }
        
        return false;
    }
    
    async deleteAdminMessage(messageId) {
        const messages = this.getFromLocalStorage('ADMIN_MESSAGES') || [];
        const filtered = messages.filter(m => m.id !== messageId);
        this.saveToLocalStorage('ADMIN_MESSAGES', filtered);
        
        if (this.isConnected && !messageId.startsWith('msg_')) {
            await this.deleteFromTelegram(`ADMIN_MSG_${messageId}`);
        }
        
        return true;
    }
    
    // ==================== TELEGRAM API ====================
    
    async saveToTelegram(key, data) {
        try {
            const message = this.formatDataMessage(key, data);
            
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chatId,
                        text: message,
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
            return false;
        }
    }
    
    async loadFromTelegram(key) {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=50`
            );
            
            const result = await response.json();
            
            if (result.ok && result.result) {
                const messages = result.result
                    .map(update => update.message)
                    .filter(msg => msg && msg.text)
                    .reverse();
                
                for (const msg of messages) {
                    if (msg.text.includes(`🔑 ${key}`)) {
                        const dataMatch = msg.text.match(/📄 Дані:\s*({[\s\S]*?})\s*🔒/);
                        if (dataMatch) {
                            try {
                                return JSON.parse(dataMatch[1]);
                            } catch (e) {
                                return null;
                            }
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
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
                    if (msg.text.includes('🔑 ') && 
                        (prefix === '' || msg.text.includes(`🔑 ${prefix}`))) {
                        
                        const keyMatch = msg.text.match(/🔑 ([^\n]+)/);
                        const dataMatch = msg.text.match(/📄 Дані:\s*({[\s\S]*?})\s*🔒/);
                        
                        if (keyMatch && dataMatch) {
                            try {
                                allData.push({
                                    key: keyMatch[1],
                                    data: JSON.parse(dataMatch[1])
                                });
                            } catch (e) {
                                // Пропускаем ошибки парсинга
                            }
                        }
                    }
                }
            }
            
            return allData;
        } catch (error) {
            return [];
        }
    }
    
    async deleteFromTelegram(key) {
        const item = this.messageHistory[key];
        if (item && item.messageId) {
            try {
                await fetch(
                    `https://api.telegram.org/bot${this.botToken}/deleteMessage`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: this.chatId,
                            message_id: item.messageId
                        })
                    }
                );
                
                delete this.messageHistory[key];
                return true;
            } catch (error) {
                return false;
            }
        }
        
        return false;
    }
    
    async sendToTelegram(text, type = 'info') {
        const emojis = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'team': '👥',
            'task': '📋',
            'absence': '🏥',
            'notification': '📢',
            'message': '📩'
        };
        
        const emoji = emojis[type] || '📌';
        const message = `${emoji} ${text}\n⏰ ${new Date().toLocaleString('uk-UA')}`;
        
        try {
            await fetch(
                `https://api.telegram.org/bot${this.botToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chatId,
                        text: message
                    })
                }
            );
        } catch (error) {
            // Игнорируем ошибки отправки уведомлений
        }
    }
    
    formatDataMessage(key, data) {
        const timestamp = new Date().toLocaleString('uk-UA');
        const dataStr = JSON.stringify(data, null, 2);
        
        return `💾 <b>HORTING DATA</b>
🔑 ${key}
⏰ ${timestamp}
📄 Дані:
<pre>${dataStr}</pre>
🔒 Кінець даних`;
    }
    
    async loadMessageHistory() {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=30`
            );
            
            const result = await response.json();
            
            if (result.ok && result.result) {
                result.result.forEach(update => {
                    if (update.message && update.message.text && update.message.text.includes('🔑 ')) {
                        const keyMatch = update.message.text.match(/🔑 ([^\n]+)/);
                        if (keyMatch) {
                            this.messageHistory[keyMatch[1]] = {
                                messageId: update.message.message_id
                            };
                        }
                    }
                });
            }
        } catch (error) {
            // Игнорируем ошибки загрузки истории
        }
    }
    
    // ==================== LOCAL STORAGE ====================
    
    enableLocalStorage() {
        this.useLocalStorage = true;
        this.isConnected = false;
        this.initLocalStorage();
        return false;
    }
    
    initLocalStorage() {
        // Создаем только если совсем пусто
        if (localStorage.getItem('horting_initialized') !== 'v2') {
            console.log("🆕 Ініціалізація чистої бази даних...");
            
            // Пустые команды
            for (let i = 1; i <= 6; i++) {
                this.saveToLocalStorage(`TEAM_${i}`, this.getEmptyTeam(i));
            }
            
            // Пустые коллекции
            this.saveToLocalStorage('NOTIFICATIONS', []);
            this.saveToLocalStorage('ADMIN_MESSAGES', []);
            
            localStorage.setItem('horting_initialized', 'v2');
            console.log("✅ База даних готова (порожня)");
        }
    }
    
    saveToLocalStorage(key, value) {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(value));
        } catch (error) {
            console.error("Помилка збереження:", error);
        }
    }
    
    getFromLocalStorage(key) {
        try {
            const item = localStorage.getItem(this.storagePrefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            return null;
        }
    }
    
    // ==================== ПУСТЫЕ ШАБЛОНЫ ====================
    
    getEmptyTeam(id) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        const names = [
            "1-ша команда",
            "2-га команда", 
            "3-тя команда",
            "4-та команда",
            "5-та команда",
            "6-та команда"
        ];
        
        return {
            id: id,
            name: names[id - 1] || `Команда ${id}`,
            color: colors[id - 1] || '#CCCCCC',
            type: id <= 3 ? 'mal' : 'str',
            members: [],
            tasks: [],
            absences: [],
            notifications: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
        };
    }
    
    // ==================== ЭКСПОРТ/ИМПОРТ ====================
    
    async exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            version: '2.0',
            teams: {},
            notifications: this.getFromLocalStorage('NOTIFICATIONS') || [],
            adminMessages: this.getFromLocalStorage('ADMIN_MESSAGES') || []
        };
        
        for (let i = 1; i <= 6; i++) {
            data.teams[i] = await this.getTeam(i);
        }
        
        return data;
    }
    
    async importData(data) {
        if (!data || !data.teams) return false;
        
        console.log("🔄 Імпорт даних...");
        
        // Импортируем команды
        for (const [teamId, teamData] of Object.entries(data.teams)) {
            await this.saveTeam(parseInt(teamId), teamData);
        }
        
        // Импортируем остальное
        if (data.notifications) {
            this.saveToLocalStorage('NOTIFICATIONS', data.notifications);
        }
        
        if (data.adminMessages) {
            this.saveToLocalStorage('ADMIN_MESSAGES', data.adminMessages);
        }
        
        console.log("✅ Імпорт завершено");
        return true;
    }
    
    // ==================== СИНХРОНИЗАЦИЯ ====================
    
    async syncWithTelegram() {
        if (!this.isConnected) return false;
        
        console.log("🔄 Синхронізація з Telegram...");
        
        try {
            const telegramData = await this.loadAllFromTelegram();
            
            telegramData.forEach(item => {
                if (item.key.startsWith('TEAM_')) {
                    this.saveToLocalStorage(item.key, item.data);
                } else if (item.key.startsWith('NOTIFICATION_')) {
                    const notifications = this.getFromLocalStorage('NOTIFICATIONS') || [];
                    const exists = notifications.some(n => n.id === item.data.id);
                    if (!exists) {
                        notifications.push(item.data);
                    }
                    this.saveToLocalStorage('NOTIFICATIONS', notifications);
                } else if (item.key.startsWith('ADMIN_MSG_')) {
                    const messages = this.getFromLocalStorage('ADMIN_MESSAGES') || [];
                    const exists = messages.some(m => m.id === item.data.id);
                    if (!exists) {
                        messages.push(item.data);
                    }
                    this.saveToLocalStorage('ADMIN_MESSAGES', messages);
                }
            });
            
            console.log("✅ Синхронізація завершена");
            return true;
        } catch (error) {
            console.error("❌ Помилка синхронізації:", error);
            return false;
        }
    }
    
    // ==================== ОЧИСТКА ====================
    
    clearAllData() {
        // Очищаем localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                localStorage.removeItem(key);
            }
        });
        
        localStorage.removeItem('horting_initialized');
        this.messageHistory = {};
        
        console.log("🧹 Всі дані очищено");
        return true;
    }
    
    resetToDefault() {
        this.clearAllData();
        this.initLocalStorage();
        console.log("🔄 Скинуто до початкового стану");
        return true;
    }
}

// Глобальный экземпляр
window.HortingStorage = new TelegramHortingStorage();
