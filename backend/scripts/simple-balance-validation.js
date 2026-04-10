/**
 * Simple Balance Validation Test
 * 
 * Tests the corrected guarantee calculation logic directly
 * without requiring a running API server.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function testBalanceCalculation() {
  try {
    console.log('🧪 Simple Balance Validation Test');
    console.log('='.repeat(40));

    // Find a guarantor account with active guarantees
    const guarantorRecord = await prisma.loanGuarantor.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        guarantorAccount: {
          select: {
            id: true,
            accountNumber: true,
            balance: true,
            customer: { select: { name: true } }
          }
        },
        loan: {
          select: {
            amount: true,
            status: true,
            account: { select: { accountNumber: true } }
          }
        }
      }
    });

    if (!guarantorRecord) {
      console.log('⚠️  No active guarantor found. Test passed by default.');
      return;
    }

    const account = guarantorRecord.guarantorAccount;
    const guaranteedAmount = Number(guarantorRecord.guaranteedAmount);
    const accountBalance = Number(account.balance);

    console.log(`\n📊 Testing Account: ${account.accountNumber}`);
    console.log(`👤 Customer: ${account.customer.name}`);
    console.log(`💰 Current Balance: ₵${accountBalance.toLocaleString()}`);
    console.log(`🤝 Guaranteed Amount: ₵${guaranteedAmount.toLocaleString()}`);

    // Test the guarantee service directly
    const { GuaranteeService } = require('../src/services/guarantee.service');
    const guaranteeService = new GuaranteeService(prisma);

    const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(account.id);

    console.log('\n✅ CORRECTED CALCULATION RESULTS:');
    console.log(`💳 Account Balance: ₵${withdrawalInfo.accountBalance.toLocaleString()}`);
    console.log(`🔓 Available Amount: ₵${withdrawalInfo.availableAmount.toLocaleString()}`);
    console.log(`🔒 Restricted by Guarantees: ₵${withdrawalInfo.restrictedByGuarantees.toLocaleString()}`);

    // Validate the fix
    const isCorrect = (
      withdrawalInfo.accountBalance === accountBalance &&
      withdrawalInfo.restrictedByGuarantees === 0 &&
      withdrawalInfo.availableAmount === accountBalance
    );

    if (isCorrect) {
      console.log('\n🎉 TEST PASSED! ');
      console.log('✅ Balance calculation is now correct:');
      console.log('   - Account balance properly reflects deducted guarantor amounts');
      console.log('   - No additional restrictions applied for existing guarantees');
      console.log('   - Full current balance is available for withdrawal');
    } else {
      console.log('\n❌ TEST FAILED!');
      console.log('⚠️  Balance calculation still has issues');
      
      if (withdrawalInfo.restrictedByGuarantees > 0) {
        console.log('   - Still applying guarantee restrictions to already-deducted amounts');
      }
      
      if (withdrawalInfo.availableAmount !== accountBalance) {
        console.log('   - Available amount does not match current balance');
      }
    }

    // Show restrictions for debugging
    if (withdrawalInfo.restrictions.length > 0) {
      console.log('\n📋 Current Restrictions:');
      for (const restriction of withdrawalInfo.restrictions) {
        const icon = restriction.type === 'GUARANTEE' ? '🤝' : '🏦';
        console.log(`   ${icon} ${restriction.description}`);
        if (restriction.amount > 0) {
          console.log(`      Restricted Amount: ₵${restriction.amount.toLocaleString()}`);
        }
      }
    }

    return isCorrect;

  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

async function main() {
  try {
    const testPassed = await testBalanceCalculation();
    
    console.log('\n💡 EXPLANATION:');
    console.log('The fix ensures that when guarantor amounts are deducted during loan creation,');
    console.log('those amounts are not double-counted as restrictions on future withdrawals.');
    console.log('The current balance already reflects the deduction, so it should be fully available.');

    process.exit(testPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();