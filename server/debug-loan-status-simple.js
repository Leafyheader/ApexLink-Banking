/**
 * Simple Debug Script: Check Loan Status Issues
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugLoanStatus() {
  console.log('🔍 DEBUGGING LOAN STATUS ISSUES\n');
  
  try {
    // Find all loans
    const loans = await prisma.loan.findMany({
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${loans.length} loans to check:\n`);

    for (const loan of loans) {
      console.log(`📋 LOAN: ${loan.customer.name}`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Amount: GH₵${loan.amount}`);
      console.log(`   Total Payable: GH₵${loan.totalPayable}`);
      console.log(`   Amount Paid: GH₵${loan.amountPaid}`);
      console.log(`   Outstanding Balance: GH₵${loan.outstandingBalance}`);
      
      // Check new tracking fields
      console.log(`\n   📊 NEW TRACKING FIELDS:`);
      console.log(`   Total Paid: GH₵${loan.totalPaid || 0}`);
      console.log(`   Total Interest Paid: GH₵${loan.totalInterestPaid || 0}`);
      console.log(`   Guarantor Reimbursed: GH₵${loan.guarantorReimbursed || 0}`);
      console.log(`   Principal Remaining: GH₵${loan.principalRemaining || loan.amount}`);
      console.log(`   Is Completed: ${loan.isCompleted || false}`);
      
      // Check completion conditions manually
      const totalPaid = Number(loan.totalPaid || 0);
      const totalInterestPaid = Number(loan.totalInterestPaid || 0);
      const guarantorReimbursed = Number(loan.guarantorReimbursed || 0);
      
      const shouldBeCompleted = totalPaid >= 1100 && totalInterestPaid >= 100 && guarantorReimbursed >= 500;
      const remainingBalance = Math.max(0, 1100 - totalPaid);
      
      console.log(`\n   ✓ Manual Completion Check:`);
      console.log(`     Total Paid >= ₵1100: ${totalPaid >= 1100} (${totalPaid} >= 1100)`);
      console.log(`     Interest Paid >= ₵100: ${totalInterestPaid >= 100} (${totalInterestPaid} >= 100)`);
      console.log(`     Guarantor Reimbursed >= ₵500: ${guarantorReimbursed >= 500} (${guarantorReimbursed} >= 500)`);
      console.log(`     Should be completed: ${shouldBeCompleted}`);
      console.log(`     Calculated remaining: GH₵${remainingBalance}`);
      
      if (shouldBeCompleted && loan.status !== 'PAID') {
        console.log(`   🚨 ISSUE: Loan should be PAID but status is ${loan.status}`);
      }
      
      if (shouldBeCompleted && loan.outstandingBalance > 0) {
        console.log(`   🚨 ISSUE: Loan should have 0 outstanding but shows GH₵${loan.outstandingBalance}`);
      }
      
      console.log(`\n   ${'='.repeat(60)}\n`);
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fixLoanStatuses() {
  console.log('🔧 FIXING LOAN STATUSES...\n');
  
  try {
    // Find loans that should be completed
    const loansToFix = await prisma.loan.findMany({
      where: {
        AND: [
          { totalPaid: { gte: 1100 } },
          { totalInterestPaid: { gte: 100 } },
          { guarantorReimbursed: { gte: 500 } }
        ]
      },
      include: {
        customer: { select: { name: true } }
      }
    });

    console.log(`Found ${loansToFix.length} loans that should be marked as PAID:\n`);

    for (const loan of loansToFix) {
      console.log(`Fixing loan for ${loan.customer.name}...`);
      
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: 'PAID',
          outstandingBalance: 0,
          isCompleted: true
        }
      });
      
      console.log(`✅ Updated ${loan.customer.name}'s loan to PAID status`);
    }

    console.log(`\n✅ Fixed ${loansToFix.length} loan(s)`);

  } catch (error) {
    console.error('❌ Fix script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line argument
const action = process.argv[2];

if (action === 'fix') {
  fixLoanStatuses();
} else {
  debugLoanStatus();
}
