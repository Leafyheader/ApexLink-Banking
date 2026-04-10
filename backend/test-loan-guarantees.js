/**
 * Test script for enhanced loan guarantee and withdrawal restrictions
 * 
 * This script demonstrates:
 * 1. Enhanced withdrawal restrictions for customers with loans
 * 2. Account notifications showing loan and guarantee information
 * 3. Withdrawal availability checks
 */

const API_BASE = 'http://localhost:5000/api';

// Test account and customer IDs (replace with actual IDs from your database)
const TEST_ACCOUNT_ID = 'test-account-id';
const TEST_CUSTOMER_ID = 'test-customer-id';
const TEST_WITHDRAWAL_AMOUNT = 1000;

// Mock authentication token (replace with actual token)
const AUTH_TOKEN = 'your-jwt-token-here';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

// Test 1: Get Account Notifications
async function testAccountNotifications() {
  console.log('\n=== Testing Account Notifications ===');
  
  try {
    const response = await fetch(`${API_BASE}/transactions/account/${TEST_ACCOUNT_ID}/notifications`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    console.log('Account Notifications Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Display notifications in user-friendly format
    if (data.notifications && data.notifications.length > 0) {
      console.log('\n📢 Account Notifications:');
      data.notifications.forEach(notification => {
        const icon = notification.type === 'WARNING' ? '⚠️' : 
                    notification.type === 'RESTRICTION' ? '🚫' : 'ℹ️';
        console.log(`${icon} ${notification.title}: ${notification.message}`);
        if (notification.amount) {
          console.log(`   Amount: ₵${notification.amount.toLocaleString()}`);
        }
      });
    }
    
    if (data.withdrawalInfo) {
      console.log('\n💰 Withdrawal Information:');
      console.log(`Account Balance: ₵${data.withdrawalInfo.accountBalance.toLocaleString()}`);
      console.log(`Available for Withdrawal: ₵${data.withdrawalInfo.availableAmount.toLocaleString()}`);
      console.log(`Total Restricted: ₵${data.withdrawalInfo.totalRestricted.toLocaleString()}`);
      
      if (data.withdrawalInfo.restrictionBreakdown.ownLoans > 0) {
        console.log(`  - Restricted by Own Loans: ₵${data.withdrawalInfo.restrictionBreakdown.ownLoans.toLocaleString()}`);
      }
      
      if (data.withdrawalInfo.restrictionBreakdown.guarantees > 0) {
        console.log(`  - Restricted by Guarantees: ₵${data.withdrawalInfo.restrictionBreakdown.guarantees.toLocaleString()}`);
      }
    }
    
  } catch (error) {
    console.error('Error testing account notifications:', error);
  }
}

// Test 2: Check Withdrawal Availability
async function testWithdrawalAvailability() {
  console.log('\n=== Testing Withdrawal Availability ===');
  
  try {
    const response = await fetch(`${API_BASE}/transactions/account/${TEST_ACCOUNT_ID}/withdrawal-check?amount=${TEST_WITHDRAWAL_AMOUNT}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    console.log('Withdrawal Check Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Display in user-friendly format
    console.log(`\n💳 Withdrawal Check for ₵${TEST_WITHDRAWAL_AMOUNT.toLocaleString()}:`);
    console.log(`Status: ${data.canWithdraw ? '✅ Approved' : '❌ Denied'}`);
    console.log(`Message: ${data.message}`);
    console.log(`Available Amount: ₵${data.availableAmount.toLocaleString()}`);
    
    if (!data.canWithdraw && data.restrictions.length > 0) {
      console.log('\n🚫 Restrictions:');
      data.restrictions.forEach(restriction => {
        console.log(`- ${restriction.description} (₵${restriction.amount.toLocaleString()})`);
      });
    }
    
  } catch (error) {
    console.error('Error testing withdrawal availability:', error);
  }
}

// Test 3: Get Customer Guarantee Information
async function testCustomerGuaranteeInfo() {
  console.log('\n=== Testing Customer Guarantee Information ===');
  
  try {
    const response = await fetch(`${API_BASE}/transactions/customer/${TEST_CUSTOMER_ID}/guarantees`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    console.log('Customer Guarantee Info Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Display in user-friendly format
    console.log(`\n👤 Customer Guarantee Summary:`);
    console.log(`Customer ID: ${data.customerId}`);
    console.log(`Accounts with Restrictions: ${data.accountsWithRestrictions}`);
    
    if (data.accounts && data.accounts.length > 0) {
      console.log('\n📊 Account Details:');
      data.accounts.forEach((account, index) => {
        console.log(`\nAccount ${index + 1}: ${account.accountId}`);
        console.log(`  Restricted Amount: ₵${account.restrictedAmount.toLocaleString()}`);
        console.log(`  Loans Guaranteed: ${account.totalLoansGuaranteed}`);
        console.log(`  Own Loans: ${account.ownLoans.length}`);
        
        if (account.ownLoans.length > 0) {
          console.log('  Own Loan Details:');
          account.ownLoans.forEach(loan => {
            console.log(`    - Loan ${loan.loanId}: ₵${loan.amount.toLocaleString()} (${loan.status})`);
            console.log(`      Outstanding: ₵${loan.outstandingBalance.toLocaleString()}`);
          });
        }
        
        if (account.activeGuarantees.length > 0) {
          console.log('  Active Guarantees:');
          account.activeGuarantees.forEach(guarantee => {
            console.log(`    - ${guarantee.borrowerName}: ₵${guarantee.guaranteeAmount.toLocaleString()} (${guarantee.guaranteePercentage}%)`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('Error testing customer guarantee info:', error);
  }
}

// Test 4: Attempt a Withdrawal Transaction
async function testWithdrawalTransaction() {
  console.log('\n=== Testing Withdrawal Transaction ===');
  
  try {
    const transactionData = {
      accountId: TEST_ACCOUNT_ID,
      type: 'WITHDRAWAL',
      amount: TEST_WITHDRAWAL_AMOUNT,
      description: 'Test withdrawal with loan restrictions'
    };
    
    const response = await fetch(`${API_BASE}/transactions/ledger`, {
      method: 'POST',
      headers,
      body: JSON.stringify(transactionData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Withdrawal Transaction Successful:');
      console.log(`Transaction ID: ${data.transaction.id}`);
      console.log(`Amount: ₵${data.transaction.amount.toLocaleString()}`);
      console.log(`New Balance: ₵${data.newBalance.toLocaleString()}`);
    } else {
      console.log('❌ Withdrawal Transaction Denied:');
      console.log(`Error: ${data.error}`);
      
      if (data.details) {
        console.log('\n📋 Restriction Details:');
        console.log(`Account Balance: ₵${data.details.accountBalance.toLocaleString()}`);
        console.log(`Available for Withdrawal: ₵${data.details.availableForWithdrawal.toLocaleString()}`);
        console.log(`Requested Amount: ₵${data.details.requestedAmount.toLocaleString()}`);
        
        if (data.details.restrictions && data.details.restrictions.length > 0) {
          console.log('\nRestrictions:');
          data.details.restrictions.forEach(restriction => {
            console.log(`- ${restriction.description} (₵${restriction.amount.toLocaleString()})`);
          });
        }
        
        console.log(`\n💡 ${data.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error testing withdrawal transaction:', error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Running Enhanced Loan Guarantee System Tests');
  console.log('================================================');
  
  console.log('\n⚠️  Note: Update TEST_ACCOUNT_ID, TEST_CUSTOMER_ID, and AUTH_TOKEN with real values');
  console.log('📝 These tests demonstrate the enhanced withdrawal restrictions and notifications');
  
  await testAccountNotifications();
  await testWithdrawalAvailability();
  await testCustomerGuaranteeInfo();
  await testWithdrawalTransaction();
  
  console.log('\n✅ All tests completed!');
  console.log('\n🎯 Key Features Demonstrated:');
  console.log('1. ✅ Enhanced withdrawal restrictions for customers with loans');
  console.log('2. ✅ Account notifications showing loan and guarantee obligations');
  console.log('3. ✅ Pre-withdrawal availability checks');
  console.log('4. ✅ Detailed error messages with restriction breakdowns');
  console.log('5. ✅ Customer guarantee information across all accounts');
}

// Export functions for individual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAccountNotifications,
    testWithdrawalAvailability,
    testCustomerGuaranteeInfo,
    testWithdrawalTransaction,
    runAllTests
  };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}