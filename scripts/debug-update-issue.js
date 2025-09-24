const axios = require('axios');
const baseURL = 'http://localhost:5000';

async function debugUpdateIssue() {
  console.log('Debugging customer update issue...');
  try {
    // 1. Login
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✓ Login successful');

    // 2. Get existing customer
    const customersResponse = await axios.get(`${baseURL}/api/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const customers = Array.isArray(customersResponse.data) ? customersResponse.data : customersResponse.data.customers || [];
    const customer = customers.find(c => c.name && c.name.includes('Phone Test'));
    
    if (!customer) {
      console.log('No test customer found');
      return;
    }

    console.log('✓ Found customer:', customer.name);
    console.log('Customer structure:');
    console.log('  dateOfBirth:', customer.dateOfBirth, typeof customer.dateOfBirth);
    console.log('  dateJoined:', customer.dateJoined, typeof customer.dateJoined);

    // 3. Try minimal update
    console.log('\n🔍 Testing minimal update (just workplace)...');
    const minimalUpdate = {
      workplace: 'Minimal Update Test'
    };
    
    try {
      const updateResponse = await axios.put(`${baseURL}/api/customers/${customer.id}`, minimalUpdate, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✓ Minimal update successful');
    } catch (err) {
      console.log('✗ Minimal update failed:', err.response?.data);
    }

    // 4. Try update with just essential fields
    console.log('\n🔍 Testing update with essential fields...');
    const essentialUpdate = {
      name: customer.name,
      firstName: customer.firstName,
      surname: customer.surname,
      email: customer.email,
      workplace: 'Essential Update Test'
    };
    
    try {
      const updateResponse = await axios.put(`${baseURL}/api/customers/${customer.id}`, essentialUpdate, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✓ Essential update successful');
    } catch (err) {
      console.log('✗ Essential update failed:', err.response?.data);
    }

    // 5. Try update with date fields properly formatted
    console.log('\n🔍 Testing update with properly formatted dates...');
    const dateUpdate = {
      name: customer.name,
      firstName: customer.firstName,
      surname: customer.surname,
      email: customer.email,
      phone: customer.phone,
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : undefined,
      workplace: 'Date Update Test'
    };
    
    try {
      const updateResponse = await axios.put(`${baseURL}/api/customers/${customer.id}`, dateUpdate, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✓ Date update successful');
      console.log('  Updated workplace:', updateResponse.data.workplace);
    } catch (err) {
      console.log('✗ Date update failed:', err.response?.data);
    }

  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

debugUpdateIssue();
