const express = require('express');
const path = require('path'); 
const TelegramBot = require('node-telegram-bot-api'); 

const app = express();
const PORT = process.env.PORT || 3000; 

const token = process.env.TELEGRAM_BOT_TOKEN; 
const chatId = process.env.TELEGRAM_CHAT_ID;  

let bot;

if (token && chatId) {
    try {
        bot = new TelegramBot(token, { polling: false });
        console.log('✅ Telegram бот инициализирован для отправки уведомлений.');
    } catch (error) {
        console.error('❌ Ошибка при инициализации Telegram бота:', error.message);
        bot = null; 
    }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

app.post('/log-visit', (req, res) => {
    const visitTime = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
    const logMessage = `➡️  Кто-то зашёл на сайт! Время: ${visitTime}`;

    console.log(logMessage);

    if (bot && token && chatId) { 
        const telegramMessage = `💖 Кто-то только что зашел на твой особенный сайт ✨ (${visitTime})`;

        try {
            bot.sendMessage(chatId, telegramMessage)
                .then(() => {
                    console.log('✉️  Уведомление в Telegram успешно отправлено.');
                })
                .catch((error) => {
                    console.error('❌ Ошибка при отправке уведомления в Telegram:', error.response ? error.response.body : error.message);
                });
        } catch (error) {
            console.error('❌ Непредвиденная ошибка при попытке отправить сообщение через Telegram:', error.message);
        }
    }
    res.sendStatus(200); 
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});