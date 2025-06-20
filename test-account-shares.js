const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000'
});

async function testAccountCreationWithShares() {
  try {
    console.log('1. Testing login...');
    const loginResponse = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    
    // Set the authorization header for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('\n2. Getting customers...');
    const customersResponse = await api.get('/api/customers');
    const customers = customersResponse.data.customers;
    console.log('✓ Customers retrieved:', customers.length, 'customers found');
    
    if (customers.length > 0) {
      const testCustomer = customers[0];
      console.log('Selected customer:', testCustomer.name);
      
      console.log('\n3. Creating account with shares...');
      const accountData = {
        customerId: testCustomer.id,
        type: 'SAVINGS',
        balance: 1000.00,
        shares: 50,
        sharesBalance: 2500.00,
        currency: 'USD'
      };
      
      const accountResponse = await api.post('/api/accounts', accountData);
      console.log('✓ Account created successfully:', {
        accountNumber: accountResponse.data.accountNumber,
        balance: accountResponse.data.balance,
        shares: accountResponse.data.shares,
        sharesBalance: accountResponse.data.sharesBalance,
        customer: accountResponse.data.customer.name
      });
      
      console.log('\n4. Getting all accounts to verify...');
      const accountsResponse = await api.get('/api/accounts');
      const newAccount = accountsResponse.data.accounts.find(acc => 
        acc.accountNumber === accountResponse.data.accountNumber
      );
      
      if (newAccount) {
        console.log('✓ Account verified in database:', {
          accountNumber: newAccount.accountNumber,
          balance: newAccount.balance,
          shares: newAccount.shares,
          sharesBalance: newAccount.sharesBalance
        });
      }
      
    } else {
      console.log('⚠ No customers found for testing');
    }
    
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

testAccountCreationWithShares();
