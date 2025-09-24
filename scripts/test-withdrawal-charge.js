// Test withdrawal charge implementation using built-in fetch

const BASE_URL = 'http://localhost:5000/api';

async function testWithdrawalCharge() {
    try {
        console.log('🧪 Testing Withdrawal Charge Implementation...\n');

        // Step 1: Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const { token } = await loginResponse.json();
        console.log('✅ Login successful\n');

        // Step 2: Get accounts
        console.log('2️⃣ Getting accounts...');
        const accountsResponse = await fetch(`${BASE_URL}/accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || accountsData;
        const savingsAccount = accounts.find(acc => 
            (acc.type === 'SAVINGS' || acc.type === 'savings') && 
            acc.status === 'ACTIVE' && 
            acc.balance > 50
        );

        if (!savingsAccount) {
            console.log('⚠️ No suitable savings account found (need active account with balance > 50).');
            return;
        }

        console.log(`✅ Found suitable account: ${savingsAccount.accountNumber}`);
        console.log(`   Current balance: $${savingsAccount.balance}\n`);

        // Step 3: Record initial balance
        const initialBalance = parseFloat(savingsAccount.balance);

        // Step 4: Make a withdrawal
        console.log('3️⃣ Making withdrawal transaction...');
        const withdrawalAmount = 20.00;
        
        const withdrawalData = {
            accountId: savingsAccount.id,
            type: 'WITHDRAWAL',
            amount: withdrawalAmount,
            description: 'Test withdrawal to check charge implementation'
        };

        const withdrawalResponse = await fetch(`${BASE_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(withdrawalData)
        });

        if (!withdrawalResponse.ok) {
            const errorText = await withdrawalResponse.text();
            throw new Error(`Withdrawal failed: ${withdrawalResponse.status} - ${errorText}`);
        }

        const withdrawalTransaction = await withdrawalResponse.json();
        console.log('✅ Withdrawal transaction created!');
        console.log(`   Transaction ID: ${withdrawalTransaction.id}`);
        console.log(`   Withdrawal amount: $${withdrawalTransaction.amount}`);
        console.log(`   New account balance: $${withdrawalTransaction.accountBalance}\n`);

        // Step 5: Check if 5 cedis charge was applied
        const finalBalance = withdrawalTransaction.accountBalance;
        const expectedBalance = initialBalance - withdrawalAmount - 5.00; // withdrawal + charge
        
        console.log('4️⃣ Verifying withdrawal charge...');
        console.log(`   Initial balance: $${initialBalance}`);
        console.log(`   Withdrawal amount: $${withdrawalAmount}`);
        console.log(`   Expected charge: $5.00`);
        console.log(`   Expected final balance: $${expectedBalance}`);
        console.log(`   Actual final balance: $${finalBalance}`);
        
        if (Math.abs(finalBalance - expectedBalance) < 0.01) {
            console.log('✅ Withdrawal charge correctly applied!\n');
        } else {
            console.log('❌ Withdrawal charge not correctly applied!\n');
        }

        // Step 6: Check bank income records
        console.log('5️⃣ Checking bank income records...');
        const incomeResponse = await fetch(`${BASE_URL}/bank-income/recent?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const withdrawalCharges = incomeData.records.filter(r => r.type === 'withdrawal_charge');
            
            console.log(`✅ Found ${withdrawalCharges.length} withdrawal charge records`);
            if (withdrawalCharges.length > 0) {
                const latestCharge = withdrawalCharges[0];
                console.log(`   Latest charge: $${latestCharge.amount} - ${latestCharge.description}`);
                console.log(`   Customer: ${latestCharge.customerName}`);
                console.log(`   Date: ${new Date(latestCharge.date).toLocaleString()}\n`);
            }
        } else {
            console.log('⚠️ Could not fetch bank income records\n');
        }

        // Step 7: Check bank income stats
        console.log('6️⃣ Checking bank income statistics...');
        const statsResponse = await fetch(`${BASE_URL}/bank-income/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Bank income statistics:');
            console.log(`   Total income: $${stats.totalIncome}`);
            console.log(`   Total records: ${stats.totalCount}`);
            
            if (stats.breakdown.withdrawal_charge) {
                console.log(`   Withdrawal charges: $${stats.breakdown.withdrawal_charge.amount} (${stats.breakdown.withdrawal_charge.count} charges)`);
            }
            
            if (stats.breakdown.loan_interest) {
                console.log(`   Loan interest: $${stats.breakdown.loan_interest.amount} (${stats.breakdown.loan_interest.count} records)`);
            }
        } else {
            console.log('⚠️ Could not fetch bank income statistics');
        }

        console.log('\n🎉 Withdrawal charge test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testWithdrawalCharge();
