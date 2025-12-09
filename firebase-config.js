// firebase-config.js

// Конфигурация Firebase (замените на свои данные из Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyBIG0qp7QJt7S4dvwMHpuqsjyJ7kkyR64A",
    authDomain: "hortingg.firebaseapp.com",
    projectId: "hortingg",
    storageBucket: "hortingg.firebasestorage.app",
    messagingSenderId: "374849935944",
    appId: "1:374849935944:web:547de2b74b732ae2af167d"
};

// Инициализация Firebase
let app, db, auth;

try {
    // Проверяем, не инициализирован ли Firebase уже
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    
    db = firebase.firestore(app);
    auth = firebase.auth(app);
    
    console.log('Firebase инициализирован успешно');
    
    // Включаем офлайн поддержку
    db.enablePersistence()
        .then(() => {
            console.log('Firestore офлайн поддержка включена');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Несколько вкладок открыто, офлайн поддержка отключена');
            } else if (err.code === 'unimplemented') {
                console.warn('Браузер не поддерживает офлайн режим');
            }
        });
    
} catch (error) {
    console.error('Ошибка инициализации Firebase:', error);
}

// Экспорт для использования
window.firebaseApp = app;
window.firestore = db;
window.auth = auth;

// Утилиты для работы с данными
window.firebaseUtils = {
    // Проверка подключения
    async testConnection() {
        try {
            await db.collection('test').doc('test').get();
            return true;
        } catch (error) {
            console.warn('Firestore недоступен:', error);
            return false;
        }
    },
    
    // Конвертация даты
    timestampToDate(timestamp) {
        if (timestamp && timestamp.toDate) {
            return timestamp.toDate();
        }
        return new Date();
    },
    
    // Получить текущий timestamp
    getServerTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    },
    
    // Создать ID
    generateId() {
        return db.collection('temp').doc().id;
    }
};

// Менеджер данных Firebase
class FirebaseDataManager {
    constructor() {
        this.db = db;
        this.cache = new Map();
        this.offlineMode = false;
        this.init();
    }
    
    async init() {
        // Проверяем соединение
        this.offlineMode = !navigator.onLine;
        
        // Слушаем изменения сети
        window.addEventListener('online', () => {
            this.offlineMode = false;
            this.syncLocalData();
        });
        
        window.addEventListener('offline', () => {
            this.offlineMode = true;
        });
    }
    
    // Получить команду
    async getTeam(teamId) {
        const cacheKey = `team_${teamId}`;
        
        // Пробуем получить из кеша
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            // Пробуем получить из Firestore
            const doc = await this.db.collection('teams').doc(teamId.toString()).get();
            
            if (doc.exists) {
                const data = doc.data();
                this.cache.set(cacheKey, data);
                this.saveToLocalStorage(`team_${teamId}`, data);
                return data;
            }
            
            // Если нет в Firestore, пробуем localStorage
            const localData = this.getFromLocalStorage(`team_${teamId}`);
            if (localData) {
                this.cache.set(cacheKey, localData);
                return localData;
            }
            
            return null;
            
        } catch (error) {
            console.error('Ошибка получения команды:', error);
            
            // Fallback на localStorage
            const localData = this.getFromLocalStorage(`team_${teamId}`);
            if (localData) {
                this.cache.set(cacheKey, localData);
                return localData;
            }
            
            return null;
        }
    }
    
    // Сохранить команду
    async saveTeam(teamId, data) {
        const cacheKey = `team_${teamId}`;
        
        // Обновляем кеш
        this.cache.set(cacheKey, data);
        
        // Сохраняем в localStorage
        this.saveToLocalStorage(`team_${teamId}`, data);
        
        try {
            // Пробуем сохранить в Firestore
            await this.db.collection('teams').doc(teamId.toString()).set({
                ...data,
                id: teamId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log(`Команда ${teamId} сохранена в Firestore`);
            return true;
            
        } catch (error) {
            console.error('Ошибка сохранения в Firestore:', error);
            
            // Помечаем для синхронизации
            this.queueForSync('team', teamId, data);
            return false;
        }
    }
    
    // Синхронизация локальных данных
    async syncLocalData() {
        if (this.offlineMode) return;
        
        const queue = this.getSyncQueue();
        
        for (const item of queue) {
            try {
                switch(item.type) {
                    case 'team':
                        await this.db.collection('teams').doc(item.id.toString()).set(item.data, { merge: true });
                        break;
                    case 'notification':
                        await this.db.collection('global_notifications').add(item.data);
                        break;
                }
                
                this.removeFromSyncQueue(item.id);
            } catch (error) {
                console.error('Ошибка синхронизации:', error);
            }
        }
    }
    
    // Вспомогательные методы
    saveToLocalStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }
    
    getFromLocalStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }
    
    queueForSync(type, id, data) {
        const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
        queue.push({ type, id, data, timestamp: Date.now() });
        localStorage.setItem('sync_queue', JSON.stringify(queue));
    }
    
    getSyncQueue() {
        return JSON.parse(localStorage.getItem('sync_queue') || '[]');
    }
    
    removeFromSyncQueue(id) {
        const queue = this.getSyncQueue();
        const filtered = queue.filter(item => item.id !== id);
        localStorage.setItem('sync_queue', JSON.stringify(filtered));
    }
}

// Создаем и экспортируем менеджер данных
const dataManager = new FirebaseDataManager();
window.dataManager = dataManager;
