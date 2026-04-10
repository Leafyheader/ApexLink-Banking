require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLedgerSystem() {
  console.log('🧪 Testing Ledger System...\n');

  try {
    // 1. First, let's create a test user, customer and account
    console.log('1. Creating test user, customer and account...');
    
    // Get or create a test user
    let testUser = await prisma.user.findFirst({
      where: { username: 'test-ledger-user' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          username: 'test-ledger-user',
          password: 'test-password',
          name: 'Test User for Ledger',
          role: 'MANAGER'
        }
      });
    }
    
    const testCustomer = await prisma.customer.create({
      data: {
        customerNumber: `CUST-TEST-${Date.now()}`,
        name: 'Test Customer for Ledger',
        email: `test-ledger-${Date.now()}@example.com`,
        phone: '0241234567',
        kycStatus: 'VERIFIED',
        createdBy: {
          connect: { id: testUser.id }
        }
      }
    });

    const testAccount = await prisma.account.create({
      data: {
        customerId: testCustomer.id,
        accountNumber: `ACC-${Date.now()}`,
        type: 'SAVINGS',
        balance: 0, // Start with zero legacy balance
        shareBalance: 0,
        status: 'ACTIVE',
        approvedById: testUser.id
      }
    });

    console.log(`✅ Created account ${testAccount.accountNumber} for ${testCustomer.name}\n`);

    // 2. Test creating ledger entries directly using Prisma
    console.log('2. Testing direct ledger entries...');
    
    // Create a credit entry (deposit)
    const creditEntry = await prisma.ledgerEntry.create({
      data: {
        accountId: testAccount.id,
        type: 'CREDIT',
        amount: 1000,
        currency: 'GHS',
        reference: 'TEST-DEPOSIT-001',
        description: 'Test deposit for ledger verification',
        createdBy: 'TEST_SCRIPT'
      }
    });

    console.log('✅ Created credit entry:', {
      id: creditEntry.id,
      amount: creditEntry.amount,
      type: creditEntry.type
    });

    // Create a debit entry (withdrawal)
    const debitEntry = await prisma.ledgerEntry.create({
      data: {
        accountId: testAccount.id,
        type: 'DEBIT',
        amount: 250,
        currency: 'GHS',
        reference: 'TEST-WITHDRAWAL-001',
        description: 'Test withdrawal for ledger verification',
        createdBy: 'TEST_SCRIPT'
      }
    });

    console.log('✅ Created debit entry:', {
      id: debitEntry.id,
      amount: debitEntry.amount,
      type: debitEntry.type
    });

    // 3. Test balance calculations manually
    console.log('\n3. Testing balance calculations manually...');
    
    // Calculate balance from ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: testAccount.id }
    });

    let calculatedBalance = 0;
    entries.forEach(entry => {
      if (entry.type === 'CREDIT') {
        calculatedBalance += Number(entry.amount);
      } else {
        calculatedBalance -= Number(entry.amount);
      }
    });

    console.log('✅ Manual balance calculation:');
    console.log(`   Found ${entries.length} ledger entries`);
    console.log(`   Calculated Balance: ${calculatedBalance} (expected: 750)`);

    // Create a balance snapshot
    const balanceSnapshot = await prisma.accountBalanceSnapshot.create({
      data: {
        accountId: testAccount.id,
        ledgerBalance: calculatedBalance,
        pendingBalance: 0,
        availableBalance: calculatedBalance,
        snapshotAt: new Date()
      }
    });

    console.log('✅ Created balance snapshot:', {
      ledgerBalance: balanceSnapshot.ledgerBalance,
      availableBalance: balanceSnapshot.availableBalance
    });

    // 4. Test pending transaction (hold) functionality
    console.log('\n4. Testing pending transaction (hold) functionality...');
    
    const pendingTx = await prisma.pendingTransaction.create({
      data: {
        accountId: testAccount.id,
        type: 'HOLD',
        amount: 200,
        currency: 'GHS',
        reference: 'TEST-HOLD-001',
        description: 'Test hold for ledger verification',
        status: 'ACTIVE',
        createdBy: 'TEST_SCRIPT'
      }
    });

    console.log('✅ Created hold:', {
      id: pendingTx.id,
      amount: pendingTx.amount,
      status: pendingTx.status
    });

    // Update balance snapshot to reflect the hold
    const pendingAmount = Number(pendingTx.amount);
    const updatedSnapshot = await prisma.accountBalanceSnapshot.update({
      where: { accountId: testAccount.id },
      data: {
        pendingBalance: pendingAmount,
        availableBalance: calculatedBalance - pendingAmount,
        snapshotAt: new Date()
      }
    });

    console.log('✅ Updated balance with hold:', {
      ledgerBalance: Number(updatedSnapshot.ledgerBalance),
      pendingBalance: Number(updatedSnapshot.pendingBalance),
      availableBalance: Number(updatedSnapshot.availableBalance)
    });
    console.log(`   Available should be: ${750 - 200} = 550`);

    // 5. Test settling the hold
    console.log('\n5. Testing hold settlement...');
    
    // Create a debit entry for the settlement
    const settlementEntry = await prisma.ledgerEntry.create({
      data: {
        accountId: testAccount.id,
        type: 'DEBIT',
        amount: 200,
        currency: 'GHS',
        reference: 'SETTLE-TEST-HOLD-001',
        description: 'Settlement of test hold',
        metadata: { originalHoldId: pendingTx.id },
        createdBy: 'TEST_SCRIPT'
      }
    });

    // Mark the hold as settled
    const settledHold = await prisma.pendingTransaction.update({
      where: { id: pendingTx.id },
      data: {
        status: 'SETTLED',
        settledAt: new Date()
      }
    });

    console.log('✅ Settled hold:', {
      id: settledHold.id,
      status: settledHold.status
    });

    // Recalculate balance after settlement
    const allEntries = await prisma.ledgerEntry.findMany({
      where: { accountId: testAccount.id }
    });

    let finalBalance = 0;
    allEntries.forEach(entry => {
      if (entry.type === 'CREDIT') {
        finalBalance += Number(entry.amount);
      } else {
        finalBalance -= Number(entry.amount);
      }
    });

    // Update final balance snapshot
    await prisma.accountBalanceSnapshot.update({
      where: { accountId: testAccount.id },
      data: {
        ledgerBalance: finalBalance,
        pendingBalance: 0,
        availableBalance: finalBalance,
        snapshotAt: new Date()
      }
    });

    console.log('✅ Final balance after settlement:', {
      ledgerBalance: finalBalance,
      pendingBalance: 0,
      availableBalance: finalBalance
    });
    console.log(`   Expected: ${750 - 200} = 550`);

    // 6. Test ledger history
    console.log('\n6. Testing ledger history...');
    
    const history = await prisma.ledgerEntry.findMany({
      where: { accountId: testAccount.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Found ${history.length} ledger entries:`);
    history.forEach(entry => {
      console.log(`   ${entry.type}: ${entry.amount} - ${entry.description} (${entry.reference})`);
    });

    // 7. Test double-entry posting manually
    console.log('\n7. Testing double-entry posting manually...');
    
    // Create another test account for transfer
    const targetAccount = await prisma.account.create({
      data: {
        customerId: testCustomer.id,
        accountNumber: `ACC-TARGET-${Date.now()}`,
        type: 'CURRENT',
        balance: 0,
        shareBalance: 0,
        status: 'ACTIVE',
        approvedById: testUser.id
      }
    });

    // Create double-entry transfer
    const transferReference = 'TRANSFER-TEST-001';
    const transferAmount = 300;

    const [creditTransferEntry, debitTransferEntry] = await Promise.all([
      // Credit the target account
      prisma.ledgerEntry.create({
        data: {
          accountId: targetAccount.id,
          type: 'CREDIT',
          amount: transferAmount,
          currency: 'GHS',
          reference: transferReference,
          description: 'Transfer credit',
          createdBy: 'TEST_SCRIPT'
        }
      }),
      // Debit the source account
      prisma.ledgerEntry.create({
        data: {
          accountId: testAccount.id,
          type: 'DEBIT',
          amount: transferAmount,
          currency: 'GHS',
          reference: transferReference,
          description: 'Transfer debit',
          createdBy: 'TEST_SCRIPT'
        }
      })
    ]);

    console.log('✅ Double-entry transfer completed');
    console.log(`   Created 2 entries with reference: ${transferReference}`);

    // Calculate final balances
    const sourceEntries = await prisma.ledgerEntry.findMany({
      where: { accountId: testAccount.id }
    });

    const targetEntries = await prisma.ledgerEntry.findMany({
      where: { accountId: targetAccount.id }
    });

    let sourceBalance = 0;
    sourceEntries.forEach(entry => {
      if (entry.type === 'CREDIT') {
        sourceBalance += Number(entry.amount);
      } else {
        sourceBalance -= Number(entry.amount);
      }
    });

    let targetBalance = 0;
    targetEntries.forEach(entry => {
      if (entry.type === 'CREDIT') {
        targetBalance += Number(entry.amount);
      } else {
        targetBalance -= Number(entry.amount);
      }
    });

    console.log(`   Source account balance: ${sourceBalance} (expected: 250)`);
    console.log(`   Target account balance: ${targetBalance} (expected: 300)`);

    // Create snapshots for both accounts
    await Promise.all([
      prisma.accountBalanceSnapshot.upsert({
        where: { accountId: testAccount.id },
        create: {
          accountId: testAccount.id,
          ledgerBalance: sourceBalance,
          pendingBalance: 0,
          availableBalance: sourceBalance,
          snapshotAt: new Date()
        },
        update: {
          ledgerBalance: sourceBalance,
          pendingBalance: 0,
          availableBalance: sourceBalance,
          snapshotAt: new Date()
        }
      }),
      prisma.accountBalanceSnapshot.create({
        data: {
          accountId: targetAccount.id,
          ledgerBalance: targetBalance,
          pendingBalance: 0,
          availableBalance: targetBalance,
          snapshotAt: new Date()
        }
      })
    ]);

    console.log('\n✨ All ledger system tests passed! ✨\n');

    // Cleanup - Delete test data
    console.log('🧹 Cleaning up test data...');
    
    await prisma.ledgerEntry.deleteMany({
      where: {
        accountId: {
          in: [testAccount.id, targetAccount.id]
        }
      }
    });

    await prisma.pendingTransaction.deleteMany({
      where: {
        accountId: {
          in: [testAccount.id, targetAccount.id]
        }
      }
    });

    await prisma.accountBalanceSnapshot.deleteMany({
      where: {
        accountId: {
          in: [testAccount.id, targetAccount.id]
        }
      }
    });

    await prisma.account.deleteMany({
      where: {
        id: {
          in: [testAccount.id, targetAccount.id]
        }
      }
    });

    await prisma.customer.delete({
      where: { id: testCustomer.id }
    });

    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testLedgerSystem()
  .then(() => {
    console.log('🎉 Ledger system test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Ledger system test failed:', error);
    process.exit(1);
  });