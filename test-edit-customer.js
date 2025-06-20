const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const baseURL = 'http://localhost:5000';

async function testEditCustomer() {
  console.log('Starting EditCustomer test...');
  try {
    console.log('Testing EditCustomer file upload functionality...');
    
    // 1. Login first
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');
      // 2. Get an existing customer (using the one we created in previous tests)
    const customersResponse = await axios.get(`${baseURL}/api/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Customer response structure:', typeof customersResponse.data, Array.isArray(customersResponse.data));
    
    // Handle different response structures
    const customers = Array.isArray(customersResponse.data) ? customersResponse.data : customersResponse.data.customers || [];
    const customer = customers.find(c => c.name && c.name.includes('Test Upload'));
    if (!customer) {
      console.log('✗ No test customer found with uploaded files. Available customers:', customers.map(c => c.name).slice(0, 3));
      console.log('Please run test-file-upload.js first to create a test customer.');
      return;
    }
    
    console.log('✓ Found test customer:', customer.name);
    console.log('  Current photo:', customer.photo);
    console.log('  Current signature:', customer.signature);
    
    // 3. Test updating customer with new files
    console.log('\n2. Testing file upload for customer update...');
    
    // Create new test image
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00
    ]);
    
    const newPhotoPath = path.join(__dirname, 'test-edit-photo.png');
    fs.writeFileSync(newPhotoPath, testImageData);
    
    // Upload new photo
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(newPhotoPath));
    
    const uploadResponse = await axios.post(`${baseURL}/api/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✓ New file uploaded:', uploadResponse.data);
    
    // Clean up test file
    fs.unlinkSync(newPhotoPath);
    
    // 4. Update the customer with the new photo
    const updatedCustomerData = {
      ...customer,
      photo: uploadResponse.data.files.photo,
      workplace: 'Updated Corp' // Also update a text field to verify the update worked
    };
    
    // Remove properties that shouldn't be sent in update
    delete updatedCustomerData.id;
    delete updatedCustomerData.accounts;
    delete updatedCustomerData.createdBy;
    
    const updateResponse = await axios.put(`${baseURL}/api/customers/${customer.id}`, updatedCustomerData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✓ Customer updated successfully');
    console.log('  New photo URL:', updateResponse.data.photo);
    console.log('  New workplace:', updateResponse.data.workplace);
    
    // 5. Verify the updated photo is accessible
    if (updateResponse.data.photo) {
      try {
        const photoResponse = await axios.get(`${baseURL}${updateResponse.data.photo}`);
        console.log('✓ Updated photo file accessible, content-length:', photoResponse.headers['content-length']);
      } catch (error) {
        console.log('✗ Updated photo file not accessible:', error.message);
      }
    }
    
    console.log('\n🎉 EditCustomer file upload functionality test passed!');
    
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

testEditCustomer();
