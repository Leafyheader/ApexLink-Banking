// Test the improved loan repayment system
const API_BASE = 'http://localhost:5000/api';

async function testLoanRepayment() {
    try {
        console.log('🧪 Testing Improved Loan Repayment System...\n');

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

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const { token } = await loginResponse.json();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Get an active loan account
        console.log('2️⃣ Finding an active loan account...');
        const loansResponse = await fetch(`${API_BASE}/loans?limit=10`, { headers });
        const loansData = await loansResponse.json();
        
        const activeLoan = loansData.loans?.find(loan => 
            loan.status.toLowerCase() === 'active' && 
            loan.outstandingBalance > 0
        );

        if (!activeLoan) {
            console.log('❌ No active loans found. Creating a test loan...');
            
            // Get a customer first
            const customersResponse = await fetch(`${API_BASE}/customers?limit=5`, { headers });
            const customersData = await customersResponse.json();
            const customer = customersData.customers?.[0];
            
            if (!customer) {
                throw new Error('No customers found');
            }

            // Get customer's savings account
            const accountsResponse = await fetch(`${API_BASE}/accounts?customerId=${customer.id}&type=SAVINGS`, { headers });
            const accountsData = await accountsResponse.json();
            const savingsAccount = accountsData.accounts?.[0];

            if (!savingsAccount) {
                throw new Error('No savings account found for customer');
            }

            // Create a test loan
            const loanData = {
                customerId: customer.id,
                amount: 10000,
                interestRate: 10,
                term: 12,
                repaymentFrequency: 'MONTHLY',
                guarantor1Id: customer.id,
                guarantor1AccountId: savingsAccount.id,
                guarantor1Percentage: 50
            };

            const createLoanResponse = await fetch(`${API_BASE}/loans`, {
                method: 'POST',
                headers,
                body: JSON.stringify(loanData)
            });

            if (!createLoanResponse.ok) {
                throw new Error(`Failed to create loan: ${createLoanResponse.status}`);
            }

            console.log('✅ Test loan created successfully');
            
            // Fetch the newly created loan
            const newLoansResponse = await fetch(`${API_BASE}/loans?limit=10`, { headers });
            const newLoansData = await newLoansResponse.json();
            const testLoan = newLoansData.loans?.find(loan => 
                loan.customerId === customer.id && 
                loan.status.toLowerCase() === 'active'
            );

            if (!testLoan) {
                throw new Error('Failed to find newly created loan');
            }

            console.log(`📊 Test Loan Created:
   Loan Amount: GH₵${Number(testLoan.amount).toFixed(2)}
   Interest Rate: ${testLoan.interestRate}%
   Total Payable: GH₵${Number(testLoan.totalPayable).toFixed(2)}
   Outstanding: GH₵${Number(testLoan.outstandingBalance).toFixed(2)}
   Account: ${testLoan.account?.accountNumber}\n`);

            // Use this loan for testing
            Object.assign(activeLoan || {}, testLoan);
        }

        if (!activeLoan) {
            throw new Error('No active loan available for testing');
        }

        console.log(`📊 Using Loan for Testing:
   Customer: ${activeLoan.customer?.name || activeLoan.customerName}
   Loan Amount: GH₵${Number(activeLoan.amount).toFixed(2)}
   Interest Rate: ${activeLoan.interestRate}%
   Total Payable: GH₵${Number(activeLoan.totalPayable).toFixed(2)}
   Amount Paid: GH₵${Number(activeLoan.amountPaid).toFixed(2)}
   Outstanding: GH₵${Number(activeLoan.outstandingBalance).toFixed(2)}
   Account: ${activeLoan.account?.accountNumber}\n`);

        // 3. Test different payment scenarios
        const testPayments = [
            { amount: 500, description: 'Partial payment (less than monthly payment)' },
            { amount: 1000, description: 'Monthly payment amount' },
            { amount: 2000, description: 'Large payment (more than monthly payment)' }
        ];

        for (let i = 0; i < testPayments.length; i++) {
            const payment = testPayments[i];
            
            console.log(`3️⃣.${i + 1} Testing: ${payment.description}`);
            console.log(`   Payment Amount: GH₵${payment.amount}`);

            // Get current loan state before payment
            const beforeLoanResponse = await fetch(`${API_BASE}/loans/${activeLoan.id}`, { headers });
            const beforeLoan = await beforeLoanResponse.json();
            
            const beforeOutstanding = Number(beforeLoan.outstandingBalance || activeLoan.outstandingBalance);
            const totalPayable = Number(beforeLoan.totalPayable || activeLoan.totalPayable);
            const originalAmount = Number(beforeLoan.amount || activeLoan.amount);
            const totalInterest = totalPayable - originalAmount;
            
            // Calculate expected interest vs principal portions
            const expectedInterestPortion = Math.min(payment.amount, 
                (totalInterest * beforeOutstanding) / totalPayable);
            const expectedPrincipalPortion = payment.amount - expectedInterestPortion;

            console.log(`   Expected Breakdown:
     Interest Portion: GH₵${expectedInterestPortion.toFixed(2)}
     Principal Portion: GH₵${expectedPrincipalPortion.toFixed(2)}
     New Outstanding: GH₵${Math.max(0, beforeOutstanding - payment.amount).toFixed(2)}`);

            // Make loan repayment
            const repaymentData = {
                accountId: activeLoan.accountId,
                amount: payment.amount,
                type: 'LOAN_REPAYMENT',
                description: `Test ${payment.description}`
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
            
            console.log(`   ✅ Payment processed successfully!`);
            console.log(`   📊 Actual Results:
     Transaction ID: ${repaymentResult.id}
     Reference: ${repaymentResult.reference}
     Interest Portion: GH₵${repaymentResult.repaymentDetails?.interestPortion?.toFixed(2) || 'N/A'}
     Principal Portion: GH₵${repaymentResult.repaymentDetails?.principalPortion?.toFixed(2) || 'N/A'}
     New Outstanding: GH₵${repaymentResult.repaymentDetails?.newOutstandingBalance?.toFixed(2) || 'N/A'}
     Fully Paid: ${repaymentResult.repaymentDetails?.isFullyPaid ? 'Yes' : 'No'}`);

            if (repaymentResult.repaymentDetails?.disbursements?.length > 0) {
                console.log(`   💰 Guarantor Disbursements:`);
                repaymentResult.repaymentDetails.disbursements.forEach(d => {
                    console.log(`     ${d.guarantorName} (${d.percentage}%): GH₵${d.amount.toFixed(2)} to ${d.accountNumber}`);
                });
            }

            console.log('');

            // Check if loan is now fully paid
            if (repaymentResult.repaymentDetails?.isFullyPaid) {
                console.log('🎉 Loan is now fully paid! Stopping test.\n');
                break;
            }

            // Wait a moment between payments
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 4. Check bank income records
        console.log('4️⃣ Checking bank income records...');
        const incomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=10`, { headers });
        
        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const loanInterestIncomes = incomeData.records?.filter(r => r.type === 'LOAN_INTEREST') || [];
            
            console.log(`   📈 Recent Loan Interest Income Records: ${loanInterestIncomes.length}`);
            loanInterestIncomes.slice(0, 3).forEach(income => {
                console.log(`     GH₵${Number(income.amount).toFixed(2)} - ${income.description}`);
            });
        }

        console.log('\n✅ Loan repayment test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            const errorText = await error.response.text();
            console.error('Response:', errorText);
        }
    }
}

// Run the test
testLoanRepayment();
