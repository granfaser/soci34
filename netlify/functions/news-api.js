const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Path to the news.json file, relative to the function's execution context
// When deployed, Netlify bundles files from the function's directory.
// For local dev with `netlify dev`, it needs to resolve from project root.
const dataFilePath = process.env.NETLIFY_DEV
    ? path.resolve(__dirname, 'data', 'news.json') // Local dev
    : path.resolve(process.cwd(), 'netlify', 'functions', 'data', 'news.json'); // Deployed

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-jwt';

// In-memory cache of news data to simulate writes for the session
// This will be re-read from file on cold starts or new deployments
let newsData = [];

try {
    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    newsData = JSON.parse(rawData);
} catch (error) {
    console.error("Error reading or parsing news.json:", error);
    // If file doesn't exist or is invalid, start with an empty array
    newsData = [];
}


// Helper to "persist" changes to the in-memory array.
// In a real scenario with Netlify Functions, you'd write to a database.
// Writing to the bundled file system is not persistent across deployments/invocations.
// This function primarily serves to update the 'newsData' variable.
function writeNewsData(data) {
    newsData = data; // Update in-memory store
    // console.log("Simulated write. Data in memory:", newsData);
    // Note: The following fs.writeFileSync will only work reliably in local dev.
    // On deployed Netlify, it might write to a temporary, ephemeral location.
    // The `news.json` bundled with the function will not be permanently changed by this.
    try {
        if (process.env.NETLIFY_DEV) { // Allow writing locally for easier testing
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
    const pathParts = event.path.split('/').filter(Boolean); // e.g. ['', 'api', 'news', 'id'] -> ['api', 'news', 'id']
    const resourceId = pathParts.length > 2 ? pathParts[2] : null; // Assumes /api/news/:id

    // Public GET all news
    if (method === 'GET' && !resourceId) {
        return {
            statusCode: 200,
            body: JSON.stringify(newsData.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // All other operations require authentication
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'admin') {
        return {
            statusCode: 401, // Unauthorized or 403 Forbidden
            body: JSON.stringify({ message: 'Access Denied: Valid token required for this operation.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        switch (method) {
            case 'POST': // Create news
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
                writeNewsData(updatedDataForPost); // Simulates write
                return {
                    statusCode: 201,
                    body: JSON.stringify({ message: 'Новость успешно создана (изменения в памяти)', item: newItem }),
                    headers: { 'Content-Type': 'application/json' },
                };

            case 'PUT': // Update news
                if (!resourceId) return { statusCode: 400, body: JSON.stringify({ message: 'Missing news ID for update.' }) };
                
                const updatedItemData = JSON.parse(event.body);
                let itemUpdated = false;
                const updatedDataForPut = newsData.map(item => {
                    if (item.id === resourceId) {
                        itemUpdated = true;
                        return { ...item, ...updatedItemData, id: item.id, publishedDate: item.publishedDate }; // Keep original ID and date
                    }
                    return item;
                });

                if (!itemUpdated) {
                    return { statusCode: 404, body: JSON.stringify({ message: 'Новость не найдена.' }) };
                }
                writeNewsData(updatedDataForPut); // Simulates write
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Новость успешно обновлена (изменения в памяти)', item: updatedDataForPut.find(i => i.id === resourceId) }),
                    headers: { 'Content-Type': 'application/json' },
                };

            case 'DELETE': // Delete news
                 if (!resourceId) return { statusCode: 400, body: JSON.stringify({ message: 'Missing news ID for delete.' }) };
                
                const initialLength = newsData.length;
                const updatedDataForDelete = newsData.filter(item => item.id !== resourceId);

                if (updatedDataForDelete.length === initialLength) {
                     return { statusCode: 404, body: JSON.stringify({ message: 'Новость не найдена для удаления.' }) };
                }
                writeNewsData(updatedDataForDelete); // Simulates write
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