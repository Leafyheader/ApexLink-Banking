const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function clearAllCustomers() {
  try {
    console.log('🗑️  Starting customer data cleanup...');

    // Get count before deletion
    const customerCount = await prisma.customer.count();
    console.log(`📊 Found ${customerCount} customers in database`);

    if (customerCount === 0) {
      console.log('✅ No customers to delete');
      return;
    }

    // Delete in correct order to respect foreign key constraints
    console.log('🔗 Deleting related records in dependency order...');

    // Step 1: Delete records that reference other tables (deepest dependencies first)
    const accountRestrictionCount = await prisma.accountRestriction.deleteMany({});
    console.log(`   ✓ Deleted ${accountRestrictionCount.count} account restrictions`);

    const loanGuarantorCount = await prisma.loanGuarantor.deleteMany({});
    console.log(`   ✓ Deleted ${loanGuarantorCount.count} loan guarantors`);

    // Step 2: Delete account-related records
    const accountBalanceSnapshotCount = await prisma.accountBalanceSnapshot.deleteMany({});
    console.log(`   ✓ Deleted ${accountBalanceSnapshotCount.count} account balance snapshots`);

    const pendingTransactionCount = await prisma.pendingTransaction.deleteMany({});
    console.log(`   ✓ Deleted ${pendingTransactionCount.count} pending transactions`);

    const ledgerEntryCount = await prisma.ledgerEntry.deleteMany({});
    console.log(`   ✓ Deleted ${ledgerEntryCount.count} ledger entries`);

    const transactionCount = await prisma.transaction.deleteMany({});
    console.log(`   ✓ Deleted ${transactionCount.count} transactions`);

    const withdrawalCount = await prisma.withdrawalAuthorization.deleteMany({});
    console.log(`   ✓ Deleted ${withdrawalCount.count} withdrawal authorizations`);

    const incomeCount = await prisma.bankIncome.deleteMany({});
    console.log(`   ✓ Deleted ${incomeCount.count} income records`);

    // Step 3: Delete loans (references customers and accounts)
    const loanCount = await prisma.loan.deleteMany({});
    console.log(`   ✓ Deleted ${loanCount.count} loans`);

    // Step 4: Delete accounts (references customers)
    const accountCount = await prisma.account.deleteMany({});
    console.log(`   ✓ Deleted ${accountCount.count} accounts`);

    // Step 5: Finally delete all customers
    console.log('👥 Deleting customers...');
    const result = await prisma.customer.deleteMany({});
    console.log(`   ✓ Deleted ${result.count} customers`);

    // Verify deletion
    const remainingCount = await prisma.customer.count();
    console.log(`📊 Remaining customers: ${remainingCount}`);

    console.log('✅ Customer cleanup completed successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log(`   - Customers deleted: ${result.count}`);
    console.log(`   - Accounts deleted: ${accountCount.count}`);
    console.log(`   - Transactions deleted: ${transactionCount.count}`);
    console.log(`   - Loans deleted: ${loanCount.count}`);
    console.log(`   - Income records deleted: ${incomeCount.count}`);
    console.log(`   - Withdrawal authorizations deleted: ${withdrawalCount.count}`);
    console.log(`   - Account restrictions deleted: ${accountRestrictionCount.count}`);
    console.log(`   - Loan guarantors deleted: ${loanGuarantorCount.count}`);
    console.log(`   - Ledger entries deleted: ${ledgerEntryCount.count}`);
    console.log(`   - Pending transactions deleted: ${pendingTransactionCount.count}`);
    console.log(`   - Account balance snapshots deleted: ${accountBalanceSnapshotCount.count}`);

  } catch (error) {
    console.error('❌ Error clearing customers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearAllCustomers()
  .then(() => {
    console.log('🎉 Database cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
