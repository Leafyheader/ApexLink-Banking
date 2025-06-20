const axios = require('axios');

async function testDirectSearch() {
  try {
    // Get token
    console.log('Getting auth token...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', { 
      username: 'admin', 
      password: 'admin123' 
    });
    const token = loginResponse.data.token;
    console.log('Token obtained:', token.substring(0, 20) + '...');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test the exact search request that's failing
    console.log('\nTesting exact search request...');
    const response = await axios.get('http://localhost:5000/api/customers?search=Guarantor&page=1&limit=5', { 
      headers,
      timeout: 10000 
    });
    
    console.log('Success! Results:', response.data.customers.length);
    console.log('Names:', response.data.customers.map(c => c.name));
    
  } catch (error) {
    console.error('Full error details:');
    console.error('Status:', error.response?.status);
    console.error('Status text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testDirectSearch();
