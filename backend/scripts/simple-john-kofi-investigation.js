/**
 * Simple Investigation of John Kofi Eshun's Loan
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

async function simpleInvestigation() {
  try {
    console.log('🔍 Simple Investigation of John Kofi Eshun\'s Loan');
    console.log('='.repeat(50));

    // First find all loans with amount 12000
    const loans = await prisma.loan.findMany({
      where: { amount: 12000 },
      include: {
        account: {
          include: {
            customer: true
          }
        }
      }
    });

    console.log(`📊 Found ${loans.length} loans with amount ₵12,000`);

    for (const loan of loans) {
      const customer = loan.account.customer;
      const customerName = customer.name || `${customer.firstName} ${customer.surname}`;

      console.log(`\n👤 Customer: ${customerName}`);
      console.log(`🏦 Account: ${loan.account.accountNumber}`);
      console.log(`💰 Amount Paid: ₵${Number(loan.amountPaid).toLocaleString()}`);
      console.log(`📈 Outstanding: ₵${Number(loan.outstandingBalance).toLocaleString()}`);
      console.log(`📊 Status: ${loan.status}`);
      console.log(`✅ Completed: ${loan.isCompleted}`);

      // Check if this matches the issue
      if (Number(loan.amountPaid) === 1100 && loan.isCompleted) {
        console.log(`\n🎯 ISSUE FOUND! This loan matches the reported problem.`);

        // Get guarantors
        const guarantors = await prisma.loanGuarantor.findMany({
          where: { loanId: loan.id },
          include: {
            guarantorAccount: {
              include: { customer: true }
            }
          }
        });

        console.log(`🤝 Guarantors: ${guarantors.length}`);
        for (const g of guarantors) {
          console.log(`   ${g.guarantorAccount.customer.name}: ₵${Number(g.guaranteedAmount).toLocaleString()} (${g.status})`);
        }

        // Get transactions
        const transactions = await prisma.transaction.findMany({
          where: { accountId: loan.accountId },
          orderBy: { createdAt: 'desc' },
          take: 5
        });

        console.log(`\n💳 Recent Transactions:`);
        for (const txn of transactions) {
          console.log(`   ${txn.type}: ₵${Number(txn.amount).toLocaleString()} - ${txn.description.substring(0, 50)}...`);
        }

        return loan;
      }
    }

    console.log(`\n❌ No loan with ₵1,100 amount paid and completed status found.`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

simpleInvestigation().then(() => prisma.$disconnect());