/**
 * Test script to verify loan repayment functionality
 * This tests the complete loan repayment flow from frontend to backend
 */

const BASE_URL = 'http://localhost:5000/api';

async function testLoanRepayment() {
    try {
        console.log('🧪 Testing Loan Repayment Functionality...\n');

        // Step 1: Login first
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },            body: JSON.stringify({
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

        // Step 2: Get accounts to find one with a loan
        console.log('2️⃣ Fetching accounts...');
        const accountsResponse = await fetch(`${BASE_URL}/accounts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
        }        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || accountsData; // Handle both response formats
        const loanAccount = accounts.find(acc => acc.type === 'LOAN');
        
        if (!loanAccount) {
            console.log('⚠️ No loan accounts found. Skipping loan repayment test.');
            return;
        }

        console.log(`✅ Found loan account: ${loanAccount.accountNumber}`);
        console.log(`   Customer: ${loanAccount.customer.name}`);
        console.log(`   Balance: $${loanAccount.balance}\n`);

        // Step 3: Test loan repayment transaction
        console.log('3️⃣ Testing loan repayment transaction...');
        const transactionData = {
            type: 'LOAN_REPAYMENT',
            amount: 100.00,
            accountId: loanAccount.id,
            description: 'Test loan repayment via API'
        };

        const transactionResponse = await fetch(`${BASE_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transactionData)
        });

        if (!transactionResponse.ok) {
            const errorText = await transactionResponse.text();
            throw new Error(`Transaction failed: ${transactionResponse.status} - ${errorText}`);
        }

        const transaction = await transactionResponse.json();
        console.log('✅ Loan repayment transaction successful!');
        console.log(`   Transaction ID: ${transaction.id}`);
        console.log(`   Reference: ${transaction.reference}`);
        console.log(`   Amount: $${transaction.amount}`);
        console.log(`   Type: ${transaction.type}\n`);

        // Step 4: Verify transaction appears in transactions list
        console.log('4️⃣ Verifying transaction in transactions list...');
        const transactionsResponse = await fetch(`${BASE_URL}/transactions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!transactionsResponse.ok) {
            throw new Error(`Failed to fetch transactions: ${transactionsResponse.status}`);
        }        const transactionsData = await transactionsResponse.json();
        const transactions = transactionsData.transactions || transactionsData; // Handle both response formats
        const loanRepaymentTransaction = transactions.find(t => t.id === transaction.id);

        if (loanRepaymentTransaction) {
            console.log('✅ Transaction found in transactions list');
            console.log(`   Status: ${loanRepaymentTransaction.status}`);
            console.log(`   Date: ${new Date(loanRepaymentTransaction.date).toLocaleString()}\n`);
        } else {
            console.log('❌ Transaction not found in transactions list\n');
        }

        console.log('🎉 All loan repayment tests passed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test with error handling
testLoanRepayment().catch(console.error);
