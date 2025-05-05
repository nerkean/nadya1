require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const UAParser = require('ua-parser-js');

const app = express();
const PORT = process.env.PORT || 3000;

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
let bot;

console.log('ℹ️  Запуск сервера...');

if (!token || !chatId) {
    console.warn('⚠️  Переменные окружения TELEGRAM_BOT_TOKEN и/или TELEGRAM_CHAT_ID не установлены.');
    console.warn('⚠️  Уведомления в Telegram НЕ БУДУТ работать. Пожалуйста, установи их в настройках твоего хостинга (Render).');
} else {
    try {
        bot = new TelegramBot(token, { polling: false }); 
        console.log('✅ Telegram бот успешно инициализирован.');
    } catch (error) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА при инициализации Telegram бота:', error.message);
        console.error('❌ Убедись, что TELEGRAM_BOT_TOKEN указан верно в переменных окружения.');
        bot = null; 
    }
}

app.set('trust proxy', true); 
console.log('✅ Express настроен доверять прокси.');

app.use(express.static(path.join(__dirname, 'public')));
console.log(`✅ Статические файлы (HTML, CSS, JS) раздаются из папки: ${path.join(__dirname, 'public')}`);


app.get('/', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET / - IP: ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ping', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /ping - IP: ${req.ip} - Ответ: OK`);
    res.status(200).send('OK'); 
});

app.post('/log-visit', (req, res) => {
    const visitTime = new Date();
    const visitTimeFormatted = visitTime.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
    const ipAddress = req.ip;
    const userAgentString = req.headers['user-agent'] || 'Не определен';

    let deviceInfo = `UA: ${userAgentString}`;
    try {
        const UAParser = require('ua-parser-js');
        const parser = new UAParser();
        const uaResult = parser.setUA(userAgentString).getResult();
        const browser = uaResult.browser.name && uaResult.browser.version ? `${uaResult.browser.name} ${uaResult.browser.version}` : 'Неизвестный браузер';
        const os = uaResult.os.name && uaResult.os.version ? `${uaResult.os.name} ${uaResult.os.version}` : 'Неизвестная ОС';
        const device = uaResult.device.vendor && uaResult.device.model ? `${uaResult.device.vendor} ${uaResult.device.model}` : (uaResult.device.type || 'Неизвестное устройство');
        deviceInfo = `🖥️ ${browser}, ${os}, ${device === 'undefined undefined' ? 'Компьютер?' : device}`;
    } catch (parseError) {
        if (parseError.code === 'MODULE_NOT_FOUND') {
             console.warn('⚠️  Библиотека ua-parser-js не установлена. Для детальной информации об устройстве установите ее: npm install ua-parser-js');
        } else {
            console.error('⚠️ Ошибка парсинга User-Agent:', parseError.message);
        }
    }

    const serverLogMessage = `➡️  [${visitTime.toISOString()}] Новый визит! IP: ${ipAddress}, Инфо: ${deviceInfo}`;
    console.log(serverLogMessage);

    if (bot) {
        const escapeMarkdownV2 = (text) => {
          if (!text) return '';
          return text.toString().replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
        };

        const safeIp = escapeMarkdownV2(ipAddress);
        const safeDeviceInfo = escapeMarkdownV2(deviceInfo.replace(/\n/g, ', '));
        const safeTime = escapeMarkdownV2(visitTimeFormatted);

        const telegramMessage = `💖 *Новый визит на сайт\\!* 💖\n\n` +
                                `*Время:* ${safeTime}\n` +
                                `*IP:* \`${safeIp}\`\n` +
                                `*Инфо:* ${safeDeviceInfo}\n\n` +
                                `✨ _Кто же это мог быть?_ ✨`;

        bot.sendMessage(chatId, telegramMessage, { parse_mode: 'MarkdownV2' })
            .then(() => {
                console.log(`✅ Уведомление в Telegram для IP ${ipAddress} успешно отправлено.`);
            })
            .catch((error) => {
                const errorBody = error.response ? error.response.body : {};
                const errorCode = errorBody.error_code || 'N/A';
                const errorDescription = errorBody.description || error.message;
                console.error(`❌ Ошибка отправки в Telegram для IP ${ipAddress}: Код ${errorCode} - ${errorDescription}`);

                 if (errorCode === 400 || errorDescription.toLowerCase().includes('parse error')) {
                    console.log('ℹ️ Ошибка форматирования Markdown. Попытка отправить сообщение без форматирования...');
                    const fallbackMessage = `Новый визит!\nВремя: ${visitTimeFormatted}\nIP: ${ipAddress}\nИнфо: ${deviceInfo}`;
                    bot.sendMessage(chatId, fallbackMessage).catch(fallbackError => {
                         console.error(`❌ Ошибка отправки даже простого сообщения: ${fallbackError.message}`);
                    });
                 }
            });
    } else {
        console.log(`ℹ️  Telegram бот не настроен, уведомление для IP ${ipAddress} не отправлено.`);
    }

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log('-----------------------------------------');
    console.log(`🚀 Сервер успешно запущен на порту ${PORT}`);
    console.log(`🔗 Локальный адрес: http://localhost:${PORT}`);
    if (process.env.RENDER_EXTERNAL_URL) {
         console.log(`🔗 Внешний адрес (Render): ${process.env.RENDER_EXTERNAL_URL}`);
    }
    console.log(`🕒 Текущее время сервера: ${new Date().toISOString()}`);
    if (bot) {
        console.log(`✅ Уведомления в Telegram активны для чата ID: ${chatId}`);
    } else {
         console.log('⚠️ Уведомления в Telegram НЕ активны (проверь переменные окружения).');
    }
    console.log('-----------------------------------------');
});

app.use((err, req, res, next) => {
  console.error(`💥💥💥 Необработанная ошибка сервера! 💥💥💥`);
  console.error(`[${new Date().toISOString()}] Ошибка при обработке запроса ${req.method} ${req.originalUrl} от IP ${req.ip}`);
  console.error('Сообщение:', err.message);
  console.error('Стек:', err.stack);
  res.status(500).send('🥺 Ой! Что-то пошло не так на сервере...');
});
