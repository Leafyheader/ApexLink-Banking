const axios = require('axios');

async function quickTest() {
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', { 
      username: 'admin', 
      password: 'admin123' 
    });
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test normal customer list
    console.log('1. Testing normal customer list:');
    const normalResult = await axios.get('http://localhost:5000/api/customers?page=1&limit=5', { headers });
    console.log('Sample customers:', normalResult.data.customers.slice(0, 3).map(c => ({ name: c.name, email: c.email })));
    
    // Test with search
    console.log('\n2. Testing with search (empty string):');
    const searchEmpty = await axios.get('http://localhost:5000/api/customers?search=&page=1&limit=5', { headers });
    console.log('Results:', searchEmpty.data.customers.length);
    
    // Test with search for "Guarantor"
    console.log('\n3. Testing search for "Guarantor":');
    const searchGuarantor = await axios.get('http://localhost:5000/api/customers?search=Guarantor&page=1&limit=5', { headers });
    console.log('Results:', searchGuarantor.data.customers.length);
    console.log('Names:', searchGuarantor.data.customers.map(c => c.name));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

quickTest();
