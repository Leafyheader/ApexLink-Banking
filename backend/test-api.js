require('dotenv').config();
const axios = require('axios');

async function testBankIncomeAPI() {
  try {
    console.log('=== Testing Bank Income API Endpoints ===\n');
    
    const baseURL = 'http://localhost:5000/api';
    
    // Test the breakdown endpoint that BankIncome.tsx uses
    console.log('📊 Testing /bank-income/breakdown endpoint...');
    
    try {
      const response = await axios.get(`${baseURL}/bank-income/breakdown?period=month&page=1&limit=10`);
      
      console.log('✅ API Response successful!');
      console.log('📄 Response structure:');
      console.log('   Period:', response.data.period);
      console.log('   Date Range:', response.data.dateRange.from, 'to', response.data.dateRange.to);
      console.log('   Total Income:', `$${response.data.stats.totalIncome}`);
      console.log('   Total Count:', response.data.stats.totalCount);
      console.log('   Breakdown:');
      
      Object.entries(response.data.stats.breakdown).forEach(([type, data]) => {
        console.log(`     ${type}: ${data.count} records, $${data.amount}`);
      });
      
      console.log('   Recent Records:', response.data.recentRecords.length);
      console.log('   Pagination:', JSON.stringify(response.data.pagination, null, 2));
      
      // Show recent records
      if (response.data.recentRecords.length > 0) {
        console.log('\n💰 Recent Income Records:');
        response.data.recentRecords.forEach((record, index) => {
          console.log(`${index + 1}. ${record.type} - $${record.amount} from ${record.customerName} (${record.accountNumber})`);
        });
      }
      
    } catch (apiError) {
      console.error('❌ API Error:', apiError.response ? apiError.response.data : apiError.message);
      
      if (apiError.code === 'ECONNREFUSED') {
        console.log('\n🔧 Backend server might not be running. Please start it with: npm run dev');
      }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testBankIncomeAPI();
