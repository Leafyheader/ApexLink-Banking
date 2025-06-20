/**
 * Test script to verify the amount paid calculation fix
 */

const BASE_URL = 'http://localhost:5000/api';

async function testAmountPaidFix() {
    try {
        console.log('🧪 Testing Amount Paid Calculation Fix...\n');

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

        // Step 2: Get loans to check amount paid
        console.log('2️⃣ Fetching loans to check amount paid...');
        const loansResponse = await fetch(`${BASE_URL}/loans?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!loansResponse.ok) {
            throw new Error(`Failed to fetch loans: ${loansResponse.status}`);
        }

        const loansData = await loansResponse.json();
        console.log(`✅ Found ${loansData.loans.length} loans:\n`);
        
        // Display loan information with amount paid
        loansData.loans.forEach((loan, index) => {
            console.log(`📋 Loan ${index + 1}:`);
            console.log(`   Account: ${loan.account.accountNumber}`);
            console.log(`   Customer: ${loan.customer.name}`);
            console.log(`   Original Amount: $${loan.amount}`);
            console.log(`   Total Payable: $${loan.totalPayable}`);
            console.log(`   Amount Paid: $${loan.amountPaid}`);
            console.log(`   Outstanding Balance: $${loan.outstandingBalance}`);
            console.log(`   Account Balance: $${loan.account.balance}`);
            console.log('');
        });

        // Step 3: Test a specific loan details
        if (loansData.loans.length > 0) {
            const testLoan = loansData.loans[0];
            console.log('3️⃣ Testing individual loan details...');
            
            const loanDetailResponse = await fetch(`${BASE_URL}/loans/${testLoan.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (loanDetailResponse.ok) {
                const loanDetail = await loanDetailResponse.json();
                console.log('✅ Individual loan details:');
                console.log(`   Account: ${loanDetail.loan.account.accountNumber}`);
                console.log(`   Amount Paid: $${loanDetail.loan.amountPaid}`);
                console.log(`   Outstanding Balance: $${loanDetail.loan.outstandingBalance}`);
                console.log(`   Account Balance: $${loanDetail.loan.account.balance}\n`);
            }
        }

        // Step 4: Check if there are any loan accounts with repayments
        console.log('4️⃣ Looking for loan accounts with repayment history...');
        const accountsResponse = await fetch(`${BASE_URL}/accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            const accounts = accountsData.accounts || accountsData;
            const loanAccounts = accounts.filter(acc => acc.type === 'LOAN');
            
            if (loanAccounts.length > 0) {
                console.log(`✅ Found ${loanAccounts.length} loan account(s):`);
                
                for (const account of loanAccounts) {
                    console.log(`\n📋 Loan Account: ${account.accountNumber}`);
                    console.log(`   Customer: ${account.customer.name}`);
                    console.log(`   Current Balance: $${account.balance}`);
                    
                    // Check transactions for this account
                    const transactionsResponse = await fetch(`${BASE_URL}/transactions?accountId=${account.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (transactionsResponse.ok) {
                        const transactionsData = await transactionsResponse.json();
                        const transactions = transactionsData.transactions || transactionsData;
                        const repayments = Array.isArray(transactions) ? 
                            transactions.filter(t => t.type.toUpperCase() === 'LOAN_REPAYMENT') : [];
                        
                        console.log(`   Total Repayment Transactions: ${repayments.length}`);
                        
                        if (repayments.length > 0) {
                            const totalRepaid = repayments.reduce((sum, t) => sum + Number(t.amount), 0);
                            console.log(`   Total Amount Repaid: $${totalRepaid}`);
                            
                            repayments.forEach((repayment, idx) => {
                                console.log(`     ${idx + 1}. $${repayment.amount} on ${new Date(repayment.date).toLocaleDateString()}`);
                            });
                        }
                    }
                }
            } else {
                console.log('⚠️ No loan accounts found');
            }
        }

        console.log('\n🎉 Amount paid calculation test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testAmountPaidFix().catch(console.error);
