const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function quickClear() {
    console.log('🚀 Quick Database Reset...\n');

    try {
        await prisma.$transaction(async (tx) => {
            // Quick deletion in dependency order
            const results = await Promise.all([
                tx.transaction.deleteMany({}),
                tx.bankIncome.deleteMany({}),
                tx.expense.deleteMany({}),
            ]);
            
            console.log(`✅ Cleared ${results[0].count} transactions`);
            console.log(`✅ Cleared ${results[1].count} bank income records`);
            console.log(`✅ Cleared ${results[2].count} expenses`);

            const loanResults = await Promise.all([
                tx.loanGuarantor.deleteMany({}),
                tx.accountRestriction.deleteMany({}),
            ]);
            
            console.log(`✅ Cleared ${loanResults[0].count} loan guarantors`);
            console.log(`✅ Cleared ${loanResults[1].count} account restrictions`);

            const moreResults = await Promise.all([
                tx.loan.deleteMany({}),
                tx.withdrawalAuthorization.deleteMany({}),
            ]);
            
            console.log(`✅ Cleared ${moreResults[0].count} loans`);
            console.log(`✅ Cleared ${moreResults[1].count} withdrawal authorizations`);

            const finalResults = await Promise.all([
                tx.account.deleteMany({}),
                tx.customer.deleteMany({}),
            ]);
            
            console.log(`✅ Cleared ${finalResults[0].count} accounts`);
            console.log(`✅ Cleared ${finalResults[1].count} customers`);

            // Clear non-admin users
            const userResult = await tx.user.deleteMany({
                where: {
                    username: { not: 'admin' }
                }
            });
            
            console.log(`✅ Cleared ${userResult.count} non-admin users`);
        });

        console.log('\n🎉 Quick reset completed!');
        
    } catch (error) {
        console.error('❌ Quick reset failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

quickClear();