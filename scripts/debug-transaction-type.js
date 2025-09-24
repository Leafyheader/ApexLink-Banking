/**
 * Debug script to test what the backend is actually receiving for transaction type
 */

const BASE_URL = 'http://localhost:5000/api';

async function debugTransactionType() {
    try {
        console.log('🔍 Debugging Transaction Type Processing...\n');

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

        // Step 2: Get a loan account
        console.log('2️⃣ Getting loan account...');
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
        const loanAccount = accounts.find(acc => acc.type === 'LOAN');
        
        if (!loanAccount) {
            console.log('⚠️ No loan accounts found.');
            return;
        }

        console.log(`✅ Found loan account: ${loanAccount.accountNumber}`);

        // Step 3: Test different type formats
        const typeFormats = [
            'loan-repayment',
            'LOAN_REPAYMENT', 
            'LOAN-REPAYMENT',
            'loan_repayment'
        ];

        for (const typeFormat of typeFormats) {
            console.log(`\n3️⃣ Testing type: "${typeFormat}"`);
            
            const transactionData = {
                type: typeFormat,
                amount: 10,
                accountId: loanAccount.id,
                description: `Test transaction with type: ${typeFormat}`
            };

            try {
                const transactionResponse = await fetch(`${BASE_URL}/transactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(transactionData)
                });

                if (transactionResponse.ok) {
                    const transaction = await transactionResponse.json();
                    console.log(`✅ SUCCESS: Type "${typeFormat}" worked!`);
                    console.log(`   Transaction ID: ${transaction.id}`);
                    console.log(`   Processed type: ${transaction.type}`);
                } else {
                    const errorData = await transactionResponse.json();
                    console.log(`❌ FAILED: Type "${typeFormat}" failed: ${errorData.error}`);
                }
            } catch (error) {
                console.log(`❌ ERROR: Type "${typeFormat}" threw error: ${error.message}`);
            }
        }

        console.log('\n🔍 Debug test completed!');

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
    }
}

// Run the debug test
debugTransactionType().catch(console.error);
