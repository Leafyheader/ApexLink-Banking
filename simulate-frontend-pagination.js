const axios = require('axios');

async function simulateFrontendCall() {
  try {
    console.log('🧪 Simulating exact frontend API calls...');
    
    // Login (simulating frontend auth)
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Simulate the three API calls that frontend makes on page load
    console.log('\n📡 Making concurrent API calls (like frontend):');
    
    const [transactionsResponse, accountsResponse, statsResponse] = await Promise.all([
      axios.get('/transactions?page=1&limit=10', { baseURL: 'http://localhost:5000/api', headers }),
      axios.get('/accounts?limit=100', { baseURL: 'http://localhost:5000/api', headers }),
      axios.get('/transactions/stats', { baseURL: 'http://localhost:5000/api', headers })
    ]);
    
    // Extract data like frontend does
    const transactions = transactionsResponse.data.transactions || [];
    const totalTransactions = transactionsResponse.data.pagination?.total || 0;
    const totalPages = transactionsResponse.data.pagination?.totalPages || 0;
    const accounts = accountsResponse.data.accounts || [];
    const transactionStats = statsResponse.data;
    
    console.log('📊 Frontend state would be:');
    console.log(`   • transactions.length: ${transactions.length}`);
    console.log(`   • totalTransactions: ${totalTransactions}`);
    console.log(`   • totalPages: ${totalPages}`);
    console.log(`   • accounts.length: ${accounts.length}`);
    console.log(`   • Show pagination? ${totalPages > 1 ? 'YES ✅' : 'NO ❌'}`);
    
    // Test pagination navigation
    if (totalPages > 1) {
      console.log('\n🔄 Testing pagination navigation:');
      
      // Test going to page 2
      const page2Response = await axios.get('/transactions?page=2&limit=10', { 
        baseURL: 'http://localhost:5000/api', 
        headers 
      });
      console.log(`   • Page 2: ${page2Response.data.transactions.length} transactions`);
      
      // Test going to last page
      const lastPageResponse = await axios.get(`/transactions?page=${totalPages}&limit=10`, { 
        baseURL: 'http://localhost:5000/api', 
        headers 
      });
      console.log(`   • Last page (${totalPages}): ${lastPageResponse.data.transactions.length} transactions`);
    }
    
    console.log('\n✅ All API calls successful - frontend pagination should work!');
    
  } catch (error) {
    console.error('❌ Error simulating frontend:', error.response?.data || error.message);
  }
}

simulateFrontendCall();
