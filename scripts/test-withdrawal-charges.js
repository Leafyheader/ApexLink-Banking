/**
 * Test script to verify withdrawal charges and bank income implementation
 */

const BASE_URL = 'http://localhost:5000/api';

async function testWithdrawalCharges() {
    try {
        console.log('🧪 Testing Withdrawal Charges and Bank Income Implementation...\n');

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

        // Step 2: Get accounts for testing
        console.log('2️⃣ Getting accounts...');
        const accountsResponse = await fetch(`${BASE_URL}/accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || accountsData;
        const testAccount = accounts.find(acc => acc.type === 'SAVINGS' && Number(acc.balance) > 20);

        if (!testAccount) {
            console.log('⚠️  No suitable savings account found (need balance > 20)');
            return;
        }

        console.log(`✅ Found test account: ${testAccount.accountNumber} with balance: $${testAccount.balance}\n`);

        // Step 3: Check initial bank income
        console.log('3️⃣ Checking initial bank income...');
        const initialIncomeResponse = await fetch(`${BASE_URL}/bank-income/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let initialIncome = 0;
        if (initialIncomeResponse.ok) {
            const initialIncomeData = await initialIncomeResponse.json();
            initialIncome = initialIncomeData.totalIncome || 0;
            console.log(`💰 Initial total bank income: $${initialIncome}`);
        }

        // Step 4: Perform a withdrawal (should trigger 5 cedis charge)
        console.log('\n4️⃣ Performing withdrawal (should trigger 5 cedis charge)...');
        const withdrawalAmount = 10.00;
        
        const withdrawalData = {
            type: 'WITHDRAWAL',
            amount: withdrawalAmount,
            accountId: testAccount.id,
            description: 'Test withdrawal with charge'
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

        const withdrawalResult = await withdrawalResponse.json();
        console.log(`✅ Withdrawal successful!`);
        console.log(`   Transaction ID: ${withdrawalResult.id}`);
        console.log(`   Withdrawal amount: $${withdrawalResult.amount}`);
        console.log(`   New account balance: $${withdrawalResult.accountBalance}`);

        // Step 5: Check if charge was applied
        console.log('\n5️⃣ Checking if withdrawal charge was applied...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second for processing

        const updatedAccountResponse = await fetch(`${BASE_URL}/accounts/${testAccount.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (updatedAccountResponse.ok) {
            const updatedAccount = await updatedAccountResponse.json();
            const actualBalance = Number(updatedAccount.balance);
            const expectedBalance = Number(testAccount.balance) - withdrawalAmount - 5.00; // 5 cedis charge
            
            console.log(`💳 Account balance check:`);
            console.log(`   Previous balance: $${testAccount.balance}`);
            console.log(`   Withdrawal amount: $${withdrawalAmount}`);
            console.log(`   Expected charge: $5.00`);
            console.log(`   Expected new balance: $${expectedBalance.toFixed(2)}`);
            console.log(`   Actual new balance: $${actualBalance.toFixed(2)}`);
            
            if (Math.abs(actualBalance - expectedBalance) < 0.01) {
                console.log('✅ Withdrawal charge correctly applied!');
            } else {
                console.log('❌ Withdrawal charge might not be applied correctly');
            }
        }

        // Step 6: Check bank income records
        console.log('\n6️⃣ Checking bank income records...');
        const incomeResponse = await fetch(`${BASE_URL}/bank-income/recent?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const recentRecords = incomeData.records || [];
            
            console.log(`📊 Recent bank income records (${recentRecords.length}):`);
            recentRecords.forEach((record, index) => {
                console.log(`   ${index + 1}. ${record.type} - $${record.amount} (${record.description})`);
            });

            // Look for withdrawal charge
            const withdrawalCharge = recentRecords.find(r => 
                r.type === 'withdrawal_charge' && 
                r.accountNumber === testAccount.accountNumber
            );

            if (withdrawalCharge) {
                console.log('✅ Withdrawal charge recorded as bank income!');
                console.log(`   Amount: $${withdrawalCharge.amount}`);
                console.log(`   Customer: ${withdrawalCharge.customerName}`);
            } else {
                console.log('❌ Withdrawal charge not found in bank income records');
            }
        }

        // Step 7: Check updated total bank income
        console.log('\n7️⃣ Checking updated bank income stats...');
        const finalIncomeResponse = await fetch(`${BASE_URL}/bank-income/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (finalIncomeResponse.ok) {
            const finalIncomeData = await finalIncomeResponse.json();
            const finalIncome = finalIncomeData.totalIncome || 0;
            const incomeIncrease = finalIncome - initialIncome;
            
            console.log(`💰 Bank income summary:`);
            console.log(`   Initial income: $${initialIncome.toFixed(2)}`);
            console.log(`   Final income: $${finalIncome.toFixed(2)}`);
            console.log(`   Increase: $${incomeIncrease.toFixed(2)}`);
            
            if (incomeIncrease >= 5.00) {
                console.log('✅ Bank income increased as expected!');
            } else {
                console.log('❌ Bank income increase is less than expected');
            }

            // Show breakdown
            if (finalIncomeData.breakdown) {
                console.log(`\n📈 Income breakdown:`);
                Object.entries(finalIncomeData.breakdown).forEach(([type, data]) => {
                    console.log(`   ${type}: $${data.amount} (${data.count} transactions)`);
                });
            }
        }

        console.log('\n🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testWithdrawalCharges();
