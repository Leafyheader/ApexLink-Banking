const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function selectiveClear(options = {}) {
    console.log('🎯 Selective Database Cleanup...\n');

    const {
        clearTransactions = false,
        clearLoans = false,
        clearAccounts = false,
        clearCustomers = false,
        clearUsers = false,
        clearExpenses = false,
        clearBankIncome = false,
        clearAll = false
    } = options;

    try {
        await prisma.$transaction(async (tx) => {
            if (clearAll || clearTransactions) {
                const count = await tx.transaction.deleteMany({});
                console.log(`✅ Cleared ${count.count} transactions`);
            }

            if (clearAll || clearBankIncome) {
                const count = await tx.bankIncome.deleteMany({});
                console.log(`✅ Cleared ${count.count} bank income records`);
            }

            if (clearAll || clearExpenses) {
                const count = await tx.expense.deleteMany({});
                console.log(`✅ Cleared ${count.count} expenses`);
            }

            if (clearAll || clearLoans) {
                // Clear loan-related data in order
                const guarantorCount = await tx.loanGuarantor.deleteMany({});
                console.log(`✅ Cleared ${guarantorCount.count} loan guarantors`);

                const restrictionCount = await tx.accountRestriction.deleteMany({});
                console.log(`✅ Cleared ${restrictionCount.count} account restrictions`);

                const loanCount = await tx.loan.deleteMany({});
                console.log(`✅ Cleared ${loanCount.count} loans`);

                const withdrawalCount = await tx.withdrawalAuthorization.deleteMany({});
                console.log(`✅ Cleared ${withdrawalCount.count} withdrawal authorizations`);
            }

            if (clearAll || clearAccounts) {
                const count = await tx.account.deleteMany({});
                console.log(`✅ Cleared ${count.count} accounts`);
            }

            if (clearAll || clearCustomers) {
                const count = await tx.customer.deleteMany({});
                console.log(`✅ Cleared ${count.count} customers`);
            }

            if (clearAll || clearUsers) {
                const count = await tx.user.deleteMany({
                    where: { username: { not: 'admin' } }
                });
                console.log(`✅ Cleared ${count.count} non-admin users`);
            }
        });

        console.log('\n🎉 Selective cleanup completed!');
        
    } catch (error) {
        console.error('❌ Selective cleanup failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};

    if (args.includes('--all')) {
        options.clearAll = true;
    }
    if (args.includes('--transactions')) {
        options.clearTransactions = true;
    }
    if (args.includes('--loans')) {
        options.clearLoans = true;
    }
    if (args.includes('--accounts')) {
        options.clearAccounts = true;
    }
    if (args.includes('--customers')) {
        options.clearCustomers = true;
    }
    if (args.includes('--users')) {
        options.clearUsers = true;
    }
    if (args.includes('--expenses')) {
        options.clearExpenses = true;
    }
    if (args.includes('--bank-income')) {
        options.clearBankIncome = true;
    }

    return options;
}

// Show usage if no arguments
function showUsage() {
    console.log('🎯 Selective Database Cleanup Tool\n');
    console.log('Usage: node selective-clear.js [options]\n');
    console.log('Options:');
    console.log('  --all           Clear all data (except admin user)');
    console.log('  --transactions  Clear all transactions');
    console.log('  --loans         Clear all loan-related data');
    console.log('  --accounts      Clear all accounts');
    console.log('  --customers     Clear all customers');
    console.log('  --users         Clear all non-admin users');
    console.log('  --expenses      Clear all expense records');
    console.log('  --bank-income   Clear all bank income records');
    console.log('\nExamples:');
    console.log('  node selective-clear.js --transactions --loans');
    console.log('  node selective-clear.js --all');
    console.log('  node selective-clear.js --customers --accounts');
}

// Run the script
if (require.main === module) {
    const options = parseArgs();
    
    if (Object.keys(options).length === 0) {
        showUsage();
        process.exit(0);
    }

    console.log('⚠️  WARNING: This will permanently delete selected data!');
    console.log('Selected options:', Object.keys(options).filter(key => options[key]));
    
    const confirmArg = process.argv.includes('--confirm');
    if (!confirmArg) {
        console.log('\n❌ Add --confirm to proceed with the cleanup');
        console.log('Example: node selective-clear.js --transactions --confirm');
        process.exit(0);
    }

    selectiveClear(options);
}

module.exports = { selectiveClear };