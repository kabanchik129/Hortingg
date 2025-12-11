// horting-db.js
class HortingDatabase {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.useLocalStorage = false;
    }
    
    async init() {
        console.log("🔄 Ініціалізація бази даних...");
        
        if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.key) {
            console.warn("⚠️ Конфіг не знайдено — localStorage");
            return this.enableLocalStorage();
        }
        
        if (typeof supabase === "undefined" || !supabase.createClient) {
            console.warn("⚠️ Supabase SDK не завантажено — localStorage");
            return this.enableLocalStorage();
        }
        
        try {
            this.client = supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key,
                { auth: { persistSession: false } }
            );
            
            // Простая проверка подключения
            const { error } = await this.client.from("teams").select("id").limit(1);
            
            if (error) {
                console.warn("⚠️ Supabase недоступен:", error.message);
                return this.enableLocalStorage();
            }
            
            console.log("✅ База даних підключена!");
            this.isConnected = true;
            return true;
            
        } catch (e) {
            console.warn("⚠️ Помилка підключення:", e);
            return this.enableLocalStorage();
        }
    }
    
    enableLocalStorage() {
        this.useLocalStorage = true;
        console.log("📦 Використовується локальне сховище");
        return false;
    }
    
    // ... добавьте остальные методы по мере необходимости
}

window.HortingDB = new HortingDatabase();
