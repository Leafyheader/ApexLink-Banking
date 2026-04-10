const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLoanRepayments() {
  try {
    console.log('Checking loan repayment transactions...');

    // Get all LOAN_REPAYMENT transactions
    const repayments = await prisma.transaction.findMany({
      where: { type: 'LOAN_REPAYMENT' },
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        date: true,
        accountId: true,
        account: {
          select: {
            accountNumber: true,
            customer: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    console.log(`Found ${repayments.length} LOAN_REPAYMENT transactions:`);
    repayments.forEach((repayment, index) => {
      console.log(`${index + 1}. ${repayment.account.customer.name} - ${repayment.account.accountNumber}: ${repayment.amount} (${repayment.status}) - ${repayment.description}`);
    });

    // Calculate total
    const total = repayments.reduce((sum, r) => sum + Number(r.amount), 0);
    console.log(`\nTotal loan repayments: ${total}`);

    // Check loans
    const loans = await prisma.loan.findMany({
      select: {
        id: true,
        amount: true,
        amountPaid: true,
        customer: { select: { name: true } }
      }
    });

    console.log(`\nLoans:`);
    loans.forEach((loan, index) => {
      console.log(`${index + 1}. ${loan.customer.name}: Loan ${loan.amount}, Paid ${loan.amountPaid}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLoanRepayments();