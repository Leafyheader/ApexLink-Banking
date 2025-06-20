// Test complete loan payoff scenario
const API_BASE = 'http://localhost:5000/api';

async function testLoanPayoff() {
    try {
        console.log('🧪 Testing Complete Loan Payoff...\n');

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
        };

        // 2. Get an active loan
        console.log('2️⃣ Finding an active loan...');
        const loansResponse = await fetch(`${API_BASE}/loans?limit=10`, { headers });
        const loansData = await loansResponse.json();
        
        const activeLoan = loansData.loans?.find(loan => 
            loan.status.toLowerCase() === 'active' && 
            loan.outstandingBalance > 0
        );

        if (!activeLoan) {
            console.log('❌ No active loans found.');
            return;
        }

        console.log(`📊 Found Active Loan:
   Customer: ${activeLoan.customer?.name}
   Outstanding Balance: GH₵${Number(activeLoan.outstandingBalance).toFixed(2)}
   Account: ${activeLoan.account?.accountNumber}\n`);

        // 3. Pay off the entire remaining balance
        const payoffAmount = Number(activeLoan.outstandingBalance);
        
        console.log(`3️⃣ Paying off entire balance: GH₵${payoffAmount.toFixed(2)}`);

        const repaymentData = {
            accountId: activeLoan.accountId,
            amount: payoffAmount,
            type: 'LOAN_REPAYMENT',
            description: 'Complete loan payoff test'
        };

        const repaymentResponse = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(repaymentData)
        });

        if (!repaymentResponse.ok) {
            const errorData = await repaymentResponse.json();
            console.log(`❌ Payoff failed: ${errorData.error}`);
            return;
        }

        const repaymentResult = await repaymentResponse.json();
        
        console.log(`✅ Loan payoff successful!`);
        console.log(`📊 Payoff Details:
   Transaction ID: ${repaymentResult.id}
   Reference: ${repaymentResult.reference}
   Interest Portion: GH₵${repaymentResult.repaymentDetails?.interestPortion?.toFixed(2) || 'N/A'}
   Principal Portion: GH₵${repaymentResult.repaymentDetails?.principalPortion?.toFixed(2) || 'N/A'}
   New Outstanding: GH₵${repaymentResult.repaymentDetails?.newOutstandingBalance?.toFixed(2) || 'N/A'}
   Fully Paid: ${repaymentResult.repaymentDetails?.isFullyPaid ? 'Yes' : 'No'}`);

        if (repaymentResult.repaymentDetails?.disbursements?.length > 0) {
            console.log(`   💰 Final Guarantor Disbursements:`);
            repaymentResult.repaymentDetails.disbursements.forEach(d => {
                console.log(`     ${d.guarantorName} (${d.percentage}%): GH₵${d.amount.toFixed(2)} to ${d.accountNumber}`);
            });
        }

        // 4. Verify loan status changed
        console.log('\n4️⃣ Verifying loan status...');
        const updatedLoanResponse = await fetch(`${API_BASE}/loans/${activeLoan.id}`, { headers });
        
        if (updatedLoanResponse.ok) {
            const updatedLoan = await updatedLoanResponse.json();
            console.log(`   Loan Status: ${updatedLoan.status}`);
            console.log(`   Outstanding Balance: GH₵${Number(updatedLoan.outstandingBalance).toFixed(2)}`);
            console.log(`   Amount Paid: GH₵${Number(updatedLoan.amountPaid).toFixed(2)}`);
        }

        // 5. Check bank income
        console.log('\n5️⃣ Checking recent bank income...');
        const incomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=5`, { headers });
        
        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const recentInterest = incomeData.records?.filter(r => 
                r.type === 'LOAN_INTEREST' && 
                new Date(r.createdAt) > new Date(Date.now() - 60000) // Last minute
            ) || [];
            
            console.log(`   💰 Recent Interest Income: ${recentInterest.length} records`);
            recentInterest.forEach(income => {
                console.log(`     GH₵${Number(income.amount).toFixed(2)} - ${income.description}`);
            });
        }

        console.log('\n🎉 Loan payoff test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testLoanPayoff();
