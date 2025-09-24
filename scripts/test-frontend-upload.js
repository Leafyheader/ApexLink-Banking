const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const baseURL = 'http://localhost:5000';

async function testFrontendUpload() {
  try {
    console.log('Testing frontend upload endpoint...');
    
    // Login first
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    
    // Create test image
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00
    ]);
    
    const photoPath = path.join(__dirname, 'test-frontend-photo.png');
    fs.writeFileSync(photoPath, testImageData);
    
    // Test the corrected upload endpoint
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(photoPath));
    
    const uploadResponse = await axios.post(`${baseURL}/api/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✓ Frontend upload endpoint working:', uploadResponse.data);
    
    // Clean up
    fs.unlinkSync(photoPath);
    
    console.log('🎉 Frontend upload endpoint test passed!');
    
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

testFrontendUpload();
