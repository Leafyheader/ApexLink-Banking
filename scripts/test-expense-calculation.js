const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testOperatingExpensesCalculation() {
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const headers = {
      'Authorization': `Bearer ${loginResponse.data.token}`,
      'Content-Type': 'application/json'
    };

    console.log('🔍 Testing Operating Expenses Calculation...\n');

    // Create a direct call to test the calculation
    const testExpense = await axios.post(`${BASE_URL}/expenses`, {
      description: 'Direct calculation test',
      amount: 100.50,
      category: 'Technology',
      vendor: 'Test Vendor',
      date: new Date().toISOString()
    }, { headers });
    
    console.log(`✅ Created test expense: $${testExpense.data.amount}`);
    
    // Approve it
    await axios.patch(`${BASE_URL}/expenses/${testExpense.data.id}/status`, {
      status: 'APPROVED'
    }, { headers });
    
    console.log('✅ Approved test expense');
    
    // Get financial summary
    const reports = await axios.get(`${BASE_URL}/reports/financial-summary`, { headers });
    console.log(`Operating expenses in reports: $${reports.data.operatingExpenses}`);
    
    // Get expense summary 
    const expenseSummary = await axios.get(`${BASE_URL}/expenses/summary`, { headers });
    console.log(`Approved expenses in summary: $${expenseSummary.data.approvedExpenses}`);
    
    console.log('\n📊 Analysis:');
    console.log(`- Report uses period filtering (last 30 days)`);
    console.log(`- Summary counts all approved expenses regardless of date`);
    console.log(`- Both should include our new $100.50 expense`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testOperatingExpensesCalculation();
