/**
 * Check all loans for Francisca Mensah
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllFranciscaLoans() {
  console.log('🔍 Checking ALL loans for Francisca Mensah...\n');
  
  try {
    const loans = await prisma.loan.findMany({
      where: {
        customer: {
          name: {
            contains: 'Francisca'
          }
        }
      },
      include: {
        customer: { select: { name: true, id: true } }
      }
    });
    
    console.log(`Found ${loans.length} loan(s) for Francisca:\n`);
    
    loans.forEach((loan, index) => {
      console.log(`📋 LOAN ${index + 1} (ID: ${loan.id}):`);
      console.log(`   Customer: ${loan.customer.name} (ID: ${loan.customer.id})`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Outstanding Balance: GH₵${loan.outstandingBalance}`);
      console.log(`   Principal Remaining: GH₵${loan.principalRemaining}`);
      console.log(`   Total Paid: GH₵${loan.totalPaid}`);
      console.log(`   Amount Paid: GH₵${loan.amountPaid}`);
      console.log(`   Total Payable: GH₵${loan.totalPayable}`);
      console.log(`   Is Completed: ${loan.isCompleted}`);
      console.log(`   Created At: ${loan.createdAt}`);
      
      if (loan.status === 'PAID' && loan.outstandingBalance > 0) {
        console.log(`   🚨 ISSUE: This PAID loan has outstanding balance > 0`);
      }
      
      console.log(`\n   ${'='.repeat(50)}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllFranciscaLoans();
