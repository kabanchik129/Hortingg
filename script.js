// script.js - Менеджер для работы с данными через Supabase
const CONFIG = {
    teams: {
        1: { name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal" },
        2: { name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal" },
        3: { name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal" },
        4: { name: "4-та команда (старша)", color: "#96CEB4", type: "str" },
        5: { name: "5-та команда (старша)", color: "#FFEAA7", type: "str" },
        6: { name: "6-та команда (старша)", color: "#DDA0DD", type: "str" }
    },
    trainingDays: {
        'понеділок': { start: '16:00', end: '19:00' },
        'середа': { start: '16:00', end: '19:00' },
        'субота': { start: '12:00', end: '16:00' }
    },
    allTrainingDays: ['понеділок', 'середа', 'субота']
};

// Парсинг пароля
function parsePassword(password) {
    if (!password) return null;
    
    password = password.trim().toLowerCase();
    
    // Админский пароль
    if (password === 'kyka7') {
        return {
            role: 'admin',
            teamId: 0,
            isCommander: true,
            isDeputy: true,
            teamType: 'admin'
        };
    }
    
    // Ищем команду (mal1, str4 и т.д.)
    let teamId = null;
    let teamType = null;
    let isCommander = false;
    let isDeputy = false;
    
    // Ищем номер команды от 1 до 6
    for (let i = 1; i <= 6; i++) {
        if (password.includes(`mal${i}`)) {
            teamId = i;
            teamType = 'mal';
            break;
        }
        if (password.includes(`str${i}`)) {
            teamId = i;
            teamType = 'str';
            break;
        }
    }
    
    if (!teamId) return null;
    
    // Проверяем роль
    isCommander = password.includes('_kam');
    isDeputy = password.includes('_zam');
    
    return {
        role: 'user',
        teamId: teamId,
        teamType: teamType,
        isCommander: isCommander,
        isDeputy: isDeputy
    };
}

// Авторизация
function login() {
    const passwordInput = document.getElementById('passwordInput');
    const errorElement = document.getElementById('errorMessage');
    
    if (!passwordInput) return;
    
    const password = passwordInput.value.trim();
    
    // Очистка предыдущей ошибки
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
    
    if (!password) {
        if (errorElement) {
            errorElement.textContent = 'Будь ласка, введіть пароль!';
            errorElement.style.display = 'block';
        }
        passwordInput.focus();
        return;
    }
    
    const userData = parsePassword(password);
    
    if (!userData) {
        if (errorElement) {
            errorElement.textContent = 'Невірний пароль!';
            errorElement.style.display = 'block';
        }
        passwordInput.focus();
        passwordInput.select();
        return;
    }
    
    // Сохраняем данные пользователя
    sessionStorage.setItem('horting_user', JSON.stringify(userData));
    
    // Перенаправляем в зависимости от роли
    if (userData.role === 'admin') {
        window.location.href = 'dashboard.html';
    } else {
        window.location.href = 'team.html';
    }
}

// Проверка авторизации
function checkAuth(requiredRole = null) {
    const userData = JSON.parse(sessionStorage.getItem('horting_user') || 'null');
    
    if (!userData) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
        return null;
    }
    
    if (requiredRole && userData.role !== requiredRole) {
        if (requiredRole === 'admin' && userData.role !== 'admin') {
            window.location.href = 'team.html';
            return null;
        }
        if (requiredRole === 'user' && userData.role === 'admin') {
            window.location.href = 'dashboard.html';
            return null;
        }
    }
    
    return userData;
}

// Выход из системы
function logout() {
    sessionStorage.removeItem('horting_user');
    sessionStorage.removeItem('horting_admin_view');
    sessionStorage.removeItem('horting_view_team');
    window.location.href = 'index.html';
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        return date.toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}

// Получить название дня недели на украинском
function getDayName(dayIndex) {
    const days = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'п\'ятниця', 'субота'];
    return days[dayIndex];
}

// Получить ближайшие тренировки
function getNextTrainings(count = 3) {
    const trainings = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dayName = getDayName(date.getDay());
        
        if (CONFIG.trainingDays[dayName]) {
            const schedule = CONFIG.trainingDays[dayName];
            trainings.push({
                date: date.toLocaleDateString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }),
                day: dayName,
                time: schedule.start + '-' + schedule.end,
                startTime: schedule.start,
                endTime: schedule.end,
                isToday: i === 0,
                fullDate: date
            });
            
            if (trainings.length >= count) break;
        }
    }
    
    return trainings;
}

// Проверка дня тренировки
function isTrainingDay(date) {
    if (!date) return false;
    
    try {
        const checkDate = new Date(date);
        if (isNaN(checkDate.getTime())) return false;
        
        const dayName = getDayName(checkDate.getDay());
        return CONFIG.trainingDays[dayName] !== undefined;
    } catch (e) {
        return false;
    }
}

// Менеджер команд
const TeamManager = {
    async init() {
        // Инициализируем Supabase клиент
        return await window.supabaseClient?.init();
    },

    // Получить команду
    async getTeam(teamId) {
        return await window.supabaseClient?.getTeam(teamId);
    },

    // Получить все команды
    async getTeams() {
        return await window.supabaseClient?.getTeams();
    },

    // Сохранить команду
    async saveTeam(teamId, teamData) {
        return await window.supabaseClient?.saveTeam(teamId, teamData);
    },

    // Добавить участника
    async addMember(teamId, memberData) {
        const team = await this.getTeam(teamId);
        if (!team) return false;

        const newMember = {
            id: Date.now().toString(),
            name: memberData.name,
            callSign: memberData.callSign,
            rank: memberData.rank,
            role: memberData.role || 'soldier',
            dateAdded: new Date().toISOString()
        };

        if (!team.members) team.members = [];
        team.members.push(newMember);
        
        await this.saveTeam(teamId, team);
        return true;
    },

    // Удалить участника
    async removeMember(teamId, memberId) {
        const team = await this.getTeam(teamId);
        if (!team || !team.members) return false;

        team.members = team.members.filter(m => m.id !== memberId);
        await this.saveTeam(teamId, team);
        return true;
    },

    // Добавить уведомление команды
    async addTeamNotification(teamId, notificationData, author = 'Система') {
        const team = await this.getTeam(teamId);
        if (!team) return false;

        const newNotification = {
            id: Date.now().toString(),
            title: notificationData.title,
            message: notificationData.message,
            date: new Date().toISOString(),
            author: author
        };

        if (!team.notifications) team.notifications = [];
        team.notifications.push(newNotification);
        
        await this.saveTeam(teamId, team);
        return true;
    },

    // Добавить задачу
    async addTask(teamId, taskData) {
        const team = await this.getTeam(teamId);
        if (!team) return false;

        const newTask = {
            id: Date.now().toString(),
            title: taskData.title,
            description: taskData.description,
            date: new Date().toISOString(),
            completed: false
        };

        if (!team.tasks) team.tasks = [];
        team.tasks.push(newTask);
        
        await this.saveTeam(teamId, team);
        return true;
    },

    // Добавить отсутствие
    async addAbsence(teamId, absenceData) {
        const team = await this.getTeam(teamId);
        if (!team) return false;

        const newAbsence = {
            id: Date.now().toString(),
            memberName: absenceData.memberName,
            date: absenceData.date,
            reason: absenceData.reason,
            reportedDate: new Date().toISOString()
        };

        if (!team.absences) team.absences = [];
        team.absences.push(newAbsence);
        
        await this.saveTeam(teamId, team);
        
        // Автоматическое удаление через день
        const absenceDate = new Date(absenceData.date);
        const deleteDate = new Date(absenceDate);
        deleteDate.setDate(deleteDate.getDate() + 1);
        deleteDate.setHours(23, 59, 0, 0);
        
        const timeUntilDelete = deleteDate.getTime() - Date.now();
        if (timeUntilDelete > 0) {
            setTimeout(async () => {
                const currentTeam = await this.getTeam(teamId);
                if (currentTeam && currentTeam.absences) {
                    currentTeam.absences = currentTeam.absences.filter(a => a.id !== newAbsence.id);
                    await this.saveTeam(teamId, currentTeam);
                }
            }, timeUntilDelete);
        }
        
        return true;
    },

    // Глобальные уведомления
    async getGlobalNotifications() {
        return await window.supabaseClient?.getGlobalNotifications();
    },

    async addGlobalNotification(notificationData, author = 'Адміністратор') {
        return await window.supabaseClient?.addGlobalNotification(notificationData, author);
    },

    async deleteGlobalNotification(id) {
        return await window.supabaseClient?.deleteGlobalNotification(id);
    },

    // Сообщения админу
    async getAdminNotifications() {
        return await window.supabaseClient?.getAdminMessages();
    },

    async addAdminNotification(message, fromTeam) {
        return await window.supabaseClient?.addAdminMessage(message, fromTeam);
    },

    async markNotificationAsRead(id) {
        return await window.supabaseClient?.markMessageAsRead(id);
    },

    async markAllNotificationsAsRead() {
        return await window.supabaseClient?.markAllMessagesAsRead();
    },

    async deleteAdminNotification(id) {
        return await window.supabaseClient?.deleteAdminMessage(id);
    },

    async getUnreadCount() {
        return await window.supabaseClient?.getUnreadCount();
    }
};

// Отправка сообщения админу
function sendToAdmin(message, fromTeam) {
    if (!message || !fromTeam) return false;
    return TeamManager.addAdminNotification(message, fromTeam);
}

// Модальное окно (упрощенное)
const Modal = {
    show(title, content, buttons = []) {
        return new Promise((resolve) => {
            // Создаем оверлей
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                padding: 20px;
            `;
            
            // Создаем модальное окно
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #1a1f2e;
                border-radius: 16px;
                padding: 24px;
                max-width: 500px;
                width: 100%;
                border: 1px solid #29c4ff;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            `;
            
            // Заголовок
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.cssText = 'color: #29c4ff; margin-bottom: 16px;';
            modal.appendChild(titleEl);
            
            // Контент
            const contentEl = document.createElement('div');
            contentEl.innerHTML = content;
            contentEl.style.cssText = 'color: #e0e1dd; margin-bottom: 20px;';
            modal.appendChild(contentEl);
            
            // Кнопки
            if (buttons.length > 0) {
                const actions = document.createElement('div');
                actions.style.cssText = 'display: flex; gap: 10px;';
                
                buttons.forEach(button => {
                    const btn = document.createElement('button');
                    btn.textContent = button.text;
                    btn.style.cssText = `
                        flex: 1;
                        padding: 10px;
                        border-radius: 8px;
                        border: none;
                        background: ${button.class === 'secondary' ? '#415a77' : 'linear-gradient(135deg, #29c4ff, #9d4edd)'};
                        color: white;
                        cursor: pointer;
                        font-weight: 500;
                    `;
                    btn.onclick = () => {
                        document.body.removeChild(overlay);
                        resolve(button.value);
                    };
                    actions.appendChild(btn);
                });
                
                modal.appendChild(actions);
            }
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Закрытие по клику на оверлей
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            };
        });
    }
};

// Выход из режима просмотра админа
function exitViewMode() {
    sessionStorage.removeItem('horting_admin_view');
    sessionStorage.removeItem('horting_view_team');
    window.location.href = 'dashboard.html';
}

// Экспортируем все функции
window.TeamManager = TeamManager;
window.parsePassword = parsePassword;
window.login = login;
window.checkAuth = checkAuth;
window.logout = logout;
window.formatDate = formatDate;
window.getNextTrainings = getNextTrainings;
window.isTrainingDay = isTrainingDay;
window.sendToAdmin = sendToAdmin;
window.Modal = Modal;
window.exitViewMode = exitViewMode;
window.CONFIG = CONFIG;
