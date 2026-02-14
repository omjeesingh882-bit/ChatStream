const http = require('http');
const fs = require('fs');
const path = require('path');

// Helper for multipart/form-data boundary
function getBoundary() {
    return '--------------------------' + Date.now().toString(16);
}

function request(options, data, isMultipart = false, boundary = null) {
    return new Promise((resolve, reject) => {
        if (isMultipart) {
            options.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
        } else if (data) {
            options.headers['Content-Type'] = 'application/json';
        }

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
            req.write(data);
        }
        req.end();
    });
}

async function runTest() {
    console.log('Starting Profile Verification...');

    // 1. Signup to get token
    const signupData = JSON.stringify({
        username: 'profile_tester_' + Date.now(),
        email: `profile${Date.now()}@example.com`,
        password: 'password123'
    });

    const signupRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/signup',
        method: 'POST',
        headers: {}
    }, signupData);

    if (signupRes.status !== 201) {
        console.error('Signup Failed:', signupRes.body);
        return;
    }
    const token = signupRes.body.token;
    console.log('Token acquired.');

    // 2. Update Bio to "Test Bio"
    console.log('Testing Bio Update ("Test Bio")...');
    const bioData = JSON.stringify({ bio: 'Test Bio' });
    const bioRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/users/profile',
        method: 'PUT',
        headers: { 'x-auth-token': token }
    }, bioData);
    console.log(`Bio Update Status: ${bioRes.status}, Bio: ${bioRes.body.bio}`);

    // 3. Update Bio to Empty String
    console.log('Testing Bio Update (Empty String)...');
    const emptyBioData = JSON.stringify({ bio: '' });
    const emptyBioRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/users/profile',
        method: 'PUT',
        headers: { 'x-auth-token': token }
    }, emptyBioData);
    console.log(`Empty Bio Update Status: ${emptyBioRes.status}, Bio: '${emptyBioRes.body.bio}'`);

    // 4. Upload Avatar
    console.log('Testing Avatar Upload...');
    const boundary = getBoundary();
    const filePath = path.join(__dirname, 'test-image.jpg');
    const fileContent = fs.readFileSync(filePath);

    let payload = `--${boundary}\r\n`;
    payload += 'Content-Disposition: form-data; name="avatar"; filename="test-image.jpg"\r\n';
    payload += 'Content-Type: image/jpeg\r\n\r\n';

    // Combine string payload and buffer
    const preBuffer = Buffer.from(payload, 'utf8');
    const postBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const bodyBuffer = Buffer.concat([preBuffer, fileContent, postBuffer]);

    const avatarRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/users/avatar',
        method: 'POST',
        headers: {
            'x-auth-token': token,
            'Content-Length': bodyBuffer.length
        }
    }, bodyBuffer, true, boundary);

    console.log(`Avatar Upload Status: ${avatarRes.status}`);
    console.log('Avatar URL:', avatarRes.body.avatar);
}

runTest();
