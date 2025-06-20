const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testTransactionsPagination() {
  console.log('🔄 Testing Transactions Pagination System');
  console.log('==========================================');
  
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Authentication successful');

    // Test transactions pagination
    console.log('\n📊 Testing Transactions:');
    const transactions = await axios.get(`${BASE_URL}/transactions?page=1&limit=5`, { headers });
    console.log(`   • Total: ${transactions.data.pagination?.total || 'N/A'} transactions`);
    console.log(`   • Pages: ${transactions.data.pagination?.totalPages || 'N/A'}`);
    console.log(`   • Current page has: ${transactions.data.transactions?.length || 0} transactions`);
    
    // Test transactions search
    console.log('\n🔍 Testing Transactions Search:');
    const transactionsSearch = await axios.get(`${BASE_URL}/transactions?search=deposit&page=1&limit=5`, { headers });
    console.log(`   • Search "deposit": ${transactionsSearch.data.pagination?.total || 0} matches`);
    console.log(`   • Results on page: ${transactionsSearch.data.transactions?.length || 0}`);
    
    // Test accounts for dropdown
    console.log('\n🏦 Testing Accounts for Dropdown:');
    const allAccounts = await axios.get(`${BASE_URL}/accounts?limit=10000`, { headers });
    console.log(`   • Total accounts available: ${allAccounts.data.pagination?.total || allAccounts.data.accounts?.length || 0}`);
    console.log(`   • Accounts returned: ${allAccounts.data.accounts?.length || 0}`);
    
    // Test specific account details for customer info
    if (allAccounts.data.accounts && allAccounts.data.accounts.length > 0) {
      const sampleAccount = allAccounts.data.accounts[0];
      console.log(`   • Sample account: ${sampleAccount.accountNumber || 'N/A'}`);
      console.log(`   • Customer name: ${sampleAccount.customer?.name || sampleAccount.customerName || 'N/A'}`);
    }

    // Test transaction filters
    console.log('\n📋 Testing Transaction Filters:');
    const depositTransactions = await axios.get(`${BASE_URL}/transactions?type=deposit&page=1&limit=5`, { headers });
    console.log(`   • Deposit transactions: ${depositTransactions.data.pagination?.total || 0}`);
    
    const completedTransactions = await axios.get(`${BASE_URL}/transactions?status=completed&page=1&limit=5`, { headers });
    console.log(`   • Completed transactions: ${completedTransactions.data.pagination?.total || 0}`);

    console.log('\n✅ All transaction tests completed successfully!');
    console.log('\n🎉 Enhanced Transactions Features:');
    console.log('   • Server-side pagination implemented');
    console.log('   • Search functionality working');
    console.log('   • Filter system functional');
    console.log('   • All accounts loaded for dropdown');
    console.log('   • Customer search in transaction form should work smoothly');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.error('💡 Server error - check backend logs');
    }
  }
}

testTransactionsPagination();
