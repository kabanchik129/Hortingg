// В supabase-client.js в функции initializeDefaultData заменяем:

async initializeDefaultData() {
    try {
        console.log('Перевірка наявності початкових даних...');
        
        // Проверяем, есть ли команды
        const { data: teams, error } = await this.client.from('teams').select('*');
        
        if (error) throw error;
        
        // Если команд нет, создаем ТОЛЬКО пустые команды
        if (!teams || teams.length === 0) {
            console.log('Створюємо початкові дані в Supabase...');
            
            const teamsData = [
                { id: 1, name: "1-ша команда (молодша)", color: "#FF6B6B", type: "mal", members: [], notifications: [], tasks: [], absences: [] },
                { id: 2, name: "2-га команда (молодша)", color: "#4ECDC4", type: "mal", members: [], notifications: [], tasks: [], absences: [] },
                { id: 3, name: "3-тя команда (розвідка)", color: "#45B7D1", type: "mal", members: [], notifications: [], tasks: [], absences: [] },
                { id: 4, name: "4-та команда (старша)", color: "#96CEB4", type: "str", members: [], notifications: [], tasks: [], absences: [] },
                { id: 5, name: "5-та команда (старша)", color: "#FFEAA7", type: "str", members: [], notifications: [], tasks: [], absences: [] },
                { id: 6, name: "6-та команда (старша)", color: "#DDA0DD", type: "str", members: [], notifications: [], tasks: [], absences: [] }
            ];
            
            // Вставляем все команды одной операцией
            const { error: insertError } = await this.client
                .from('teams')
                .insert(teamsData);
                
            if (insertError) throw insertError;
            
            console.log('✅ Створено 6 пустих команд в Supabase');
        } else {
            console.log(`✅ В Supabase вже є ${teams.length} команд`);
        }
        
    } catch (error) {
        console.error('Помилка створення початкових даних:', error);
    }
}
