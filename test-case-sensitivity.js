const axios = require('axios');

async function testCaseSensitivity() {
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', { 
      username: 'admin', 
      password: 'admin123' 
    });
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('Testing case sensitivity in search...');
    
    // Test uppercase
    console.log('\n1. Search for "GUARANTOR":');
    const upperSearch = await axios.get('http://localhost:5000/api/customers?search=GUARANTOR&page=1&limit=5', { headers });
    console.log('Results:', upperSearch.data.customers.length);
    
    // Test lowercase
    console.log('\n2. Search for "guarantor":');
    const lowerSearch = await axios.get('http://localhost:5000/api/customers?search=guarantor&page=1&limit=5', { headers });
    console.log('Results:', lowerSearch.data.customers.length);
    
    // Test mixed case
    console.log('\n3. Search for "Guarantor":');
    const mixedSearch = await axios.get('http://localhost:5000/api/customers?search=Guarantor&page=1&limit=5', { headers });
    console.log('Results:', mixedSearch.data.customers.length);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCaseSensitivity();
