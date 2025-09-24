require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWithdrawalIncome() {
  try {
    console.log('=== Checking Withdrawal Income Integration ===\n');
    
    // 1. Check existing withdrawal charge transactions
    const withdrawalCharges = await prisma.transaction.findMany({
      where: {
        description: 'withdrawal charge'
      },
      include: {
        account: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    });

    console.log(`📊 Found ${withdrawalCharges.length} withdrawal charge transactions:`);
    withdrawalCharges.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.date.toISOString().split('T')[0]} - $${tx.amount} for ${tx.account.customer.name} (${tx.account.accountNumber})`);
    });

    // 2. Check existing bank income records for withdrawal charges
    const bankIncomeRecords = await prisma.bankIncome.findMany({
      where: {
        type: 'WITHDRAWAL_CHARGE'
      },
      include: {
        account: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    });

    console.log(`\n💰 Found ${bankIncomeRecords.length} withdrawal charge bank income records:`);
    bankIncomeRecords.forEach((income, index) => {
      console.log(`${index + 1}. ${income.date.toISOString().split('T')[0]} - $${income.amount} from ${income.account?.customer?.name || 'Unknown'} (Source: ${income.sourceId})`);
    });

    // 3. Check total bank income stats
    const totalIncome = await prisma.bankIncome.count();
    const totalIncomeAmount = await prisma.bankIncome.aggregate({
      _sum: {
        amount: true
      }
    });
    
    const withdrawalChargeIncome = await prisma.bankIncome.aggregate({
      where: {
        type: 'WITHDRAWAL_CHARGE'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    console.log(`\n📈 Bank Income Summary:`);
    console.log(`   Total records: ${totalIncome}`);
    console.log(`   Total amount: $${totalIncomeAmount._sum.amount || 0}`);
    console.log(`   Withdrawal charges: ${withdrawalChargeIncome._count.id} records, $${withdrawalChargeIncome._sum.amount || 0}`);

    // 4. Check if there's a mismatch between withdrawal charges and bank income
    if (withdrawalCharges.length !== bankIncomeRecords.length) {
      console.log(`\n⚠️  MISMATCH DETECTED:`);
      console.log(`   Withdrawal charge transactions: ${withdrawalCharges.length}`);
      console.log(`   Bank income records: ${bankIncomeRecords.length}`);
      console.log(`   Missing bank income records: ${withdrawalCharges.length - bankIncomeRecords.length}`);
    } else {
      console.log(`\n✅ All withdrawal charges have corresponding bank income records!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWithdrawalIncome();
