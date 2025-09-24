/**
 * Test script to verify loan creation with guarantor deductions
 */

const BASE_URL = 'http://localhost:5000/api';

async function testLoanCreationWithGuarantors() {
    try {
        console.log('🧪 Testing Loan Creation with Guarantor Deductions...\n');

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
            const errorText = await loginResponse.text();
            throw new Error(`Login failed: ${loginResponse.status} - ${errorText}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful\n');

        // Step 2: Get customers to find suitable guarantors
        console.log('2️⃣ Fetching customers for loan...');
        const customersResponse = await fetch(`${BASE_URL}/loans/customers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!customersResponse.ok) {
            throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
        }

        const customersData = await customersResponse.json();
        const customers = customersData.customers || customersData;
        
        if (customers.length < 2) {
            console.log('⚠️ Not enough customers found. Need at least 2 customers for this test.');
            return;
        }

        const borrower = customers[0];
        const guarantor = customers[1];

        console.log(`✅ Found borrower: ${borrower.name}`);
        console.log(`   Borrower accounts:`, borrower.accounts);
        console.log(`✅ Found guarantor: ${guarantor.name}`);
        console.log(`   Guarantor accounts:`, guarantor.accounts);        // Find suitable accounts
        const borrowerAccount = borrower.accounts?.find(acc => 
            (acc.type === 'SAVINGS' || acc.type === 'CURRENT') && 
            Number(acc.balance) >= 0
        );
        const guarantorAccount = guarantor.accounts?.find(acc => 
            (acc.type === 'SAVINGS' || acc.type === 'CURRENT') && 
            Number(acc.balance) >= 500
        );

        if (!borrowerAccount) {
            console.log('⚠️ Borrower has no suitable account.');
            return;
        }

        if (!guarantorAccount) {
            console.log('⚠️ Guarantor has no suitable account with sufficient balance.');
            return;
        }

        console.log(`   Borrower account: ${borrowerAccount.accountNumber} (Balance: $${borrowerAccount.balance})`);
        console.log(`   Guarantor account: ${guarantorAccount.accountNumber} (Balance: $${guarantorAccount.balance})\n`);

        // Step 3: Create loan with guarantor
        console.log('3️⃣ Creating loan with guarantor deduction...');
        const loanAmount = 1000;
        const guarantorPercentage = 50; // 50% of loan amount
        const deductionAmount = (loanAmount * guarantorPercentage) / 100;

        const loanData = {
            customerId: borrower.id,
            amount: loanAmount,
            interestRate: 10,
            term: 12,
            repaymentFrequency: 'MONTHLY',
            guarantor1Id: guarantor.id,
            guarantor1AccountId: guarantorAccount.id,
            guarantor1Percentage: guarantorPercentage
        };

        console.log(`   Loan amount: $${loanAmount}`);
        console.log(`   Guarantor percentage: ${guarantorPercentage}%`);
        console.log(`   Expected deduction: $${deductionAmount}`);

        const loanResponse = await fetch(`${BASE_URL}/loans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(loanData)
        });

        if (!loanResponse.ok) {
            const errorText = await loanResponse.text();
            throw new Error(`Loan creation failed: ${loanResponse.status} - ${errorText}`);
        }

        const loan = await loanResponse.json();
        console.log('✅ Loan created successfully!');
        console.log(`   Loan ID: ${loan.loan.id}`);
        console.log(`   Loan account: ${loan.loan.account.accountNumber}\n`);

        // Step 4: Verify guarantor account balance was deducted
        console.log('4️⃣ Verifying guarantor account deduction...');
        const accountsResponse = await fetch(`${BASE_URL}/accounts/${guarantorAccount.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch guarantor account: ${accountsResponse.status}`);
        }

        const updatedAccount = await accountsResponse.json();
        const newBalance = Number(updatedAccount.account.balance);
        const originalBalance = Number(guarantorAccount.balance);
        const actualDeduction = originalBalance - newBalance;

        console.log(`   Original balance: $${originalBalance}`);
        console.log(`   New balance: $${newBalance}`);
        console.log(`   Actual deduction: $${actualDeduction}`);

        if (Math.abs(actualDeduction - deductionAmount) < 0.01) {
            console.log('✅ Guarantor deduction verified successfully!');
        } else {
            console.log('❌ Guarantor deduction amount mismatch!');
        }

        // Step 5: Check transaction history
        console.log('\n5️⃣ Checking transaction history...');
        const transactionsResponse = await fetch(`${BASE_URL}/transactions?accountId=${guarantorAccount.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            const transactions = transactionsData.transactions || transactionsData;
            const guarantorTransaction = Array.isArray(transactions) ? 
                transactions.find(t => t.description && t.description.includes('Guarantor contribution')) : null;

            if (guarantorTransaction) {
                console.log('✅ Guarantor contribution transaction found:');
                console.log(`   Type: ${guarantorTransaction.type}`);
                console.log(`   Amount: $${guarantorTransaction.amount}`);
                console.log(`   Description: ${guarantorTransaction.description}`);
                console.log(`   Reference: ${guarantorTransaction.reference}`);
            } else {
                console.log('❌ Guarantor contribution transaction not found');
            }
        }

        console.log('\n🎉 All loan creation with guarantor tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testLoanCreationWithGuarantors().catch(console.error);
