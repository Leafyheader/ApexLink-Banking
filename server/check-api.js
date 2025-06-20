/**
 * Check API response for Francisca Mensah's loan
 */

const https = require('http');

async function checkAPI() {
  console.log('🔍 Checking API response for Francisca Mensah...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/loans');
    const data = await response.json();
    
    const francisca = data.loans?.find(loan => 
      loan.customer?.name?.includes('Francisca')
    );
    
    if (francisca) {
      console.log('📋 FRANCISCA MENSAH FROM API:');
      console.log(`   Status: ${francisca.status}`);
      console.log(`   Outstanding Balance: ${francisca.outstandingBalance}`);
      console.log(`   Principal Remaining: ${francisca.principalRemaining}`);
      console.log(`   Total Paid: ${francisca.totalPaid}`);
      console.log(`   Total Interest Paid: ${francisca.totalInterestPaid}`);
      console.log(`   Guarantor Reimbursed: ${francisca.guarantorReimbursed}`);
      console.log(`   Is Completed: ${francisca.isCompleted}`);
      console.log(`   Amount Paid: ${francisca.amountPaid}`);
      console.log(`   Total Payable: ${francisca.totalPayable}`);
      
      console.log('\n🔍 WHAT FRONTEND WILL DISPLAY:');
      console.log(`   Status Badge: ${francisca.status}`);
      console.log(`   Outstanding Balance: ${francisca.outstandingBalance}`);
      
      if (francisca.status === 'PAID' && francisca.outstandingBalance > 0) {
        console.log('\n🚨 ISSUE: API is returning PAID loan with outstanding balance > 0');
      } else if (francisca.status === 'PAID' && francisca.outstandingBalance === 0) {
        console.log('\n✅ CORRECT: API shows PAID loan with 0 outstanding balance');
      }
    } else {
      console.log('❌ Francisca not found in API response');
      console.log('Available loans:', data.loans?.map(l => l.customer?.name));
    }
    
  } catch (error) {
    console.error('❌ Error checking API:', error);
  }
}

checkAPI();
