const { LoanRepaymentLogic, createLoanRepayment, validateLoanState } = require('./loan-repayment-logic.js');

/**
 * Comprehensive test suite for loan repayment logic
 */
class LoanRepaymentTester {
  constructor() {
    this.testResults = [];
  }
  
  log(message, isError = false) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = isError ? '❌' : '✅';
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    console.log(logMessage);
    this.testResults.push({ message: logMessage, isError });
  }
  
  assertEquals(actual, expected, message) {
    if (Math.abs(actual - expected) < 0.01) { // Allow for floating point precision
      this.log(`${message}: ${actual} (✓)`);
      return true;
    } else {
      this.log(`${message}: Expected ${expected}, got ${actual}`, true);
      return false;
    }
  }
  
  assertTrue(condition, message) {
    if (condition) {
      this.log(`${message}: true (✓)`);
      return true;
    } else {
      this.log(`${message}: Expected true, got false`, true);
      return false;
    }
  }
  
  runAllTests() {
    console.log('🚀 Starting Loan Repayment Logic Tests');
    console.log('=====================================');
    
    this.testInitialState();
    this.testSingleRepayment();
    this.testMultipleRepayments();
    this.testCompleteRepaymentScenario();
    this.testEdgeCases();
    this.testOverpaymentPrevention();
    this.testGuarantorReimbursementLogic();
    this.testInterestCapLogic();
    
    this.printSummary();
  }
  
  testInitialState() {
    console.log('\n📋 Test 1: Initial State');
    const loan = createLoanRepayment();
    const state = loan.getCurrentState();
    
    this.assertEquals(state.loanAmount, 1000, 'Initial loan amount');
    this.assertEquals(state.totalRepayable, 1100, 'Total repayable');
    this.assertEquals(state.guarantorAdvance, 500, 'Guarantor advance');
    this.assertEquals(state.totalPaid, 0, 'Initial total paid');
    this.assertEquals(state.totalInterestPaid, 0, 'Initial interest paid');
    this.assertEquals(state.guarantorReimbursed, 0, 'Initial guarantor reimbursed');
    this.assertEquals(state.principalRemaining, 1000, 'Initial principal remaining');
    this.assertTrue(!state.isCompleted, 'Initial completion status');
    this.assertEquals(loan.getRemainingBalance(), 1100, 'Initial remaining balance');
  }
  
  testSingleRepayment() {
    console.log('\n📋 Test 2: Single Repayment (₵110)');
    const loan = createLoanRepayment();
    const breakdown = loan.makeRepayment(110);
    
    // Payment breakdown
    this.assertEquals(breakdown.paymentAmount, 110, 'Payment amount');
    this.assertEquals(breakdown.interestPaid, 10, 'Interest paid (9.09% of 110)');
    this.assertEquals(breakdown.guarantorReimbursement, 50, 'Guarantor reimbursement (50% of principal)');
    this.assertEquals(breakdown.loanReduction, 50, 'Loan reduction (50% of principal)');
    
    // Updated state
    const state = breakdown.updatedState;
    this.assertEquals(state.totalPaid, 110, 'Total paid after payment');
    this.assertEquals(state.totalInterestPaid, 10, 'Total interest paid');
    this.assertEquals(state.guarantorReimbursed, 50, 'Total guarantor reimbursed');
    this.assertEquals(state.principalRemaining, 950, 'Principal remaining');
    this.assertEquals(breakdown.remainingBalance, 990, 'Remaining balance');
  }
  
  testMultipleRepayments() {
    console.log('\n📋 Test 3: Multiple Repayments');
    const loan = createLoanRepayment();
    
    // First payment: ₵220
    let breakdown = loan.makeRepayment(220);
    this.assertEquals(breakdown.interestPaid, 20, 'First payment - interest');
    this.assertEquals(breakdown.guarantorReimbursement, 100, 'First payment - guarantor');
    this.assertEquals(breakdown.loanReduction, 100, 'First payment - loan reduction');
    
    // Second payment: ₵330
    breakdown = loan.makeRepayment(330);
    this.assertEquals(breakdown.interestPaid, 30, 'Second payment - interest');
    this.assertEquals(breakdown.guarantorReimbursement, 150, 'Second payment - guarantor');
    this.assertEquals(breakdown.loanReduction, 150, 'Second payment - loan reduction');
    
    // Check cumulative state
    const state = loan.getCurrentState();
    this.assertEquals(state.totalPaid, 550, 'Cumulative total paid');
    this.assertEquals(state.totalInterestPaid, 50, 'Cumulative interest paid');
    this.assertEquals(state.guarantorReimbursed, 250, 'Cumulative guarantor reimbursed');
    this.assertEquals(state.principalRemaining, 750, 'Cumulative principal remaining');
  }
  
  testCompleteRepaymentScenario() {
    console.log('\n📋 Test 4: Complete Repayment Scenario');
    const loan = createLoanRepayment();
    
    // Make multiple payments to complete the loan
    const payments = [110, 220, 330, 220, 220]; // Total: 1100
    let totalPaid = 0;
    
    for (const payment of payments) {
      if (loan.getRemainingBalance() > 0) {
        const breakdown = loan.makeRepayment(payment);
        totalPaid += breakdown.paymentAmount;
        this.log(`Payment ₵${payment}: Interest ₵${breakdown.interestPaid.toFixed(2)}, Guarantor ₵${breakdown.guarantorReimbursement.toFixed(2)}, Loan ₵${breakdown.loanReduction.toFixed(2)}`);
      }
    }
    
    // Verify final state
    const finalState = loan.getCurrentState();
    this.assertEquals(finalState.totalPaid, 1100, 'Final total paid');
    this.assertEquals(finalState.totalInterestPaid, 100, 'Final interest paid');
    this.assertEquals(finalState.guarantorReimbursed, 500, 'Final guarantor reimbursed');
    this.assertEquals(finalState.principalRemaining, 0, 'Final principal remaining');
    this.assertTrue(finalState.isCompleted, 'Loan completion status');
    this.assertEquals(loan.getRemainingBalance(), 0, 'Final remaining balance');
    
    // Test summary
    const summary = loan.getSummary();
    this.assertEquals(summary.progress.percentComplete, 100, 'Completion percentage');
    this.assertTrue(summary.status === 'completed', 'Summary status');
  }
  
  testEdgeCases() {
    console.log('\n📋 Test 5: Edge Cases');
    const loan = createLoanRepayment();
    
    // Test very small payment
    let breakdown = loan.makeRepayment(1);
    this.assertTrue(breakdown.paymentAmount > 0, 'Small payment accepted');
    this.assertTrue(breakdown.interestPaid > 0, 'Small payment generates interest');
    
    // Test large payment (should be capped)
    loan.reset();
    breakdown = loan.makeRepayment(2000); // More than total repayable
    this.assertEquals(breakdown.paymentAmount, 1100, 'Large payment capped at remaining balance');
    this.assertTrue(loan.isLoanCompleted(), 'Large payment completes loan');
    
    // Test zero payment (should throw error)
    loan.reset();
    try {
      loan.makeRepayment(0);
      this.log('Zero payment should throw error', true);
    } catch (error) {
      this.log('Zero payment correctly throws error');
    }
    
    // Test negative payment (should throw error)
    try {
      loan.makeRepayment(-100);
      this.log('Negative payment should throw error', true);
    } catch (error) {
      this.log('Negative payment correctly throws error');
    }
  }
  
  testOverpaymentPrevention() {
    console.log('\n📋 Test 6: Overpayment Prevention');
    const loan = createLoanRepayment();
    
    // Pay almost everything
    loan.makeRepayment(1000);
    const remainingBefore = loan.getRemainingBalance();
    this.assertTrue(remainingBefore > 0, 'Some balance remains');
    
    // Try to overpay
    const breakdown = loan.makeRepayment(200); // More than remaining
    this.assertEquals(breakdown.paymentAmount, remainingBefore, 'Payment capped at remaining balance');
    this.assertEquals(loan.getRemainingBalance(), 0, 'No remaining balance after final payment');
    
    // Try to pay when loan is complete
    try {
      loan.makeRepayment(10);
      this.log('Payment on completed loan should throw error', true);
    } catch (error) {
      this.log('Payment on completed loan correctly throws error');
    }
  }
  
  testGuarantorReimbursementLogic() {
    console.log('\n📋 Test 7: Guarantor Reimbursement Logic');
    const loan = createLoanRepayment();
    
    // Make payments until guarantor is fully reimbursed
    let totalGuarantorReimbursed = 0;
    let paymentCount = 0;
    
    while (loan.getCurrentState().guarantorReimbursed < 500 && paymentCount < 20) {
      const breakdown = loan.makeRepayment(110);
      totalGuarantorReimbursed += breakdown.guarantorReimbursement;
      paymentCount++;
      
      if (breakdown.guarantorReimbursement === 0) {
        break; // Guarantor fully reimbursed
      }
    }
    
    this.assertEquals(loan.getCurrentState().guarantorReimbursed, 500, 'Guarantor fully reimbursed');
    
    // Next payment should have no guarantor reimbursement
    if (loan.getRemainingBalance() > 0) {
      const breakdown = loan.makeRepayment(110);
      this.assertEquals(breakdown.guarantorReimbursement, 0, 'No more guarantor reimbursement');
      this.assertTrue(breakdown.loanReduction > 90, 'Excess goes to loan reduction');
    }
  }
  
  testInterestCapLogic() {
    console.log('\n📋 Test 8: Interest Cap Logic');
    const loan = createLoanRepayment();
    
    // Make payments until interest is fully paid
    let totalInterestPaid = 0;
    let paymentCount = 0;
    
    while (loan.getCurrentState().totalInterestPaid < 100 && paymentCount < 20) {
      const breakdown = loan.makeRepayment(110);
      totalInterestPaid += breakdown.interestPaid;
      paymentCount++;
      
      if (breakdown.interestPaid === 0) {
        break; // Interest fully paid
      }
    }
    
    this.assertEquals(loan.getCurrentState().totalInterestPaid, 100, 'Interest fully paid');
    
    // Next payment should have no interest
    if (loan.getRemainingBalance() > 0) {
      const breakdown = loan.makeRepayment(110);
      this.assertEquals(breakdown.interestPaid, 0, 'No more interest payment');
      this.assertTrue(breakdown.loanReduction > 90, 'Excess goes to loan reduction');
    }
  }
  
  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => !r.isError).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Loan repayment logic is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
  }
}

// Run the tests
const tester = new LoanRepaymentTester();
tester.runAllTests();
