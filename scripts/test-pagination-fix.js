const axios = require('axios');

async function testPaginationStructure() {
  try {
    console.log('Testing pagination structure...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Test transactions endpoint
    const response = await axios.get('http://localhost:5000/api/transactions?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Pagination structure:');
    console.log('- Total transactions:', response.data.pagination?.total);
    console.log('- Pages (backend):', response.data.pagination?.pages);
    console.log('- Total pages (frontend expected):', response.data.pagination?.totalPages);
    console.log('- Current page:', response.data.pagination?.page);
    console.log('- Limit:', response.data.pagination?.limit);
    console.log('- Transactions returned:', response.data.transactions?.length);
    
    console.log('\nFull pagination object:', JSON.stringify(response.data.pagination, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPaginationStructure();
