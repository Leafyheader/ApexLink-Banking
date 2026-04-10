const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function clearAllData() {
    console.log('🗑️  Starting database cleanup...\n');

    try {
        // Start a transaction to ensure all operations succeed or fail together
        await prisma.$transaction(async (tx) => {
            console.log('1️⃣  Clearing transaction-related data...');
            
            // Clear transactions first (they reference accounts)
            const transactionCount = await tx.transaction.count();
            if (transactionCount > 0) {
                await tx.transaction.deleteMany({});
                console.log(`   ✅ Deleted ${transactionCount} transactions`);
            } else {
                console.log('   ℹ️  No transactions to delete');
            }

            console.log('\n2️⃣  Clearing bank income records...');
            
            // Clear bank income records
            const bankIncomeCount = await tx.bankIncome.count();
            if (bankIncomeCount > 0) {
                await tx.bankIncome.deleteMany({});
                console.log(`   ✅ Deleted ${bankIncomeCount} bank income records`);
            } else {
                console.log('   ℹ️  No bank income records to delete');
            }

            console.log('\n3️⃣  Clearing expense records...');
            
            // Clear expenses
            const expenseCount = await tx.expense.count();
            if (expenseCount > 0) {
                await tx.expense.deleteMany({});
                console.log(`   ✅ Deleted ${expenseCount} expense records`);
            } else {
                console.log('   ℹ️  No expense records to delete');
            }

            console.log('\n4️⃣  Clearing loan-related data...');
            
            // Clear loan guarantors first (they reference loans)
            const guarantorCount = await tx.loanGuarantor.count();
            if (guarantorCount > 0) {
                await tx.loanGuarantor.deleteMany({});
                console.log(`   ✅ Deleted ${guarantorCount} loan guarantor records`);
            } else {
                console.log('   ℹ️  No loan guarantor records to delete');
            }

            // Clear account restrictions
            const restrictionCount = await tx.accountRestriction.count();
            if (restrictionCount > 0) {
                await tx.accountRestriction.deleteMany({});
                console.log(`   ✅ Deleted ${restrictionCount} account restriction records`);
            } else {
                console.log('   ℹ️  No account restriction records to delete');
            }

            // Clear loans
            const loanCount = await tx.loan.count();
            if (loanCount > 0) {
                await tx.loan.deleteMany({});
                console.log(`   ✅ Deleted ${loanCount} loans`);
            } else {
                console.log('   ℹ️  No loans to delete');
            }

            console.log('\n5️⃣  Clearing withdrawal authorization data...');
            
            // Clear withdrawal authorizations
            const withdrawalAuthCount = await tx.withdrawalAuthorization.count();
            if (withdrawalAuthCount > 0) {
                await tx.withdrawalAuthorization.deleteMany({});
                console.log(`   ✅ Deleted ${withdrawalAuthCount} withdrawal authorization records`);
            } else {
                console.log('   ℹ️  No withdrawal authorization records to delete');
            }

            console.log('\n6️⃣  Clearing account data...');
            
            // Clear accounts (they reference customers)
            const accountCount = await tx.account.count();
            if (accountCount > 0) {
                await tx.account.deleteMany({});
                console.log(`   ✅ Deleted ${accountCount} accounts`);
            } else {
                console.log('   ℹ️  No accounts to delete');
            }

            console.log('\n7️⃣  Clearing customer data...');
            
            // Clear customers
            const customerCount = await tx.customer.count();
            if (customerCount > 0) {
                await tx.customer.deleteMany({});
                console.log(`   ✅ Deleted ${customerCount} customers`);
            } else {
                console.log('   ℹ️  No customers to delete');
            }

            console.log('\n8️⃣  Clearing user data (except system admin)...');
            
            // Clear users except the system admin
            const allUsers = await tx.user.findMany();
            const nonAdminUsers = allUsers.filter(user => user.username !== 'admin');
            
            if (nonAdminUsers.length > 0) {
                await tx.user.deleteMany({
                    where: {
                        username: {
                            not: 'admin'
                        }
                    }
                });
                console.log(`   ✅ Deleted ${nonAdminUsers.length} non-admin users`);
            } else {
                console.log('   ℹ️  No non-admin users to delete');
            }

            const adminUser = allUsers.find(user => user.username === 'admin');
            if (adminUser) {
                console.log('   ℹ️  Preserved admin user');
            } else {
                console.log('   ⚠️  No admin user found');
            }
        });

        console.log('\n🎉 Database cleanup completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   - All transactions cleared');
        console.log('   - All bank income records cleared');
        console.log('   - All expense records cleared');
        console.log('   - All loans and guarantor records cleared');
        console.log('   - All account restrictions cleared');
        console.log('   - All withdrawal authorizations cleared');
        console.log('   - All accounts cleared');
        console.log('   - All customers cleared');
        console.log('   - All non-admin users cleared');
        console.log('   - Admin user preserved');

        console.log('\n💡 Next steps:');
        console.log('   1. The database is now clean and ready for fresh data');
        console.log('   2. You can run seed scripts to populate with test data');
        console.log('   3. You can start creating new customers and accounts');

    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
        console.error('\n🔍 Error details:');
        console.error('   Message:', error.message);
        if (error.code) {
            console.error('   Code:', error.code);
        }
        if (error.meta) {
            console.error('   Meta:', error.meta);
        }
        
        console.log('\n💡 Troubleshooting tips:');
        console.log('   1. Make sure the database is running');
        console.log('   2. Check database connection string in .env');
        console.log('   3. Ensure Prisma client is properly configured');
        console.log('   4. Run `npx prisma generate` to update client');
        
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Add confirmation prompt for safety
async function confirmAndClear() {
    console.log('⚠️  WARNING: This will permanently delete ALL data from the database!');
    console.log('📋 This includes:');
    console.log('   • All transactions');
    console.log('   • All bank income records');
    console.log('   • All expenses');
    console.log('   • All loans and guarantor records');
    console.log('   • All account restrictions');
    console.log('   • All withdrawal authorizations');
    console.log('   • All accounts');
    console.log('   • All customers');
    console.log('   • All users (except admin)');
    
    // For script execution, we'll add an environment variable check
    const forceMode = process.env.FORCE_CLEAR === 'true';
    const confirmArg = process.argv.includes('--confirm');
    
    if (forceMode || confirmArg) {
        console.log('\n✅ Confirmation received, proceeding with cleanup...\n');
        await clearAllData();
    } else {
        console.log('\n❌ Operation cancelled for safety.');
        console.log('\n💡 To proceed with the cleanup, run:');
        console.log('   node clear-all-data.js --confirm');
        console.log('   or set environment variable: FORCE_CLEAR=true');
        process.exit(0);
    }
}

// Run the script
if (require.main === module) {
    confirmAndClear();
}

module.exports = { clearAllData };