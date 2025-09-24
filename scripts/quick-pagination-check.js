const axios = require('axios');

async function quickPaginationTest() {
  try {
    // Login
    const login = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    // Test default pagination (what frontend uses)
    const response = await axios.get('http://localhost:5000/api/transactions?page=1&limit=10', {
      headers: { Authorization: `Bearer ${login.data.token}` }
    });
    
    console.log('✅ Pagination working:');
    console.log(`   • Total transactions: ${response.data.pagination.total}`);
    console.log(`   • Total pages: ${response.data.pagination.totalPages}`);
    console.log(`   • Current page: ${response.data.pagination.page}`);
    console.log(`   • Items per page: ${response.data.pagination.limit}`);
    console.log(`   • Should show pagination UI: ${response.data.pagination.totalPages > 1 ? 'YES ✅' : 'NO ❌'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickPaginationTest();
