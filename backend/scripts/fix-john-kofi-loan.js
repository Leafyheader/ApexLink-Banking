/**
 * Fix John Kofi Eshun's Loan Issue
 *
 * The loan shows amount paid as ₵1,100 but user paid ₵6,000
 * Loan was incorrectly marked as complete and guarantor funds returned
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

async function fixJohnKofiLoan() {
  try {
    console.log('🔧 Fixing John Kofi Eshun\'s Loan Issue');
    console.log('='.repeat(45));

    // Find the problematic loan
    const loan = await prisma.loan.findFirst({
      where: { amount: 12000 },
      include: {
        account: {
          include: {
            customer: true
          }
        },
        guarantors: {
          include: {
            guarantorAccount: true
          }
        }
      }
    });

    if (!loan) {
      console.log('❌ Loan not found');
      return;
    }

    console.log('🏦 CURRENT LOAN STATE:');
    console.log('Customer:', loan.account.customer.name);
    console.log('Amount:', '₵' + loan.amount);
    console.log('Amount Paid:', '₵' + loan.amountPaid);
    console.log('Outstanding:', '₵' + loan.outstandingBalance);
    console.log('Status:', loan.status);
    console.log('Completed:', loan.isCompleted);
    console.log('Total Paid:', loan.totalPaid);
    console.log('Interest Paid:', loan.totalInterestPaid);
    console.log('Guarantor Reimbursed:', loan.guarantorReimbursed);

    // Calculate correct values
    const loanAmount = Number(loan.amount); // ₵12,000
    const interestRate = 0.10; // 10%
    const totalInterest = loanAmount * interestRate; // ₵1,200
    const totalPayable = loanAmount + totalInterest; // ₵13,200

    // User actually paid ₵6,000, not ₵1,100
    const actualPayment = 6000;
    const previousIncorrectPayment = Number(loan.amountPaid); // ₵1,100

    console.log('\n📊 CORRECT CALCULATIONS:');
    console.log('Loan Amount: ₵' + loanAmount.toLocaleString());
    console.log('Interest (10%): ₵' + totalInterest.toLocaleString());
    console.log('Total Payable: ₵' + totalPayable.toLocaleString());
    console.log('Actual Payment Made: ₵' + actualPayment.toLocaleString());
    console.log('Previously Recorded: ₵' + previousIncorrectPayment.toLocaleString());

    // Apply the loan repayment logic to ₵6,000 payment
    // Using the same logic as the repayment service
    const payment = actualPayment;
    const interestPortion = payment * 0.0909; // 9.09%
    const principalPortion = payment * 0.9091; // 90.91%

    const interestPaid = Math.min(interestPortion, totalInterest - Number(loan.totalInterestPaid));
    const extraToPrincipal = interestPortion - interestPaid;
    const totalPrincipalPortion = principalPortion + extraToPrincipal;

    const guarantorReimbursement = totalPrincipalPortion * 0.5;
    const loanReduction = totalPrincipalPortion * 0.5;

    const actualGuarantorReimbursement = Math.min(guarantorReimbursement, Number(loan.guaranteeRequired) - Number(loan.guarantorReimbursed));
    const extraToLoan = guarantorReimbursement - actualGuarantorReimbursement;
    const actualLoanReduction = loanReduction + extraToLoan;

    // Calculate corrected loan state
    const correctedTotalPaid = actualPayment;
    const correctedTotalInterestPaid = interestPaid;
    const correctedGuarantorReimbursed = actualGuarantorReimbursement;
    const correctedPrincipalRemaining = loanAmount - actualLoanReduction;
    const correctedOutstandingBalance = Math.max(0, totalPayable - actualPayment);
    const shouldBeCompleted = correctedTotalPaid >= totalPayable - 0.01;

    console.log('\n🔧 CORRECTED VALUES:');
    console.log('Total Paid: ₵' + correctedTotalPaid.toLocaleString());
    console.log('Interest Paid: ₵' + correctedTotalInterestPaid.toFixed(2));
    console.log('Guarantor Reimbursed: ₵' + correctedGuarantorReimbursed.toFixed(2));
    console.log('Principal Remaining: ₵' + correctedPrincipalRemaining.toFixed(2));
    console.log('Outstanding Balance: ₵' + correctedOutstandingBalance.toFixed(2));
    console.log('Should Be Completed: ' + shouldBeCompleted);

    // Check if guarantor reimbursement should be reversed
    const guarantorReimbursements = await prisma.transaction.findMany({
      where: {
        description: {
          contains: 'Guarantor fund reimbursement - loan completion'
        },
        reference: {
          contains: loan.id.slice(-8)
        }
      }
    });

    console.log('\n🤝 GUARANTOR REIMBURSEMENT CHECK:');
    console.log('Reimbursements Found:', guarantorReimbursements.length);

    if (guarantorReimbursements.length > 0 && !shouldBeCompleted) {
      console.log('❌ Guarantor funds were incorrectly returned - loan is not complete');
      console.log('🔄 These reimbursements should be reversed');
    } else if (guarantorReimbursements.length === 0 && shouldBeCompleted) {
      console.log('ℹ️ Loan should be complete but no reimbursements found');
    } else {
      console.log('✅ Guarantor reimbursement status is correct');
    }

    // Apply the fix
    console.log('\n🔧 APPLYING FIX...');

    await prisma.$transaction(async (tx) => {
      // 1. Correct the loan record
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          amountPaid: correctedTotalPaid,
          totalPaid: correctedTotalPaid,
          totalInterestPaid: correctedTotalInterestPaid,
          guarantorReimbursed: correctedGuarantorReimbursed,
          principalRemaining: correctedPrincipalRemaining,
          outstandingBalance: correctedOutstandingBalance,
          isCompleted: shouldBeCompleted,
          status: shouldBeCompleted ? 'PAID' : 'ACTIVE'
        }
      });

      // 2. If loan should not be completed, reverse guarantor reimbursements
      if (!shouldBeCompleted && guarantorReimbursements.length > 0) {
        console.log('🔄 Reversing incorrect guarantor reimbursements...');

        for (const reimbursement of guarantorReimbursements) {
          // Reverse the credit transaction
          await tx.transaction.create({
            data: {
              accountId: reimbursement.accountId,
              type: 'WITHDRAWAL',
              amount: reimbursement.amount,
              description: `Reversal: ${reimbursement.description}`,
              reference: `REV-${reimbursement.reference}`,
              status: 'COMPLETED'
            }
          });

          // Update guarantor account balance
          await tx.account.update({
            where: { id: reimbursement.accountId },
            data: {
              balance: {
                decrement: reimbursement.amount
              },
              lastTransactionDate: new Date()
            }
          });
        }

        // Update guarantor status back to ACTIVE
        await tx.loanGuarantor.updateMany({
          where: { loanId: loan.id },
          data: { status: 'ACTIVE' }
        });
      }

      console.log('✅ Loan record corrected');
    });

    // Verify the fix
    const correctedLoan = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: {
        guarantors: true
      }
    });

    console.log('\n✅ VERIFICATION:');
    console.log('Amount Paid:', '₵' + correctedLoan.amountPaid);
    console.log('Outstanding:', '₵' + correctedLoan.outstandingBalance);
    console.log('Status:', correctedLoan.status);
    console.log('Completed:', correctedLoan.isCompleted);

    if (correctedLoan.guarantors.length > 0) {
      console.log('Guarantor Status:', correctedLoan.guarantors[0].status);
    }

    console.log('\n🎉 FIX COMPLETED SUCCESSFULLY!');
    console.log('The loan now correctly reflects the ₵6,000 payment.');
    console.log('Outstanding balance and completion status have been corrected.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixJohnKofiLoan().then(() => prisma.$disconnect());