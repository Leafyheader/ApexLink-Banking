// Test to verify loan interest calculation consistency between frontend and backend

const BASE_URL = 'http://localhost:5000/api';

async function testLoanCalculationConsistency() {
    try {
        console.log('🧪 Testing Loan Calculation Consistency...\n');

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

        // Step 2: Get customers for loan creation
        console.log('2️⃣ Getting customers...');
        const customersResponse = await fetch(`${BASE_URL}/customers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!customersResponse.ok) {
            throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
        }

        const customersData = await customersResponse.json();
        const customers = customersData.customers || customersData;
        
        if (customers.length === 0) {
            console.log('⚠️ No customers found');
            return;
        }

        const customer = customers[0];
        console.log(`✅ Using customer: ${customer.name}\n`);

        // Step 3: Get customer accounts
        const accountsResponse = await fetch(`${BASE_URL}/accounts?customerId=${customer.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || accountsData;
        const savingsAccount = accounts.find(acc => acc.type === 'SAVINGS' && acc.status === 'ACTIVE');

        if (!savingsAccount) {
            console.log('⚠️ No active savings account found for customer');
            return;
        }

        console.log(`✅ Using account: ${savingsAccount.accountNumber}\n`);

        // Step 4: Test loan calculation with known values
        const testCases = [
            { amount: 10000, interestRate: 12, term: 12, description: '1 year loan at 12%' },
            { amount: 5000, interestRate: 8, term: 24, description: '2 year loan at 8%' },
            { amount: 20000, interestRate: 15, term: 36, description: '3 year loan at 15%' }
        ];

        for (const testCase of testCases) {
            console.log(`3️⃣ Testing: ${testCase.description}`);
            console.log(`   Principal: $${testCase.amount}`);
            console.log(`   Interest Rate: ${testCase.interestRate}%`);
            console.log(`   Term: ${testCase.term} months`);

            // Calculate frontend values (flat rate calculation)
            const principal = testCase.amount;
            const annualInterestRate = testCase.interestRate / 100;
            const termInYears = testCase.term / 12;
            const totalInterest = principal * annualInterestRate * termInYears;
            const totalPayable = principal + totalInterest;
            const monthlyPayment = totalPayable / testCase.term;

            console.log('\n   📊 Frontend (Flat Rate) Calculation:');
            console.log(`     Total Interest: $${totalInterest.toFixed(2)}`);
            console.log(`     Total Payable: $${totalPayable.toFixed(2)}`);
            console.log(`     Monthly Payment: $${monthlyPayment.toFixed(2)}`);

            // Create loan via backend to verify calculation
            console.log('\n   🔄 Creating loan via backend...');
            const loanData = {
                customerId: customer.id,
                amount: testCase.amount,
                interestRate: testCase.interestRate,
                term: testCase.term,
                repaymentFrequency: 'MONTHLY',
                guarantor1Id: customer.id, // Using same customer as guarantor for test
                guarantor1AccountId: savingsAccount.id,
                guarantor1Percentage: 50
            };

            const loanResponse = await fetch(`${BASE_URL}/loans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(loanData)
            });

            if (loanResponse.ok) {
                const loanResult = await loanResponse.json();
                const loan = loanResult.loan;

                console.log('   📊 Backend Calculation:');
                console.log(`     Total Interest: $${(loan.totalPayable - loan.amount).toFixed(2)}`);
                console.log(`     Total Payable: $${loan.totalPayable.toFixed(2)}`);
                console.log(`     Monthly Payment: $${loan.monthlyPayment.toFixed(2)}`);

                // Compare values
                const totalPayableDiff = Math.abs(totalPayable - loan.totalPayable);
                const monthlyPaymentDiff = Math.abs(monthlyPayment - loan.monthlyPayment);
                const totalInterestDiff = Math.abs(totalInterest - (loan.totalPayable - loan.amount));

                console.log('\n   🔍 Comparison:');
                console.log(`     Total Payable Difference: $${totalPayableDiff.toFixed(2)}`);
                console.log(`     Monthly Payment Difference: $${monthlyPaymentDiff.toFixed(2)}`);
                console.log(`     Total Interest Difference: $${totalInterestDiff.toFixed(2)}`);

                const isConsistent = totalPayableDiff < 0.01 && monthlyPaymentDiff < 0.01 && totalInterestDiff < 0.01;
                console.log(`     Status: ${isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);

                // Clean up - delete the test loan
                try {
                    await fetch(`${BASE_URL}/loans/${loan.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (e) {
                    // Ignore cleanup errors
                }
            } else {
                const errorText = await loanResponse.text();
                console.log(`   ❌ Backend loan creation failed: ${loanResponse.status} - ${errorText}`);
            }

            console.log('   ' + '-'.repeat(60) + '\n');
        }

        console.log('🎉 Loan calculation consistency test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoanCalculationConsistency();
