async function testCompleteIdGeneration() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('=== Testing Complete ID Generation System ===\n');
    
    // 1. Create customers with new ID format
    console.log('1. Creating customers...');
    const customers = [];
    
    for (let i = 1; i <= 2; i++) {
      const customerData = {
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `+123456789${i}`,
        address: `${i}00 Main St`,
        firstName: 'Customer',
        surname: `${i}`,
        gender: 'Male'
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
        console.log(`   ✓ Customer ${i}: ${customer.customerNumber} - ${customer.name}`);
      }
    }
    
    // 2. Create accounts for customers
    console.log('\n2. Creating accounts...');
    const accounts = [];
    
    for (let i = 0; i < customers.length; i++) {
      const accountData = {
        customerId: customers[i].id,
        type: i === 0 ? 'SAVINGS' : 'CURRENT',
        balance: (i + 1) * 1000,
        currency: 'USD'
      };
      
      const createResponse = await fetch('http://localhost:5000/api/accounts', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(accountData)
      });
      
      if (createResponse.ok) {
        const account = await createResponse.json();
        accounts.push(account);
        console.log(`   ✓ Account ${i + 1}: ${account.accountNumber} - ${account.type} (${customers[i].customerNumber})`);
      } else {
        const error = await createResponse.text();
        console.log(`   ✗ Failed to create account ${i + 1}: ${error}`);
      }
    }
    
    // 3. Display summary
    console.log('\n3. Summary:');
    console.log('Customer ID Format: CUST000000XXX');
    console.log('Account ID Format: ACC001XXXXXX');
    console.log('\nCreated IDs:');
    
    customers.forEach((customer, index) => {
      console.log(`Customer ${index + 1}: ${customer.customerNumber}`);
      if (accounts[index]) {
        console.log(`  └─ Account: ${accounts[index].accountNumber}`);
      }
    });
    
    // 4. Clean up
    console.log('\n4. Cleaning up...');
    for (const account of accounts) {
      await fetch(`http://localhost:5000/api/accounts/${account.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    
    for (const customer of customers) {
      await fetch(`http://localhost:5000/api/customers/${customer.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    
    console.log('   ✓ Test data cleaned up');
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCompleteIdGeneration();
