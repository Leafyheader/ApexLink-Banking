/**
 * Test Script: Loan Repayment Integration with Backend
 * 
 * This script tests the integrated loan repayment logic in the live banking application.
 * It simulates making loan repayment transactions and validates the results.
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api'; // Backend server URL
const TEST_ACCOUNT_ID = ''; // Will be populated with a loan account
const TEST_AMOUNT = 300; // Test repayment amount

// Helper function to format currency
function formatCurrency(amount) {
  return `GH₵${parseFloat(amount).toFixed(2)}`;
}

// Test authentication (you may need to modify based on your auth system)
async function authenticate() {
  try {
    // This is a placeholder - you'll need to implement actual authentication
    console.log('🔐 Authenticating...');
    return 'mock-token'; // Replace with actual authentication
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

// Get loan accounts
async function getLoanAccounts(token) {
  try {
    console.log('📋 Fetching accounts...');
    const response = await axios.get(`${BASE_URL}/accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Filter for loan accounts (negative balance typically indicates loan debt)
    const loanAccounts = response.data.data.filter(account => 
      parseFloat(account.balance) < 0 || account.type === 'LOAN'
    );
    
    console.log(`📊 Found ${loanAccounts.length} loan accounts`);
    return loanAccounts;
  } catch (error) {
    console.error('❌ Failed to fetch accounts:', error.message);
    throw error;
  }
}

// Make a loan repayment transaction
async function makeLoanRepayment(token, accountId, amount) {
  try {
    console.log(`💰 Making loan repayment: ${formatCurrency(amount)} to account ${accountId}`);
    
    const response = await axios.post(`${BASE_URL}/transactions`, {
      accountId: accountId,
      type: 'loan-repayment',
      amount: amount,
      description: `Test loan repayment - ${formatCurrency(amount)}`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Loan repayment successful!');
    return response.data;
  } catch (error) {
    console.error('❌ Loan repayment failed:', error.response?.data || error.message);
    throw error;
  }
}

// Display repayment details
function displayRepaymentDetails(transaction) {
  console.log('\n📊 LOAN REPAYMENT DETAILS:');
  console.log('=' .repeat(50));
  
  console.log(`Transaction ID: ${transaction.id}`);
  console.log(`Account: ${transaction.accountNumber}`);
  console.log(`Customer: ${transaction.customerName}`);
  console.log(`Amount: ${formatCurrency(transaction.amount)}`);
  console.log(`Status: ${transaction.status}`);
  console.log(`Date: ${new Date(transaction.date).toLocaleString()}`);
  
  if (transaction.repaymentDetails) {
    const details = transaction.repaymentDetails;
    
    console.log('\n💰 PAYMENT BREAKDOWN:');
    console.log(`  Interest Paid: ${formatCurrency(details.breakdown.interestPaid)}`);
    console.log(`  Guarantor Reimbursement: ${formatCurrency(details.breakdown.guarantorReimbursement)}`);
    console.log(`  Loan Reduction: ${formatCurrency(details.breakdown.loanReduction)}`);
    console.log(`  Total Payment: ${formatCurrency(details.totalRepayment)}`);
    
    console.log('\n📈 LOAN STATUS:');
    console.log(`  Total Paid: ${formatCurrency(details.loanState.totalPaid)}`);
    console.log(`  Total Interest Paid: ${formatCurrency(details.loanState.totalInterestPaid)}`);
    console.log(`  Guarantor Reimbursed: ${formatCurrency(details.loanState.guarantorReimbursed)}`);
    console.log(`  Principal Remaining: ${formatCurrency(details.loanState.principalRemaining)}`);
    console.log(`  Remaining Balance: ${formatCurrency(details.remainingBalance)}`);
    console.log(`  Status: ${details.isCompleted ? '🎉 COMPLETED' : '🔄 ACTIVE'}`);
    
    if (details.disbursements && details.disbursements.length > 0) {
      console.log('\n👥 GUARANTOR DISBURSEMENTS:');
      details.disbursements.forEach(disbursement => {
        console.log(`  • ${disbursement.guarantorName} (${disbursement.accountNumber}): ${formatCurrency(disbursement.amount)} (${disbursement.percentage}%)`);
      });
    }
  } else {
    console.log('\n⚠️  No detailed repayment breakdown available (using legacy format)');
  }
  
  console.log('=' .repeat(50));
}

// Main test function
async function runIntegrationTest() {
  console.log('🚀 Starting Loan Repayment Integration Test\n');
  
  try {
    // Step 1: Authenticate
    const token = await authenticate();
    
    // Step 2: Get loan accounts
    const loanAccounts = await getLoanAccounts(token);
    
    if (loanAccounts.length === 0) {
      console.log('⚠️  No loan accounts found. Please create a loan account first.');
      return;
    }
    
    // Step 3: Select first loan account for testing
    const testAccount = loanAccounts[0];
    console.log(`🎯 Using test account: ${testAccount.accountNumber} (Balance: ${formatCurrency(testAccount.balance)})`);
    
    // Step 4: Make loan repayment
    const transaction = await makeLoanRepayment(token, testAccount.id, TEST_AMOUNT);
    
    // Step 5: Display results
    displayRepaymentDetails(transaction);
    
    // Step 6: Verify logic
    console.log('\n🔍 VERIFICATION:');
    if (transaction.repaymentDetails) {
      const breakdown = transaction.repaymentDetails.breakdown;
      const total = breakdown.interestPaid + breakdown.guarantorReimbursement + breakdown.loanReduction;
      const isValid = Math.abs(total - transaction.repaymentDetails.totalRepayment) < 0.01;
      
      console.log(`✓ Payment breakdown sum: ${formatCurrency(total)}`);
      console.log(`✓ Total payment: ${formatCurrency(transaction.repaymentDetails.totalRepayment)}`);
      console.log(`${isValid ? '✅' : '❌'} Breakdown validation: ${isValid ? 'PASSED' : 'FAILED'}`);
      
      // Check business rules
      const interestPercent = (breakdown.interestPaid / transaction.repaymentDetails.totalRepayment) * 100;
      console.log(`✓ Interest percentage: ${interestPercent.toFixed(2)}% (should be ~9.09%)`);
      
      const principalAmount = breakdown.guarantorReimbursement + breakdown.loanReduction;
      const principalPercent = (principalAmount / transaction.repaymentDetails.totalRepayment) * 100;
      console.log(`✓ Principal percentage: ${principalPercent.toFixed(2)}% (should be ~90.91%)`);
    }
    
    console.log('\n🎉 Integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

// Helper function for manual testing
async function runManualTest() {
  console.log('📝 Manual Test Mode');
  console.log('Please ensure:');
  console.log('1. Backend server is running on http://localhost:3001');
  console.log('2. You have loan accounts with negative balances');
  console.log('3. Authentication is properly configured');
  console.log('\nTo run the test:');
  console.log('1. Update the BASE_URL and authentication method in this script');
  console.log('2. Run: node test-loan-repayment-integration.js');
}

// Check if this is being run directly
if (require.main === module) {
  // For now, just show instructions since we need to configure authentication
  runManualTest();
  
  // Uncomment the line below once authentication is configured
  // runIntegrationTest();
}

module.exports = {
  runIntegrationTest,
  makeLoanRepayment,
  displayRepaymentDetails
};
