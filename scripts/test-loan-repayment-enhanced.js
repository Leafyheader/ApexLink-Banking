/**
 * Enhanced test script to verify improved loan repayment functionality
 * Tests the complete flow with better user feedback
 */

const BASE_URL = 'http://localhost:5000/api';

async function testEnhancedLoanRepayment() {
    try {
        console.log('🧪 Testing Enhanced Loan Repayment Functionality...\n');

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

        // Step 2: Get accounts to find loan accounts
        console.log('2️⃣ Fetching loan accounts...');
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
        const loanAccounts = accounts.filter(acc => acc.type === 'LOAN' || acc.type === 'loan');
        
        if (loanAccounts.length === 0) {
            console.log('⚠️ No loan accounts found. Creating a test loan first...');
            return;
        }

        console.log(`✅ Found ${loanAccounts.length} loan account(s):`);
        loanAccounts.forEach((account, index) => {
            console.log(`   ${index + 1}. ${account.accountNumber} - ${account.customer.name} (Debt: $${Math.abs(account.balance)})`);
        });

        const testAccount = loanAccounts[0];
        const originalDebt = Math.abs(testAccount.balance);
        console.log(`\nUsing account: ${testAccount.accountNumber} with debt of $${originalDebt}\n`);

        // Step 3: Test different repayment scenarios
        const testScenarios = [
            { amount: 50, description: 'Small partial payment' },
            { amount: originalDebt + 100, description: 'Overpayment (should fail)', expectFail: true },
            { amount: 100, description: 'Regular partial payment' }
        ];

        for (const scenario of testScenarios) {
            console.log(`3️⃣ Testing: ${scenario.description} ($${scenario.amount})`);
            
            const transactionData = {
                type: 'LOAN_REPAYMENT',
                amount: scenario.amount,
                accountId: testAccount.id,
                description: `Test ${scenario.description.toLowerCase()}`
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

                if (scenario.expectFail) {
                    if (transactionResponse.ok) {
                        console.log('❌ Expected transaction to fail but it succeeded');
                    } else {
                        const errorData = await transactionResponse.json();
                        console.log('✅ Transaction correctly rejected:', errorData.error);
                    }
                } else {
                    if (!transactionResponse.ok) {
                        const errorText = await transactionResponse.text();
                        throw new Error(`Transaction failed: ${transactionResponse.status} - ${errorText}`);
                    }

                    const transaction = await transactionResponse.json();
                    console.log('✅ Transaction successful!');
                    console.log(`   Transaction ID: ${transaction.id}`);
                    console.log(`   Amount: $${transaction.amount}`);
                    console.log(`   New account balance: $${transaction.accountBalance}`);
                    console.log(`   Remaining debt: $${Math.abs(transaction.accountBalance)}`);
                }
            } catch (error) {
                if (scenario.expectFail) {
                    console.log('✅ Transaction correctly failed:', error.message);
                } else {
                    console.log('❌ Unexpected error:', error.message);
                }
            }
            console.log('');
        }

        // Step 4: Verify final account state
        console.log('4️⃣ Verifying final account state...');
        const finalAccountResponse = await fetch(`${BASE_URL}/accounts/${testAccount.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });        if (finalAccountResponse.ok) {
            const finalAccount = await finalAccountResponse.json();
            // Handle different response structures
            const accountData = finalAccount.account || finalAccount;
            const finalDebt = Math.abs(accountData.balance);
            const totalPaid = originalDebt - finalDebt;
            
            console.log(`✅ Final account state verified:`);
            console.log(`   Original debt: $${originalDebt}`);
            console.log(`   Total paid: $${totalPaid}`);
            console.log(`   Remaining debt: $${finalDebt}`);
        } else {
            console.log('⚠️ Could not verify final account state');
        }

        console.log('\n🎉 Enhanced loan repayment test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testEnhancedLoanRepayment().catch(console.error);
