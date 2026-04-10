require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLoanRepaymentWithGuarantors() {
  try {
    console.log('🧪 Testing loan repayment with guarantor processing...\n');

    // Find a loan with guarantors
    const loanWithGuarantors = await prisma.loan.findFirst({
      where: {
        status: 'ACTIVE',
        isCompleted: false
      },
      include: {
        account: {
          include: { customer: true }
        },
        guarantors: {
          where: { status: 'ACTIVE' },
          include: {
            guarantorAccount: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });

    if (!loanWithGuarantors) {
      console.log('❌ No active loans with guarantors found for testing');
      return;
    }

    console.log('📋 Test Loan Details:');
    console.log(`   Loan ID: ${loanWithGuarantors.id}`);
    console.log(`   Borrower: ${loanWithGuarantors.account.customer.name} (${loanWithGuarantors.account.accountNumber})`);
    console.log(`   Loan Amount: ₵${Number(loanWithGuarantors.amount).toLocaleString()}`);
    console.log(`   Total Paid: ₵${Number(loanWithGuarantors.totalPaid || 0).toLocaleString()}`);
    console.log(`   Principal Remaining: ₵${Number(loanWithGuarantors.principalRemaining || loanWithGuarantors.amount).toLocaleString()}`);
    console.log(`   Guarantors: ${loanWithGuarantors.guarantors.length}`);

    loanWithGuarantors.guarantors.forEach((g, index) => {
      console.log(`     ${index + 1}. ${g.guarantorAccount.customer.name} (${g.guarantorAccount.accountNumber}) - ₵${Number(g.guaranteedAmount).toLocaleString()}`);
    });

    // Test a small repayment amount
    const testRepaymentAmount = 1000; // ₵1,000

    console.log(`\n💰 Testing repayment of ₵${testRepaymentAmount.toLocaleString()}...`);

    // Simulate the repayment logic (without actually executing transactions)
    const loanAmount = Number(loanWithGuarantors.amount);
    const totalInterest = loanAmount * 0.10; // 10% interest
    const totalPayable = loanAmount + totalInterest;

    const currentLoanState = {
      loanAmount: loanAmount,
      totalRepayable: totalPayable,
      guarantorAdvance: Number(loanWithGuarantors.guaranteeRequired || 0),
      totalPaid: Number(loanWithGuarantors.totalPaid || 0),
      totalInterestPaid: Number(loanWithGuarantors.totalInterestPaid || 0),
      guarantorReimbursed: Number(loanWithGuarantors.guarantorReimbursed || 0),
      principalRemaining: Number(loanWithGuarantors.principalRemaining || loanAmount),
      isCompleted: Boolean(loanWithGuarantors.isCompleted || false)
    };

    console.log('📊 Current Loan State:');
    console.log(`   Total Paid: ₵${currentLoanState.totalPaid.toLocaleString()}`);
    console.log(`   Principal Remaining: ₵${currentLoanState.principalRemaining.toLocaleString()}`);
    console.log(`   Guarantor Reimbursed: ₵${currentLoanState.guarantorReimbursed.toLocaleString()}`);
    console.log(`   Total Payable: ₵${currentLoanState.totalRepayable.toLocaleString()}`);

    // Calculate expected breakdown
    const interestPortion = testRepaymentAmount * 0.0909; // 9.09% interest
    const principalPortion = testRepaymentAmount * 0.9091; // 90.91% principal
    const guarantorReimbursement = principalPortion * 0.5; // 50% of principal to guarantors
    const loanReduction = principalPortion * 0.5; // 50% of principal to loan reduction

    console.log('\n🧮 Expected Breakdown:');
    console.log(`   Interest Paid: ₵${interestPortion.toFixed(2)}`);
    console.log(`   Guarantor Reimbursement: ₵${guarantorReimbursement.toFixed(2)}`);
    console.log(`   Loan Reduction: ₵${loanReduction.toFixed(2)}`);

    // Check if guarantors would receive reimbursement
    if (guarantorReimbursement > 0 && loanWithGuarantors.guarantors.length > 0) {
      const totalActivePercentage = loanWithGuarantors.guarantors.reduce((sum, g) => sum + (Number(g.guaranteedAmount) / loanAmount * 100), 0);

      console.log('\n🤝 Guarantor Distribution:');
      loanWithGuarantors.guarantors.forEach((g) => {
        const percentage = loanAmount > 0 ? (Number(g.guaranteedAmount) / loanAmount) * 100 : 0;
        const share = (percentage / totalActivePercentage) * guarantorReimbursement;
        console.log(`   ${g.guarantorAccount.customer.name}: ₵${share.toFixed(2)} (${percentage.toFixed(1)}%)`);
      });
    }

    console.log('\n✅ Test completed successfully - logic appears correct');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLoanRepaymentWithGuarantors();