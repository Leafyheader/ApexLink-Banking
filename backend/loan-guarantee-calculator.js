/**
 * Loan Guarantee System - Core Logic Implementation
 * 
 * This file demonstrates the core logic of the loan guarantee system
 * without database dependencies for easy testing and understanding.
 */

class LoanGuaranteeCalculator {
  /**
   * Check if a loan application is eligible
   */
  static checkLoanEligibility(customerBalance, loanAmount, guarantors = []) {
    const maxLoanAmount = customerBalance * 2; // 2x balance rule
    
    // Check if loan amount exceeds maximum
    if (loanAmount > maxLoanAmount) {
      return {
        eligible: false,
        reason: `Loan amount ${loanAmount} exceeds maximum ${maxLoanAmount} (2x customer balance)`
      };
    }
    
    // Calculate contributions
    const customerContribution = Math.min(customerBalance, loanAmount);
    const guaranteeRequired = loanAmount - customerContribution;
    
    // If no guarantee needed
    if (guaranteeRequired <= 0) {
      return {
        eligible: true,
        customerContribution,
        guaranteeRequired: 0,
        guarantors: []
      };
    }
    
    // Check guarantor capacity
    let totalGuaranteed = 0;
    const guarantorResults = [];
    
    for (const guarantor of guarantors) {
      const available = this.calculateAvailableBalance(
        guarantor.balance, 
        guarantor.existingGuarantees || []
      );
      
      const canGuarantee = Math.min(available, guarantor.requestedAmount);
      totalGuaranteed += canGuarantee;
      
      guarantorResults.push({
        name: guarantor.name,
        balance: guarantor.balance,
        available,
        requested: guarantor.requestedAmount,
        approved: canGuarantee,
        eligible: canGuarantee >= guarantor.requestedAmount
      });
    }
    
    const eligible = totalGuaranteed >= guaranteeRequired;
    
    return {
      eligible,
      customerContribution,
      guaranteeRequired,
      totalGuaranteed,
      shortage: Math.max(0, guaranteeRequired - totalGuaranteed),
      guarantors: guarantorResults,
      reason: eligible ? 'Loan approved' : `Insufficient guarantee coverage. Need ${guaranteeRequired - totalGuaranteed} more`
    };
  }
  
  /**
   * Calculate available balance considering existing guarantees
   */
  static calculateAvailableBalance(accountBalance, existingGuarantees = []) {
    const totalRestricted = existingGuarantees.reduce(
      (sum, guarantee) => sum + guarantee.amount, 0
    );
    return Math.max(0, accountBalance - totalRestricted);
  }
  
  /**
   * Calculate new restrictions after loan repayment
   */
  static adjustRestrictionsAfterPayment(originalLoan, remainingBalance, guarantors) {
    const reductionRatio = remainingBalance / originalLoan;
    
    return guarantors.map(guarantor => ({
      ...guarantor,
      newRestriction: guarantor.originalRestriction * reductionRatio,
      releasedAmount: guarantor.originalRestriction * (1 - reductionRatio)
    }));
  }
}

// Demo scenarios
console.log('🏦 Loan Guarantee System - Core Logic Demo\n');

// Test Case 1: Simple eligible loan
console.log('📋 Test Case 1: Eligible Loan with Single Guarantor');
const result1 = LoanGuaranteeCalculator.checkLoanEligibility(500, 1000, [
  { name: 'Bob Smith', balance: 600, requestedAmount: 500 }
]);
console.log(result1);
console.log('');

// Test Case 2: Insufficient guarantor funds
console.log('📋 Test Case 2: Insufficient Guarantor Funds');
const result2 = LoanGuaranteeCalculator.checkLoanEligibility(500, 1000, [
  { name: 'Charlie Brown', balance: 300, requestedAmount: 500 }
]);
console.log(result2);
console.log('');

// Test Case 3: Multiple guarantors
console.log('📋 Test Case 3: Multiple Guarantors Sharing Risk');
const result3 = LoanGuaranteeCalculator.checkLoanEligibility(400, 800, [
  { name: 'David Wilson', balance: 300, requestedAmount: 200 },
  { name: 'Emma Davis', balance: 250, requestedAmount: 200 }
]);
console.log(result3);
console.log('');

// Test Case 4: Loan exceeding maximum
console.log('📋 Test Case 4: Loan Exceeding Maximum (3x balance)');
const result4 = LoanGuaranteeCalculator.checkLoanEligibility(300, 1000, [
  { name: 'Frank Miller', balance: 800, requestedAmount: 700 }
]);
console.log(result4);
console.log('');

// Test Case 5: Available balance calculation with existing guarantees
console.log('📋 Test Case 5: Guarantor with Existing Commitments');
const availableBalance = LoanGuaranteeCalculator.calculateAvailableBalance(1000, [
  { amount: 300, loan: 'Loan-001' },
  { amount: 200, loan: 'Loan-002' }
]);
console.log(`Guarantor with $1000 balance and $500 existing guarantees:`);
console.log(`Available for new guarantees: $${availableBalance}`);
console.log('');

// Test Case 6: Loan repayment impact
console.log('📋 Test Case 6: Loan Repayment Restriction Adjustment');
const adjustmentResult = LoanGuaranteeCalculator.adjustRestrictionsAfterPayment(1000, 600, [
  { name: 'Guarantor A', originalRestriction: 300 },
  { name: 'Guarantor B', originalRestriction: 200 }
]);
console.log('After 40% loan repayment (remaining $600 of $1000):');
console.log(adjustmentResult);
console.log('');

// Comprehensive example
console.log('Comprehensive Example: Alice\'s $800 Loan Application\n');

const alice = { balance: 400 };
const loanAmount = 800;
const guarantors = [
  { name: 'Bob', balance: 600, requestedAmount: 250, existingGuarantees: [] },
  { name: 'Carol', balance: 400, requestedAmount: 150, existingGuarantees: [{ amount: 100, loan: 'Other-Loan' }] }
];

console.log(`Customer: Alice (Balance: $${alice.balance})`);
console.log(`Requested Loan: $${loanAmount}`);
console.log('Guarantors:');
guarantors.forEach(g => {
  const existing = g.existingGuarantees.reduce((sum, e) => sum + e.amount, 0);
  console.log(`  - ${g.name}: Balance $${g.balance}, Available $${g.balance - existing}, Offering $${g.requestedAmount}`);
});

const comprehensiveResult = LoanGuaranteeCalculator.checkLoanEligibility(
  alice.balance, 
  loanAmount, 
  guarantors
);

console.log('\n📊 Analysis Results:');
console.log(`✓ Eligible: ${comprehensiveResult.eligible}`);
console.log(`✓ Customer Contribution: $${comprehensiveResult.customerContribution}`);
console.log(`✓ Guarantee Required: $${comprehensiveResult.guaranteeRequired}`);
console.log(`✓ Total Guaranteed: $${comprehensiveResult.totalGuaranteed}`);
if (comprehensiveResult.shortage > 0) {
  console.log(`✗ Shortage: $${comprehensiveResult.shortage}`);
}
console.log(`✓ Status: ${comprehensiveResult.reason}`);

console.log('\n🤝 Guarantor Details:');
comprehensiveResult.guarantors.forEach(g => {
  console.log(`  ${g.name}: ${g.eligible ? '✅' : '❌'} Can provide $${g.approved} of requested $${g.requested}`);
});

// Success scenario summary
if (comprehensiveResult.eligible) {
  console.log('\n🎉 Loan Approved! Summary:');
  console.log(`   💰 Alice receives: $${loanAmount}`);
  console.log(`   💳 Alice contributes: $${comprehensiveResult.customerContribution} (from her account)`);
  console.log(`   🤝 Guarantors cover: $${comprehensiveResult.totalGuaranteed}`);
  console.log(`   🔒 Guarantor restrictions:`);
  comprehensiveResult.guarantors.forEach(g => {
    if (g.approved > 0) {
      console.log(`       ${g.name}: $${g.approved} restricted, $${g.available - g.approved} available for withdrawal`);
    }
  });
}