/**
 * Fix Loan Precision Issues
 * 
 * This script fixes loans that should be marked as PAID but aren't
 * due to floating point precision issues.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLoanPrecisionIssues() {
  console.log('🔧 FIXING LOAN PRECISION ISSUES\n');
  
  try {
    // Find all loans that should be completed but aren't
    const loansToCheck = await prisma.loan.findMany({
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    console.log(`Checking ${loansToCheck.length} loans for precision issues...\n`);

    let fixedCount = 0;

    for (const loan of loansToCheck) {
      const totalPaid = Number(loan.totalPaid || 0);
      const totalInterestPaid = Number(loan.totalInterestPaid || 0);
      const guarantorReimbursed = Number(loan.guarantorReimbursed || 0);
      
      // Check if loan should be completed (allowing for floating point precision issues)
      const isPaidSufficient = totalPaid >= (1100 - 0.01);
      const isInterestSufficient = totalInterestPaid >= (100 - 0.01);
      const isGuarantorSufficient = guarantorReimbursed >= (500 - 0.01);
      
      const shouldBeCompleted = isPaidSufficient && isInterestSufficient && isGuarantorSufficient;
      
      if (shouldBeCompleted && (loan.status !== 'PAID' || loan.outstandingBalance > 0.01 || !loan.isCompleted)) {
        console.log(`🔧 Fixing loan for ${loan.customer.name}:`);
        console.log(`   Current status: ${loan.status}`);
        console.log(`   Current outstanding: GH₵${loan.outstandingBalance}`);
        console.log(`   Current isCompleted: ${loan.isCompleted}`);
        console.log(`   Total paid: GH₵${totalPaid} (sufficient: ${isPaidSufficient})`);
        console.log(`   Interest paid: GH₵${totalInterestPaid} (sufficient: ${isInterestSufficient})`);
        console.log(`   Guarantor reimbursed: GH₵${guarantorReimbursed} (sufficient: ${isGuarantorSufficient})`);
        
        // Round the values to fix precision issues
        const fixedTotalPaid = Math.round(totalPaid * 100) / 100;
        const fixedTotalInterestPaid = Math.round(totalInterestPaid * 100) / 100;
        const fixedGuarantorReimbursed = Math.round(guarantorReimbursed * 100) / 100;
        
        // Ensure exact values for completion
        const finalTotalPaid = Math.max(fixedTotalPaid, 1100);
        const finalInterestPaid = Math.max(fixedTotalInterestPaid, 100);
        const finalGuarantorReimbursed = Math.max(fixedGuarantorReimbursed, 500);
          await prisma.loan.update({
          where: { id: loan.id },
          data: {
            // Fix precision in tracking fields
            totalPaid: finalTotalPaid,
            totalInterestPaid: finalInterestPaid,
            guarantorReimbursed: finalGuarantorReimbursed,
            principalRemaining: 0,
            isCompleted: true,
            // Update status and outstanding balance
            status: 'PAID',
            outstandingBalance: 0.00, // Ensure it's exactly 0
            amountPaid: finalTotalPaid
          }
        });
        
        console.log(`   ✅ Fixed: Status -> PAID, Outstanding -> GH₵0, Completed -> true`);
        console.log(`   ✅ Rounded values: Paid=${finalTotalPaid}, Interest=${finalInterestPaid}, Guarantor=${finalGuarantorReimbursed}\n`);
        
        fixedCount++;
      } else if (shouldBeCompleted) {
        console.log(`✅ ${loan.customer.name}: Already properly marked as completed\n`);
      } else {
        console.log(`ℹ️ ${loan.customer.name}: Not yet completed (Paid: ${totalPaid}/1100, Interest: ${totalInterestPaid}/100, Guarantor: ${guarantorReimbursed}/500)\n`);
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} loan(s) with precision issues`);

  } catch (error) {
    console.error('❌ Fix script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixLoanPrecisionIssues();
