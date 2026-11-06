
// Флаг задается в base.html. 
// true — если зашел пользователь с правами is_staff (админ).
// false — для обычных пользователей и гостей.
window.DEBUG_MODE = window.DEBUG_MODE || false;

window.debugLog = function (moduleName, customText = null) {
    // 1. Если user не админ — консоль молчит
    if (!window.DEBUG_MODE) return;

    // 2. Защита от вызова напрямую из консоли браузера
    const stack = new Error().stack || '';
    if (stack.includes('console') || stack.includes('<anonymous>')) {
        return; 
    }

    // 3. Формируем стиль для вывода в консоль
    if (customText) {
        // Если передан свой текст (например, ошибка или действие)
        console.log(`[DEBUG] ${moduleName}.......${customText}`);
    } else {
        // Если передан только модуль — значит, он просто запустился
        console.log(`[DEBUG] ${moduleName}.......РАБОТАЕТ`);
    }
};