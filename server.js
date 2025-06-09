require('dotenv').config(); // Загружаем переменные из .env
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Импортируем хендлеры ваших Netlify функций
const { handler: authHandler } = require('./netlify/functions/auth.js');
const { handler: newsApiHandler } = require('./netlify/functions/news-api.js');

app.use(express.json()); // Для парсинга JSON тел запросов
app.use(express.urlencoded({ extended: true }));

// Middleware для адаптации Express req/res к формату Netlify Function event/context
const adaptNetlifyFunction = (netlifyHandler) => {
    return async (req, res) => {
        const event = {
            httpMethod: req.method,
            path: req.path, // req.originalUrl может быть лучше для полного пути
            headers: req.headers,
            body: req.body ? JSON.stringify(req.body) : null, // Netlify ожидает строку
            queryStringParameters: req.query,
            // Дополнительные поля event можно добавить по необходимости
        };
        const context = {}; // Пустой контекст для простоты

        try {
            const result = await netlifyHandler(event, context);
            res.status(result.statusCode);
            if (result.headers) {
                for (const [key, value] of Object.entries(result.headers)) {
                    res.setHeader(key, value);
                }
            }
            // Netlify handler может возвращать тело как строку, так и JSON
            // Если Content-Type это application/json, парсим. Иначе отдаем как есть.
            if (result.headers && result.headers['Content-Type'] === 'application/json' && typeof result.body === 'string') {
                try {
                    res.json(JSON.parse(result.body));
                } catch (e) {
                     res.send(result.body); // Если не удалось спарсить, отдать как есть
                }
            } else {
                res.send(result.body);
            }

        } catch (error) {
            console.error("Error in adapted Netlify function:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    };
};

// Маршруты API (соответствующие вашим netlify.toml redirects)
app.post('/admin/login', adaptNetlifyFunction(authHandler));

// Для /api/news и /api/news/:id лучше использовать один обработчик,
// так как newsApiHandler уже разбирает event.path
app.all('/api/news', adaptNetlifyFunction(newsApiHandler));
app.all('/api/news/:id', adaptNetlifyFunction(newsApiHandler));


// Обслуживание статических файлов из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Отдавать index.html для любых других GET запросов, не являющихся API или файлами
// Это полезно для SPA-подобного поведения, если у вас есть клиентская маршрутизация
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
        return next(); // Пропускаем API запросы
    }
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        next(); // Для запросов не на HTML (например, CSS, JS из index.html)
    }
});


app.listen(port, () => {
    console.log(`Node.js server listening at http://localhost:${port}`);
    console.log(`Frontend should be accessible at http://localhost:${port}/index.html`);
    console.log(`Admin panel at http://localhost:${port}/admin.html`);
    console.log(`API endpoints:`);
    console.log(`  POST http://localhost:${port}/admin/login`);
    console.log(`  GET/POST http://localhost:${port}/api/news`);
    console.log(`  PUT/DELETE http://localhost:${port}/api/news/:id`);
    console.log("---");
    console.log("ВАЖНО: В файле netlify/functions/news-api.js путь к news.json:");
    console.log("const dataFilePath = path.resolve(__dirname, 'data', 'news.json');");
    console.log("Убедитесь, что __dirname (т.е. папка netlify/functions/) содержит папку 'data' с 'news.json'");
    console.log("Если вы запускаете 'node server.js' из корня проекта, то это должно работать.");
    console.log("Если вы используете `process.env.NETLIFY_DEV`, уберите эту переменную окружения или установите в false при запуске с `node server.js`");
});