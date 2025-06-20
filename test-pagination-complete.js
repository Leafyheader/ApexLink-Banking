const axios = require('axios');

async function testPaginationEndToEnd() {
  try {
    console.log('🔄 Testing Transactions Pagination End-to-End');
    console.log('=============================================');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Test first page with different page sizes
    console.log('\n📊 Testing Different Page Sizes:');
    
    const pageSizes = [5, 10, 25];
    for (const size of pageSizes) {
      const response = await axios.get(`http://localhost:5000/api/transactions?page=1&limit=${size}`, { headers });
      const { total, totalPages, page, limit } = response.data.pagination;
      
      console.log(`   • ${size} per page: ${total} total, ${totalPages} pages, showing ${response.data.transactions.length} items`);
    }
    
    // Test pagination navigation
    console.log('\n🔍 Testing Pagination Navigation:');
    
    const testResponse = await axios.get('http://localhost:5000/api/transactions?page=1&limit=10', { headers });
    const totalPages = testResponse.data.pagination.totalPages;
    
    if (totalPages > 1) {
      // Test first page
      const firstPage = await axios.get('http://localhost:5000/api/transactions?page=1&limit=10', { headers });
      console.log(`   • Page 1: ${firstPage.data.transactions.length} transactions`);
      console.log(`     - First transaction ID: ${firstPage.data.transactions[0]?.id}`);
      
      // Test middle page (if exists)
      if (totalPages > 2) {
        const middlePage = Math.ceil(totalPages / 2);
        const midResponse = await axios.get(`http://localhost:5000/api/transactions?page=${middlePage}&limit=10`, { headers });
        console.log(`   • Page ${middlePage}: ${midResponse.data.transactions.length} transactions`);
        console.log(`     - First transaction ID: ${midResponse.data.transactions[0]?.id}`);
      }
      
      // Test last page
      const lastPage = await axios.get(`http://localhost:5000/api/transactions?page=${totalPages}&limit=10`, { headers });
      console.log(`   • Page ${totalPages} (last): ${lastPage.data.transactions.length} transactions`);
      console.log(`     - First transaction ID: ${lastPage.data.transactions[0]?.id}`);
      
      // Verify no duplicate transactions between pages
      const firstPageIds = new Set(firstPage.data.transactions.map(t => t.id));
      const lastPageIds = new Set(lastPage.data.transactions.map(t => t.id));
      const hasOverlap = [...firstPageIds].some(id => lastPageIds.has(id));
      
      console.log(`   • No duplicate transactions between first and last page: ${!hasOverlap ? '✅' : '❌'}`);
    }
    
    // Test with filters
    console.log('\n🔧 Testing Pagination with Filters:');
    
    const filterTests = [
      { filter: 'type=deposit', name: 'Deposits only' },
      { filter: 'status=completed', name: 'Completed only' },
      { filter: 'search=test', name: 'Search "test"' }
    ];
    
    for (const test of filterTests) {
      const response = await axios.get(`http://localhost:5000/api/transactions?page=1&limit=5&${test.filter}`, { headers });
      const { total, totalPages } = response.data.pagination;
      console.log(`   • ${test.name}: ${total} results, ${totalPages} pages`);
    }
    
    console.log('\n✅ Pagination testing completed successfully!');
    console.log('\nFrontend should now show:');
    console.log('- Pagination controls when total pages > 1');
    console.log('- Smart pagination with ellipsis for many pages');
    console.log('- "Go to page" input for datasets with > 10 pages');
    console.log('- Page info even for single page datasets');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPaginationEndToEnd();
