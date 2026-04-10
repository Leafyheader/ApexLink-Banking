/**
 * Balance Calculation Before vs After Fix Demo
 * 
 * This script demonstrates the difference between the old (incorrect) 
 * and new (correct) balance calculation logic for guarantor accounts.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

async function demonstrateBalanceCalculationFix() {
  try {
    console.log('🔍 Balance Calculation Fix Demonstration');
    console.log('='.repeat(50));

    // Get test account data
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
            status: true
          }
        }
      }
    });

    if (!guarantorRecord) {
      console.log('No active guarantor found for demonstration.');
      return;
    }

    const account = guarantorRecord.guarantorAccount;
    const guaranteedAmount = Number(guarantorRecord.guaranteedAmount);
    const currentBalance = Number(account.balance);

    console.log(`\n📊 Test Account: ${account.accountNumber}`);
    console.log(`👤 Customer: ${account.customer.name}`);
    console.log(`💰 Current Balance: ₵${currentBalance.toLocaleString()}`);
    console.log(`🤝 Guaranteed Amount: ₵${guaranteedAmount.toLocaleString()}`);

    // Simulate OLD (incorrect) calculation
    console.log('\n❌ OLD CALCULATION (INCORRECT - Double Counting):');
    console.log('─'.repeat(40));
    
    const oldRestrictedAmount = guaranteedAmount; // Incorrectly treating deducted amount as restriction
    const oldAvailableAmount = Math.max(0, currentBalance - oldRestrictedAmount);
    
    console.log(`💳 Account Balance: ₵${currentBalance.toLocaleString()}`);
    console.log(`🔒 Restricted by Guarantees: ₵${oldRestrictedAmount.toLocaleString()} (WRONG!)`);
    console.log(`🔓 Available for Withdrawal: ₵${oldAvailableAmount.toLocaleString()}`);
    console.log('\n❌ PROBLEM: This double-counts the guarantor deduction!');
    console.log('   The guarantor amount was already deducted when the loan was created,');
    console.log('   but we\'re restricting it again for withdrawals.');

    // Show NEW (correct) calculation
    console.log('\n✅ NEW CALCULATION (CORRECT - No Double Counting):');
    console.log('─'.repeat(40));
    
    const newRestrictedAmount = 0; // No additional restrictions for already-deducted amounts
    const newAvailableAmount = currentBalance; // Full current balance is available
    
    console.log(`💳 Account Balance: ₵${currentBalance.toLocaleString()}`);
    console.log(`🔒 Restricted by Guarantees: ₵${newRestrictedAmount.toLocaleString()} (CORRECT!)`);
    console.log(`🔓 Available for Withdrawal: ₵${newAvailableAmount.toLocaleString()}`);
    console.log('\n✅ SOLUTION: No additional restrictions on already-deducted amounts!');
    console.log('   The current balance already reflects the guarantor deduction,');
    console.log('   so the full balance is available for withdrawal.');

    // Show the difference
    const improvementAmount = newAvailableAmount - oldAvailableAmount;
    
    console.log('\n📈 IMPROVEMENT:');
    console.log('─'.repeat(30));
    console.log(`💰 Additional Available Funds: ₵${improvementAmount.toLocaleString()}`);
    console.log(`📊 Percentage Increase: ${((improvementAmount / oldAvailableAmount) * 100).toFixed(1)}%`);

    // Timeline explanation
    console.log('\n📅 TRANSACTION TIMELINE:');
    console.log('─'.repeat(30));
    console.log('1. 📅 Loan Creation:');
    console.log(`   • Guarantor had: ₵${(currentBalance + guaranteedAmount).toLocaleString()}`);
    console.log(`   • Deducted: ₵${guaranteedAmount.toLocaleString()} for guarantee`);
    console.log(`   • Remaining: ₵${currentBalance.toLocaleString()} (current balance)`);
    console.log('\n2. 💳 Withdrawal Request (Before Fix):');
    console.log(`   • Available: ₵${oldAvailableAmount.toLocaleString()} (incorrectly restricted)`);
    console.log('\n3. 💳 Withdrawal Request (After Fix):');
    console.log(`   • Available: ₵${newAvailableAmount.toLocaleString()} (correctly calculated)`);

    console.log('\n🎯 KEY INSIGHT:');
    console.log('The fix recognizes that guarantor amounts are PHYSICAL deductions, not restrictions.');
    console.log('Once the money is deducted, it\'s gone from the account - no need to restrict it again!');

    return true;

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    return false;
  }
}

async function main() {
  try {
    await demonstrateBalanceCalculationFix();
    
    console.log('\n🏆 CONCLUSION:');
    console.log('The guarantor balance calculation fix eliminates double-counting and');
    console.log('provides customers with accurate, fair access to their available funds.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();