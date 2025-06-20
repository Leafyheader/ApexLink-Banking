const axios = require('axios');
const baseURL = 'http://localhost:5000';

console.log('Starting phone validation test...');

async function testPhoneValidation() {
  console.log('Testing phone number validation...');
  try {
    // 1. Login first
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');

    // 2. Test creating a customer with phone number starting with 0
    console.log('\n🔍 Testing customer creation with phone number starting with 0...');
    
    const testCustomerData = {
      name: 'Phone Test Customer',
      firstName: 'Phone',
      surname: 'Test Customer',
      email: 'phonetest@example.com',
      phone: '0712345678', // Phone number starting with 0
      address: '123 Test Street',
      kycStatus: 'pending',
      dateJoined: new Date().toISOString(),
      gender: 'male',
      dateOfBirth: '1990-01-15',
      occupation: 'Tester',
      workplace: 'Test Corp',
      maritalStatus: 'single',
      residentialAddress: '123 Test Street',
      postalAddress: 'PO Box 123',
      contactNumber: '0712345678', // Same phone number
      city: 'Test City',
      identificationType: 'national_id',
      identificationNumber: 'TEST123456',
      beneficiaryName: 'Test Beneficiary',
      beneficiaryContact: '0798765432',
      beneficiaryPercentage: 100,
      beneficiary2Name: '',
      beneficiary2Contact: '',
      beneficiary2Percentage: 0,
      beneficiary3Name: '',
      beneficiary3Contact: '',
      beneficiary3Percentage: 0,
      photo: '',
      signature: ''
    };
    
    const createResponse = await axios.post(`${baseURL}/api/customers`, testCustomerData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✓ Customer created successfully with phone starting with 0');
    console.log('  Customer ID:', createResponse.data.id);
    console.log('  Phone number:', createResponse.data.phone);
    console.log('  Contact number:', createResponse.data.contactNumber);

    // 3. Test updating the customer
    console.log('\n🔍 Testing customer update with phone number starting with 0...');
    
    const customerId = createResponse.data.id;
    const updateData = {
      name: 'Phone Test Customer Updated',
      firstName: 'Phone',
      surname: 'Test Customer Updated',
      email: 'phonetest@example.com',
      phone: '0723456789', // Different phone number starting with 0
      address: '123 Test Street',
      kycStatus: 'pending',
      gender: 'male',
      dateOfBirth: '1990-01-15',
      occupation: 'Senior Tester',
      workplace: 'Updated Test Corp',
      maritalStatus: 'single',
      residentialAddress: '123 Test Street',
      postalAddress: 'PO Box 123',
      contactNumber: '0723456789',
      city: 'Test City',
      identificationType: 'national_id',
      identificationNumber: 'TEST123456',
      beneficiaryName: 'Test Beneficiary',
      beneficiaryContact: '0798765432',
      beneficiaryPercentage: 100,
      beneficiary2Name: '',
      beneficiary2Contact: '',
      beneficiary2Percentage: 0,
      beneficiary3Name: '',
      beneficiary3Contact: '',
      beneficiary3Percentage: 0,
      photo: '',
      signature: ''
    };
    
    const updateResponse = await axios.put(`${baseURL}/api/customers/${customerId}`, updateData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✓ Customer updated successfully with phone starting with 0');
    console.log('  Updated phone number:', updateResponse.data.phone);
    console.log('  Updated contact number:', updateResponse.data.contactNumber);
    console.log('  Updated workplace:', updateResponse.data.workplace);

    // 4. Clean up - delete the test customer
    await axios.delete(`${baseURL}/api/customers/${customerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✓ Test customer cleaned up');

    console.log('\n🎉 All phone validation tests passed!');
    
  } catch (error) {
    console.error('✗ Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

testPhoneValidation();
