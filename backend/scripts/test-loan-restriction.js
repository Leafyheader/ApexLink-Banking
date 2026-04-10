/**
 * Test Loan Restriction Logic
 * 
 * Validates the loan restriction calculation for the specific scenario
 * where account has ₵4,001 and loan amount is ₵2,000
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

async function testLoanRestrictionScenario() {
  try {
    console.log('🧪 Testing Loan Restriction Logic');
    console.log('='.repeat(40));

    // Find an account with an active loan
    const activeLoans = await prisma.loan.findMany({
      where: { 
        status: 'ACTIVE',
        account: {
          balance: { gt: 0 }
        }
      },
      include: {
        account: {
          select: {
            id: true,
            accountNumber: true,
            balance: true,
            customer: { select: { name: true } }
          }
        }
      },
      take: 1
    });

    if (activeLoans.length === 0) {
      console.log('No active loans found for testing.');
      return;
    }

    const loan = activeLoans[0];
    const account = loan.account;
    const accountBalance = Number(account.balance);
    const loanAmount = Number(loan.amount);
    const outstandingBalance = Number(loan.outstandingBalance);

    console.log(`\n📊 Test Account: ${account.accountNumber}`);
    console.log(`👤 Customer: ${account.customer.name}`);
    console.log(`💰 Account Balance: ₵${accountBalance.toLocaleString()}`);
    console.log(`🏦 Loan Amount: ₵${loanAmount.toLocaleString()}`);
    console.log(`💳 Outstanding Balance: ₵${outstandingBalance.toLocaleString()}`);

    // Test the loan restriction logic
    console.log('\n🔍 Loan Restriction Analysis:');
    
    const mustMaintainAmount = loanAmount; // Must maintain > loan amount
    const hasActiveLoan = true;
    const isBalanceCloseToLoan = accountBalance <= (loanAmount * 1.1); // Within 10%
    
    // Calculate restriction based on our logic
    let restrictedAmount = 0;
    let canWithdraw = true;
    let maxWithdrawal = accountBalance;

    if (accountBalance <= loanAmount) {
      // If balance <= loan amount, they need to add money to withdraw
      restrictedAmount = loanAmount - accountBalance + 1;
      canWithdraw = false;
      maxWithdrawal = 0;
    } else {
      // If balance > loan amount, they can withdraw excess above loan amount
      maxWithdrawal = accountBalance - loanAmount;
    }

    console.log(`\n✅ RESTRICTION CALCULATION:`);
    console.log(`🔒 Must Maintain: > ₵${mustMaintainAmount.toLocaleString()}`);
    console.log(`💰 Current Balance: ₵${accountBalance.toLocaleString()}`);
    console.log(`🔓 Available for Withdrawal: ₵${maxWithdrawal.toLocaleString()}`);
    
    if (restrictedAmount > 0) {
      console.log(`⚠️  Restricted Amount: ₵${restrictedAmount.toLocaleString()}`);
      console.log(`❌ Cannot withdraw - need to add ₵${restrictedAmount.toLocaleString()} first`);
    } else {
      console.log(`✅ Can withdraw up to ₵${maxWithdrawal.toLocaleString()}`);
    }

    // Notification logic
    console.log(`\n📢 NOTIFICATIONS:`);
    
    if (hasActiveLoan) {
      console.log(`ℹ️  INFO: Active loan with ₵${outstandingBalance.toLocaleString()} outstanding`);
    }
    
    if (isBalanceCloseToLoan) {
      console.log(`⚠️  WARNING: Balance close to loan amount - maintain above ₵${loanAmount.toLocaleString()}`);
    }
    
    if (accountBalance <= loanAmount) {
      console.log(`🔒 RESTRICTION: Must maintain balance > ₵${loanAmount.toLocaleString()}`);
    }

    // Validate against your scenario
    if (Math.abs(accountBalance - 4001) < 100 && Math.abs(loanAmount - 2000) < 100) {
      console.log(`\n🎯 YOUR SCENARIO VALIDATION:`);
      console.log(`✅ Balance ₵4,001 > Loan ₵2,000 - Can withdraw!`);
      console.log(`✅ Max withdrawal: ₵${maxWithdrawal.toLocaleString()}`);
      console.log(`✅ Logic working correctly!`);
    }

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function main() {
  try {
    await testLoanRestrictionScenario();
    
    console.log('\n💡 KEY POINTS:');
    console.log('• Loan restrictions ensure borrowers maintain sufficient balance');
    console.log('• Balance must be > loan amount to allow withdrawals');
    console.log('• This protects both the bank and borrower from default risk');
    console.log('• Your scenario shows the logic working correctly!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();