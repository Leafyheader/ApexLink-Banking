const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Quick test to check login format and admin user
async function testLogin() {
  try {
    console.log('Testing login with admin credentials...');
    
    // Try with username instead of email
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful with admin/admin123');
    console.log('User:', loginResponse.data.user);
    
  } catch (error) {
    console.log('❌ Login failed with admin/admin123');
    console.log('Error:', error.response?.data || error.message);
    
    // Try alternative credentials
    try {
      const altLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'admin@apexlink.com',
        password: 'admin123'
      });
      console.log('✅ Login successful with admin@apexlink.com/admin123');
    } catch (altError) {
      console.log('❌ Login also failed with admin@apexlink.com/admin123');
      console.log('Alt Error:', altError.response?.data || altError.message);
    }
  }
}

testLogin();
