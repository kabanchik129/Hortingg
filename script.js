// ============ Firebase инициализация ============
let firebaseApp, firestore, auth;

async function initFirebase() {
    try {
        console.log('Ініціалізація Firebase...');
        
        // Проверяем, есть ли конфигурация
        if (!window.firebaseConfig) {
            console.warn('Конфігурація Firebase не знайдена');
            return false;
        }
        
        // Проверяем, загружена ли Firebase
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK не завантажено');
            return false;
        }
        
        // Инициализируем Firebase
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(window.firebaseConfig);
            console.log('Firebase ініціалізовано');
        } else {
            firebaseApp = firebase.app();
            console.log('Firebase вже ініціалізовано');
        }
        
        // Инициализируем Firestore и Auth
        firestore = firebase.firestore();
        auth = firebase.auth();
        
        // Сохраняем в глобальные переменные
        window.firebaseApp = firebaseApp;
        window.firestore = firestore;
        window.auth = auth;
        
        // Включаем офлайн поддержку
        try {
            await firestore.enablePersistence();
            console.log('Firestore офлайн підтримка увімкнена');
        } catch (err) {
            console.warn('Офлайн підтримка недоступна:', err.code);
        }
        
        console.log('Firebase готовий до роботи');
        return true;
        
    } catch (error) {
        console.error('Помилка ініціалізації Firebase:', error);
        return false;
    }
}

// Конфигурация системы
const CONFIG = {
    teams: {
        1: { name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal" },
        2: { name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal" },
        3: { name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal" },
        4: { name: "4-та команда (старша)", color: "#96CEB4", type: "str" },
        5: { name: "5-та команда (старша)", color: "#FFEAA7", type: "str" },
        6: { name: "6-та команда (старша)", color: "#DDA0DD", type: "str" }
    },
    // Расписание: понедельник, среда (16:00-19:00), суббота (12:00-16:00)
    trainingDays: {
        'понеділок': { start: '16:00', end: '19:00' },
        'середа': { start: '16:00', end: '19:00' },
        'субота': { start: '12:00', end: '16:00' }
    },
    // Полный список дней для проверки
    allTrainingDays: ['понеділок', 'середа', 'субота']
};

// Firebase менеджер данных
const FirebaseManager = {
    // Инициализация Firebase
    async init() {
        try {
            // Проверяем, есть ли уже конфигурация
            if (!window.firebaseConfig) {
                console.warn('Конфигурация Firebase не найдена, работаем в локальном режиме');
                this.useFirebase = false;
                return false;
            }
            
            // Инициализируем Firebase если еще не инициализирован
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(window.firebaseConfig);
                console.log('Firebase инициализирован');
            } else {
                this.app = firebase.app();
            }
            
            this.db = firebase.firestore(this.app);
            this.auth = firebase.auth(this.app);
            
            // Включаем офлайн поддержку
            await this.db.enablePersistence().catch(err => {
                console.warn('Офлайн поддержка недоступна, работаем онлайн:', err.code);
            });
            
            this.useFirebase = true;
            console.log('FirebaseManager готов к работе');
            
            // Инициализируем начальные данные если нужно
            await this.initializeDefaultData();
            
            return true;
            
        } catch (error) {
            console.error('Ошибка инициализации Firebase:', error);
            this.useFirebase = false;
            return false;
        }
    },

    // Инициализация начальных данных
    async initializeDefaultData() {
        if (!this.useFirebase) return;
        
        try {
            // Проверяем, есть ли уже команды
            const teamsSnapshot = await this.db.collection('teams').limit(1).get();
            
            if (teamsSnapshot.empty) {
                console.log('Создаем начальные данные в Firebase...');
                
                // Создаем команды
                for (let i = 1; i <= 6; i++) {
                    const teamData = {
                        id: i,
                        name: CONFIG.teams[i].name,
                        type: CONFIG.teams[i].type,
                        color: CONFIG.teams[i].color,
                        members: [],
                        notifications: [],
                        tasks: [],
                        absences: [],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // Тестовые данные для первой команды
                    if (i === 1) {
                        teamData.members = [
                            { id: '1', name: 'Петро Коваль', callSign: 'Командир', rank: 'Старшина', role: 'command' },
                            { id: '2', name: 'Іван Сидоренко', callSign: 'Заступник', rank: 'Сержант', role: 'deputy' },
                            { id: '3', name: 'Олексій Мельник', callSign: 'Сокіл', rank: 'Рядовий', role: 'soldier' }
                        ];
                        teamData.notifications = [
                            { 
                                id: '1', 
                                title: 'Ласкаво просимо!', 
                                message: 'Вітаємо в команді 1. Перше заняття завтра о 16:00.', 
                                date: new Date().toISOString(), 
                                author: 'Командир' 
                            }
                        ];
                    }
                    
                    await this.db.collection('teams').doc(i.toString()).set(teamData);
                }
                
                // Создаем глобальные уведомления
                await this.db.collection('global_notifications').add({
                    title: 'Вітання з початком навчання!',
                    message: 'Ласкаво просимо до гуртка "Хортинг". Бажаємо успіхів у навчанні! Заняття: понеділок, середа (16:00-19:00), субота (12:00-16:00)',
                    date: new Date().toISOString(),
                    author: 'Адміністратор',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('Начальные данные созданы в Firebase');
            }
        } catch (error) {
            console.error('Ошибка создания начальных данных:', error);
        }
    },

    // =============== КОМАНДЫ ===============
    
    // Получить команду
    async getTeam(teamId) {
        try {
            if (this.useFirebase) {
                const doc = await this.db.collection('teams').doc(teamId.toString()).get();
                if (doc.exists) {
                    return doc.data();
                }
            }
        } catch (error) {
            console.error('Ошибка получения команды из Firebase:', error);
        }
        
        // Fallback на localStorage
        const localData = localStorage.getItem(`horting_team_${teamId}`);
        return localData ? JSON.parse(localData) : null;
    },

    // Получить все команды
    async getTeams() {
        const teams = {};
        
        try {
            if (this.useFirebase) {
                const snapshot = await this.db.collection('teams').get();
                snapshot.forEach(doc => {
                    teams[doc.id] = doc.data();
                });
                return teams;
            }
        } catch (error) {
            console.error('Ошибка получения команд из Firebase:', error);
        }
        
        // Fallback на localStorage
        for (let i = 1; i <= 6; i++) {
            const team = await this.getTeam(i);
            if (team) teams[i] = team;
        }
        
        return teams;
    },

    // Сохранить команду
    async saveTeam(teamId, teamData) {
        try {
            if (this.useFirebase) {
                await this.db.collection('teams').doc(teamId.toString()).set({
                    ...teamData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`Команда ${teamId} сохранена в Firebase`);
            }
        } catch (error) {
            console.error('Ошибка сохранения команды в Firebase:', error);
        }
        
        // Всегда сохраняем в localStorage как резервную копию
        localStorage.setItem(`horting_team_${teamId}`, JSON.stringify(teamData));
        return true;
    },

    // =============== ГЛОБАЛЬНЫЕ УВЕДОМЛЕНИЯ ===============
    
    async getGlobalNotifications() {
        try {
            if (this.useFirebase) {
                const snapshot = await this.db.collection('global_notifications')
                    .orderBy('createdAt', 'desc')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }
        } catch (error) {
            console.error('Ошибка получения глобальных уведомлений:', error);
        }
        
        // Fallback на localStorage
        const localData = localStorage.getItem('horting_global_notifications');
        return localData ? JSON.parse(localData) : [];
    },

    async addGlobalNotification(notificationData, author = 'Адміністратор') {
        const newNotification = {
            ...notificationData,
            date: new Date().toISOString(),
            author: author,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            if (this.useFirebase) {
                const docRef = await this.db.collection('global_notifications').add(newNotification);
                console.log('Глобальное уведомление добавлено в Firebase:', docRef.id);
            }
        } catch (error) {
            console.error('Ошибка добавления глобального уведомления:', error);
        }
        
        // Сохраняем в localStorage
        const notifications = await this.getGlobalNotifications();
        notifications.push({ ...newNotification, id: Date.now().toString() });
        localStorage.setItem('horting_global_notifications', JSON.stringify(notifications));
        
        return true;
    },

    async deleteGlobalNotification(id) {
        try {
            if (this.useFirebase) {
                await this.db.collection('global_notifications').doc(id).delete();
            }
        } catch (error) {
            console.error('Ошибка удаления глобального уведомления:', error);
        }
        
        // Удаляем из localStorage
        const notifications = await this.getGlobalNotifications();
        const filtered = notifications.filter(n => n.id !== id);
        localStorage.setItem('horting_global_notifications', JSON.stringify(filtered));
    },

    // =============== АДМИН УВЕДОМЛЕНИЯ ===============
    
    async getAdminNotifications() {
        try {
            if (this.useFirebase) {
                const snapshot = await this.db.collection('admin_notifications')
                    .orderBy('date', 'desc')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }
        } catch (error) {
            console.error('Ошибка получения админ уведомлений:', error);
        }
        
        // Fallback на localStorage
        const localData = localStorage.getItem('horting_admin_notifications');
        return localData ? JSON.parse(localData) : [];
    },

    async addAdminNotification(message, fromTeam) {
        const newNotification = {
            message: message,
            date: new Date().toISOString(),
            fromTeam: fromTeam,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            if (this.useFirebase) {
                await this.db.collection('admin_notifications').add(newNotification);
            }
        } catch (error) {
            console.error('Ошибка добавления админ уведомления:', error);
        }
        
        // Сохраняем в localStorage
        const notifications = await this.getAdminNotifications();
        notifications.push({ ...newNotification, id: Date.now().toString() });
        localStorage.setItem('horting_admin_notifications', JSON.stringify(notifications));
        
        return true;
    },

    async markNotificationAsRead(id) {
        try {
            if (this.useFirebase) {
                await this.db.collection('admin_notifications').doc(id).update({
                    read: true
                });
            }
        } catch (error) {
            console.error('Ошибка обновления уведомления:', error);
        }
        
        // Обновляем в localStorage
        const notifications = await this.getAdminNotifications();
        const notification = notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            localStorage.setItem('horting_admin_notifications', JSON.stringify(notifications));
        }
    },

    async markAllNotificationsAsRead() {
        try {
            if (this.useFirebase) {
                const snapshot = await this.db.collection('admin_notifications').where('read', '==', false).get();
                const batch = this.db.batch();
                
                snapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { read: true });
                });
                
                await batch.commit();
            }
        } catch (error) {
            console.error('Ошибка массового обновления уведомлений:', error);
        }
        
        // Обновляем в localStorage
        const notifications = await this.getAdminNotifications();
        notifications.forEach(n => n.read = true);
        localStorage.setItem('horting_admin_notifications', JSON.stringify(notifications));
    },

    async deleteAdminNotification(id) {
        try {
            if (this.useFirebase) {
                await this.db.collection('admin_notifications').doc(id).delete();
            }
        } catch (error) {
            console.error('Ошибка удаления админ уведомления:', error);
        }
        
        // Удаляем из localStorage
        const notifications = await this.getAdminNotifications();
        const filtered = notifications.filter(n => n.id !== id);
        localStorage.setItem('horting_admin_notifications', JSON.stringify(filtered));
    },

    async getUnreadCount() {
        const notifications = await this.getAdminNotifications();
        return notifications.filter(n => !n.read).length;
    }
};

// Парсинг пароля
function parsePassword(password) {
    if (!password) return null;
    
    password = password.trim().toLowerCase();
    console.log('Парсим пароль:', password);
    
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
async function login() {
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

// Получить ближайшие тренировки с правильным временем
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

// Отправка сообщения админу
async function sendToAdmin(message, fromTeam) {
    if (!message || !fromTeam) return false;
    return await FirebaseManager.addAdminNotification(message, fromTeam);
}

// Менеджер команд для обратной совместимости
const TeamManager = {
    async init() {
        await FirebaseManager.init();
    },

    async getTeam(teamId) {
        return await FirebaseManager.getTeam(teamId);
    },

    async getTeams() {
        return await FirebaseManager.getTeams();
    },

    async saveTeam(teamId, teamData) {
        return await FirebaseManager.saveTeam(teamId, teamData);
    },

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

    async removeMember(teamId, memberId) {
        const team = await this.getTeam(teamId);
        if (!team || !team.members) return false;

        team.members = team.members.filter(m => m.id !== memberId);
        await this.saveTeam(teamId, team);
        return true;
    },

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
        
        // Автоматическое удаление через день после даты отсутствия
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

    async getGlobalNotifications() {
        return await FirebaseManager.getGlobalNotifications();
    },

    async addGlobalNotification(notificationData, author = 'Адміністратор') {
        return await FirebaseManager.addGlobalNotification(notificationData, author);
    },

    async deleteGlobalNotification(id) {
        return await FirebaseManager.deleteGlobalNotification(id);
    },

    async getAdminNotifications() {
        return await FirebaseManager.getAdminNotifications();
    },

    async addAdminNotification(message, fromTeam) {
        return await FirebaseManager.addAdminNotification(message, fromTeam);
    },

    async markNotificationAsRead(id) {
        return await FirebaseManager.markNotificationAsRead(id);
    },

    async markAllNotificationsAsRead() {
        return await FirebaseManager.markAllNotificationsAsRead();
    },

    async deleteAdminNotification(id) {
        return await FirebaseManager.deleteAdminNotification(id);
    },

    async getUnreadCount() {
        return await FirebaseManager.getUnreadCount();
    }
};

// Модальное окно (оставляем без изменений)
const Modal = {
    show(title, content, buttons = []) {
        // ... существующий код модального окна ...
        return new Promise((resolve) => {
            // Код модального окна из предыдущей версии
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) {
                document.body.removeChild(existingModal);
            }
            
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                padding: 20px;
            `;
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.cssText = `
                background: rgba(30, 35, 50, 0.95);
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 100%;
                border: 1px solid rgba(41, 196, 255, 0.3);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            `;
            
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            titleElement.style.cssText = `
                color: #29c4ff;
                margin-bottom: 20px;
                text-align: center;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
            `;
            modal.appendChild(titleElement);
            
            const contentElement = document.createElement('div');
            contentElement.innerHTML = content;
            contentElement.style.cssText = 'color: #e0e1dd; line-height: 1.6; font-size: 14px;';
            modal.appendChild(contentElement);
            
            if (buttons.length > 0) {
                const actions = document.createElement('div');
                actions.style.cssText = 'display: flex; gap: 15px; margin-top: 25px;';
                
                buttons.forEach(button => {
                    const btn = document.createElement('button');
                    btn.className = button.class === 'secondary' ? 'btn-secondary' : 'btn-primary';
                    btn.textContent = button.text;
                    btn.style.cssText = 'flex: 1;';
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
            
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            };
            
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', handleEscape);
                    resolve(null);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    },

    showForm(title, fields) {
        // ... существующий код формы ...
        return new Promise((resolve) => {
            let formHTML = '';
            
            fields.forEach(field => {
                formHTML += `
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #e0e1dd; font-weight: 500;">
                            ${field.label} ${field.required ? '<span style="color: #ff6b6b;">*</span>' : ''}
                        </label>
                `;
                
                if (field.type === 'textarea') {
                    formHTML += `
                        <textarea class="enhanced-textarea" 
                                  name="${field.name}" 
                                  placeholder="${field.placeholder || ''}"
                                  rows="${field.rows || 4}"
                                  ${field.required ? 'required' : ''}
                                  style="width: 100%; resize: vertical; min-height: 80px;">${field.value || ''}</textarea>
                    `;
                } else if (field.type === 'select') {
                    formHTML += `
                        <select class="enhanced-select" 
                                name="${field.name}" 
                                ${field.required ? 'required' : ''}
                                style="width: 100%;">
                            <option value="">${field.placeholder || 'Оберіть...'}</option>
                    `;
                    
                    field.options.forEach(option => {
                        formHTML += `<option value="${option.value}" ${option.value === field.value ? 'selected' : ''}>${option.text}</option>`;
                    });
                    
                    formHTML += `</select>`;
                } else {
                    formHTML += `
                        <input type="${field.type || 'text'}" 
                               class="enhanced-input" 
                               name="${field.name}" 
                               placeholder="${field.placeholder || ''}"
                               value="${field.value || ''}"
                               ${field.required ? 'required' : ''}
                               style="width: 100%;">
                    `;
                }
                
                formHTML += `</div>`;
            });
            
            this.show(title, formHTML, [
                { text: 'Скасувати', class: 'secondary', value: null },
                { text: 'Зберегти', class: '', value: 'submit' }
            ]).then(result => {
                if (result === 'submit') {
                    const formData = {};
                    let isValid = true;
                    
                    fields.forEach(field => {
                        const input = document.querySelector(`[name="${field.name}"]`);
                        if (input) {
                            const value = input.value.trim();
                            
                            if (field.required && !value) {
                                isValid = false;
                                input.style.borderColor = '#ff6b6b';
                                input.focus();
                            } else {
                                formData[field.name] = value;
                                input.style.borderColor = '';
                            }
                        }
                    });
                    
                    if (isValid) {
                        resolve(formData);
                    } else {
                        this.show('Помилка', '<p style="color: #ff6b6b;">Будь ласка, заповніть всі обов\'язкові поля!</p>', [
                            { text: 'OK', class: '', value: 'ok' }
                        ]).then(() => {
                            this.showForm(title, fields).then(resolve);
                        });
                    }
                } else {
                    resolve(null);
                }
            });
        });
    }
};

// Выход из режима просмотра админа
function exitViewMode() {
    sessionStorage.removeItem('horting_admin_view');
    sessionStorage.removeItem('horting_view_team');
    window.location.href = 'dashboard.html';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Инициализируем FirebaseManager
    await TeamManager.init();
    
    // Для страницы входа
    if (document.getElementById('passwordInput')) {
        const passwordInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('loginBtn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', login);
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    login();
                }
            });
            
            // Фокус на поле ввода
            setTimeout(() => {
                passwordInput.focus();
            }, 100);
        }
    }
});

// Экспортируем глобальные функции
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
