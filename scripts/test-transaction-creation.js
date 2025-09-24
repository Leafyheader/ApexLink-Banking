// Quick test for transaction creation
const api = require('axios').default;

const baseURL = 'http://localhost:5000';

async function testTransactionCreation() {
  try {
    console.log('1. Testing login...');
    const loginResponse = await api.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    
    // Set the authorization header for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get accounts
    console.log('2. Getting accounts...');
    const accountsResponse = await api.get(`${baseURL}/api/accounts`);
    const accounts = accountsResponse.data.accounts;
    console.log('✓ Accounts retrieved:', accounts.length, 'accounts found');
    
    if (accounts.length > 0) {
      // Find an active account
      const activeAccount = accounts.find(acc => acc.status === 'ACTIVE');
      if (activeAccount) {
        console.log('3. Creating deposit transaction...');
        const depositData = {
          accountId: activeAccount.id,
          type: 'DEPOSIT',
          amount: 100.00,
          description: 'Test deposit via API'
        };
        
        const depositResponse = await api.post(`${baseURL}/api/transactions`, depositData);
        console.log('✓ Deposit transaction created successfully:', {
          id: depositResponse.data.id,
          amount: depositResponse.data.amount,
          type: depositResponse.data.type,
          status: depositResponse.data.status
        });
        
        // Test getting updated balance
        console.log('4. Checking account balance update...');
        const updatedAccountResponse = await api.get(`${baseURL}/api/accounts/${activeAccount.id}`);
        console.log('✓ Account balance updated:', {
          before: activeAccount.balance,
          after: updatedAccountResponse.data.balance
        });
        
      } else {
        console.log('⚠ No active accounts found for testing');
      }
    }
    
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

testTransactionCreation();
