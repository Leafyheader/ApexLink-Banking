async function testDashboard() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const { token } = await loginResponse.json();
    
    // Get dashboard summary
    const dashboardResponse = await fetch('http://localhost:5000/api/dashboard/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await dashboardResponse.json();
    
    console.log('Dashboard Summary:');
    console.log('Total Customers:', data.totalCustomers);
    console.log('Total Deposits:', data.totalDeposits);
    console.log('Total Withdrawals:', data.totalWithdrawals);
    console.log('Total Loans:', data.totalLoans);
    console.log('Today Transactions:', data.todayTransactions);
    console.log('\nFull response:', JSON.stringify(data, null, 2));
    
    // Also check individual transactions to see what deposit amounts exist
    const transactionsResponse = await fetch('http://localhost:5000/api/dashboard/transactions?limit=50', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const transactions = await transactionsResponse.json();
    
    const deposits = transactions.filter(t => t.type === 'deposit');
    const withdrawals = transactions.filter(t => t.type === 'withdrawal');
    
    console.log('\nDeposit transactions:');
    deposits.forEach(t => console.log(`- ${t.amount} on ${t.date}`));
    
    console.log('\nWithdrawal transactions:');
    withdrawals.forEach(t => console.log(`- ${t.amount} on ${t.date}`));
    
    const totalDepositTransactions = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawalTransactions = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    
    console.log('\nCalculated from transactions:');
    console.log('Total Deposit Transactions:', totalDepositTransactions);
    console.log('Total Withdrawal Transactions:', totalWithdrawalTransactions);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDashboard();
