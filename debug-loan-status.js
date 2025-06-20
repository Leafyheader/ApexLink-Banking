/**
 * Debug Script: Check Loan Status and Outstanding Balance Issues
 * 
 * This script helps debug why loan status is not updating to "PAID" after full repayment
 * and why outstanding balance shows incorrect values.
 */

const { PrismaClient } = require('@prisma/client');
const { makeRepayment } = require('../server/src/services/loanRepayment.service');

const prisma = new PrismaClient();

async function debugLoanStatus() {
  console.log('🔍 DEBUGGING LOAN STATUS ISSUES\n');
  
  try {
    // Find loans that might have payment issues
    const loans = await prisma.loan.findMany({
      where: {
        OR: [
          { status: 'ACTIVE' },
          { outstandingBalance: { gt: 0 } }
        ]
      },
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${loans.length} loans to check:\n`);

    for (const loan of loans) {
      console.log(`📋 LOAN: ${loan.customer.name}`);
      console.log(`   ID: ${loan.id}`);
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
      
      // Test our loan repayment logic with current state
      console.log(`\n   🧪 TESTING REPAYMENT LOGIC:`);
      try {
        const currentState = {
          totalPaid: Number(loan.totalPaid || 0),
          totalInterestPaid: Number(loan.totalInterestPaid || 0),
          guarantorReimbursed: Number(loan.guarantorReimbursed || 0),
          principalRemaining: Number(loan.principalRemaining || loan.amount),
          isCompleted: Boolean(loan.isCompleted || false)
        };
        
        console.log(`   Current State:`, currentState);
        
        // Test with ₵0 payment to see current status
        const testResult = makeRepayment(0.01, currentState);
        if (testResult.success) {
          console.log(`   Logic Says Completed: ${testResult.isCompleted}`);
          console.log(`   Remaining Balance: GH₵${testResult.remainingBalance}`);
          
          // Check completion conditions
          const totalPaidOK = currentState.totalPaid >= 1100;
          const interestPaidOK = currentState.totalInterestPaid >= 100;
          const guarantorReimbursedOK = currentState.guarantorReimbursed >= 500;
          
          console.log(`   ✓ Completion Conditions:`);
          console.log(`     Total Paid >= ₵1100: ${totalPaidOK} (${currentState.totalPaid} >= 1100)`);
          console.log(`     Interest Paid >= ₵100: ${interestPaidOK} (${currentState.totalInterestPaid} >= 100)`);
          console.log(`     Guarantor Reimbursed >= ₵500: ${guarantorReimbursedOK} (${currentState.guarantorReimbursed} >= 500)`);
          console.log(`     Should be completed: ${totalPaidOK && interestPaidOK && guarantorReimbursedOK}`);
        }
      } catch (err) {
        console.log(`   Error testing logic: ${err.message}`);
      }
      
      console.log(`\n   ${'='.repeat(60)}\n`);
    }

    // Check for loans that should be PAID but aren't
    const shouldBePaidLoans = await prisma.loan.findMany({
      where: {
        status: { not: 'PAID' },
        totalPaid: { gte: 1100 },
        totalInterestPaid: { gte: 100 },
        guarantorReimbursed: { gte: 500 }
      },
      include: {
        customer: { select: { name: true } }
      }
    });

    if (shouldBePaidLoans.length > 0) {
      console.log(`\n🚨 FOUND ${shouldBePaidLoans.length} LOANS THAT SHOULD BE MARKED AS PAID:`);
      for (const loan of shouldBePaidLoans) {
        console.log(`   - ${loan.customer.name}: Status=${loan.status}, Should be PAID`);
      }
    }

    // Check for outstanding balance inconsistencies
    const balanceInconsistencies = await prisma.loan.findMany({
      where: {
        OR: [
          {
            AND: [
              { totalPaid: { gte: 1100 } },
              { outstandingBalance: { gt: 0 } }
            ]
          },
          {
            AND: [
              { status: 'PAID' },
              { outstandingBalance: { gt: 0 } }
            ]
          }
        ]
      },
      include: {
        customer: { select: { name: true } }
      }
    });

    if (balanceInconsistencies.length > 0) {
      console.log(`\n🚨 FOUND ${balanceInconsistencies.length} LOANS WITH BALANCE INCONSISTENCIES:`);
      for (const loan of balanceInconsistencies) {
        console.log(`   - ${loan.customer.name}: Total Paid=₵${loan.totalPaid}, Outstanding=₵${loan.outstandingBalance}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to fix loan statuses
async function fixLoanStatuses() {
  console.log('🔧 FIXING LOAN STATUSES...\n');
  
  try {
    // Update loans that meet completion criteria but aren't marked as PAID
    const result = await prisma.loan.updateMany({
      where: {
        status: { not: 'PAID' },
        totalPaid: { gte: 1100 },
        totalInterestPaid: { gte: 100 },
        guarantorReimbursed: { gte: 500 }
      },
      data: {
        status: 'PAID',
        outstandingBalance: 0,
        isCompleted: true
      }
    });

    console.log(`✅ Updated ${result.count} loan(s) to PAID status`);

    // Fix outstanding balances for completed loans
    const balanceResult = await prisma.loan.updateMany({
      where: {
        totalPaid: { gte: 1100 },
        outstandingBalance: { gt: 0 }
      },
      data: {
        outstandingBalance: 0
      }
    });

    console.log(`✅ Fixed outstanding balance for ${balanceResult.count} loan(s)`);

  } catch (error) {
    console.error('❌ Fix script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if this is being run directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'fix') {
    fixLoanStatuses();
  } else {
    debugLoanStatus();
  }
}

module.exports = {
  debugLoanStatus,
  fixLoanStatuses
};
