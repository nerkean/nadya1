const express = require('express');
const path = require('path'); // Модуль для работы с путями
const TelegramBot = require('node-telegram-bot-api'); // <--- Добавили импорт

const app = express();
const PORT = process.env.PORT || 3000; // Render предоставит свой порт

// --- НАСТРОЙКИ TELEGRAM БОТА ---
// !!! ВАЖНО: Никогда не вставляй токен и ID прямо в код!
// Используй переменные окружения (Environment Variables) на твоем хостинге (Render).
const token = process.env.TELEGRAM_BOT_TOKEN; // Имя переменной для токена
const chatId = process.env.TELEGRAM_CHAT_ID;   // Имя переменной для ID чата

// Проверка, заданы ли переменные окружения
if (!token || !chatId) {
    console.warn('⚠️  Переменные окружения TELEGRAM_BOT_TOKEN и/или TELEGRAM_CHAT_ID не установлены.');
    console.warn('Уведомления в Telegram не будут работать. Установи их в настройках твоего хостинга (Render).');
}

let bot; // Объявляем переменную для бота здесь

// Инициализируем бота только если токен и chatId существуют
if (token && chatId) {
    try {
        // Инициализация бота (отключаем polling, нам нужна только отправка)
        bot = new TelegramBot(token, { polling: false });
        console.log('✅ Telegram бот инициализирован для отправки уведомлений.');
    } catch (error) {
        console.error('❌ Ошибка при инициализации Telegram бота:', error.message);
        // Возможно, неверный токен
        bot = null; // Убедимся, что бот не будет использоваться
    }
}
// --- Конец настроек Telegram ---


// Middleware для раздачи статических файлов из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для главной страницы (отдаем index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для UptimeRobot
app.get('/ping', (req, res) => {
    res.status(200).send('OK'); // Простой ответ для проверки активности
});

// --- ОБНОВЛЕННЫЙ МАРШРУТ: Логирование визита и отправка в Telegram ---
app.post('/log-visit', (req, res) => {
    const visitTime = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
    const logMessage = `➡️  Кто-то зашёл на сайт! Время: ${visitTime}`;

    // Логирование на сервере (в логи Render)
    console.log(logMessage);

    // Отправка сообщения в Telegram, если бот был успешно инициализирован
    if (bot && token && chatId) { // Дополнительно проверяем token и chatId на всякий случай
        // Можно настроить текст сообщения как угодно
        const telegramMessage = `💖 Ура! Кто-то только что зашел на твой особенный сайт! ✨ (${visitTime})`;

        // Используем try-catch для обработки возможных ошибок отправки
        try {
            bot.sendMessage(chatId, telegramMessage)
                .then(() => {
                    console.log('✉️  Уведомление в Telegram успешно отправлено.');
                })
                .catch((error) => {
                    // Логируем ошибку, если отправка не удалась
                    console.error('❌ Ошибка при отправке уведомления в Telegram:', error.response ? error.response.body : error.message);
                    // Пример: error.code ETELEGRAM, error.response.body содержит описание ошибки от API Telegram
                });
        } catch (error) {
            console.error('❌ Непредвиденная ошибка при попытке отправить сообщение через Telegram:', error.message);
        }
    } else {
         console.log('ℹ️  Telegram бот не настроен или не инициализирован, уведомление не отправлено.');
    }

    // Отправляем успешный ответ обратно в браузер (чтобы скрипт на сайте знал, что все ок)
    res.sendStatus(200); // Статус 200 OK
});
// --- Конец обновленного маршрута ---


// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    // Дополнительное напоминание при старте, если переменные не заданы
    if (!token || !chatId) {
         console.log("💡 Напоминание: Для включения уведомлений в Telegram установите переменные окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в настройках вашего хостинга.");
    }
});