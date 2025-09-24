const BASE_URL = 'http://localhost:5000/api';

async function debugTransactionValidation() {
    try {
        console.log('🔍 Debugging Transaction Validation in Detail...\n');

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
        }        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || accountsData;
        
        console.log(`Found ${accounts.length} total accounts:`);
        accounts.forEach(acc => {
            console.log(`- ${acc.type}: ${acc.accountNumber} Status: ${acc.status} Active?: ${acc.status === 'ACTIVE'}`);
        });
        
        const loanAccount = accounts.find(acc => acc.type === 'LOAN' || acc.type === 'loan');
        
        if (!loanAccount) {
            console.log('⚠️ No loan accounts found.');
            return;
        }

        console.log(`✅ Found loan account: ${loanAccount.accountNumber}`);
        console.log(`   Account ID: ${loanAccount.id}`);
        console.log(`   Account Type: ${loanAccount.type}`);
        console.log(`   Balance: ${loanAccount.balance}`);
        console.log(`   Status: ${loanAccount.status}\n`);

        // Step 3: Test the exact transaction data
        console.log('3️⃣ Testing loan repayment transaction...');
        
        const transactionData = {
            type: 'LOAN_REPAYMENT',
            amount: 10,
            accountId: loanAccount.id,
            description: 'Debug test transaction'
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

        if (!transactionResponse.ok) {
            console.log('❌ Transaction failed as expected, checking error details...');
            try {
                const errorData = JSON.parse(responseText);
                console.log('Parsed error:', errorData);
            } catch (e) {
                console.log('Could not parse error response as JSON');
            }
        } else {
            console.log('✅ Transaction succeeded!');
            try {
                const transaction = JSON.parse(responseText);
                console.log('Transaction details:', transaction);
            } catch (e) {
                console.log('Could not parse success response as JSON');
            }
        }

        // Step 4: Test type conversion explicitly
        console.log('\n4️⃣ Testing type conversion logic...');
        const inputType = 'LOAN_REPAYMENT';
        const convertedType = inputType.toUpperCase().replace('-', '_');
        const allowedTypes = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'LOAN_REPAYMENT'];
        
        console.log(`Input type: "${inputType}"`);
        console.log(`Converted type: "${convertedType}"`);
        console.log(`Allowed types: ${JSON.stringify(allowedTypes)}`);
        console.log(`Is valid? ${allowedTypes.includes(convertedType)}`);

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Full error:', error);
    }
}

debugTransactionValidation().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
});
