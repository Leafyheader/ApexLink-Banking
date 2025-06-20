const BASE_URL = 'http://localhost:5000/api';

async function testWorkingTransaction() {
    try {
        console.log('🔍 Testing with a known working transaction type...\n');

        // Step 1: Login first
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful\n');

        // Step 2: Get a savings account for testing
        console.log('2️⃣ Getting savings account...');
        const accountsResponse = await fetch(`${BASE_URL}/accounts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || accountsData;
        const savingsAccount = accounts.find(acc => acc.type === 'savings' || acc.type === 'SAVINGS');
        
        if (!savingsAccount) {
            console.log('⚠️ No savings accounts found.');
            return;
        }

        console.log(`✅ Found savings account: ${savingsAccount.accountNumber}`);
        console.log(`   Status: ${savingsAccount.status}\n`);

        // Step 3: Test DEPOSIT transaction (should work)
        console.log('3️⃣ Testing DEPOSIT transaction...');
        
        const transactionData = {
            type: 'DEPOSIT',
            amount: 10,
            accountId: savingsAccount.id,
            description: 'Test deposit to verify debug logs'
        };

        console.log('📤 Sending transaction data:');
        console.log(JSON.stringify(transactionData, null, 2));
        console.log('');

        const transactionResponse = await fetch(`${BASE_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transactionData)
        });

        console.log(`📥 Response status: ${transactionResponse.status}`);
        
        const responseText = await transactionResponse.text();
        console.log(`📥 Response body: ${responseText}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testWorkingTransaction().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
});
