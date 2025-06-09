const jwt = require('jsonwebtoken');
const ADMIN_USERNAME = '1';
const ADMIN_PASSWORD = '2';
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-jwt'; // Store in Netlify env variables!

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        const { username, password } = JSON.parse(event.body);

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ username: ADMIN_USERNAME, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, token, message: 'Login successful' }),
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Internal server error during login' }),
        };
    }
};