const fetch = require('node-fetch');

async function testPagination() {
  try {
    console.log('Testing pagination API response...');
    
    const response = await fetch('http://localhost:5000/api/transactions?page=1&limit=10', {
      headers: {
        'Authorization': 'Bearer ' + 'test-token' // This might not work without auth, but let's see the structure
      }
    });
    
    const data = await response.json();
    console.log('Response structure:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPagination();
