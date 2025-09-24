const axios = require('axios');
const baseURL = 'http://localhost:5000';

async function debugEditCustomer() {
  console.log('Starting debug EditCustomer test...');
  try {
    // 1. Login first
    console.log('Attempting login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');

    // 2. Get an existing customer
    console.log('Fetching customers...');
    const customersResponse = await axios.get(`${baseURL}/api/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const customers = Array.isArray(customersResponse.data) ? customersResponse.data : customersResponse.data.customers || [];
    const customer = customers.find(c => c.name && c.name.includes('Test Upload'));
    
    if (!customer) {
      console.log('✗ No test customer found. Available customers:', customers.map(c => c.name).slice(0, 3));
      return;
    }
    
    console.log('✓ Found test customer:', customer.name);
    console.log('Customer dateJoined:', customer.dateJoined);
    console.log('Customer dateOfBirth:', customer.dateOfBirth);

    // 3. Try to update customer with proper structure (like EditCustomer.tsx does)
    console.log('\n🔍 Testing with proper structure (like EditCustomer.tsx)...');
    
    const customerData = {
      name: `${customer.firstName} ${customer.surname}`,
      firstName: customer.firstName || '',
      surname: customer.surname || '',
      email: customer.email || '',
      phone: customer.phone || customer.contactNumber || '',
      address: customer.address || customer.residentialAddress || '',
      kycStatus: customer.kycStatus || 'pending',
      dateJoined: new Date().toISOString(), // This will be ignored on update
      gender: customer.gender,
      dateOfBirth: customer.dateOfBirth,
      occupation: customer.occupation || '',
      workplace: 'Updated Corporation Name', // Changed field
      maritalStatus: customer.maritalStatus,
      residentialAddress: customer.residentialAddress || '',
      postalAddress: customer.postalAddress || '',
      contactNumber: customer.contactNumber || customer.phone || '',
      city: customer.city || '',
      beneficiaryName: customer.beneficiaryName || '',
      beneficiaryContact: customer.beneficiaryContact || '',
      beneficiaryPercentage: Number(customer.beneficiaryPercentage) || 0,
      beneficiary2Name: customer.beneficiary2Name || '',
      beneficiary2Contact: customer.beneficiary2Contact || '',
      beneficiary2Percentage: Number(customer.beneficiary2Percentage) || 0,
      beneficiary3Name: customer.beneficiary3Name || '',
      beneficiary3Contact: customer.beneficiary3Contact || '',
      beneficiary3Percentage: Number(customer.beneficiary3Percentage) || 0,
      identificationType: customer.identificationType,
      identificationNumber: customer.identificationNumber || '',
      photo: customer.photo || '',
      signature: customer.signature || '',
    };
    
    console.log('Update data keys:', Object.keys(customerData));
    
    const updateResponse = await axios.put(`${baseURL}/api/customers/${customer.id}`, customerData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✓ Customer updated successfully with proper structure');
    console.log('Updated workplace:', updateResponse.data.workplace);
    
  } catch (error) {
    console.error('✗ Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

debugEditCustomer();
