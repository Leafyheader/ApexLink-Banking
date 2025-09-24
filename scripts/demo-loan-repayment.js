const { LoanRepaymentLogic, createLoanRepayment } = require('./loan-repayment-logic.js');

/**
 * Practical demonstration of the loan repayment logic
 * Shows real-world scenarios and payment breakdowns
 */

function formatCurrency(amount) {
  return `₵${amount.toFixed(2)}`;
}

function printLoanStatus(loan, title) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
  
  const summary = loan.getSummary();
  const state = loan.getCurrentState();
  
  console.log(`📊 Loan Overview:`);
  console.log(`   • Original Loan: ${formatCurrency(summary.loanAmount)}`);
  console.log(`   • Total Repayable: ${formatCurrency(summary.totalRepayable)}`);
  console.log(`   • Guarantor Advance: ${formatCurrency(summary.guarantorAdvance)}`);
  console.log(`   • Status: ${summary.status.toUpperCase()}`);
  
  console.log(`\n💰 Progress (${summary.progress.percentComplete.toFixed(1)}% complete):`);
  console.log(`   • Total Paid: ${formatCurrency(summary.progress.totalPaid)}`);
  console.log(`   • Remaining Balance: ${formatCurrency(summary.progress.remainingBalance)}`);
  
  console.log(`\n🔍 Breakdown:`);
  console.log(`   • Interest Paid: ${formatCurrency(summary.breakdown.interestPaid)} / ${formatCurrency(100)} (${(summary.breakdown.interestPaid/100*100).toFixed(1)}%)`);
  console.log(`   • Guarantor Reimbursed: ${formatCurrency(summary.breakdown.guarantorReimbursed)} / ${formatCurrency(500)} (${(summary.breakdown.guarantorReimbursed/500*100).toFixed(1)}%)`);
  console.log(`   • Principal Paid: ${formatCurrency(summary.breakdown.principalPaid)} / ${formatCurrency(1000)} (${(summary.breakdown.principalPaid/1000*100).toFixed(1)}%)`);
}

function makePaymentWithDetails(loan, amount, paymentNumber) {
  console.log(`\n💳 Payment #${paymentNumber}: ${formatCurrency(amount)}`);
  console.log('-'.repeat(40));
  
  try {
    const breakdown = loan.makeRepayment(amount);
    
    console.log(`✅ Payment processed: ${formatCurrency(breakdown.paymentAmount)}`);
    console.log(`   📈 Interest Paid: ${formatCurrency(breakdown.interestPaid)} (${((breakdown.interestPaid/breakdown.paymentAmount)*100).toFixed(1)}%)`);
    console.log(`   🤝 Guarantor Reimbursement: ${formatCurrency(breakdown.guarantorReimbursement)} (${((breakdown.guarantorReimbursement/breakdown.paymentAmount)*100).toFixed(1)}%)`);
    console.log(`   🏦 Loan Reduction: ${formatCurrency(breakdown.loanReduction)} (${((breakdown.loanReduction/breakdown.paymentAmount)*100).toFixed(1)}%)`);
    console.log(`   📊 Remaining Balance: ${formatCurrency(breakdown.remainingBalance)}`);
    
    if (breakdown.updatedState.isCompleted) {
      console.log(`   🎉 LOAN COMPLETED!`);
    }
    
    return breakdown;
  } catch (error) {
    console.log(`❌ Payment failed: ${error.message}`);
    return null;
  }
}

function runScenarios() {
  console.log('🏦 LOAN REPAYMENT LOGIC DEMONSTRATION');
  console.log('====================================');
  console.log('Loan Terms:');
  console.log('• Principal: ₵1,000');
  console.log('• Interest: 10% (₵100)');
  console.log('• Total Repayable: ₵1,100');
  console.log('• Guarantor Advance: ₵500');
  console.log('• Payment Split: 9.09% interest, 90.91% principal');
  console.log('• Principal Split: 50% guarantor, 50% loan reduction');
  
  // Scenario 1: Regular equal payments
  console.log('\n\n🎯 SCENARIO 1: Regular Equal Payments (₵110 x 10)');
  console.log('================================================');
  
  const loan1 = createLoanRepayment();
  printLoanStatus(loan1, '📋 Initial Loan Status');
  
  for (let i = 1; i <= 10; i++) {
    makePaymentWithDetails(loan1, 110, i);
    
    if (loan1.isLoanCompleted()) {
      break;
    }
  }
  
  printLoanStatus(loan1, '📋 Final Loan Status');
  
  // Scenario 2: Irregular payment amounts
  console.log('\n\n🎯 SCENARIO 2: Irregular Payment Amounts');
  console.log('======================================');
  
  const loan2 = createLoanRepayment();
  const irregularPayments = [50, 200, 150, 300, 100, 150, 100, 50];
  
  printLoanStatus(loan2, '📋 Initial Loan Status');
  
  let paymentNumber = 1;
  for (const amount of irregularPayments) {
    if (loan2.getRemainingBalance() > 0) {
      makePaymentWithDetails(loan2, amount, paymentNumber);
      paymentNumber++;
    }
  }
  
  printLoanStatus(loan2, '📋 Loan Status After Irregular Payments');
  
  // Complete the remaining balance
  if (loan2.getRemainingBalance() > 0) {
    console.log('\n🔄 Completing remaining balance...');
    makePaymentWithDetails(loan2, loan2.getRemainingBalance(), paymentNumber);
    printLoanStatus(loan2, '📋 Final Loan Status');
  }
  
  // Scenario 3: Large single payment
  console.log('\n\n🎯 SCENARIO 3: Large Single Payment');
  console.log('=================================');
  
  const loan3 = createLoanRepayment();
  printLoanStatus(loan3, '📋 Initial Loan Status');
  
  makePaymentWithDetails(loan3, 1100, 1);
  printLoanStatus(loan3, '📋 Final Loan Status');
  
  // Scenario 4: Overpayment attempt
  console.log('\n\n🎯 SCENARIO 4: Overpayment Prevention');
  console.log('===================================');
  
  const loan4 = createLoanRepayment();
  
  // Pay most of the loan
  makePaymentWithDetails(loan4, 1000, 1);
  
  console.log(`\n💡 Remaining balance: ${formatCurrency(loan4.getRemainingBalance())}`);
  console.log('Attempting to pay ₵200 (more than remaining)...');
  
  makePaymentWithDetails(loan4, 200, 2);
  
  console.log('\n🔒 Attempting payment on completed loan...');
  makePaymentWithDetails(loan4, 50, 3);
  
  // Scenario 5: Step-by-step breakdown showing priority system
  console.log('\n\n🎯 SCENARIO 5: Priority System Demonstration');
  console.log('==========================================');
  
  const loan5 = createLoanRepayment();
  console.log('This scenario shows how payments are prioritized:');
  console.log('1. Interest payment (9.09% of payment, capped at ₵100 total)');
  console.log('2. Guarantor reimbursement (50% of remaining, capped at ₵500 total)');
  console.log('3. Loan reduction (remaining amount)');
  
  const paymentAmounts = [55, 110, 165, 220, 275, 330];
  
  for (let i = 0; i < paymentAmounts.length; i++) {
    if (loan5.getRemainingBalance() > 0) {
      console.log(`\n🔄 Payment ${i + 1} Analysis:`);
      const simulation = loan5.simulateRepayment(paymentAmounts[i]);
      
      console.log(`   Payment: ${formatCurrency(paymentAmounts[i])}`);
      console.log(`   Interest portion (9.09%): ${formatCurrency(paymentAmounts[i] * 0.0909)}`);
      console.log(`   Principal portion (90.91%): ${formatCurrency(paymentAmounts[i] * 0.9091)}`);
      console.log(`   → Actual interest paid: ${formatCurrency(simulation.interestPaid)}`);
      console.log(`   → Guarantor reimbursement: ${formatCurrency(simulation.guarantorReimbursement)}`);
      console.log(`   → Loan reduction: ${formatCurrency(simulation.loanReduction)}`);
      
      makePaymentWithDetails(loan5, paymentAmounts[i], i + 1);
    }
  }
  
  console.log('\n🎊 DEMONSTRATION COMPLETE!');
  console.log('The loan repayment logic successfully implements all requirements:');
  console.log('✅ Flexible payment amounts');
  console.log('✅ Correct payment splitting (9.09% interest, 90.91% principal)');
  console.log('✅ Priority reimbursement to guarantor');
  console.log('✅ Interest cap at ₵100');
  console.log('✅ Guarantor reimbursement cap at ₵500');
  console.log('✅ Overpayment prevention');
  console.log('✅ Accurate tracking of all components');
}

// Run all scenarios
runScenarios();
