// Test script to validate customer creation API
const api = require('axios').default;

const baseURL = 'http://localhost:5000';

// First login to get a token
async function testCustomerCreation() {
  try {    console.log('1. Testing login...');
    const loginResponse = await api.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, token obtained');
    
    // Set the authorization header for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('\n2. Testing customer creation...');
    
    // Create test customer data
    const testCustomer = {
      name: 'John Smith',
      firstName: 'John',
      surname: 'Smith',
      email: 'john.smith@example.com',
      phone: '1234567890', // Valid format: starts with 1-9, max 16 digits
      address: '123 Main Street, City',
      kycStatus: 'pending',
      dateJoined: new Date().toISOString(),
      gender: 'Male',
      dateOfBirth: '1990-01-15',
      occupation: 'Software Engineer',
      workplace: 'Tech Corp',
      maritalStatus: 'Single',
      residentialAddress: '123 Main Street, City',
      postalAddress: 'PO Box 123, City',
      contactNumber: '1234567890',
      city: 'New York',
      identificationType: 'National ID',
      identificationNumber: 'ID123456789',
      beneficiaryName: 'Jane Smith',
      beneficiaryContact: '9876543210',
      beneficiaryPercentage: 100, // Ensure it's a number and totals 100%
      beneficiary2Name: '',
      beneficiary2Contact: '',
      beneficiary2Percentage: 0,
      beneficiary3Name: '',
      beneficiary3Contact: '',
      beneficiary3Percentage: 0,
      photo: '',
      signature: ''
    };
      const customerResponse = await api.post(`${baseURL}/api/customers`, testCustomer);
    console.log('✓ Customer created successfully:', customerResponse.data);
    
    console.log('\n3. Testing customer retrieval...');
    const customersResponse = await api.get(`${baseURL}/api/customers`);
    console.log('✓ Customers retrieved:', customersResponse.data.length, 'customers found');
    
  } catch (error) {
    console.error('✗ Error occurred:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testCustomerCreation();
