/**
 * Comprehensive test for loan repayment with guarantor disbursement system
 * 
 * This test verifies:
 * 1. Creating a loan with guarantors
 * 2. Processing loa// Step 5: Create loan with guar// Step 6: Check i// Step 7: Process loan repayment
a// Step 8: Check f// Step 9: Verify calculations
async function verifyCalculations(initialBalances, finalBalances, repaymentAmount) {al balances
async function checkFinalBalances() {nc function processLoanRepayment(repaymentAmount) {tial balances
async function checkInitialBalances() {tors
async function createLoan() {repayment with 50/50 split
 * 3. Verifying guarantor disbursements
 * 4. Checking account balance updates
 */

const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5000/api';
let authToken = '';

// Test data
const timestamp = Date.now();
const testData = {
  borrower: {
    name: 'John Borrower',
    firstName: 'John',
    surname: 'Borrower',
    email: `john.borrower.${timestamp}@test.com`,
    phone: '+1234567890',
    address: '123 Loan Street',
    dateOfBirth: '1980-01-01',
    nationalId: `ID123456789${timestamp}`,
    occupation: 'Engineer',
    monthlyIncome: 5000
  },
  guarantor1: {
    name: 'Alice Guarantor',
    firstName: 'Alice',
    surname: 'Guarantor',
    email: `alice.guarantor.${timestamp}@test.com`,
    phone: '+1234567891',
    address: '456 Guarantee Ave',
    dateOfBirth: '1975-05-15',
    nationalId: `ID987654321${timestamp}`,
    occupation: 'Doctor',
    monthlyIncome: 8000
  },
  guarantor2: {
    name: 'Bob Guarantor',
    firstName: 'Bob',
    surname: 'Guarantor',
    email: `bob.guarantor.${timestamp}@test.com`,
    phone: '+1234567892',
    address: '789 Security Blvd',
    dateOfBirth: '1978-09-20',
    nationalId: `ID555666777${timestamp}`,
    occupation: 'Lawyer',
    monthlyIncome: 7000
  },
  loan: {
    amount: 10000,
    interestRate: 12,
    term: 24,
    purpose: 'Business expansion'
  }
};

let customers = {};
let accounts = {};
let loanAccount = null;

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Step 1: Login
async function login() {
  console.log('🔐 Logging in...');
  const response = await apiRequest('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  authToken = response.token;
  console.log('✅ Login successful');
  return response;
}

// Step 2: Create customers
async function createCustomers() {
  console.log('\n👥 Creating customers...');
  
  // Create borrower
  console.log('Creating borrower...');
  customers.borrower = await apiRequest('POST', '/customers', testData.borrower);
  console.log(`✅ Borrower created: ${customers.borrower.name} (ID: ${customers.borrower.id})`);
  
  // Create guarantor 1
  console.log('Creating guarantor 1...');
  customers.guarantor1 = await apiRequest('POST', '/customers', testData.guarantor1);
  console.log(`✅ Guarantor 1 created: ${customers.guarantor1.name} (ID: ${customers.guarantor1.id})`);
  
  // Create guarantor 2
  console.log('Creating guarantor 2...');
  customers.guarantor2 = await apiRequest('POST', '/customers', testData.guarantor2);
  console.log(`✅ Guarantor 2 created: ${customers.guarantor2.name} (ID: ${customers.guarantor2.id})`);
}

// Step 3: Create accounts
async function createAccounts() {
  console.log('\n💳 Creating accounts...');
    // Create borrower account
  console.log('Creating borrower account...');
  accounts.borrower = await apiRequest('POST', '/accounts', {
    customerId: customers.borrower.id,
    type: 'SAVINGS',
    balance: 1000
  });
  console.log(`✅ Borrower account created: ${accounts.borrower.accountNumber}`);
    // Create guarantor 1 account
  console.log('Creating guarantor 1 account...');  accounts.guarantor1 = await apiRequest('POST', '/accounts', {
    customerId: customers.guarantor1.id,
    type: 'SAVINGS',
    balance: 5000
  });
  console.log(`✅ Guarantor 1 account created: ${accounts.guarantor1.accountNumber}`);
    // Create guarantor 2 account
  console.log('Creating guarantor 2 account...');  accounts.guarantor2 = await apiRequest('POST', '/accounts', {
    customerId: customers.guarantor2.id,
    type: 'SAVINGS',
    balance: 5000
  });
  console.log(`✅ Guarantor 2 account created: ${accounts.guarantor2.accountNumber}`);
}

// Step 4: Approve accounts
async function approveAccounts() {
  console.log('\n✅ Approving accounts...');
  
  // Approve borrower account
  console.log('Approving borrower account...');
  await apiRequest('POST', `/account-authorizations/${accounts.borrower.id}/approve`);
  console.log(`✅ Borrower account approved: ${accounts.borrower.accountNumber}`);
  
  // Approve guarantor 1 account
  console.log('Approving guarantor 1 account...');
  await apiRequest('POST', `/account-authorizations/${accounts.guarantor1.id}/approve`);
  console.log(`✅ Guarantor 1 account approved: ${accounts.guarantor1.accountNumber}`);
  
  // Approve guarantor 2 account
  console.log('Approving guarantor 2 account...');
  await apiRequest('POST', `/account-authorizations/${accounts.guarantor2.id}/approve`);
  console.log(`✅ Guarantor 2 account approved: ${accounts.guarantor2.accountNumber}`);
}

// Step 5: Create loan with guarantors
async function createLoan() {
  console.log('\n💰 Creating loan with guarantors...');  const loanData = {
    customerId: customers.borrower.id,
    amount: testData.loan.amount,
    interestRate: testData.loan.interestRate,
    term: testData.loan.term,
    purpose: testData.loan.purpose,
    repaymentFrequency: 'MONTHLY',
    guarantor1Id: customers.guarantor1.id,
    guarantor1Percentage: 25,
    guarantor1AccountId: accounts.guarantor1.id,
    guarantor2Id: customers.guarantor2.id,
    guarantor2Percentage: 25,
    guarantor2AccountId: accounts.guarantor2.id
  };
  const response = await apiRequest('POST', '/loans', loanData);
  const loan = response.loan;
  console.log(`✅ Loan created: ${loan.id}`);
  console.log(`   Amount: $${loan.amount}`);
  console.log(`   Term: ${loan.term} months`);
  console.log(`   Interest Rate: ${loan.interestRate}%`);
  
  // Get the loan account
  loanAccount = await apiRequest('GET', `/accounts/${loan.accountId}`);
  console.log(`✅ Loan account created: ${loanAccount.accountNumber}`);
  console.log(`   Balance: $${loanAccount.balance} (negative indicates debt)`);
  
  return loan;
}

// Step 6: Check initial balances
async function checkInitialBalances() {
  console.log('\n📊 Initial Account Balances:');
  
  const borrowerAcc = await apiRequest('GET', `/accounts/${accounts.borrower.id}`);
  const guarantor1Acc = await apiRequest('GET', `/accounts/${accounts.guarantor1.id}`);
  const guarantor2Acc = await apiRequest('GET', `/accounts/${accounts.guarantor2.id}`);
  const loanAcc = await apiRequest('GET', `/accounts/${loanAccount.id}`);
  
  console.log(`   Borrower (${borrowerAcc.accountNumber}): $${borrowerAcc.balance}`);
  console.log(`   Guarantor 1 (${guarantor1Acc.accountNumber}): $${guarantor1Acc.balance}`);
  console.log(`   Guarantor 2 (${guarantor2Acc.accountNumber}): $${guarantor2Acc.balance}`);
  console.log(`   Loan Account (${loanAcc.accountNumber}): $${loanAcc.balance}`);
  
  return { borrowerAcc, guarantor1Acc, guarantor2Acc, loanAcc };
}

// Step 7: Process loan repayment
async function processLoanRepayment(repaymentAmount) {
  console.log(`\n💸 Processing loan repayment of $${repaymentAmount}...`);
  
  const repaymentData = {
    accountId: loanAccount.id,
    type: 'LOAN_REPAYMENT',
    amount: repaymentAmount,
    description: `Test loan repayment of $${repaymentAmount}`,
    reference: `TEST-REP-${Date.now()}`
  };
  const transaction = await apiRequest('POST', '/transactions', repaymentData);  console.log(`✅ Loan repayment processed: ${transaction.reference}`);
  
  // Check if disbursement details are included
  if (transaction.disbursementDetails) {
    console.log('\n📋 Disbursement Details:');
    console.log(`   Total Repayment: $${transaction.disbursementDetails.totalRepayment}`);
    console.log(`   Loan Reduction (50%): $${transaction.disbursementDetails.loanReduction}`);
    console.log(`   Guarantor Disbursement (50%): $${transaction.disbursementDetails.guarantorDisbursement}`);
    console.log(`   Number of Guarantors: ${transaction.disbursementDetails.guarantorsCount}`);
    
    if (transaction.disbursementDetails.disbursements) {
      console.log('\n   Individual Disbursements:');
      transaction.disbursementDetails.disbursements.forEach((disbursement, index) => {
        console.log(`     ${index + 1}. ${disbursement.guarantorName} (${disbursement.accountNumber}): $${disbursement.amount}`);
        console.log(`        Reference: ${disbursement.reference}`);
      });
    }
  } else {
    console.log('\n⚠️  No disbursement details found in response');
  }
  
  return transaction;
}

// Step 8: Check final balances
async function checkFinalBalances() {
  console.log('\n📊 Final Account Balances:');
  
  const borrowerAcc = await apiRequest('GET', `/accounts/${accounts.borrower.id}`);
  const guarantor1Acc = await apiRequest('GET', `/accounts/${accounts.guarantor1.id}`);
  const guarantor2Acc = await apiRequest('GET', `/accounts/${accounts.guarantor2.id}`);
  const loanAcc = await apiRequest('GET', `/accounts/${loanAccount.id}`);
  
  console.log(`   Borrower (${borrowerAcc.accountNumber}): $${borrowerAcc.balance}`);
  console.log(`   Guarantor 1 (${guarantor1Acc.accountNumber}): $${guarantor1Acc.balance}`);
  console.log(`   Guarantor 2 (${guarantor2Acc.accountNumber}): $${guarantor2Acc.balance}`);
  console.log(`   Loan Account (${loanAcc.accountNumber}): $${loanAcc.balance}`);
  
  return { borrowerAcc, guarantor1Acc, guarantor2Acc, loanAcc };
}

// Step 9: Verify calculations
async function verifyCalculations(initialBalances, finalBalances, repaymentAmount) {
  console.log('\n🔍 Verifying Calculations:');
  
  const loanReduction = repaymentAmount * 0.5;
  const guarantorDisbursement = repaymentAmount * 0.5;
  const amountPerGuarantor = guarantorDisbursement / 2; // 2 guarantors
  
  console.log(`\n   Expected Changes:`);
  console.log(`   - Loan debt reduction: $${loanReduction}`);
  console.log(`   - Total guarantor disbursement: $${guarantorDisbursement}`);
  console.log(`   - Amount per guarantor: $${amountPerGuarantor}`);
  
  console.log(`\n   Actual Changes:`);
  
  // Check loan account balance change
  const loanBalanceChange = finalBalances.loanAcc.balance - initialBalances.loanAcc.balance;
  console.log(`   - Loan balance change: $${loanBalanceChange} (expected: $${loanReduction})`);
  
  // Check guarantor 1 balance change
  const guarantor1Change = finalBalances.guarantor1Acc.balance - initialBalances.guarantor1Acc.balance;
  console.log(`   - Guarantor 1 balance change: $${guarantor1Change} (expected: $${amountPerGuarantor})`);
  
  // Check guarantor 2 balance change
  const guarantor2Change = finalBalances.guarantor2Acc.balance - initialBalances.guarantor2Acc.balance;
  console.log(`   - Guarantor 2 balance change: $${guarantor2Change} (expected: $${amountPerGuarantor})`);
  
  // Verify calculations
  const loanCorrect = Math.abs(loanBalanceChange - loanReduction) < 0.01;
  const guarantor1Correct = Math.abs(guarantor1Change - amountPerGuarantor) < 0.01;
  const guarantor2Correct = Math.abs(guarantor2Change - amountPerGuarantor) < 0.01;
  
  console.log(`\n   Verification Results:`);
  console.log(`   - Loan reduction: ${loanCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
  console.log(`   - Guarantor 1 disbursement: ${guarantor1Correct ? '✅ CORRECT' : '❌ INCORRECT'}`);
  console.log(`   - Guarantor 2 disbursement: ${guarantor2Correct ? '✅ CORRECT' : '❌ INCORRECT'}`);
  
  return loanCorrect && guarantor1Correct && guarantor2Correct;
}

// Main test function
async function runTest() {
  try {
    console.log('🚀 Starting Loan Repayment with Guarantor Disbursement Test\n');
    console.log('=' .repeat(70));
    
    // Execute test steps
    await login();
    await createCustomers();
    await createAccounts();
    await approveAccounts();
    await createLoan();
    
    const initialBalances = await checkInitialBalances();
    
    // Test with a $2000 repayment
    const repaymentAmount = 2000;
    await processLoanRepayment(repaymentAmount);
    
    const finalBalances = await checkFinalBalances();
    
    const isCorrect = await verifyCalculations(initialBalances, finalBalances, repaymentAmount);
    
    console.log('\n' + '=' .repeat(70));
    console.log(`🎯 Test Result: ${isCorrect ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('=' .repeat(70));
    
    if (isCorrect) {
      console.log('\n🎉 All calculations are correct!');
      console.log('The loan repayment with guarantor disbursement system is working properly.');
    } else {
      console.log('\n❌ Some calculations are incorrect.');
      console.log('Please check the implementation for bugs.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
runTest();
