/**
 * Check Francisca Mensah's loan details
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFrancisca() {
  console.log('🔍 Checking Francisca Mensah\'s loan details...\n');
  
  try {
    const loan = await prisma.loan.findFirst({
      where: {
        customer: {
          name: {
            contains: 'Francisca'
          }
        }
      },
      include: {
        customer: { select: { name: true } }
      }
    });
    
    if (loan) {
      console.log('📋 FRANCISCA MENSAH LOAN DETAILS:');
      console.log(`   Status: ${loan.status}`);
      console.log(`   Outstanding Balance: GH₵${loan.outstandingBalance}`);
      console.log(`   Principal Remaining: GH₵${loan.principalRemaining}`);
      console.log(`   Total Paid: GH₵${loan.totalPaid}`);
      console.log(`   Total Interest Paid: GH₵${loan.totalInterestPaid}`);
      console.log(`   Guarantor Reimbursed: GH₵${loan.guarantorReimbursed}`);
      console.log(`   Is Completed: ${loan.isCompleted}`);
      console.log(`   Amount Paid: GH₵${loan.amountPaid}`);
      console.log(`   Total Payable: GH₵${loan.totalPayable}`);
      
      console.log('\n🔍 FRONTEND DISPLAY VALUES:');
      console.log(`   Status Badge: ${loan.status}`);
      console.log(`   Outstanding Balance (Frontend): GH₵${loan.outstandingBalance}`);
      
      // Check if outstanding balance should be 0
      if (loan.status === 'PAID' && loan.outstandingBalance > 0) {
        console.log('\n🚨 ISSUE FOUND: Loan is PAID but outstanding balance is not 0');
        console.log('   This will show incorrect data in the frontend modal');
      }
    } else {
      console.log('❌ Francisca Mensah loan not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFrancisca();
