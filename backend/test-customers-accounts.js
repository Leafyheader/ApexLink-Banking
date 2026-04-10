const axios = require('axios');

async function testCustomersWithAccounts() {
  try {
    console.log('🧪 Testing /loans/customers endpoint - should only return customers with accounts...\n');

    const baseURL = 'http://localhost:5000/api';
    const response = await axios.get(`${baseURL}/loans/customers?limit=10`);

    console.log('✅ API Response successful!');
    console.log(`📊 Total customers returned: ${response.data.customers.length}`);

    // Check each customer has accounts
    let customersWithAccounts = 0;
    let customersWithoutAccounts = 0;

    response.data.customers.forEach((customer, index) => {
      const hasAccounts = customer.accounts && customer.accounts.length > 0;
      if (hasAccounts) {
        customersWithAccounts++;
        console.log(`  ${index + 1}. ✅ ${customer.name} - ${customer.accounts.length} account(s)`);
      } else {
        customersWithoutAccounts++;
        console.log(`  ${index + 1}. ❌ ${customer.name} - No accounts`);
      }
    });

    console.log(`\n📈 Summary:`);
    console.log(`   Customers with accounts: ${customersWithAccounts}`);
    console.log(`   Customers without accounts: ${customersWithoutAccounts}`);

    if (customersWithoutAccounts === 0) {
      console.log('\n✅ SUCCESS: All customers returned have accounts!');
    } else {
      console.log('\n❌ FAILURE: Some customers without accounts were returned!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCustomersWithAccounts();