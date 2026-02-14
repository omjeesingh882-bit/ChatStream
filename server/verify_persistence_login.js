const http = require('http');

const data = JSON.stringify({
    email: 'persistent@example.com',
    password: 'password123'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        console.log('Login Status:', res.statusCode);
        console.log('Login Response:', body);
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
