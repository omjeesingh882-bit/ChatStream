// const axios = require('axios'); // Removed unused dependency

// Using native fetch if available (Node 18+), else might need axios. 
// Let's assume Node 18+ or I will verify with a simple script using http module if needed.
// Actually, I'll use a simple http request function to avoid installing axios if not present.

const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTest() {
    console.log('Starting verification...');

    // waiting for server to start
    await new Promise(r => setTimeout(r, 2000));

    // 1. Signup
    console.log('Testing Signup...');
    const signupData = {
        username: 'test_verifier_' + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: 'password123'
    };

    const signupRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/signup',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, signupData);

    console.log('Signup Status:', signupRes.status);
    if (signupRes.status !== 201) {
        console.error('Signup Failed:', signupRes.body);
        return;
    }
    const token = signupRes.body.token;
    console.log('Token received');

    // 2. Get Profile
    console.log('Testing Get Profile...');
    const profileRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/me',
        method: 'GET',
        headers: { 'x-auth-token': token }
    });
    console.log('Profile Status:', profileRes.status);
    console.log('User:', profileRes.body.username);

    // 3. Update Profile
    console.log('Testing Update Profile...');
    const updateRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/users/profile',
        method: 'PUT',
        headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
        }
    }, { bio: 'Hello World' });
    console.log('Update Status:', updateRes.status);
    console.log('Bio updated:', updateRes.body.bio);

    console.log('Verification Complete!');
}

runTest();
