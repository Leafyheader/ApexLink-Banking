const axios = require('axios');

async function testAccountsData() {
  try {
    // First, let's try to login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token:', token);
    
    // Now get accounts with the token
    const accountsResponse = await axios.get('http://localhost:5000/api/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Accounts response:', JSON.stringify(accountsResponse.data, null, 2));
    
    // Also get customers
    const customersResponse = await axios.get('http://localhost:5000/api/customers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Customers response:', JSON.stringify(customersResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAccountsData();
