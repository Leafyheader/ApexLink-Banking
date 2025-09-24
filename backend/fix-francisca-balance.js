/**
 * Fix Francisca's Outstanding Balance
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFranciscaBalance() {
  console.log('🔧 FIXING FRANCISCA\'S OUTSTANDING BALANCE\n');
  
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
      console.log('📋 BEFORE FIX:');
      console.log(`   Status: ${loan.status}`);
      console.log(`   Outstanding Balance: ${loan.outstandingBalance}`);
      console.log(`   Is Completed: ${loan.isCompleted}`);
      
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          outstandingBalance: 0.00
        }
      });
      
      console.log('\n✅ FIXED:');
      console.log('   Outstanding Balance: 0.00');
      
      // Verify the fix
      const updatedLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
        include: {
          customer: { select: { name: true } }
        }
      });
      
      console.log('\n📋 AFTER FIX:');
      console.log(`   Status: ${updatedLoan.status}`);
      console.log(`   Outstanding Balance: ${updatedLoan.outstandingBalance}`);
      console.log(`   Is Completed: ${updatedLoan.isCompleted}`);
      
    } else {
      console.log('❌ Francisca Mensah loan not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFranciscaBalance();
