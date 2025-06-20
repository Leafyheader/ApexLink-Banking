const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test function for authentication
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return null;
  }
}

// Test pagination for customers
async function testCustomersPagination(token) {
  console.log('\n=== Testing Customers Pagination ===');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  try {
    // Test page 1 with default limit (10)
    console.log('\n1. Testing page 1 with limit 10:');
    const page1 = await axios.get(`${BASE_URL}/customers?page=1&limit=10`, { headers });
    console.log(`- Total customers: ${page1.data.pagination.total}`);
    console.log(`- Total pages: ${page1.data.pagination.totalPages}`);
    console.log(`- Current page: ${page1.data.pagination.page}`);
    console.log(`- Customers returned: ${page1.data.customers.length}`);
    console.log(`- First customer: ${page1.data.customers[0]?.name || 'none'}`);
    
    // Test page 2 if it exists
    if (page1.data.pagination.totalPages > 1) {
      console.log('\n2. Testing page 2:');
      const page2 = await axios.get(`${BASE_URL}/customers?page=2&limit=10`, { headers });
      console.log(`- Customers returned: ${page2.data.customers.length}`);
      console.log(`- First customer: ${page2.data.customers[0]?.name || 'none'}`);
      
      // Check if customers are different
      const page1Names = page1.data.customers.map(c => c.name);
      const page2Names = page2.data.customers.map(c => c.name);
      const isDifferent = !page1Names.some(name => page2Names.includes(name));
      console.log(`- Different from page 1: ${isDifferent ? 'YES' : 'NO'}`);
    }
    
    // Test with larger limit
    console.log('\n3. Testing with limit 25:');
    const largePage = await axios.get(`${BASE_URL}/customers?page=1&limit=25`, { headers });
    console.log(`- Customers returned: ${largePage.data.customers.length}`);
    
  } catch (error) {
    console.error('Error testing customers pagination:', error.response?.data || error.message);
  }
}

// Test pagination for accounts
async function testAccountsPagination(token) {
  console.log('\n=== Testing Accounts Pagination ===');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  try {
    // Test page 1 with default limit (10)
    console.log('\n1. Testing page 1 with limit 10:');
    const page1 = await axios.get(`${BASE_URL}/accounts?page=1&limit=10`, { headers });
    console.log(`- Total accounts: ${page1.data.pagination.total}`);
    console.log(`- Total pages: ${page1.data.pagination.totalPages}`);
    console.log(`- Current page: ${page1.data.pagination.page}`);
    console.log(`- Accounts returned: ${page1.data.accounts.length}`);
    console.log(`- First account: ${page1.data.accounts[0]?.accountNumber || 'none'}`);
    
    // Test page 2 if it exists
    if (page1.data.pagination.totalPages > 1) {
      console.log('\n2. Testing page 2:');
      const page2 = await axios.get(`${BASE_URL}/accounts?page=2&limit=10`, { headers });
      console.log(`- Accounts returned: ${page2.data.accounts.length}`);
      console.log(`- First account: ${page2.data.accounts[0]?.accountNumber || 'none'}`);
      
      // Check if accounts are different
      const page1Numbers = page1.data.accounts.map(a => a.accountNumber);
      const page2Numbers = page2.data.accounts.map(a => a.accountNumber);
      const isDifferent = !page1Numbers.some(num => page2Numbers.includes(num));
      console.log(`- Different from page 1: ${isDifferent ? 'YES' : 'NO'}`);
    }
    
    // Test with larger limit
    console.log('\n3. Testing with limit 25:');
    const largePage = await axios.get(`${BASE_URL}/accounts?page=1&limit=25`, { headers });
    console.log(`- Accounts returned: ${largePage.data.accounts.length}`);
    
  } catch (error) {
    console.error('Error testing accounts pagination:', error.response?.data || error.message);
  }
}

// Test search functionality
async function testSearch(token) {
  console.log('\n=== Testing Search Functionality ===');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  try {
    // Test customer search
    console.log('\n1. Testing customer search:');
    const customerSearch = await axios.get(`${BASE_URL}/customers?search=John&page=1&limit=10`, { headers });
    console.log(`- Search results: ${customerSearch.data.customers.length}`);
    console.log(`- Total matching: ${customerSearch.data.pagination.total}`);
    console.log(`- Names: ${customerSearch.data.customers.map(c => c.name).join(', ')}`);
    
    // Test account search
    console.log('\n2. Testing account search:');
    const accountSearch = await axios.get(`${BASE_URL}/accounts?search=ACC&page=1&limit=10`, { headers });
    console.log(`- Search results: ${accountSearch.data.accounts.length}`);
    console.log(`- Total matching: ${accountSearch.data.pagination.total}`);
    console.log(`- Account numbers: ${accountSearch.data.accounts.map(a => a.accountNumber).slice(0, 5).join(', ')}`);
    
  } catch (error) {
    console.error('Error testing search:', error.response?.data || error.message);
  }
}

// Main test function
async function runTests() {
  console.log('Starting pagination tests...');
  
  const token = await login();
  if (!token) {
    console.error('Failed to authenticate. Cannot run tests.');
    return;
  }
  
  console.log('✓ Authentication successful');
  
  await testCustomersPagination(token);
  await testAccountsPagination(token);
  await testSearch(token);
  
  console.log('\n=== Tests completed ===');
}

// Run the tests
runTests().catch(console.error);
