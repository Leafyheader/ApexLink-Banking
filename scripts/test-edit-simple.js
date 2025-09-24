console.log('Testing EditCustomer...');

const axios = require('axios');

async function simpleTest() {
  try {
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('Server is responding');
  } catch (error) {
    console.error('Server connection failed:', error.message);
  }
}

simpleTest();
