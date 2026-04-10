const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testDepositBalance() {
  console.log('🧪 Testing Deposit Balance Update...\n');

  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Get accounts
    console.log('\n2. Getting accounts...');
    const accountsResponse = await axios.get(`${API_BASE}/accounts`, { headers });
    const accounts = accountsResponse.data.accounts || accountsResponse.data;
    
    if (!accounts || accounts.length === 0) {
      console.log('❌ No accounts found');
      return;
    }

    const testAccount = accounts.find(acc => acc.status === 'ACTIVE') || accounts[0];
    console.log(`✅ Using account: ${testAccount.accountNumber}`);
    console.log(`   Current balance: ${testAccount.balance}`);
    console.log(`   Current share balance: ${testAccount.shareBalance || 0}`);

    // 3. Test regular deposit using ledger endpoint
    console.log('\n3. Testing regular deposit...');
    const depositAmount = 100;
    
    const depositData = {
      accountId: testAccount.id,
      type: 'deposit',
      amount: depositAmount,
      description: 'Test deposit for balance verification'
    };

    const depositResponse = await axios.post(`${API_BASE}/transactions/ledger`, depositData, { headers });
    console.log('✅ Deposit transaction created:', {
      id: depositResponse.data.transaction.id,
      amount: depositResponse.data.transaction.amount,
      type: depositResponse.data.transaction.type
    });

    // 4. Check updated account balance
    console.log('\n4. Checking updated balance...');
    const updatedAccountResponse = await axios.get(`${API_BASE}/accounts/${testAccount.id}`, { headers });
    const updatedAccount = updatedAccountResponse.data;
    
    console.log('✅ Account balance after deposit:');
    console.log(`   Previous balance: ${testAccount.balance}`);
    console.log(`   New balance: ${updatedAccount.balance}`);
    console.log(`   Expected: ${Number(testAccount.balance) + depositAmount}`);
    console.log(`   Balance increase: ${Number(updatedAccount.balance) - Number(testAccount.balance)}`);

    if (Number(updatedAccount.balance) === Number(testAccount.balance) + depositAmount) {
      console.log('🎉 SUCCESS: Balance updated correctly!');
    } else {
      console.log('❌ ISSUE: Balance not updated as expected');
    }

    // 5. Test share deposit
    console.log('\n5. Testing share deposit...');
    const shareAmount = 50;
    
    const shareData = {
      accountId: testAccount.id,
      type: 'deposit-shares',
      amount: shareAmount,
      description: 'Test share deposit for balance verification'
    };

    const shareResponse = await axios.post(`${API_BASE}/transactions/ledger`, shareData, { headers });
    console.log('✅ Share deposit transaction created:', {
      id: shareResponse.data.transaction.id,
      amount: shareResponse.data.transaction.amount,
      type: shareResponse.data.transaction.type
    });

    // 6. Check updated share balance
    console.log('\n6. Checking updated share balance...');
    const finalAccountResponse = await axios.get(`${API_BASE}/accounts/${testAccount.id}`, { headers });
    const finalAccount = finalAccountResponse.data;
    
    console.log('✅ Account share balance after deposit:');
    console.log(`   Previous share balance: ${updatedAccount.shareBalance || 0}`);
    console.log(`   New share balance: ${finalAccount.shareBalance || 0}`);
    console.log(`   Expected: ${Number(updatedAccount.shareBalance || 0) + shareAmount}`);

    if (Number(finalAccount.shareBalance || 0) === Number(updatedAccount.shareBalance || 0) + shareAmount) {
      console.log('🎉 SUCCESS: Share balance updated correctly!');
    } else {
      console.log('❌ ISSUE: Share balance not updated as expected');
    }

    console.log('\n📊 Final Summary:');
    console.log(`   Regular balance: ${testAccount.balance} → ${finalAccount.balance}`);
    console.log(`   Share balance: ${testAccount.shareBalance || 0} → ${finalAccount.shareBalance || 0}`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`   Status: ${error.response.status}`);
    }
  }
}

// Run the test
testDepositBalance();