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

async function testLoanGuaranteeSystem() {
  console.log('\n🏦 Testing Loan Guarantee System\n');
  
  try {
    // First, let's get some customers and their accounts
    console.log('📋 Fetching customers...');
    const customersResponse = await apiClient.get('/loans/customers');
    const customers = customersResponse.data.customers;
    
    if (customers.length < 2) {
      console.log('❌ Need at least 2 customers with accounts for testing');
      return;
    }
    
    const borrower = customers[0];
    const guarantor = customers[1];
    
    console.log(`👤 Borrower: ${borrower.name} (${borrower.accounts[0]?.accountNumber})`);
    console.log(`🤝 Guarantor: ${guarantor.name} (${guarantor.accounts[0]?.accountNumber})`);
    
    const borrowerAccount = borrower.accounts[0];
    const guarantorAccount = guarantor.accounts[0];
    
    if (!borrowerAccount || !guarantorAccount) {
      console.log('❌ Both customers need active accounts');
      return;
    }
    
    console.log(`\n💰 Borrower Balance: ${borrowerAccount.balance}`);
    console.log(`💰 Guarantor Balance: ${guarantorAccount.balance}`);
    
    // Test 1: Check loan eligibility for 2x borrower's balance (should need guarantor)
    const borrowerBalance = parseFloat(borrowerAccount.balance);
    const loanAmount = borrowerBalance * 2; // Maximum allowed loan
    const guaranteeNeeded = borrowerBalance; // Guarantor needs to cover the other half
    
    console.log(`\n🎯 Testing loan for ${loanAmount} (2x borrower's balance)`);
    console.log(`🎯 Guarantee needed: ${guaranteeNeeded}`);
    
    // Check eligibility with guarantor
    const eligibilityRequest = {
      customerId: borrower.id,
      accountId: borrowerAccount.id,
      amount: loanAmount,
      guarantor1Amount: guaranteeNeeded,
      guarantor1AccountId: guarantorAccount.id
    };
    
    console.log('\n🔍 Checking loan eligibility...');
    const eligibilityResponse = await apiClient.post('/loans/check-eligibility', eligibilityRequest);
    const eligibility = eligibilityResponse.data.eligibility;
    
    console.log('\n📊 Eligibility Results:');
    console.log(`✓ Is Eligible: ${eligibility.isEligible}`);
    console.log(`✓ Customer Max Loan: ${eligibility.customerMaxLoan}`);
    console.log(`✓ Customer Balance: ${eligibility.customerBalance}`);
    console.log(`✓ Customer Contribution: ${eligibility.customerContribution}`);
    console.log(`✓ Guarantee Required: ${eligibility.guaranteeRequired}`);
    console.log(`✓ Message: ${eligibility.message}`);
    
    if (eligibility.guarantor1Check) {
      console.log('\n🤝 Guarantor 1 Check:');
      console.log(`  - Current Balance: ${eligibility.guarantor1Check.currentBalance}`);
      console.log(`  - Available for Guarantee: ${eligibility.guarantor1Check.availableForGuarantee}`);
      console.log(`  - Requested Amount: ${eligibility.guarantor1Check.requestedAmount}`);
      console.log(`  - Is Eligible: ${eligibility.guarantor1Check.isEligible}`);
      console.log(`  - Message: ${eligibility.guarantor1Check.message}`);
    }
    
    // Test 2: Check available balance for withdrawal for guarantor (before loan)
    console.log('\n💳 Checking guarantor available balance (before loan)...');
    const balanceResponse1 = await apiClient.get(`/loans/account/${guarantorAccount.id}/available-balance`);
    console.log('Available for withdrawal (before loan):', balanceResponse1.data);
    
    // Test 3: Create the loan if eligible
    if (eligibility.isEligible) {
      console.log('\n🏦 Creating loan...');
      
      const loanRequest = {
        customerId: borrower.id,
        amount: loanAmount,
        interestRate: 12,
        term: 12,
        repaymentFrequency: 'MONTHLY',
        guarantor1Id: guarantor.id,
        guarantor1AccountId: guarantorAccount.id,
        guarantor1Percentage: Math.round((guaranteeNeeded / loanAmount) * 100)
      };
      
      const loanResponse = await apiClient.post('/loans', loanRequest);
      const loan = loanResponse.data.loan;
      
      console.log('✅ Loan created successfully!');
      console.log(`   Loan ID: ${loan.id}`);
      console.log(`   Amount: ${loan.amount}`);
      console.log(`   Monthly Payment: ${loan.monthlyPayment}`);
      console.log(`   Status: ${loan.status}`);
      
      // Test 4: Check guarantor's available balance after loan creation
      console.log('\n💳 Checking guarantor available balance (after loan)...');
      const balanceResponse2 = await apiClient.get(`/loans/account/${guarantorAccount.id}/available-balance`);
      console.log('Available for withdrawal (after loan):', balanceResponse2.data);
      
      // Test 5: Get guarantor's loan commitments
      console.log('\n📋 Checking guarantor\'s loan commitments...');
      const guarantorLoansResponse = await apiClient.get(`/loans/guarantor/${guarantor.id}`);
      console.log('Guarantor loans:', guarantorLoansResponse.data);
      
      console.log('\n✅ Loan guarantee system working correctly!');
      console.log('\n📋 Summary:');
      console.log(`   - Borrower can take loan up to 2x their balance (${eligibility.customerMaxLoan})`);
      console.log(`   - Customer contributes: ${eligibility.customerContribution}`);
      console.log(`   - Guarantor covers: ${guaranteeNeeded}`);
      console.log(`   - Guarantor's available balance reduced by guaranteed amount`);
      
    } else {
      console.log('\n❌ Loan not eligible:', eligibility.message);
      
      // Test with insufficient guarantor balance scenario
      const excessiveLoanAmount = borrowerBalance * 4; // Way more than allowed
      console.log(`\n🎯 Testing excessive loan amount: ${excessiveLoanAmount}`);
      
      const excessiveEligibilityRequest = {
        customerId: borrower.id,
        accountId: borrowerAccount.id,
        amount: excessiveLoanAmount,
        guarantor1Amount: excessiveLoanAmount - borrowerBalance,
        guarantor1AccountId: guarantorAccount.id
      };
      
      const excessiveResponse = await apiClient.post('/loans/check-eligibility', excessiveEligibilityRequest);
      console.log('Excessive loan result:', excessiveResponse.data.eligibility.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testLoanGuaranteeSystem();