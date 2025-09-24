import { BankIncomeService } from '../src/services/bankIncome.service';

/**
 * Daily Loan Interest Calculator
 * This script should be run daily to calculate and record loan interest as bank income
 */
async function calculateDailyInterest() {
  try {
    console.log('🕐 Starting daily loan interest calculation...');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    
    const incomeRecords = await BankIncomeService.calculateDailyLoanInterest();
      const totalInterest = incomeRecords.reduce((sum: number, record: any) => sum + Number(record.amount), 0);
    
    console.log('✅ Daily loan interest calculation completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Records created: ${incomeRecords.length}`);
    console.log(`   - Total interest income: $${totalInterest.toFixed(2)}`);
    
    if (incomeRecords.length > 0) {
      console.log(`📝 Interest records created:`);
      incomeRecords.forEach((record: any, index: number) => {
        console.log(`   ${index + 1}. $${Number(record.amount).toFixed(2)} from loan ${record.sourceId}`);
      });
    } else {
      console.log('ℹ️  No active loans found or no interest to calculate');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error calculating daily loan interest:', error);
    process.exit(1);
  }
}

// Run the calculation
calculateDailyInterest();
