const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function showDatabaseStats() {
    console.log('📊 Database Statistics\n');

    try {
        const stats = await prisma.$transaction(async (tx) => {
            const results = await Promise.all([
                tx.user.count(),
                tx.customer.count(),
                tx.account.count(),
                tx.transaction.count(),
                tx.loan.count(),
                tx.loanGuarantor.count(),
                tx.accountRestriction.count(),
                tx.withdrawalAuthorization.count(),
                tx.expense.count(),
                tx.bankIncome.count(),
            ]);

            return {
                users: results[0],
                customers: results[1],
                accounts: results[2],
                transactions: results[3],
                loans: results[4],
                loanGuarantors: results[5],
                accountRestrictions: results[6],
                withdrawalAuthorizations: results[7],
                expenses: results[8],
                bankIncome: results[9],
            };
        });

        // Display statistics
        console.log('👥 Users & Customers:');
        console.log(`   Users: ${stats.users}`);
        console.log(`   Customers: ${stats.customers}`);

        console.log('\n💰 Accounts & Transactions:');
        console.log(`   Accounts: ${stats.accounts}`);
        console.log(`   Transactions: ${stats.transactions}`);

        console.log('\n🏦 Loans & Guarantors:');
        console.log(`   Loans: ${stats.loans}`);
        console.log(`   Loan Guarantors: ${stats.loanGuarantors}`);
        console.log(`   Account Restrictions: ${stats.accountRestrictions}`);
        console.log(`   Withdrawal Authorizations: ${stats.withdrawalAuthorizations}`);

        console.log('\n📈 Financial Records:');
        console.log(`   Expenses: ${stats.expenses}`);
        console.log(`   Bank Income Records: ${stats.bankIncome}`);

        const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
        console.log(`\n🔢 Total Records: ${totalRecords}`);

        // Show recent activity
        console.log('\n📅 Recent Activity:');
        
        const recentTransactions = await prisma.transaction.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                amount: true,
                createdAt: true,
                account: {
                    select: {
                        accountNumber: true,
                        customer: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (recentTransactions.length > 0) {
            console.log('   Recent Transactions:');
            recentTransactions.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type} - $${tx.amount} (${tx.account?.customer?.name || 'Unknown'}) - ${tx.createdAt.toLocaleDateString()}`);
            });
        } else {
            console.log('   No recent transactions');
        }

        const recentLoans = await prisma.loan.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true,
                customer: {
                    select: { name: true }
                }
            }
        });

        if (recentLoans.length > 0) {
            console.log('\n   Recent Loans:');
            recentLoans.forEach((loan, index) => {
                console.log(`   ${index + 1}. $${loan.amount} - ${loan.status} (${loan.customer?.name || 'Unknown'}) - ${loan.createdAt.toLocaleDateString()}`);
            });
        } else {
            console.log('\n   No recent loans');
        }

        return stats;

    } catch (error) {
        console.error('❌ Error fetching database stats:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    showDatabaseStats();
}

module.exports = { showDatabaseStats };