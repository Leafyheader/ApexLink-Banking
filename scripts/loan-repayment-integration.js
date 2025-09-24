/**
 * Simple Integration Function for Loan Repayment
 * This function can be easily integrated into existing backend systems
 */

const { createLoanRepayment } = require('./loan-repayment-logic.js');

/**
 * Process a loan repayment with the specific business rules
 * @param {number} amount - The repayment amount
 * @param {Object} existingLoanState - Current state of the loan (optional)
 * @returns {Object} Repayment result with breakdown and updated state
 */
function makeRepayment(amount, existingLoanState = {}) {
  try {
    // Create loan instance with existing state
    const loan = createLoanRepayment(existingLoanState);
    
    // Make the repayment
    const result = loan.makeRepayment(amount);
    
    // Return detailed breakdown
    return {
      success: true,
      payment: {
        amount: result.paymentAmount,
        breakdown: {
          interestPaid: result.interestPaid,
          guarantorReimbursement: result.guarantorReimbursement,
          loanReduction: result.loanReduction
        }
      },
      loanState: result.updatedState,
      remainingBalance: result.remainingBalance,
      isCompleted: result.updatedState.isCompleted,
      summary: loan.getSummary()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      payment: null,
      loanState: null,
      remainingBalance: null,
      isCompleted: false,
      summary: null
    };
  }
}

/**
 * Get loan summary without making a payment
 * @param {Object} existingLoanState - Current state of the loan
 * @returns {Object} Loan summary
 */
function getLoanSummary(existingLoanState = {}) {
  const loan = createLoanRepayment(existingLoanState);
  return {
    success: true,
    summary: loan.getSummary(),
    state: loan.getCurrentState(),
    remainingBalance: loan.getRemainingBalance(),
    isCompleted: loan.isLoanCompleted()
  };
}

/**
 * Simulate a repayment without applying it
 * @param {number} amount - The repayment amount to simulate
 * @param {Object} existingLoanState - Current state of the loan
 * @returns {Object} Simulation result
 */
function simulateRepayment(amount, existingLoanState = {}) {
  try {
    const loan = createLoanRepayment(existingLoanState);
    const result = loan.simulateRepayment(amount);
    
    return {
      success: true,
      simulation: {
        paymentAmount: result.paymentAmount,
        breakdown: {
          interestPaid: result.interestPaid,
          guarantorReimbursement: result.guarantorReimbursement,
          loanReduction: result.loanReduction
        },
        resultingState: result.updatedState,
        remainingBalance: result.remainingBalance,
        wouldComplete: result.updatedState.isCompleted
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      simulation: null
    };
  }
}

// Example usage and test
function runExample() {
  console.log('🧪 LOAN REPAYMENT INTEGRATION EXAMPLE');
  console.log('===================================');
  
  // Example 1: Making a repayment
  console.log('\n📝 Example 1: Making a ₵110 repayment');
  let result = makeRepayment(110);
  
  if (result.success) {
    console.log(`✅ Payment successful!`);
    console.log(`   💰 Amount paid: ₵${result.payment.amount}`);
    console.log(`   📈 Interest: ₵${result.payment.breakdown.interestPaid}`);
    console.log(`   🤝 Guarantor reimbursement: ₵${result.payment.breakdown.guarantorReimbursement}`);
    console.log(`   🏦 Loan reduction: ₵${result.payment.breakdown.loanReduction}`);
    console.log(`   📊 Remaining balance: ₵${result.remainingBalance}`);
    console.log(`   ✅ Completed: ${result.isCompleted ? 'Yes' : 'No'}`);
  } else {
    console.log(`❌ Payment failed: ${result.error}`);
  }
  
  // Example 2: Getting loan summary
  console.log('\n📝 Example 2: Getting loan summary');
  const summary = getLoanSummary(result.success ? result.loanState : {});
  console.log(`   📊 Progress: ${summary.summary.progress.percentComplete.toFixed(1)}% complete`);
  console.log(`   💰 Total paid: ₵${summary.summary.progress.totalPaid}`);
  console.log(`   📈 Interest paid: ₵${summary.summary.breakdown.interestPaid}/₵100`);
  console.log(`   🤝 Guarantor reimbursed: ₵${summary.summary.breakdown.guarantorReimbursed}/₵500`);
  
  // Example 3: Simulating a payment
  console.log('\n📝 Example 3: Simulating a ₵500 payment');
  const simulation = simulateRepayment(500, result.success ? result.loanState : {});
  
  if (simulation.success) {
    console.log(`💡 Simulation results:`);
    console.log(`   💰 Would pay: ₵${simulation.simulation.paymentAmount}`);
    console.log(`   📈 Interest: ₵${simulation.simulation.breakdown.interestPaid}`);
    console.log(`   🤝 Guarantor: ₵${simulation.simulation.breakdown.guarantorReimbursement}`);
    console.log(`   🏦 Loan reduction: ₵${simulation.simulation.breakdown.loanReduction}`);
    console.log(`   📊 Would leave balance: ₵${simulation.simulation.remainingBalance}`);
    console.log(`   ✅ Would complete loan: ${simulation.simulation.wouldComplete ? 'Yes' : 'No'}`);
  }
  
  console.log('\n🎯 INTEGRATION READY!');
  console.log('Functions available:');
  console.log('• makeRepayment(amount, existingState)');
  console.log('• getLoanSummary(existingState)');
  console.log('• simulateRepayment(amount, existingState)');
}

// Export functions for use in other modules
module.exports = {
  makeRepayment,
  getLoanSummary,
  simulateRepayment,
  // Also export the core logic class if needed
  LoanRepaymentLogic: require('./loan-repayment-logic.js').LoanRepaymentLogic
};

// Run example if this file is executed directly
if (require.main === module) {
  runExample();
}
