const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test authentication token (you may need to update this)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzU4NGUyZC04ZjI3LTQ4NmMtOTcwMC00YTY3NWQ4NWJkMWUiLCJ1c2VybmFtZSI6ImFkbWluIiwibmFtZSI6IkFkbWluIFVzZXIiLCJpYXQiOjE3MzQ2NDYwNzN9._nx4hlqAYoNmkLWMYhiakv3sNHSw8oJ3okKhq4Aq2Po';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function demonstrateLoanGuaranteeSystem() {
  console.log('\n🏦 Banking Loan Guarantee System Demonstration\n');
  
  try {
    // Get customers and their account information
    console.log('📋 Fetching customers and accounts...');
    const customersResponse = await apiClient.get('/loans/customers');
    const customers = customersResponse.data.customers;
    
    if (customers.length < 2) {
      console.log('❌ Need at least 2 customers with accounts for demonstration');
      return;
    }
    
    const borrower = customers[0];
    const potentialGuarantor = customers[1];
    
    console.log(`👤 Borrower: ${borrower.name}`);
    console.log(`🤝 Potential Guarantor: ${potentialGuarantor.name}`);
    
    // Display account balances
    if (borrower.accounts && borrower.accounts.length > 0) {
      const borrowerAccount = borrower.accounts[0];
      console.log(`   📊 Borrower Account: ${borrowerAccount.accountNumber} - Balance: ${borrowerAccount.balance}`);
      
      // Calculate loan parameters based on the 2x rule
      const borrowerBalance = parseFloat(borrowerAccount.balance);
      const maxLoanAmount = borrowerBalance * 2;
      const customerContribution = borrowerBalance;
      const guaranteeNeeded = borrowerBalance;
      
      console.log(`\n💰 Loan Guarantee Rules:`);
      console.log(`   ✓ Customer Balance: ${borrowerBalance}`);
      console.log(`   ✓ Maximum Loan (2x balance): ${maxLoanAmount}`);
      console.log(`   ✓ Customer contributes: ${customerContribution}`);
      console.log(`   ✓ Guarantor must cover: ${guaranteeNeeded}`);
    }
    
    if (potentialGuarantor.accounts && potentialGuarantor.accounts.length > 0) {
      const guarantorAccount = potentialGuarantor.accounts[0];
      console.log(`   📊 Guarantor Account: ${guarantorAccount.accountNumber} - Balance: ${guarantorAccount.balance}`);
      
      const guarantorBalance = parseFloat(guarantorAccount.balance);
      const borrowerBalance = parseFloat(borrower.accounts[0].balance);
      
      console.log(`\n🔍 Guarantee Capacity Check:`);
      if (guarantorBalance >= borrowerBalance) {
        console.log(`   ✅ Guarantor can cover required amount (${borrowerBalance})`);
        console.log(`   ✅ After guarantee, guarantor would have ${guarantorBalance - borrowerBalance} available for withdrawal`);
      } else {
        console.log(`   ❌ Guarantor insufficient funds. Has ${guarantorBalance}, needs ${borrowerBalance}`);
      }
    }
    
    console.log(`\n📖 Loan Guarantee System Rules:`);
    console.log(`   1. 📏 Maximum loan = 2x customer's account balance`);
    console.log(`   2. 💰 Customer contributes their full account balance`);
    console.log(`   3. 🤝 Guarantors cover the remaining 50%`);
    console.log(`   4. 🔒 Guaranteed amounts are withheld from guarantor accounts`);
    console.log(`   5. ⛔ Guarantors cannot withdraw past their available balance`);
    console.log(`   6. 📉 Restrictions reduce as loan is repaid`);
    console.log(`   7. 🎯 Up to 3 guarantors can share the guarantee burden`);
    
    // Demonstrate loan eligibility scenarios
    console.log(`\n🎯 Loan Scenarios:`);
    
    if (borrower.accounts && borrower.accounts.length > 0) {
      const borrowerBalance = parseFloat(borrower.accounts[0].balance);
      
      // Scenario 1: Loan within customer's own capacity
      const smallLoan = borrowerBalance;
      console.log(`   Scenario 1: ${borrower.name} wants ${smallLoan} (within own capacity)`);
      console.log(`   Result: ✅ Approved - No guarantor needed`);
      
      // Scenario 2: Maximum loan with guarantor
      const maxLoan = borrowerBalance * 2;
      console.log(`   Scenario 2: ${borrower.name} wants ${maxLoan} (maximum with guarantor)`);
      if (potentialGuarantor.accounts && parseFloat(potentialGuarantor.accounts[0].balance) >= borrowerBalance) {
        console.log(`   Result: ✅ Approved - ${potentialGuarantor.name} can guarantee ${borrowerBalance}`);
      } else {
        console.log(`   Result: ❌ Declined - Guarantor has insufficient funds`);
      }
      
      // Scenario 3: Excessive loan amount
      const excessiveLoan = borrowerBalance * 3;
      console.log(`   Scenario 3: ${borrower.name} wants ${excessiveLoan} (exceeds 2x rule)`);
      console.log(`   Result: ❌ Declined - Exceeds maximum loan amount`);
    }
    
    // Show withdrawal restriction example
    console.log(`\n🔒 Withdrawal Restriction Example:`);
    if (potentialGuarantor.accounts && borrower.accounts) {
      const guarantorBalance = parseFloat(potentialGuarantor.accounts[0].balance);
      const guaranteeAmount = parseFloat(borrower.accounts[0].balance);
      
      console.log(`   ${potentialGuarantor.name} current balance: ${guarantorBalance}`);
      console.log(`   If guaranteeing: ${guaranteeAmount}`);
      console.log(`   Available for withdrawal: ${Math.max(0, guarantorBalance - guaranteeAmount)}`);
      console.log(`   Restricted amount: ${Math.min(guarantorBalance, guaranteeAmount)}`);
    }
    
    console.log(`\n✅ Loan Guarantee System Successfully Demonstrated!`);
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error.response?.data || error.message);
  }
}

// Create a simple demo with test data
async function createDemoScenario() {
  console.log('\n🎪 Creating Demo Scenario with Test Data\n');
  
  // Sample customer data
  const demoCustomers = [
    { 
      name: 'Alice Johnson', 
      balance: 500, 
      scenario: 'Wants loan of 1000 (2x her balance)' 
    },
    { 
      name: 'Bob Smith', 
      balance: 750, 
      scenario: 'Can guarantee 500 for Alice' 
    },
    { 
      name: 'Charlie Brown', 
      balance: 300, 
      scenario: 'Insufficient to guarantee large amounts' 
    }
  ];
  
  console.log('👥 Demo Customers:');
  demoCustomers.forEach((customer, index) => {
    console.log(`   ${index + 1}. ${customer.name} - Balance: ${customer.balance}`);
    console.log(`      ${customer.scenario}\n`);
  });
  
  // Loan scenario analysis
  const alice = demoCustomers[0];
  const bob = demoCustomers[1];
  const charlie = demoCustomers[2];
  
  console.log('📊 Loan Analysis for Alice Johnson (Balance: 500):');
  console.log(`   Maximum loan allowed: ${alice.balance * 2} (2x balance)`);
  console.log(`   Alice contributes: ${alice.balance}`);
  console.log(`   Guarantee needed: ${alice.balance}`);
  
  console.log('\n🤝 Guarantor Analysis:');
  console.log(`   Bob (Balance: ${bob.balance}):`);
  console.log(`     ✅ Can guarantee ${alice.balance}? YES`);
  console.log(`     After guarantee: ${bob.balance - alice.balance} available for withdrawal`);
  
  console.log(`\n   Charlie (Balance: ${charlie.balance}):`);
  console.log(`     ❌ Can guarantee ${alice.balance}? NO (insufficient funds)`);
  
  console.log('\n🔄 Loan Repayment Example:');
  const loanAmount = alice.balance * 2; // 1000
  const monthlyPayment = loanAmount / 12; // Simple calculation
  
  console.log(`   Loan Amount: ${loanAmount}`);
  console.log(`   Monthly Payment: ${monthlyPayment.toFixed(2)}`);
  console.log(`   After 6 payments (${(monthlyPayment * 6).toFixed(2)}):`);
  console.log(`     Remaining balance: ${(loanAmount - monthlyPayment * 6).toFixed(2)}`);
  console.log(`     Bob's restriction reduced to: ${((loanAmount - monthlyPayment * 6) / 2).toFixed(2)}`);
  console.log(`     Bob's additional available funds: ${(monthlyPayment * 6 / 2).toFixed(2)}`);
  
  console.log('\n🎯 System Benefits:');
  console.log('   ✅ Borrowers can access 2x their savings');
  console.log('   ✅ Risk is shared with trusted guarantors');
  console.log('   ✅ Guarantor funds are protected through restrictions');
  console.log('   ✅ Restrictions automatically reduce with payments');
  console.log('   ✅ Multiple guarantors can share the burden');
  console.log('   ✅ System prevents over-borrowing and defaults');
}

// Run demonstrations
demonstrateLoanGuaranteeSystem().then(() => {
  return createDemoScenario();
}).catch(error => {
  console.error('Demo failed:', error.message);
});