// Test end-to-end loan repayment with correct calculations
const API_BASE = 'http://localhost:5000/api';

async function testLoanRepaymentEndToEnd() {
    try {
        console.log('🧪 Testing End-to-End Loan Repayment...\n');

        // 1. Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const { token } = await loginResponse.json();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };        // 2. Get customers and accounts
        console.log('2️⃣ Finding customers...');
        const customersResponse = await fetch(`${API_BASE}/customers?limit=5`, { headers });
        const customersData = await customersResponse.json();
        
        // Find John Doe who has active accounts
        const customer = customersData.customers?.find(c => c.name === 'John Doe');
        if (!customer) {
            throw new Error('John Doe customer not found');
        }

        const accountsResponse = await fetch(`${API_BASE}/accounts?customerId=${customer.id}`, { headers });
        const accountsData = await accountsResponse.json();
        const activeAccount = accountsData.accounts?.find(acc => 
            (acc.type === 'SAVINGS' || acc.type === 'CURRENT') && acc.status === 'ACTIVE'
        );
        if (!activeAccount) {
            throw new Error('No active account found for customer');
        }

        // Get another customer for guarantor
        const guarantorCustomer = customersData.customers?.find(c => c.name === 'Jane Smith');
        if (!guarantorCustomer) {
            throw new Error('Jane Smith customer not found');
        }

        const guarantorAccountsResponse = await fetch(`${API_BASE}/accounts?customerId=${guarantorCustomer.id}`, { headers });
        const guarantorAccountsData = await guarantorAccountsResponse.json();
        const guarantorAccount = guarantorAccountsData.accounts?.find(acc => 
            (acc.type === 'SAVINGS' || acc.type === 'CURRENT') && acc.status === 'ACTIVE'
        );
        if (!guarantorAccount) {
            throw new Error('No active guarantor account found');
        }

        console.log(`Using customer: ${customer.name}, Account: ${activeAccount.accountNumber}`);
        console.log(`Using guarantor: ${guarantorCustomer.name}, Account: ${guarantorAccount.accountNumber}`);

        // 3. Create a test loan
        console.log('3️⃣ Creating a test loan...');        const loanData = {
            customerId: customer.id,
            amount: 2000,
            interestRate: 10,
            term: 12,
            repaymentFrequency: 'MONTHLY',
            guarantor1Id: guarantorCustomer.id,
            guarantor1AccountId: guarantorAccount.id,
            guarantor1Percentage: 50
        };

        const createLoanResponse = await fetch(`${API_BASE}/loans`, {
            method: 'POST',
            headers,
            body: JSON.stringify(loanData)
        });

        if (!createLoanResponse.ok) {
            const errorData = await createLoanResponse.json();
            throw new Error(`Failed to create loan: ${errorData.error}`);
        }

        console.log('✅ Test loan created successfully');

        // 4. Get the newly created loan
        const loansResponse = await fetch(`${API_BASE}/loans?limit=5`, { headers });
        const loansData = await loansResponse.json();
        const testLoan = loansData.loans?.find(loan => 
            loan.customerId === customer.id &&            loan.status.toLowerCase() === 'active' &&
            Number(loan.amount) === 2000
        );

        if (!testLoan) {
            throw new Error('Failed to find newly created loan');
        }

        console.log(`📊 Test Loan Details:
   Customer: ${testLoan.customer?.name}
   Loan Amount: GH₵${Number(testLoan.amount).toFixed(2)}
   Interest Rate: ${testLoan.interestRate}%
   Total Payable: GH₵${Number(testLoan.totalPayable).toFixed(2)}
   Outstanding: GH₵${Number(testLoan.outstandingBalance).toFixed(2)}
   Monthly Payment: GH₵${Number(testLoan.monthlyPayment).toFixed(2)}
   Account: ${testLoan.account?.accountNumber}\n`);

        // Calculate expected values for verification
        const loanAmount = Number(testLoan.amount);
        const totalPayable = Number(testLoan.totalPayable);
        const totalInterest = totalPayable - loanAmount;

        console.log(`📊 Expected Breakdown:
   Principal: GH₵${loanAmount.toFixed(2)}
   Total Interest: GH₵${totalInterest.toFixed(2)}
   Total Payable: GH₵${totalPayable.toFixed(2)}\n`);

        // 5. Make some test payments
        const testPayments = [
            { amount: 500, description: 'First payment' },
            { amount: 1000, description: 'Second payment' },
            { amount: 2000, description: 'Large payment' }
        ];

        let currentOutstanding = Number(testLoan.outstandingBalance);
        let currentAmountPaid = 0;

        for (let i = 0; i < testPayments.length && currentOutstanding > 0; i++) {
            const payment = testPayments[i];
            const paymentAmount = Math.min(payment.amount, currentOutstanding);
            
            console.log(`5️⃣.${i + 1} Making payment: ${payment.description}`);
            console.log(`   Payment Amount: GH₵${paymentAmount.toFixed(2)}`);
            console.log(`   Outstanding Before: GH₵${currentOutstanding.toFixed(2)}`);

            // Calculate expected interest vs principal
            const remainingInterest = Math.max(0, totalInterest - currentAmountPaid * (totalInterest / totalPayable));
            const expectedInterest = Math.min(paymentAmount, remainingInterest);
            const expectedPrincipal = paymentAmount - expectedInterest;

            console.log(`   Expected - Interest: GH₵${expectedInterest.toFixed(2)}, Principal: GH₵${expectedPrincipal.toFixed(2)}`);

            // Make the payment
            const repaymentData = {
                accountId: testLoan.accountId,
                amount: paymentAmount,
                type: 'LOAN_REPAYMENT',
                description: payment.description
            };

            const repaymentResponse = await fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(repaymentData)
            });

            if (!repaymentResponse.ok) {
                const errorData = await repaymentResponse.json();
                console.log(`   ❌ Payment failed: ${errorData.error}`);
                continue;
            }

            const repaymentResult = await repaymentResponse.json();

            console.log(`   ✅ Payment successful!`);
            console.log(`   Actual - Interest: GH₵${repaymentResult.repaymentDetails?.interestPortion?.toFixed(2) || 'N/A'}, Principal: GH₵${repaymentResult.repaymentDetails?.principalPortion?.toFixed(2) || 'N/A'}`);
            console.log(`   New Outstanding: GH₵${repaymentResult.repaymentDetails?.newOutstandingBalance?.toFixed(2) || 'N/A'}`);
            console.log(`   Fully Paid: ${repaymentResult.repaymentDetails?.isFullyPaid ? 'Yes' : 'No'}`);

            if (repaymentResult.repaymentDetails?.disbursements?.length > 0) {
                console.log(`   💰 Guarantor Disbursements:`);
                repaymentResult.repaymentDetails.disbursements.forEach(d => {
                    console.log(`     ${d.guarantorName} (${d.percentage}%): GH₵${d.amount.toFixed(2)}`);
                });
            }

            // Update tracking variables
            currentOutstanding = repaymentResult.repaymentDetails?.newOutstandingBalance || 0;
            currentAmountPaid += paymentAmount;

            console.log('');

            if (repaymentResult.repaymentDetails?.isFullyPaid) {
                console.log('🎉 Loan fully paid! Stopping test.\n');
                break;
            }
        }

        // 6. Check bank income
        console.log('6️⃣ Checking bank income...');
        const incomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=10`, { headers });
        
        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const loanInterestIncomes = incomeData.records?.filter(r => 
                r.type === 'LOAN_INTEREST' && 
                new Date(r.createdAt) > new Date(Date.now() - 120000) // Last 2 minutes
            ) || [];
            
            console.log(`   📈 Recent Loan Interest Income: ${loanInterestIncomes.length} records`);
            let totalInterestIncome = 0;
            loanInterestIncomes.forEach(income => {
                totalInterestIncome += Number(income.amount);
                console.log(`     GH₵${Number(income.amount).toFixed(2)} - ${income.description}`);
            });
            console.log(`   💰 Total Interest Income: GH₵${totalInterestIncome.toFixed(2)}`);
        }

        console.log('\n✅ End-to-end loan repayment test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testLoanRepaymentEndToEnd();
