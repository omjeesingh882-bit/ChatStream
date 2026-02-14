const http = require('http');

const data = JSON.stringify({
    username: 'persist_' + Date.now(),
    email: 'p' + Date.now() + '@test.com',
    password: '123456'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => console.log('Response:', body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
