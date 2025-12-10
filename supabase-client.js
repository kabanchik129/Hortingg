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

        // 2. Проверяем наличие SDK
        if (typeof supabase === "undefined") {
            console.warn("⚠️ Supabase SDK не завантажено — localStorage");
            return this.enableLocalStorage();
        }

        // 3. Создаём клиент
        this.client = supabase.createClient(
            window.SUPABASE_CONFIG.url,
            window.SUPABASE_CONFIG.key,
            { auth: { persistSession: false } }
        );

        // 4. Проверяем соединение
        try {
            const { error } = await this.client.from("teams").select("id").limit(1);

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
        if (!this.isConnected) return;

        const { data: teams, error } = await this.client.from("teams").select("*");

        if (error) return;

        if (!teams || teams.length < 6) {
            console.log("🛠 Створюємо початкові команди...");

            const baseTeams = this.generateDefaultTeamsArray();

            await this.client.from("teams").upsert(baseTeams);
            console.log("✅ Команди ініціалізовано");
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

        try {
            const { data, error } = await this.client.from("teams").select("*").eq("id", id).single();
            if (error) return this.getLocalData(`team_${id}`);

            this.saveLocalData(`team_${id}`, data);
            return data;
        } catch {
            return this.getLocalData(`team_${id}`);
        }
    }

    async saveTeam(id, teamData) {
        this.saveLocalData(`team_${id}`, teamData);

        if (this.useLocalStorage || !this.isConnected) return true;

        const { error } = await this.client.from("teams").upsert(teamData);
        if (error) console.error("Помилка збереження команди:", error);

        return !error;
    }

    async getTeams() {
        if (this.useLocalStorage) {
            const result = {};
            for (let i = 1; i <= 6; i++) {
                result[i] = this.getLocalData(`team_${i}`);
            }
            return result;
        }

        const { data, error } = await this.client.from("teams").select("*").order("id");

        if (error || !data) {
            const result = {};
            for (let i = 1; i <= 6; i++) result[i] = this.getLocalData(`team_${i}`);
            return result;
        }

        data.forEach(t => this.saveLocalData(`team_${t.id}`, t));
        return Object.fromEntries(data.map(t => [t.id, t]));
    }

    // =============================
    // GLOBAL NOTIFICATIONS
    // =============================
    async getGlobalNotifications() {
        if (this.useLocalStorage) return this.getLocalData("global_notifications") || [];

        const { data, error } = await this.client
            .from("global_notifications")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) return this.getLocalData("global_notifications") || [];

        this.saveLocalData("global_notifications", data);
        return data;
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
        if (this.isConnected) {
            const { id, ...dataForDB } = notif;
            await this.client.from("global_notifications").insert(dataForDB);
        }

        return true;
    }

    async deleteGlobalNotification(id) {
        const list = this.getLocalData("global_notifications") || [];
        this.saveLocalData("global_notifications", list.filter(n => n.id !== id));

        if (this.isConnected && !id.startsWith("notif_")) {
            await this.client.from("global_notifications").delete().eq("id", id);
        }

        return true;
    }

    // =============================
    // ADMIN MESSAGES
    // =============================
    async getAdminMessages() {
        if (this.useLocalStorage) return this.getLocalData("admin_messages") || [];

        const { data, error } = await this.client
            .from("admin_messages")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) return this.getLocalData("admin_messages") || [];

        this.saveLocalData("admin_messages", data);
        return data;
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

        if (this.isConnected) {
            const { id, fromTeam, read, date, ...dbData } = msg;
            await this.client.from("admin_messages").insert(dbData);
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

        if (this.isConnected && !id.startsWith("msg_")) {
            await this.client.from("admin_messages").update({ is_read: true }).eq("id", id);
        }
    }

    async markAllMessagesAsRead() {
        const list = this.getLocalData("admin_messages") || [];
        list.forEach(m => { m.read = true; m.is_read = true; });
        this.saveLocalData("admin_messages", list);

        if (this.isConnected) {
            await this.client.from("admin_messages").update({ is_read: true }).eq("is_read", false);
        }
    }

    async deleteAdminMessage(id) {
        const list = this.getLocalData("admin_messages") || [];
        this.saveLocalData("admin_messages", list.filter(m => m.id !== id));

        if (this.isConnected && !id.startsWith("msg_")) {
            await this.client.from("admin_messages").delete().eq("id", id);
        }
    }

    // =============================
    // LOCAL STORAGE HELPERS
    // =============================
    saveLocalData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    getLocalData(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    }
}

window.HortingDB = new SupabaseClient();
