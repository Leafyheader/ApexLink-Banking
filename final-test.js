const axios = require('axios');

async function testBasicTransactions() {
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    // Test basic pagination
    const response = await axios.get('http://localhost:5000/api/transactions?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Basic transactions API working');
    console.log('Status:', response.status);
    console.log('Pagination:', response.data.pagination);
    console.log('Transactions count:', response.data.transactions.length);
    
    // Test search functionality
    const searchResponse = await axios.get('http://localhost:5000/api/transactions?page=1&limit=10&search=jane', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ Search functionality working');
    console.log('Search results:', searchResponse.data.transactions.length);
    console.log('Sample result:', searchResponse.data.transactions[0]?.customerName || 'No results');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBasicTransactions();
