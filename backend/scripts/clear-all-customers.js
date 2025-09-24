const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });

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
    
    // First, delete related records that reference customers
    console.log('🔗 Deleting related records...');
    
    // Delete withdrawal authorizations
    const withdrawalCount = await prisma.withdrawalAuthorization.deleteMany({});
    console.log(`   ✓ Deleted ${withdrawalCount.count} withdrawal authorizations`);
    
    // Delete transactions (they reference accounts which reference customers)
    const transactionCount = await prisma.transaction.deleteMany({});
    console.log(`   ✓ Deleted ${transactionCount.count} transactions`);
    
    // Delete loans (they reference customers)
    const loanCount = await prisma.loan.deleteMany({});
    console.log(`   ✓ Deleted ${loanCount.count} loans`);
    
    // Delete bank income records
    const incomeCount = await prisma.bankIncome.deleteMany({});
    console.log(`   ✓ Deleted ${incomeCount.count} income records`);
    
    // Delete accounts (they reference customers)
    const accountCount = await prisma.account.deleteMany({});
    console.log(`   ✓ Deleted ${accountCount.count} accounts`);
    
    // Finally, delete all customers
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
