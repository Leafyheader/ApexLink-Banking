const axios = require('axios');
const baseURL = 'http://localhost:5000';

async function testEditCustomerDetailed() {
  console.log('Testing EditCustomer update with detailed logging...');
  try {
    // 1. Login first
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');

    // 2. Get an existing customer
    const customersResponse = await axios.get(`${baseURL}/api/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const customers = Array.isArray(customersResponse.data) ? customersResponse.data : customersResponse.data.customers || [];
    const customer = customers.find(c => c.name && c.name.includes('Test Upload'));
    
    if (!customer) {
      console.log('✗ No test customer found. Creating one first...');
      // Create a test customer
      const testCustomer = {
        name: 'Test Update User',
        firstName: 'Test',
        surname: 'Update User',
        email: 'test.update@example.com',
        phone: '0123456789',
        address: '123 Test Street',
        kycStatus: 'pending',
        dateJoined: new Date().toISOString(),
        gender: 'Male',
        dateOfBirth: '1990-01-15',
        occupation: 'Tester',
        workplace: 'Test Corp',
        maritalStatus: 'Single',
        residentialAddress: '123 Test Street',
        postalAddress: 'PO Box 123',
        contactNumber: '0123456789',
        city: 'Test City',
        identificationType: 'National ID',
        identificationNumber: 'TEST123456789',
        beneficiaryName: 'Jane Test',
        beneficiaryContact: '0987654321',
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
      
      const createResponse = await axios.post(`${baseURL}/api/customers`, testCustomer, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const newCustomer = createResponse.data;
      console.log('✓ Test customer created:', newCustomer.name);
      
      // Now try to update this customer
      const updateData = {
        name: `${newCustomer.firstName} ${newCustomer.surname}`,
        firstName: newCustomer.firstName,
        surname: newCustomer.surname,
        email: newCustomer.email,
        phone: '0123456789', // Phone starting with 0
        address: newCustomer.address,
        kycStatus: newCustomer.kycStatus,
        dateJoined: new Date().toISOString(),
        gender: newCustomer.gender,
        dateOfBirth: newCustomer.dateOfBirth,
        occupation: newCustomer.occupation,
        workplace: 'Updated Test Corp', // Change this field
        maritalStatus: newCustomer.maritalStatus,
        residentialAddress: newCustomer.residentialAddress,
        postalAddress: newCustomer.postalAddress,
        contactNumber: '0123456789', // Phone starting with 0
        city: newCustomer.city,
        identificationType: newCustomer.identificationType,
        identificationNumber: newCustomer.identificationNumber,
        beneficiaryName: newCustomer.beneficiaryName,
        beneficiaryContact: '0987654321', // Phone starting with 0
        beneficiaryPercentage: 100,
        beneficiary2Name: '',
        beneficiary2Contact: '',
        beneficiary2Percentage: 0,
        beneficiary3Name: '',
        beneficiary3Contact: '',
        beneficiary3Percentage: 0,
        photo: '',
        signature: '',
      };
      
      console.log('Attempting to update customer with data:', JSON.stringify(updateData, null, 2));
      
      const updateResponse = await axios.put(`${baseURL}/api/customers/${newCustomer.id}`, updateData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✓ Customer updated successfully:', updateResponse.data.workplace);
      
    } else {
      console.log('✓ Found existing test customer:', customer.name);
      console.log('Customer ID:', customer.id);
      
      // Try to update with the same structure as EditCustomer.tsx
      const updateData = {
        name: `${customer.firstName} ${customer.surname}`,
        firstName: customer.firstName,
        surname: customer.surname,
        email: customer.email,
        phone: customer.phone || customer.contactNumber,
        address: customer.address || customer.residentialAddress,
        kycStatus: customer.kycStatus,
        dateJoined: new Date().toISOString(),
        gender: customer.gender,
        dateOfBirth: customer.dateOfBirth,
        occupation: customer.occupation,
        workplace: 'Updated Corporation Name',
        maritalStatus: customer.maritalStatus,
        residentialAddress: customer.residentialAddress,
        postalAddress: customer.postalAddress,
        contactNumber: customer.contactNumber || customer.phone,
        city: customer.city,
        identificationType: customer.identificationType,
        identificationNumber: customer.identificationNumber,
        beneficiaryName: customer.beneficiaryName,
        beneficiaryContact: customer.beneficiaryContact,
        beneficiaryPercentage: Number(customer.beneficiaryPercentage) || 0,
        beneficiary2Name: customer.beneficiary2Name || '',
        beneficiary2Contact: customer.beneficiary2Contact || '',
        beneficiary2Percentage: Number(customer.beneficiary2Percentage) || 0,
        beneficiary3Name: customer.beneficiary3Name || '',
        beneficiary3Contact: customer.beneficiary3Contact || '',
        beneficiary3Percentage: Number(customer.beneficiary3Percentage) || 0,
        photo: customer.photo || '',
        signature: customer.signature || '',
      };
      
      console.log('Attempting to update existing customer...');
      console.log('Update data structure:', Object.keys(updateData));
      
      const updateResponse = await axios.put(`${baseURL}/api/customers/${customer.id}`, updateData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✓ Existing customer updated successfully:', updateResponse.data.workplace);
    }
    
  } catch (error) {
    console.error('✗ Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

testEditCustomerDetailed();
