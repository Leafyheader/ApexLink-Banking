const axios = require('axios');

async function testReverseAccount() {
  try {
    const baseURL = 'http://localhost:5000/api';
    
    // First, let's get all account authorizations to find an approved account
    console.log('Fetching account authorizations...');
    const response = await axios.get(`${baseURL}/account-authorizations`, {
      headers: {
        'Authorization': 'Bearer your-jwt-token-here' // You'll need to replace this with actual token
      }
    });
    
    console.log('Available accounts:', response.data.accounts);
    
    // Find an approved account
    const approvedAccount = response.data.accounts.find(account => account.status === 'approved');
    
    if (approvedAccount) {
      console.log('Testing reverse on account:', approvedAccount.id);
      
      // Test the reverse endpoint
      const reverseResponse = await axios.post(`${baseURL}/account-authorizations/${approvedAccount.id}/reject`, {}, {
        headers: {
          'Authorization': 'Bearer your-jwt-token-here' // You'll need to replace this with actual token
        }
      });
      
      console.log('Reverse successful:', reverseResponse.data);
    } else {
      console.log('No approved accounts found to test reverse');
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testReverseAccount();