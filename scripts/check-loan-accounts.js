const BASE_URL = 'http://localhost:5000/api';

async function checkLoanAccounts() {
  try {
    // Login first
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const { token } = await loginResponse.json();
    
    // Get all accounts
    const accountsResponse = await fetch(`${BASE_URL}/accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await accountsResponse.json();
    const accounts = data.accounts || data;
    
    console.log('Total accounts:', accounts.length);
    console.log('\nAccount types breakdown:');
    
    const typeCount = {};
    const loanAccounts = [];
      accounts.forEach(acc => {
      typeCount[acc.type] = (typeCount[acc.type] || 0) + 1;
      if (acc.type === 'LOAN' || acc.type === 'loan') {
        loanAccounts.push(acc);
        console.log(`- LOAN: ${acc.accountNumber} (${acc.customer.name}) Balance: ${acc.balance} Status: ${acc.status}`);
      }
    });
    
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
    console.log(`\nFound ${loanAccounts.length} loan accounts total`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLoanAccounts();
