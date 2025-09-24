const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('Login successful:');
    console.log('Token:', response.data.token);
    
    // Test search with token
    const searchResponse = await axios.get('http://localhost:5000/api/transactions?search=test', {
      headers: {
        'Authorization': `Bearer ${response.data.token}`
      }
    });
    
    console.log('Search response:', searchResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testLogin();
