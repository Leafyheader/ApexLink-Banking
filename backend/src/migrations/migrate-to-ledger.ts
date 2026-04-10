import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateLegacyBalancesToLedger() {
  console.log('🔄 Starting migration of legacy balances to ledger system...');

  try {
    // Get all accounts with non-zero balances
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { balance: { not: 0 } },
          { shareBalance: { not: 0 } },
        ],
      },
      select: {
        id: true,
        accountNumber: true,
        balance: true,
        shareBalance: true,
      },
    });

    console.log(`📊 Found ${accounts.length} accounts with non-zero balances`);

    // Create opening entries for each account
    for (const account of accounts) {
      const openingEntries: any[] = [];

      // Create opening balance entry if there's a regular balance
      if (account.balance && Number(account.balance) !== 0) {
        const balanceAmount = Number(account.balance);
        const reference = `OPENING-BALANCE-${account.accountNumber}`;

        openingEntries.push({
          accountId: account.id,
          type: balanceAmount > 0 ? 'CREDIT' : 'DEBIT',
          amount: Math.abs(balanceAmount),
          currency: 'GHS',
          reference,
          description: `Opening balance migration for account ${account.accountNumber}`,
          metadata: {
            migration: true,
            originalBalance: balanceAmount,
            migrationDate: new Date(),
          },
          createdBy: 'SYSTEM_MIGRATION',
        });
      }

      // Create opening share balance entry if there's a share balance
      if (account.shareBalance && Number(account.shareBalance) !== 0) {
        const shareAmount = Number(account.shareBalance);
        const reference = `OPENING-SHARES-${account.accountNumber}`;

        openingEntries.push({
          accountId: account.id,
          type: shareAmount > 0 ? 'CREDIT' : 'DEBIT',
          amount: Math.abs(shareAmount),
          currency: 'GHS',
          reference,
          description: `Opening share balance migration for account ${account.accountNumber}`,
          metadata: {
            migration: true,
            shareBalance: true,
            originalShareBalance: shareAmount,
            migrationDate: new Date(),
          },
          createdBy: 'SYSTEM_MIGRATION',
        });
      }

      // Insert all opening entries for this account
      if (openingEntries.length > 0) {
        await prisma.ledgerEntry.createMany({
          data: openingEntries,
        });

        // Create initial balance snapshot
        const ledgerBalance = openingEntries
          .filter(entry => !entry.metadata.shareBalance)
          .reduce((sum, entry) => sum + (entry.type === 'CREDIT' ? entry.amount : -entry.amount), 0);

        await prisma.accountBalanceSnapshot.create({
          data: {
            accountId: account.id,
            ledgerBalance,
            pendingBalance: 0,
            availableBalance: ledgerBalance,
            snapshotAt: new Date(),
          },
        });

        console.log(`✅ Migrated account ${account.accountNumber}: Balance ${account.balance}, Shares ${account.shareBalance}`);
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('📝 Note: Legacy balance fields are still intact for reference.');
    console.log('💡 You can now update your controllers to use the ledger service.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migrateLegacyBalancesToLedger()
    .then(() => {
      console.log('✨ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateLegacyBalancesToLedger };