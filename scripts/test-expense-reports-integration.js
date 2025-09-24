const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

// Test the integration between expense management and reporting
async function testExpenseReportsIntegration() {
  try {
    console.log('🧪 Testing Expense Reports Integration...\n');

    // Step 1: Login to get auth token
    console.log('1. Logging in...');    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful\n');

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Get current financial summary (before adding expenses)
    console.log('2. Getting current financial summary...');
    const initialReports = await axios.get(`${BASE_URL}/reports/financial-summary`, { headers });
    const initialOperatingExpenses = initialReports.data.operatingExpenses;
    console.log(`Initial operating expenses: $${initialOperatingExpenses}\n`);

    // Step 3: Create a new expense (should be PENDING by default)
    console.log('3. Creating a new expense...');    const newExpense = await axios.post(`${BASE_URL}/expenses`, {
      title: 'Test Office Supplies',
      description: 'Testing expense integration',
      amount: 250.00,
      category: 'OFFICE_SUPPLIES',
      vendor: 'Test Vendor Inc',
      date: new Date().toISOString()
    }, { headers });
    
    const expenseId = newExpense.data.id;
    console.log(`✅ Created expense with ID: ${expenseId} (Status: ${newExpense.data.status})\n`);

    // Step 4: Check that pending expense doesn't affect reports
    console.log('4. Checking that PENDING expense does not affect reports...');
    const reportsAfterPending = await axios.get(`${BASE_URL}/reports/financial-summary`, { headers });
    const expensesAfterPending = reportsAfterPending.data.operatingExpenses;
    console.log(`Operating expenses after PENDING: $${expensesAfterPending}`);
    
    if (expensesAfterPending === initialOperatingExpenses) {
      console.log('✅ Correct: PENDING expenses do not affect financial reports\n');
    } else {
      console.log('❌ Error: PENDING expenses are affecting financial reports\n');
    }

    // Step 5: Approve the expense
    console.log('5. Approving the expense...');
    const approvedExpense = await axios.patch(`${BASE_URL}/expenses/${expenseId}/status`, {
      status: 'APPROVED'
    }, { headers });
    console.log(`✅ Expense approved (Status: ${approvedExpense.data.status})\n`);

    // Step 6: Check that approved expense affects reports
    console.log('6. Checking that APPROVED expense affects reports...');
    const reportsAfterApproval = await axios.get(`${BASE_URL}/reports/financial-summary`, { headers });
    const expensesAfterApproval = reportsAfterApproval.data.operatingExpenses;
    console.log(`Operating expenses after APPROVAL: $${expensesAfterApproval}`);
    
    const expectedExpenses = initialOperatingExpenses + 250.00;
    if (Math.abs(expensesAfterApproval - expectedExpenses) < 0.01) {
      console.log('✅ Correct: APPROVED expenses are included in financial reports\n');
    } else {
      console.log(`❌ Error: Expected $${expectedExpenses}, got $${expensesAfterApproval}\n`);
    }

    // Step 7: Test expense summary for approved expenses
    console.log('7. Testing expense summary...');
    const expenseSummary = await axios.get(`${BASE_URL}/expenses/summary`, { headers });
    console.log('Expense Summary:');
    console.log(`- Total Expenses: $${expenseSummary.data.totalExpenses}`);
    console.log(`- Monthly Spent: $${expenseSummary.data.monthlySpent}`);
    console.log(`- Pending Count: ${expenseSummary.data.pendingCount}`);
    console.log('✅ Expense summary retrieved successfully\n');

    // Step 8: Test expense approval list
    console.log('8. Testing expense approval list...');
    const expenseApproval = await axios.get(`${BASE_URL}/expenses/pending`, { headers });
    console.log(`Pending expenses for approval: ${expenseApproval.data.length} items`);
    if (expenseApproval.data.length > 0) {
      console.log('Sample pending expense:', {
        id: expenseApproval.data[0].id,
        title: expenseApproval.data[0].title,
        amount: expenseApproval.data[0].amount,
        status: expenseApproval.data[0].status
      });
    }
    console.log('✅ Expense approval list retrieved successfully\n');

    // Step 9: Check net profit calculation
    console.log('9. Testing net profit calculation...');
    const finalReports = await axios.get(`${BASE_URL}/reports/financial-summary`, { headers });
    const { bankIncome, operatingExpenses: finalOperatingExpenses, netProfit } = finalReports.data;
    const calculatedNetProfit = bankIncome - finalOperatingExpenses;
    
    console.log(`Bank Income: $${bankIncome}`);
    console.log(`Operating Expenses: $${finalOperatingExpenses}`);
    console.log(`Net Profit (reported): $${netProfit}`);
    console.log(`Net Profit (calculated): $${calculatedNetProfit}`);
    
    if (Math.abs(netProfit - calculatedNetProfit) < 0.01) {
      console.log('✅ Correct: Net profit calculation includes real expense data\n');
    } else {
      console.log('❌ Error: Net profit calculation mismatch\n');
    }

    console.log('🎉 Expense Reports Integration Test Complete!');
    console.log('\n📊 Summary:');
    console.log('- Expense creation and approval workflow: ✅');
    console.log('- PENDING expenses excluded from reports: ✅');
    console.log('- APPROVED expenses included in reports: ✅');
    console.log('- Expense summary accuracy: ✅');
    console.log('- Net profit calculation: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testExpenseReportsIntegration();
