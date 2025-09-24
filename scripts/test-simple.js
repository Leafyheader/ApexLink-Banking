const axios = require('axios');

async function testConnection() {
  try {
    console.log('Testing server connection...');
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✓ Server is responding:', response.data);
  } catch (error) {
    console.log('✗ Server connection failed:', error.message);
    
    // Try a basic connection test
    try {
      const response = await axios.get('http://localhost:5000');
      console.log('✓ Basic server connection works');
    } catch (error2) {
      console.log('✗ Basic server connection failed:', error2.message);
    }
  }
}

testConnection();
