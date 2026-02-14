const http = require('http');

// We need to know the credentials used in test_persist.js
// But test_persist.js used dynamic credentials based on Date.now()
// so we can't easily guess them unless we parsed the output or fixed them.
// Let's create a *fixed* user in a new script, restart, then verify.

// Wait, I already ran test_persist.js. I should modify it to use fixed credentials 
// or just run a new "create fixed user" script, restart, then "login fixed user".

// Let's do:
// 1. Create fixed user
// 2. Restart server (handled by agent steps)
// 3. Login fixed user

// This script will just create a fixed user "persistent_user"
const data = JSON.stringify({
    username: 'persistent_user',
    email: 'persistent@example.com',
    password: 'password123'
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
    res.on('end', () => console.log('Signup Response:', body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
