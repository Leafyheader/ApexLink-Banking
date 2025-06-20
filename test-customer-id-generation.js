async function testCustomerIdGeneration() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      console.log('Login failed:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      console.log('No token received:', loginData);
      return;
    }
    
    console.log('Login successful, token received');
    
    // Create a test customer
    const customerData = {
      name: 'Test Customer',
      email: 'test.customer@example.com',
      phone: '+1234567890',
      address: '123 Test St',
      firstName: 'Test',
      surname: 'Customer',
      gender: 'Male',
      occupation: 'Engineer'
    };
    
    console.log('Creating customer with new ID system...');
    const createResponse = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(customerData)
    });
    
    if (createResponse.ok) {
      const customer = await createResponse.json();
      console.log('Customer created successfully:');
      console.log('ID:', customer.id);
      console.log('Customer Number:', customer.customerNumber);
      console.log('Name:', customer.name);
      console.log('Email:', customer.email);
      
      // Clean up - delete the test customer
      await fetch(`http://localhost:5000/api/customers/${customer.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Test customer cleaned up');
      
    } else {
      const error = await createResponse.text();
      console.log('Failed to create customer:', error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCustomerIdGeneration();
