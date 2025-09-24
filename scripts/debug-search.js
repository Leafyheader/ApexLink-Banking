const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugSearch() {
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const headers = {
      'Authorization': `Bearer ${loginResponse.data.token}`,
      'Content-Type': 'application/json'
    };

    console.log('Testing different search terms...');
    
    // Test with a simpler search
    try {
      const searchResults1 = await axios.get(`${BASE_URL}/expenses?search=test`, { headers });
      console.log(`✅ Search for "test": ${searchResults1.data.expenses.length} results`);
    } catch (err) {
      console.log('❌ Search for "test" failed:', err.response?.data);
    }

    // Test with category search
    try {
      const searchResults2 = await axios.get(`${BASE_URL}/expenses?category=Marketing`, { headers });
      console.log(`✅ Category "Marketing": ${searchResults2.data.expenses.length} results`);
    } catch (err) {
      console.log('❌ Category search failed:', err.response?.data);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugSearch();
