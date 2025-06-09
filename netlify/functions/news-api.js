// Полное содержимое файла: netlify/functions/news-api.js

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const dataFilePath = process.env.NETLIFY_DEV
    ? path.resolve(__dirname, 'data', 'news.json')
    : path.resolve(process.cwd(), 'netlify', 'functions', 'data', 'news.json');

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-jwt';

let newsData = [];
try {
    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    newsData = JSON.parse(rawData);
} catch (error) {
    console.error("Error reading or parsing news.json:", error);
    newsData = [];
}

function writeNewsData(data) {
    newsData = data;
    try {
        if (process.env.NETLIFY_DEV) {
            fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
        }
    } catch (writeError) {
        console.error("Error writing news.json (this is expected on deployed Netlify):", writeError);
    }
}

function verifyToken(event) {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        console.error("Token verification failed:", e.message);
        return null;
    }
}

exports.handler = async (event, context) => {
    const method = event.httpMethod;
    // Определяем resourceId из пути
    // event.path для Netlify Functions включает префикс функции, например, /.netlify/functions/news-api/ID
    // или если настроены редиректы, то может быть /api/news/ID
    // Этот код пытается быть гибким
    let resourceId = null;
    if (event.path) {
        const pathParts = event.path.split('/');
        // Ищем ID после 'news-api' или 'news' (в зависимости от того, как пришел path)
        const apiSegmentIndex = pathParts.findIndex(segment => segment === 'news-api' || segment === 'news');
        if (apiSegmentIndex !== -1 && apiSegmentIndex < pathParts.length - 1) {
            const potentialId = pathParts[apiSegmentIndex + 1];
            // Простая проверка, что ID не пустой и не является другим сегментом пути (например, частью query string)
            if (potentialId && !potentialId.includes('?')) {
                 resourceId = potentialId;
            }
        }
    }


    // --- НАЧАЛО ИЗМЕНЕННОГО БЛОКА ДЛЯ GET ---
    if (method === 'GET') {
        if (resourceId) { // Если есть ID, пытаемся вернуть одну новость
            const singleItem = newsData.find(item => item.id === resourceId);
            if (singleItem) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(singleItem),
                    headers: { 'Content-Type': 'application/json' },
                };
            } else {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Новость не найдена' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
        } else { // Если ID нет, возвращаем все новости
            return {
                statusCode: 200,
                body: JSON.stringify(newsData.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    }
    // --- КОНЕЦ ИЗМЕНЕННОГО БЛОКА ДЛЯ GET ---


    // All other operations require authentication
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'admin') {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Access Denied: Valid token required for this operation.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        switch (method) {
            case 'POST':
                if (resourceId) return { statusCode: 400, body: JSON.stringify({ message: 'Cannot POST to a specific ID.' }) };
                
                const newItemData = JSON.parse(event.body);
                if (!newItemData.title || !newItemData.content) {
                    return { statusCode: 400, body: JSON.stringify({ message: 'Title and content are required.'}) };
                }
                const newItem = {
                    id: Date.now().toString(),
                    ...newItemData,
                    publishedDate: new Date().toISOString(),
                };
                const updatedDataForPost = [...newsData, newItem];
                writeNewsData(updatedDataForPost);
                return {
                    statusCode: 201,
                    body: JSON.stringify({ message: 'Новость успешно создана (изменения в памяти)', item: newItem }),
                    headers: { 'Content-Type': 'application/json' },
                };

            case 'PUT':
                if (!resourceId) return { statusCode: 400, body: JSON.stringify({ message: 'Missing news ID for update.' }) };
                
                const updatedItemData = JSON.parse(event.body);
                let itemUpdated = false;
                const updatedDataForPut = newsData.map(item => {
                    if (item.id === resourceId) {
                        itemUpdated = true;
                        return { ...item, ...updatedItemData, id: item.id, publishedDate: item.publishedDate };
                    }
                    return item;
                });

                if (!itemUpdated) {
                    return { statusCode: 404, body: JSON.stringify({ message: 'Новость не найдена.' }) };
                }
                writeNewsData(updatedDataForPut);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Новость успешно обновлена (изменения в памяти)', item: updatedDataForPut.find(i => i.id === resourceId) }),
                    headers: { 'Content-Type': 'application/json' },
                };

            case 'DELETE':
                 if (!resourceId) return { statusCode: 400, body: JSON.stringify({ message: 'Missing news ID for delete.' }) };
                
                const initialLength = newsData.length;
                const updatedDataForDelete = newsData.filter(item => item.id !== resourceId);

                if (updatedDataForDelete.length === initialLength) {
                     return { statusCode: 404, body: JSON.stringify({ message: 'Новость не найдена для удаления.' }) };
                }
                writeNewsData(updatedDataForDelete);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Новость успешно удалена (изменения в памяти)' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ message: 'Method Not Allowed for admin endpoint' }),
                    headers: { 'Content-Type': 'application/json' },
                };
        }
    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};