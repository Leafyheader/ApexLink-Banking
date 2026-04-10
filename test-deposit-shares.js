// Test script to create a deposit-shares transaction
const axios = require('axios');

async function testDepositShares() {
  try {
    const baseURL = 'http://localhost:5000/api';
    
    console.log('Testing deposit-shares functionality...');
    
    // First, get accounts to find one with shares capability
    const accountsResponse = await axios.get(`${baseURL}/accounts`, {
      headers: {
        'Authorization': 'Bearer your-jwt-token-here' // Replace with actual token
      }
    });
    
    console.log('Available accounts:', accountsResponse.data.accounts);
    
    // Find an account with shareBalance (indicating shares capability)
    const sharesAccount = accountsResponse.data.accounts.find(account => 
      typeof account.shareBalance !== 'undefined'
    );
    
    if (sharesAccount) {
      console.log('Found shares account:', sharesAccount);
      
      // Test creating a deposit-shares transaction
      const transactionData = {
        accountId: sharesAccount.id,
        type: 'deposit-shares',
        amount: 100,
        description: 'Test shares deposit',
        reference: 'TEST-SHARES-001'
      };
      
      console.log('Creating deposit-shares transaction:', transactionData);
      
      const response = await axios.post(`${baseURL}/transactions`, transactionData, {
        headers: {
          'Authorization': 'Bearer your-jwt-token-here' // Replace with actual token
        }
      });
      
      console.log('Transaction created successfully:', response.data);
      
    } else {
      console.log('No accounts with shares capability found');
      console.log('Available account types:', accountsResponse.data.accounts.map(a => ({
        id: a.id,
        accountNumber: a.accountNumber,
        type: a.type,
        hasShares: typeof a.shareBalance !== 'undefined',
        shareBalance: a.shareBalance
      })));
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDepositShares();