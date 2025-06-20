// Test script to validate transactions API
const api = require('axios').default;

const baseURL = 'http://localhost:5000';

async function testTransactionsAPI() {
  try {
    console.log('1. Testing login...');
    const loginResponse = await api.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, token obtained');
    
    // Set the authorization header for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('\n2. Testing transactions API...');
    
    // Test get transactions
    console.log('2a. Getting transactions...');
    const transactionsResponse = await api.get(`${baseURL}/api/transactions`);
    console.log('✓ Transactions retrieved:', transactionsResponse.data.transactions?.length || 0, 'transactions found');
    
    // Test get transaction stats
    console.log('2b. Getting transaction stats...');
    const statsResponse = await api.get(`${baseURL}/api/transactions/stats`);
    console.log('✓ Transaction stats retrieved:', JSON.stringify(statsResponse.data, null, 2));
    
    // Test get accounts (needed for creating transactions)
    console.log('\n3. Getting accounts for transaction creation...');
    const accountsResponse = await api.get(`${baseURL}/api/accounts`);
    const accounts = accountsResponse.data;
    console.log('✓ Accounts retrieved:', accounts.length, 'accounts found');
    
    if (accounts.length > 0) {
      const testAccount = accounts[0];
      console.log('Selected account for testing:', testAccount.accountNumber, 'with balance:', testAccount.balance);
      
      // Test create deposit transaction
      console.log('\n4. Creating deposit transaction...');
      const depositData = {
        accountId: testAccount.id,
        type: 'DEPOSIT',
        amount: 100.00,
        description: 'Test deposit transaction'
      };
      
      const depositResponse = await api.post(`${baseURL}/api/transactions`, depositData);
      console.log('✓ Deposit transaction created:', depositResponse.data);
      
      // Test create withdrawal transaction
      console.log('\n5. Creating withdrawal transaction...');
      const withdrawalData = {
        accountId: testAccount.id,
        type: 'WITHDRAWAL',
        amount: 50.00,
        description: 'Test withdrawal transaction'
      };
      
      const withdrawalResponse = await api.post(`${baseURL}/api/transactions`, withdrawalData);
      console.log('✓ Withdrawal transaction created:', withdrawalResponse.data);
      
      // Test get specific transaction
      console.log('\n6. Getting specific transaction...');
      const transactionId = depositResponse.data.id;
      const singleTransactionResponse = await api.get(`${baseURL}/api/transactions/${transactionId}`);
      console.log('✓ Single transaction retrieved:', singleTransactionResponse.data);
    } else {
      console.log('⚠ No accounts found. Cannot test transaction creation.');
    }
    
  } catch (error) {
    console.error('✗ Error occurred:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('Validation errors:', error.response.data.error);
    }
  }
}

testTransactionsAPI();
