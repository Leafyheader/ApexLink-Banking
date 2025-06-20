const axios = require('axios');

async function testTransactions() {
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful');
    
    // Test basic transactions list (no search)
    console.log('\n--- Testing basic transactions list ---');
    const basicResponse = await axios.get('http://localhost:5000/api/transactions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Basic response status:', basicResponse.status);
    console.log('Transactions count:', basicResponse.data.transactions?.length || 0);
    console.log('Sample transaction:', basicResponse.data.transactions?.[0] || 'No transactions');
    
    // Test search with various terms
    const searchTerms = ['test', 'john', 'deposit', 'acc'];
    
    for (const term of searchTerms) {
      console.log(`\n--- Testing search with term: "${term}" ---`);
      try {
        const searchResponse = await axios.get(`http://localhost:5000/api/transactions?search=${term}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Search response status:', searchResponse.status);
        console.log('Found transactions:', searchResponse.data.transactions?.length || 0);
        
      } catch (searchError) {
        console.error('Search error for term', term, ':', searchError.response?.data || searchError.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testTransactions();
