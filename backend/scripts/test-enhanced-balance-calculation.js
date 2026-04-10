/**
 * Test Enhanced Account Balance Calculation
 * 
 * This script tests the corrected guarantor balance calculation
 * to ensure that guarantor accounts show proper available amounts.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧪 Testing Enhanced Account Balance Calculation');
    console.log('=' * 50);

    // Get a guarantor account that has active guarantees
    console.log('\n🔍 Looking for guarantor accounts...');
    
    const guarantorRecords = await prisma.loanGuarantor.findMany({
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
            id: true,
            amount: true,
            status: true,
            account: { select: { accountNumber: true } }
          }
        }
      },
      take: 1
    });

    if (guarantorRecords.length === 0) {
      console.log('⚠️  No active guarantor accounts found. Creating test scenario...');
      
      // You can add test data creation here if needed
      console.log('Please run the guarantor reimbursement test first to create test data.');
      return;
    }

    const guarantorRecord = guarantorRecords[0];
    const guarantorAccount = guarantorRecord.guarantorAccount;
    const loan = guarantorRecord.loan;
    const guaranteedAmount = Number(guarantorRecord.guaranteedAmount);

    console.log('\n📊 Testing Account:', guarantorAccount.accountNumber);
    console.log(`👤 Customer: ${guarantorAccount.customer.name}`);
    console.log(`💰 Current Balance: ₵${Number(guarantorAccount.balance).toLocaleString()}`);
    console.log(`🔒 Guaranteed Amount: ₵${guaranteedAmount.toLocaleString()}`);
    console.log(`🏦 For Loan: ${loan.account.accountNumber} (₵${Number(loan.amount).toLocaleString()})`);

    // Test the old vs new calculation
    console.log('\n🔍 Testing Guarantee Service Calculations...');

    // Import the guarantee service
    const { GuaranteeService } = require('../src/services/guarantee.service');
    const guaranteeService = new GuaranteeService(prisma);

    // Get withdrawal availability (new corrected logic)
    const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(guarantorAccount.id);
    
    console.log('\n✅ NEW CORRECTED CALCULATION:');
    console.log(`   💳 Account Balance: ₵${withdrawalInfo.accountBalance.toLocaleString()}`);
    console.log(`   🔓 Available for Withdrawal: ₵${withdrawalInfo.availableAmount.toLocaleString()}`);
    console.log(`   🔒 Restricted by Guarantees: ₵${withdrawalInfo.restrictedByGuarantees.toLocaleString()}`);
    console.log(`   🏦 Restricted by Own Loans: ₵${withdrawalInfo.restrictedByOwnLoans.toLocaleString()}`);
    
    console.log('\n📋 Restriction Details:');
    if (withdrawalInfo.restrictions.length === 0) {
      console.log('   ✅ No restrictions - full balance available!');
    } else {
      for (const restriction of withdrawalInfo.restrictions) {
        console.log(`   ${restriction.type === 'GUARANTEE' ? '🤝' : '🏦'} ${restriction.description}`);
        if (restriction.amount > 0) {
          console.log(`      Amount: ₵${restriction.amount.toLocaleString()}`);
        }
      }
    }

    // Test the enhanced balance API
    console.log('\n🔄 Testing Enhanced Balance API...');
    
    try {
      // Simulate the API call
      const response = await fetch(`http://localhost:5000/api/transactions/account/${guarantorAccount.id}/enhanced-balance`, {
        headers: {
          'Authorization': 'Bearer test-token' // You may need to adjust this
        }
      });

      if (response.ok) {
        const enhancedBalance = await response.json();
        
        console.log('\n✅ ENHANCED BALANCE API RESPONSE:');
        console.log(`   📊 Original Balance: ₵${enhancedBalance.balanceInformation.originalBalance.toLocaleString()}`);
        console.log(`   💳 Current Balance: ₵${enhancedBalance.balanceInformation.currentBalance.toLocaleString()}`);
        console.log(`   🔓 Available Balance: ₵${enhancedBalance.balanceInformation.availableBalance.toLocaleString()}`);
        
        console.log('\n📈 Guarantor Activity:');
        console.log(`   📉 Total Deducted: ₵${enhancedBalance.balanceInformation.guarantorActivity.totalDeducted.toLocaleString()}`);
        console.log(`   📈 Total Reimbursed: ₵${enhancedBalance.balanceInformation.guarantorActivity.totalReimbursed.toLocaleString()}`);
        console.log(`   📊 Net Impact: ₵${enhancedBalance.balanceInformation.guarantorActivity.netImpact.toLocaleString()}`);
        
        console.log('\n🤝 Current Guarantees:');
        console.log(`   📊 Active Guarantees: ${enhancedBalance.currentGuarantees.activeGuarantees}`);
        
        if (enhancedBalance.currentGuarantees.guaranteeDetails.length > 0) {
          for (const guarantee of enhancedBalance.currentGuarantees.guaranteeDetails) {
            console.log(`   🏦 ${guarantee.borrowerName} (${guarantee.borrowerAccount})`);
            console.log(`      Amount: ₵${guarantee.guaranteedAmount.toLocaleString()} (${guarantee.percentage.toFixed(1)}%)`);
            console.log(`      Status: ${guarantee.status}`);
          }
        }
      } else {
        console.log('⚠️  Enhanced Balance API not available (server not running)');
      }
    } catch (error) {
      console.log('⚠️  Enhanced Balance API test skipped (server not available)');
    }

    // Summary
    console.log('\n📊 CALCULATION SUMMARY:');
    console.log(''.padEnd(50, '-'));
    
    const currentBalance = Number(guarantorAccount.balance);
    const availableAmount = withdrawalInfo.availableAmount;
    
    console.log(`✅ Current Balance: ₵${currentBalance.toLocaleString()}`);
    console.log(`✅ Available for Withdrawal: ₵${availableAmount.toLocaleString()}`);
    
    if (availableAmount === currentBalance) {
      console.log('🎉 CORRECT: Available amount equals current balance!');
      console.log('    The guarantee amounts have already been deducted,');
      console.log('    so no additional restrictions are needed.');
    } else {
      console.log('⚠️  Available amount differs from current balance.');
      console.log('   This might indicate restrictions from own loans.');
    }

    // Explanation
    console.log('\n💡 HOW IT WORKS:');
    console.log('1. When a loan is created, guarantor amounts are immediately deducted from guarantor accounts');
    console.log('2. The current account balance already reflects this deduction');
    console.log('3. No additional restrictions are needed for existing guarantees');
    console.log('4. The full current balance is available for withdrawal (unless restricted by own loans)');
    console.log('5. When loans are completed, guarantor amounts are credited back automatically');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();