require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testNewWithdrawal() {
  try {
    console.log('=== Testing New Withdrawal to Verify Bank Income Recording ===\n');
    
    // Get test user and account
    const testUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'MANAGER'] } }
    });
    
    const testAccount = await prisma.account.findFirst({
      where: {
        balance: { gt: 100 } // Account with sufficient balance
      },
      include: {
        customer: true
      }
    });
    
    if (!testAccount) {
      console.log('❌ No account with sufficient balance found');
      return;
    }
    
    console.log(`✅ Using account: ${testAccount.accountNumber} (${testAccount.customer.name}) - Balance: $${testAccount.balance}`);
    
    const token = jwt.sign(
      { id: testUser.id, username: testUser.username, name: testUser.name, role: testUser.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '1h' }
    );
    
    const baseURL = 'http://localhost:5000/api';
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    // Step 1: Create withdrawal authorization request
    console.log('\n📝 Step 1: Creating withdrawal authorization request...');
    
    const withdrawalRequest = {
      accountId: testAccount.id,
      amount: 50,
      type: 'withdrawal',
      description: 'Test withdrawal for bank income verification',
      reference: `TEST-${Date.now()}`
    };
    
    const createResponse = await axios.post(`${baseURL}/withdrawal-authorizations`, withdrawalRequest, { headers });
    console.log(`✅ Withdrawal authorization created: ${createResponse.data.id}`);
    
    // Step 2: Approve the withdrawal
    console.log('\n✅ Step 2: Approving withdrawal authorization...');
    
    const approveResponse = await axios.post(`${baseURL}/withdrawal-authorizations/${createResponse.data.id}/approve`, {}, { headers });
    console.log(`✅ Withdrawal approved successfully`);
    
    // Step 3: Check if bank income was recorded
    console.log('\n💰 Step 3: Checking bank income records...');
    
    // Wait a moment for the income to be recorded
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const bankIncomeRecords = await prisma.bankIncome.findMany({
      where: {
        type: 'WITHDRAWAL_CHARGE',
        sourceId: createResponse.data.id
      },
      include: {
        account: {
          include: {
            customer: true
          }
        }
      }
    });
    
    if (bankIncomeRecords.length > 0) {
      console.log(`✅ Bank income recorded successfully!`);
      bankIncomeRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. $${record.amount} from ${record.account.customer.name} - ${record.description}`);
      });
    } else {
      console.log(`❌ No bank income record found for withdrawal authorization ${createResponse.data.id}`);
    }
    
    // Step 4: Check transaction records
    console.log('\n💳 Step 4: Checking transaction records...');
    
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: testAccount.id,
        reference: { contains: createResponse.data.reference || createResponse.data.id }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`Found ${transactions.length} related transactions:`);
    transactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type} - $${tx.amount} - ${tx.description} (${tx.status})`);
    });
    
    // Step 5: Test the API endpoint with the new data
    console.log('\n📊 Step 5: Testing API endpoint with new data...');
    
    const apiResponse = await axios.get(`${baseURL}/bank-income/breakdown?period=day&page=1&limit=10`, { headers });
    console.log(`   Today's Income: $${apiResponse.data.stats.totalIncome}`);
    console.log(`   Today's Count: ${apiResponse.data.stats.totalCount}`);
    
    if (apiResponse.data.recentRecords.length > 0) {
      console.log(`   Recent records:`);
      apiResponse.data.recentRecords.forEach((record, index) => {
        console.log(`     ${index + 1}. ${record.type} - $${record.amount} from ${record.customerName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testNewWithdrawal();
