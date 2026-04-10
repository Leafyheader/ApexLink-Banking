// Get correct account ID for Elizabeth
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function getElizabethAccountId() {
    try {
        // 1. Authenticate
        const authResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const authData = await authResponse.json();
        const token = authData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Get Elizabeth's accounts
        const accountsResponse = await fetch(`${BASE_URL}/accounts?customerId=e851e707-87dc-4660-baf6-9ccca0645457`, {
            headers
        });

        const accountsData = await accountsResponse.json();
        console.log('Elizabeth\'s accounts:');
        console.log(JSON.stringify(accountsData, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

getElizabethAccountId();