/**
 * Get the latest loan account for testing
 */

const { PrismaClient } = require('@prisma/client');

async function getLatestLoanAccount() {
  const prisma = new PrismaClient();
  
  try {
    const loanAccount = await prisma.account.findFirst({
      where: {
        type: 'LOAN'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        loan: {
          include: {
            guarantor1Account: true,
            guarantor2Account: true
          }
        }
      }
    });
    
    if (loanAccount) {
      console.log('Latest loan account:');
      console.log(`ID: ${loanAccount.id}`);
      console.log(`Account Number: ${loanAccount.accountNumber}`);
      console.log(`Balance: ${loanAccount.balance}`);
      console.log(`Status: ${loanAccount.status}`);
      
      if (loanAccount.loan) {
        console.log('\nLoan details:');
        console.log(`Amount: ${loanAccount.loan.amount}`);
        console.log(`Guarantor 1 Account ID: ${loanAccount.loan.guarantor1AccountId}`);
        console.log(`Guarantor 2 Account ID: ${loanAccount.loan.guarantor2AccountId}`);
      }
    } else {
      console.log('No loan accounts found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getLatestLoanAccount();
