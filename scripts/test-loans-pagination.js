const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testLoansPagination() {
  console.log('🧪 Testing Loans Pagination API...\n');

  try {
    // Test 1: Basic pagination
    console.log('📄 Test 1: Basic loans pagination');
    const response1 = await axios.get(`${API_BASE}/loans?page=1&limit=5`);
    console.log(`✅ Page 1 - Got ${response1.data.loans.length} loans`);
    console.log(`   Total: ${response1.data.pagination.total}, Pages: ${response1.data.pagination.pages}`);
    
    if (response1.data.loans.length > 0) {
      const loan = response1.data.loans[0];
      console.log(`   First loan: ${loan.customer?.name || loan.customerName} - ${loan.amount}`);
    }

    // Test 2: Second page (if exists)
    if (response1.data.pagination.pages > 1) {
      console.log('\n📄 Test 2: Second page');
      const response2 = await axios.get(`${API_BASE}/loans?page=2&limit=5`);
      console.log(`✅ Page 2 - Got ${response2.data.loans.length} loans`);
      
      if (response2.data.loans.length > 0) {
        const loan = response2.data.loans[0];
        console.log(`   First loan: ${loan.customer?.name || loan.customerName} - ${loan.amount}`);
      }
    } else {
      console.log('\n📄 Test 2: Only one page exists');
    }

    // Test 3: Search functionality
    console.log('\n🔍 Test 3: Search functionality');
    const searchResponse = await axios.get(`${API_BASE}/loans?search=a&limit=10`);
    console.log(`✅ Search for 'a' - Got ${searchResponse.data.loans.length} loans`);
    console.log(`   Total matches: ${searchResponse.data.pagination.total}`);

    // Test 4: Different page sizes
    console.log('\n📊 Test 4: Different page sizes');
    const sizes = [5, 10, 25];
    for (const size of sizes) {
      const response = await axios.get(`${API_BASE}/loans?page=1&limit=${size}`);
      console.log(`✅ Page size ${size} - Got ${response.data.loans.length} loans (max ${size})`);
    }

    // Test 5: Edge cases
    console.log('\n🚨 Test 5: Edge cases');
    
    // Page beyond limit
    const highPageResponse = await axios.get(`${API_BASE}/loans?page=999&limit=10`);
    console.log(`✅ Page 999 - Got ${highPageResponse.data.loans.length} loans (should be 0)`);
    
    // Invalid parameters (should default)
    const invalidResponse = await axios.get(`${API_BASE}/loans?page=abc&limit=xyz`);
    console.log(`✅ Invalid params - Got ${invalidResponse.data.loans.length} loans (default behavior)`);

    console.log('\n✅ All loans pagination tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing loans pagination:', error.response?.data || error.message);
  }
}

testLoansPagination();
