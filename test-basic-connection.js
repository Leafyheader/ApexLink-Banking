const BASE_URL = 'http://localhost:5000/api';

async function testBasicConnection() {
    try {
        console.log('Testing basic connection...');
        
        const response = await fetch(`${BASE_URL}/loans`, {
            method: 'GET'
        });
        
        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response:', text.substring(0, 200));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testBasicConnection();
