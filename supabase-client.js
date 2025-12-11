// =============================
// supabase-client.js
// Полный, готовый, оптимизированный клиент
// =============================

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.useLocalStorage = false;
    }

    // =============================
    //  ИНИЦИАЛИЗАЦИЯ
    // =============================
    async init() {
        console.log("🔄 Ініціалізація Supabase...");

        // 1. Проверяем конфиг
        if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.key) {
            console.warn("⚠️ Supabase config не знайдено — використовуємо localStorage");
            return this.enableLocalStorage();
        }

        // 2. Проверяем наличие SDK - исправленная проверка
        if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
            console.warn("⚠️ Supabase SDK не завантажено — localStorage");
            return this.enableLocalStorage();
        }

        // 3. Создаём клиент
        try {
            this.client = window.supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key,
                { auth: { persistSession: false } }
            );
        } catch (e) {
            console.warn("⚠️ Не вдалося створити клієнт:", e);
            return this.enableLocalStorage();
        }

        // 4. Проверяем соединение
        try {
            // Используем try-catch вместо .catch()
            let data, error;
            try {
                const result = await this.client.from("teams").select("id").limit(1);
                data = result.data;
                error = result.error;
            } catch (e) {
                console.warn("⚠️ Помилка запиту:", e);
                return this.enableLocalStorage();
            }

            if (error) {
                console.warn("⚠️ Supabase недоступен:", error.message);
                return this.enableLocalStorage();
            }

            console.log("✅ Supabase підключено!");
            this.isConnected = true;

            // Проверяем/создаём команды
            await this.initializeTeamsIfMissing();

        } catch (e) {
            console.warn("⚠️ Помилка підключення:", e);
            return this.enableLocalStorage();
        }

        return true;
    }

    enableLocalStorage() {
        this.useLocalStorage = true;
        this.initLocalStorage();
        this.isConnected = false;
        console.log("📦 Використовується локальне сховище (offline)");
        return false;
    }

    // =============================
    //  ИНИЦИАЛИЗАЦИЯ КОМАНД
    // =============================
    async initializeTeamsIfMissing() {
        if (!this.isConnected || !this.client) return;

        try {
            const { data: teams, error } = await this.client.from("teams").select("*");

            if (error) {
                console.warn("⚠️ Помилка при отриманні команд:", error);
                return;
            }

            if (!teams || teams.length < 6) {
                console.log("🛠 Створюємо початкові команди...");

                const baseTeams = this.generateDefaultTeamsArray();

                // Добавляем поля для базы данных
                const teamsForDB = baseTeams.map(team => ({
                    ...team,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }));

                const { error: upsertError } = await this.client.from("teams").upsert(teamsForDB);
                
                if (upsertError) {
                    console.warn("⚠️ Помилка при створенні команд:", upsertError);
                } else {
                    console.log("✅ Команди ініціалізовано");
                }
            }
        } catch (e) {
            console.warn("⚠️ Помилка ініціалізації команд:", e);
        }
    }

    generateDefaultTeamsArray() {
        const templates = {
            1: { name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal" },
            2: { name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal" },
            3: { name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal" },
            4: { name: "4-та команда (старша)", color: "#96CEB4", type: "str" },
            5: { name: "5-та команда (старша)", color: "#FFEAA7", type: "str" },
            6: { name: "6-та команда (старша)", color: "#DDA0DD", type: "str" }
        };

        return Object.keys(templates).map(id => ({
            id: Number(id),
            ...templates[id],
            members: [],
            notifications: [],
            tasks: [],
            absences: []
        }));
    }

    // =============================
    // LOCAL STORAGE INIT
    // =============================
    initLocalStorage() {
        if (localStorage.getItem("horting_initialized")) return;

        console.log("📦 Створення даних у localStorage...");

        const teams = this.generateDefaultTeamsArray();

        for (const t of teams) {
            this.saveLocalData(`team_${t.id}`, t);
        }

        this.saveLocalData("global_notifications", []);
        this.saveLocalData("admin_messages", []);

        localStorage.setItem("horting_initialized", "true");
        console.log("✅ LocalStorage готовий");
    }

    // =============================
    // TEAM FUNCTIONS
    // =============================
    async getTeam(id) {
        if (this.useLocalStorage) return this.getLocalData(`team_${id}`);

        if (!this.isConnected || !this.client) return this.getLocalData(`team_${id}`);

        try {
            const { data, error } = await this.client.from("teams").select("*").eq("id", id).single();
            
            if (error) {
                console.warn("⚠️ Помилка отримання команди:", error);
                return this.getLocalData(`team_${id}`);
            }

            if (data) {
                this.saveLocalData(`team_${id}`, data);
            }
            
            return data || this.getLocalData(`team_${id}`);
        } catch (e) {
            console.warn("⚠️ Виняток при отриманні команди:", e);
            return this.getLocalData(`team_${id}`);
        }
    }

    async saveTeam(id, teamData) {
        this.saveLocalData(`team_${id}`, teamData);

        if (this.useLocalStorage || !this.isConnected || !this.client) return true;

        try {
            const dataForDB = {
                ...teamData,
                updated_at: new Date().toISOString()
            };

            const { error } = await this.client.from("teams").upsert(dataForDB);
            
            if (error) {
                console.error("Помилка збереження команди:", error);
                return false;
            }

            return true;
        } catch (e) {
            console.error("Виняток при збереженні команди:", e);
            return false;
        }
    }

    async getTeams() {
        if (this.useLocalStorage) {
            const result = {};
            for (let i = 1; i <= 6; i++) {
                result[i] = this.getLocalData(`team_${i}`);
            }
            return result;
        }

        if (!this.isConnected || !this.client) {
            const result = {};
            for (let i = 1; i <= 6; i++) result[i] = this.getLocalData(`team_${i}`);
            return result;
        }

        try {
            const { data, error } = await this.client.from("teams").select("*").order("id");

            if (error || !data) {
                console.warn("⚠️ Помилка отримання команд:", error);
                const result = {};
                for (let i = 1; i <= 6; i++) result[i] = this.getLocalData(`team_${i}`);
                return result;
            }

            data.forEach(t => this.saveLocalData(`team_${t.id}`, t));
            
            return Object.fromEntries(data.map(t => [t.id, t]));
        } catch (e) {
            console.warn("⚠️ Виняток при отриманні команд:", e);
            const result = {};
            for (let i = 1; i <= 6; i++) result[i] = this.getLocalData(`team_${i}`);
            return result;
        }
    }

    // =============================
    // GLOBAL NOTIFICATIONS
    // =============================
    async getGlobalNotifications() {
        if (this.useLocalStorage) return this.getLocalData("global_notifications") || [];

        if (!this.isConnected || !this.client) return this.getLocalData("global_notifications") || [];

        try {
            const { data, error } = await this.client
                .from("global_notifications")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.warn("⚠️ Помилка отримання сповіщень:", error);
                return this.getLocalData("global_notifications") || [];
            }

            if (data) {
                this.saveLocalData("global_notifications", data);
            }

            return data || this.getLocalData("global_notifications") || [];
        } catch (e) {
            console.warn("⚠️ Виняток при отриманні сповіщень:", e);
            return this.getLocalData("global_notifications") || [];
        }
    }

    async addGlobalNotification(info, author = "Адміністратор") {
        const notif = {
            id: `notif_${Date.now()}`,
            author,
            ...info,
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        // localStorage
        const cache = this.getLocalData("global_notifications") || [];
        cache.unshift(notif);
        this.saveLocalData("global_notifications", cache);

        // Supabase
        if (this.isConnected && this.client) {
            try {
                const { id, ...dataForDB } = notif;
                const { error } = await this.client.from("global_notifications").insert(dataForDB);
                
                if (error) {
                    console.warn("⚠️ Помилка збереження сповіщення:", error);
                }
            } catch (e) {
                console.warn("⚠️ Виняток при збереженні сповіщення:", e);
            }
        }

        return true;
    }

    async deleteGlobalNotification(id) {
        const list = this.getLocalData("global_notifications") || [];
        this.saveLocalData("global_notifications", list.filter(n => n.id !== id));

        if (this.isConnected && this.client && !id.startsWith("notif_")) {
            try {
                await this.client.from("global_notifications").delete().eq("id", id);
            } catch (e) {
                console.warn("⚠️ Виняток при видаленні сповіщення:", e);
            }
        }

        return true;
    }

    // =============================
    // ADMIN MESSAGES
    // =============================
    async getAdminMessages() {
        if (this.useLocalStorage) return this.getLocalData("admin_messages") || [];

        if (!this.isConnected || !this.client) return this.getLocalData("admin_messages") || [];

        try {
            const { data, error } = await this.client
                .from("admin_messages")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.warn("⚠️ Помилка отримання повідомлень:", error);
                return this.getLocalData("admin_messages") || [];
            }

            if (data) {
                this.saveLocalData("admin_messages", data);
            }

            return data || this.getLocalData("admin_messages") || [];
        } catch (e) {
            console.warn("⚠️ Виняток при отриманні повідомлень:", e);
            return this.getLocalData("admin_messages") || [];
        }
    }

    async addAdminMessage(text, fromTeam) {
        const msg = {
            id: `msg_${Date.now()}`,
            message: text,
            fromTeam,
            from_team: fromTeam,
            read: false,
            is_read: false,
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        const list = this.getLocalData("admin_messages") || [];
        list.unshift(msg);
        this.saveLocalData("admin_messages", list);

        if (this.isConnected && this.client) {
            try {
                const { id, fromTeam, read, date, ...dbData } = msg;
                const { error } = await this.client.from("admin_messages").insert(dbData);
                
                if (error) {
                    console.warn("⚠️ Помилка збереження повідомлення:", error);
                }
            } catch (e) {
                console.warn("⚠️ Виняток при збереженні повідомлення:", e);
            }
        }

        return true;
    }

    async markMessageAsRead(id) {
        const list = this.getLocalData("admin_messages") || [];
        const msg = list.find(m => m.id === id);
        if (msg) {
            msg.read = true;
            msg.is_read = true;
            this.saveLocalData("admin_messages", list);
        }

        if (this.isConnected && this.client && !id.startsWith("msg_")) {
            try {
                await this.client.from("admin_messages").update({ is_read: true }).eq("id", id);
            } catch (e) {
                console.warn("⚠️ Виняток при оновленні повідомлення:", e);
            }
        }
    }

    async markAllMessagesAsRead() {
        const list = this.getLocalData("admin_messages") || [];
        list.forEach(m => { m.read = true; m.is_read = true; });
        this.saveLocalData("admin_messages", list);

        if (this.isConnected && this.client) {
            try {
                await this.client.from("admin_messages").update({ is_read: true }).eq("is_read", false);
            } catch (e) {
                console.warn("⚠️ Виняток при оновленні всіх повідомлень:", e);
            }
        }
    }

    async deleteAdminMessage(id) {
        const list = this.getLocalData("admin_messages") || [];
        this.saveLocalData("admin_messages", list.filter(m => m.id !== id));

        if (this.isConnected && this.client && !id.startsWith("msg_")) {
            try {
                await this.client.from("admin_messages").delete().eq("id", id);
            } catch (e) {
                console.warn("⚠️ Виняток при видаленні повідомлення:", e);
            }
        }
    }

    // =============================
    // LOCAL STORAGE HELPERS
    // =============================
    saveLocalData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error("⚠️ Помилка збереження в localStorage:", e);
        }
    }

    getLocalData(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error("⚠️ Помилка читання з localStorage:", e);
            return null;
        }
    }

    // =============================
    // CLEAR CACHE
    // =============================
    clearCache() {
        for (let i = 1; i <= 6; i++) {
            localStorage.removeItem(`team_${i}`);
        }
        localStorage.removeItem("global_notifications");
        localStorage.removeItem("admin_messages");
        localStorage.removeItem("horting_initialized");
        console.log("🧹 Кеш очищено");
    }
}

// Создаем глобальный экземпляр
window.HortingDB = new SupabaseClient();
