const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugExpenseData() {
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

    console.log('🔍 Debugging Expense Data...\n');    // Get all expenses
    console.log('1. Getting all expenses...');
    const allExpenses = await axios.get(`${BASE_URL}/expenses`, { headers });
    console.log('Raw response:', JSON.stringify(allExpenses.data, null, 2));
    
    const expenses = allExpenses.data.expenses || allExpenses.data || [];
    console.log(`Total expenses in system: ${expenses.length}`);    
    if (expenses.length > 0) {
      console.log('\nRecent expenses:');
      expenses.slice(-3).forEach((expense, index) => {
        console.log(`${index + 1}. ID: ${expense.id}`);
        console.log(`   Amount: $${expense.amount}`);
        console.log(`   Status: ${expense.status}`);
        console.log(`   Date: ${expense.date}`);
        console.log(`   Category: ${expense.category}`);
        console.log('');
      });
    }

    // Get expense summary
    console.log('2. Getting expense summary...');
    const expenseSummary = await axios.get(`${BASE_URL}/expenses/summary`, { headers });
    console.log('Expense Summary:', expenseSummary.data);

    // Get financial reports
    console.log('\n3. Getting financial reports...');
    const financialReports = await axios.get(`${BASE_URL}/reports/financial-summary`, { headers });
    console.log('Financial Summary Operating Expenses:', financialReports.data.operatingExpenses);
    console.log('Date range:', financialReports.data.periodStart, 'to', financialReports.data.periodEnd);

    // Get approved expenses for current period
    console.log('\n4. Checking approved expenses in current period...');
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log(`Looking for expenses from ${thirtyDaysAgo.toISOString()} to ${today.toISOString()}`);
      const approvedExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (expense.status === 'APPROVED' || expense.status === 'PAID') &&
             expenseDate >= thirtyDaysAgo &&
             expenseDate <= today;
    });
    
    console.log(`Approved/Paid expenses in period: ${approvedExpenses.length}`);
    const totalApprovedAmount = approvedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    console.log(`Total approved expense amount: $${totalApprovedAmount}`);

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugExpenseData();
