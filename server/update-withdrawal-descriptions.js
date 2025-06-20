require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateWithdrawalDescriptions() {
  try {
    console.log('Updating withdrawal charge descriptions...');
    
    // Update existing transactions with old descriptions
    const updateResult1 = await prisma.transaction.updateMany({
      where: {
        description: 'Withdrawal service charge'
      },
      data: {
        description: 'withdrawal charge'
      }
    });
    
    console.log(`Updated ${updateResult1.count} transactions from "Withdrawal service charge" to "withdrawal charge"`);
    
    const updateResult2 = await prisma.transaction.updateMany({
      where: {
        description: 'Reversal: Withdrawal service charge'
      },
      data: {
        description: 'Reversal: withdrawal charge'
      }
    });
    
    console.log(`Updated ${updateResult2.count} reversal transactions from "Reversal: Withdrawal service charge" to "Reversal: withdrawal charge"`);
    
    // Check for any other withdrawal-related descriptions that might need updating
    const withdrawalTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { description: { contains: 'service charge' } },
          { description: { contains: 'Withdrawal service' } },
          { description: 'withdrawal' },
          { description: 'Withdrawal' }
        ]
      },
      select: {
        id: true,
        description: true,
        type: true,
        amount: true
      }
    });
    
    console.log('\nCurrent withdrawal-related transactions:');
    withdrawalTransactions.forEach(t => {
      console.log(`- ID: ${t.id}, Type: ${t.type}, Amount: ${t.amount}, Description: "${t.description}"`);
    });
    
    // Update simple "withdrawal" descriptions to "withdrawal charge" for charge transactions
    const chargeTransactions = withdrawalTransactions.filter(t => 
      (t.description === 'withdrawal' || t.description === 'Withdrawal') && 
      parseFloat(t.amount) === 5.00
    );
    
    if (chargeTransactions.length > 0) {
      console.log(`\nFound ${chargeTransactions.length} charge transactions with simple "withdrawal" description. Updating...`);
      
      for (const transaction of chargeTransactions) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { description: 'withdrawal charge' }
        });
        console.log(`Updated transaction ${transaction.id} description to "withdrawal charge"`);
      }
    }
    
    console.log('\nUpdate completed!');
    
  } catch (error) {
    console.error('Error updating withdrawal descriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateWithdrawalDescriptions();
