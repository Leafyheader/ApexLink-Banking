// Test script to check accounts API response
const api = require('axios').default;

const baseURL = 'http://localhost:5000';

async function testAccountsAPI() {
  try {
    console.log('1. Testing login...');
    const loginResponse = await api.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, token obtained');
    
    // Set the authorization header for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('\n2. Testing accounts API...');
    const accountsResponse = await api.get(`${baseURL}/api/accounts`);
    console.log('✓ Accounts API response:', JSON.stringify(accountsResponse.data, null, 2));
    
  } catch (error) {
    console.error('✗ Error occurred:', error.response?.data || error.message);
  }
}

testAccountsAPI();
