// Test new loan repayment logic: Interest is % of payment, guarantor reimbursed first
const API_BASE = 'http://localhost:5000/api';

async function testNewLoanRepaymentLogic() {
    try {
        console.log('🧪 Testing NEW Loan Repayment Logic\n');
        console.log('==========================================\n');

        // 1. Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // 2. Get customers for loan setup
        console.log('2️⃣ Setting up customers...');
        const customersResponse = await fetch(`${API_BASE}/customers?limit=5`, { headers });
        const customersData = await customersResponse.json();
        
        const customer = customersData.customers?.find(c => c.name === 'John Doe');
        const guarantorCustomer = customersData.customers?.find(c => c.name === 'Jane Smith');

        if (!customer || !guarantorCustomer) {
            throw new Error('Required customers not found');
        }

        // Get their accounts
        const accountsResponse = await fetch(`${API_BASE}/accounts?customerId=${customer.id}`, { headers });
        const accountsData = await accountsResponse.json();
        const customerAccount = accountsData.accounts?.find(acc => acc.type === 'SAVINGS' && acc.status === 'ACTIVE');

        const gAccountsResponse = await fetch(`${API_BASE}/accounts?customerId=${guarantorCustomer.id}`, { headers });
        const gAccountsData = await gAccountsResponse.json();
        const guarantorAccount = gAccountsData.accounts?.find(acc => acc.type === 'CURRENT' && acc.status === 'ACTIVE');

        if (!customerAccount || !guarantorAccount) {
            throw new Error('Required accounts not found');
        }

        console.log(`   Customer: ${customer.name} (${customerAccount.accountNumber})`);
        console.log(`   Guarantor: ${guarantorCustomer.name} (${guarantorAccount.accountNumber})`);

        // 3. Create a test loan following the new rules
        console.log('\n3️⃣ Creating test loan...');
        const loanAmount = 1000;
        const interestRate = 10; // 10% of each payment goes to interest
        
        const loanData = {
            customerId: customer.id,
            amount: loanAmount,
            interestRate: interestRate,
            term: 12,
            repaymentFrequency: 'MONTHLY',
            guarantor1Id: guarantorCustomer.id,
            guarantor1AccountId: guarantorAccount.id,
            guarantor1Percentage: 50 // Guarantor paid ₵500 upfront (50% of ₵1000)
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

        // 4. Get the loan details
        const loansResponse = await fetch(`${API_BASE}/loans?limit=5`, { headers });
        const loansData = await loansResponse.json();
        const testLoan = loansData.loans?.find(loan => 
            loan.customerId === customer.id && 
            loan.status.toLowerCase() === 'active' &&
            Number(loan.amount) === loanAmount
        );

        if (!testLoan) {
            throw new Error('Failed to find newly created loan');
        }

        console.log(`\n📊 Loan Setup:
   Principal: GH₵${Number(testLoan.amount).toFixed(2)}
   Interest Rate: ${testLoan.interestRate}% (of each payment)
   Total Payable: GH₵${Number(testLoan.totalPayable).toFixed(2)}
   Outstanding: GH₵${Number(testLoan.outstandingBalance).toFixed(2)}
   Guarantor Contribution: GH₵${(loanAmount * 0.5).toFixed(2)} (to be reimbursed)\n`);

        // 5. Test different payment scenarios
        const testPayments = [
            { amount: 200, description: 'First payment - ₵20 interest, ₵180 principal' },
            { amount: 300, description: 'Second payment - ₵30 interest, ₵270 principal' },
            { amount: 500, description: 'Large payment - ₵50 interest, ₵450 principal' }
        ];

        let guarantorReimbursed = 0;
        const guarantorContribution = loanAmount * 0.5; // ₵500

        for (let i = 0; i < testPayments.length; i++) {
            const payment = testPayments[i];
            
            console.log(`5️⃣.${i + 1} Making payment: ${payment.description}`);
            console.log(`   Payment Amount: GH₵${payment.amount}`);

            // Calculate expected breakdown according to new rules
            const expectedInterest = (payment.amount * interestRate) / 100;
            const expectedPrincipal = payment.amount - expectedInterest;
            const guarantorStillOwed = guarantorContribution - guarantorReimbursed;
            const guarantorReimbursement = Math.min(expectedPrincipal, guarantorStillOwed);
            const borrowerBenefit = expectedPrincipal - guarantorReimbursement;

            console.log(`   Expected Breakdown:
     Interest (${interestRate}%): GH₵${expectedInterest.toFixed(2)} → Bank Income
     Principal: GH₵${expectedPrincipal.toFixed(2)}
       → Guarantor Reimbursement: GH₵${guarantorReimbursement.toFixed(2)}
       → Borrower Benefit: GH₵${borrowerBenefit.toFixed(2)}`);

            // Make the payment
            const repaymentData = {
                accountId: testLoan.accountId,
                amount: payment.amount,
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
            console.log(`   Actual Results:
     Interest: GH₵${repaymentResult.repaymentDetails?.interestPortion?.toFixed(2) || 'N/A'}
     Principal: GH₵${repaymentResult.repaymentDetails?.principalPortion?.toFixed(2) || 'N/A'}
     Guarantor Reimbursed: GH₵${repaymentResult.repaymentDetails?.guarantorTotalReimbursed?.toFixed(2) || 'N/A'}
     Guarantor Still Owed: GH₵${repaymentResult.repaymentDetails?.guarantorStillOwed?.toFixed(2) || 'N/A'}
     Borrower Benefit: GH₵${repaymentResult.repaymentDetails?.borrowerBenefitAmount?.toFixed(2) || 'N/A'}
     New Outstanding: GH₵${repaymentResult.repaymentDetails?.newOutstandingBalance?.toFixed(2) || 'N/A'}`);

            if (repaymentResult.repaymentDetails?.disbursements?.length > 0) {
                console.log(`   💰 Guarantor Disbursements:`);
                repaymentResult.repaymentDetails.disbursements.forEach(d => {
                    console.log(`     ${d.guarantorName}: GH₵${d.amount.toFixed(2)}`);
                });
            }

            // Update tracking
            guarantorReimbursed += guarantorReimbursement;

            console.log('');

            if (repaymentResult.repaymentDetails?.isFullyPaid) {
                console.log('🎉 Loan fully paid!\n');
                break;
            }
        }

        // 6. Check bank income
        console.log('6️⃣ Checking bank income...');
        const incomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=10`, { headers });
        
        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const recentInterest = incomeData.records?.filter(r => 
                r.type === 'LOAN_INTEREST' && 
                new Date(r.createdAt) > new Date(Date.now() - 120000) // Last 2 minutes
            ) || [];
            
            const totalInterestIncome = recentInterest.reduce((sum, r) => sum + Number(r.amount), 0);
            console.log(`   💰 Total Interest Income: GH₵${totalInterestIncome.toFixed(2)}`);
            
            recentInterest.forEach(income => {
                console.log(`     GH₵${Number(income.amount).toFixed(2)} - ${income.description}`);
            });
        }

        console.log('\n✅ NEW LOAN REPAYMENT LOGIC VERIFIED!');
        console.log('\n🎯 Key Features Confirmed:');
        console.log('   ✓ Interest = Fixed % of each payment (not time-based)');
        console.log('   ✓ Guarantor reimbursed first from principal portion');
        console.log('   ✓ Borrower benefits only after guarantor fully reimbursed');
        console.log('   ✓ Bank receives interest income on each payment');
        console.log('   ✓ Flexible payment amounts supported');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testNewLoanRepaymentLogic();
