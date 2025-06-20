async function testMultipleCustomerIds() {
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
    
    console.log('Creating multiple customers to test ID sequence...');
    
    const customers = [];
    
    // Create 3 customers
    for (let i = 1; i <= 3; i++) {
      const customerData = {
        name: `Test Customer ${i}`,
        email: `test.customer${i}@example.com`,
        phone: `+123456789${i}`,
        address: `${i}23 Test St`,
        firstName: 'Test',
        surname: `Customer${i}`,
        gender: 'Male',
        occupation: 'Engineer'
      };
      
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
        customers.push(customer);
        console.log(`Customer ${i}: ${customer.customerNumber} (${customer.name})`);
      } else {
        console.log(`Failed to create customer ${i}:`, await createResponse.text());
      }
    }
    
    console.log('\nCustomer IDs generated:');
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.customerNumber} - ${customer.name}`);
    });
    
    // Clean up - delete test customers
    console.log('\nCleaning up test customers...');
    for (const customer of customers) {
      await fetch(`http://localhost:5000/api/customers/${customer.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    console.log('Test customers cleaned up');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMultipleCustomerIds();
