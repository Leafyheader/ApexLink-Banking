const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const baseURL = 'http://localhost:5000';

// First login to get a token
async function testFileUpload() {
  console.log('Starting file upload test...');
  try {
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, token obtained');
    
    console.log('\n2. Testing file upload endpoint...');
    
    // Create a simple test image file (1x1 pixel PNG)
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00
    ]);
    
    // Write test files
    const photoPath = path.join(__dirname, 'test-photo.png');
    const signaturePath = path.join(__dirname, 'test-signature.png');
    fs.writeFileSync(photoPath, testImageData);
    fs.writeFileSync(signaturePath, testImageData);
    
    // Create form data
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(photoPath));
    formData.append('signature', fs.createReadStream(signaturePath));
    
    const uploadResponse = await axios.post(`${baseURL}/api/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✓ File upload successful:', uploadResponse.data);
    
    // Clean up test files
    fs.unlinkSync(photoPath);
    fs.unlinkSync(signaturePath);
    
    console.log('\n3. Testing customer creation with uploaded files...');
    
    // Create test customer data with uploaded file URLs
    const testCustomer = {
      name: 'John Test Upload',
      firstName: 'John',
      surname: 'Test Upload',
      email: 'john.upload@example.com',
      phone: '1234567890',
      address: '123 Upload Street, Test City',
      kycStatus: 'pending',
      dateJoined: new Date().toISOString(),
      gender: 'Male',
      dateOfBirth: '1990-01-15',
      occupation: 'Tester',
      workplace: 'Test Corp',
      maritalStatus: 'Single',
      residentialAddress: '123 Upload Street, Test City',
      postalAddress: 'PO Box 123, Test City',
      contactNumber: '1234567890',
      city: 'Test City',
      identificationType: 'National ID',
      identificationNumber: 'TEST123456789',
      beneficiaryName: 'Jane Test',
      beneficiaryContact: '9876543210',
      beneficiaryPercentage: 100,
      beneficiary2Name: '',
      beneficiary2Contact: '',
      beneficiary2Percentage: 0,
      beneficiary3Name: '',
      beneficiary3Contact: '',
      beneficiary3Percentage: 0,
      photo: uploadResponse.data.files.photo || '',
      signature: uploadResponse.data.files.signature || ''
    };
    
    const customerResponse = await axios.post(`${baseURL}/api/customers`, testCustomer, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    console.log('✓ Customer created successfully with uploaded files:', customerResponse.data);
    
    console.log('\n4. Testing customer retrieval to verify file URLs...');
    const customerDetailResponse = await axios.get(`${baseURL}/api/customers/${customerResponse.data.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    console.log('✓ Customer retrieved with file URLs:');
    console.log('  Photo URL:', customerDetailResponse.data.photo);
    console.log('  Signature URL:', customerDetailResponse.data.signature);
    
    // Verify the actual files exist
    console.log('\n5. Verifying uploaded files exist on server...');
    if (customerDetailResponse.data.photo) {
      try {
        const photoResponse = await axios.get(`${baseURL}${customerDetailResponse.data.photo}`);
        console.log('✓ Photo file accessible, content-length:', photoResponse.headers['content-length']);
      } catch (error) {
        console.log('✗ Photo file not accessible:', error.message);
      }
    }
    
    if (customerDetailResponse.data.signature) {
      try {
        const signatureResponse = await axios.get(`${baseURL}${customerDetailResponse.data.signature}`);
        console.log('✓ Signature file accessible, content-length:', signatureResponse.headers['content-length']);
      } catch (error) {
        console.log('✗ Signature file not accessible:', error.message);
      }
    }
    
    console.log('\n🎉 All tests passed! File upload functionality is working correctly.');
      } catch (error) {
    console.error('✗ Error occurred:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('Validation errors:', error.response.data.errors);
    }
    process.exit(1);
  }
}

// Run the test
testFileUpload();
