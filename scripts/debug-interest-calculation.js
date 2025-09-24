// Test to debug the interest calculation logic
const API_BASE = 'http://localhost:5000/api';

async function debugInterestCalculation() {
    try {
        console.log('🔍 DEBUGGING INTEREST CALCULATION LOGIC\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get our test loan details
        const loansResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loansResponse.json();
        const testLoan = loansData.loans?.find(loan => loan.id === 'a17c7d27-a9d2-4557-a029-918cdc4894b4');

        if (!testLoan) {
            console.log('❌ Test loan not found');
            return;
        }

        console.log('📊 Loan Details:');
        console.log(`   Principal: ₵${testLoan.amount}`);
        console.log(`   Interest Rate: ${testLoan.interestRate}%`);
        console.log(`   Total Payable: ₵${testLoan.totalPayable}`);
        console.log(`   Amount Paid: ₵${testLoan.amountPaid}`);
        console.log(`   Outstanding: ₵${testLoan.outstandingBalance}\n`);

        // Manual calculation of what should happen
        const originalAmount = Number(testLoan.amount);
        const totalPayable = Number(testLoan.totalPayable);
        const totalInterestRequired = totalPayable - originalAmount;
        
        console.log('🧮 Expected Calculation:');
        console.log(`   Original Amount: ₵${originalAmount}`);
        console.log(`   Total Payable: ₵${totalPayable}`);
        console.log(`   Total Interest Required: ₵${totalInterestRequired}`);
        console.log(`   Interest Percentage: ${((totalInterestRequired / totalPayable) * 100).toFixed(2)}%\n`);

        // Check current bank income for this loan
        const incomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=100`, { headers });
        let totalInterestPaid = 0;
        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            const loanInterestRecords = incomeData.records?.filter(r => 
                r.type === 'LOAN_INTEREST' && r.accountId === testLoan.accountId
            ) || [];
            totalInterestPaid = loanInterestRecords.reduce((sum, r) => sum + Number(r.amount), 0);
        }

        console.log('💰 Current Interest Status:');
        console.log(`   Total Interest Paid: ₵${totalInterestPaid.toFixed(2)}`);
        console.log(`   Remaining Interest Due: ₵${Math.max(0, totalInterestRequired - totalInterestPaid).toFixed(2)}\n`);

        // Test with a payment that should trigger interest
        const testPaymentAmount = 100;
        const expectedInterestPercentage = totalInterestRequired / totalPayable;
        const expectedInterest = Math.min(
            testPaymentAmount * expectedInterestPercentage, 
            totalInterestRequired - totalInterestPaid
        );
        const expectedPrincipal = testPaymentAmount - expectedInterest;

        console.log(`💸 Simulating ₵${testPaymentAmount} payment:`);
        console.log(`   Expected Interest: ₵${expectedInterest.toFixed(2)}`);
        console.log(`   Expected Principal: ₵${expectedPrincipal.toFixed(2)}\n`);

        // Make the actual payment
        console.log('💳 Making actual payment...\n');
        const paymentResponse = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                accountId: testLoan.accountId,
                type: 'LOAN_REPAYMENT',
                amount: testPaymentAmount,
                description: 'Debug payment to test interest calculation'
            })
        });

        if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            console.log('✅ PAYMENT PROCESSED!');
            console.log('📊 Actual Results:');
            console.log(`   Interest Portion: ₵${Number(paymentResult.repaymentDetails?.interestPortion || 0).toFixed(2)}`);
            console.log(`   Principal Portion: ₵${Number(paymentResult.repaymentDetails?.principalPortion || 0).toFixed(2)}`);
            
            const actualInterest = Number(paymentResult.repaymentDetails?.interestPortion || 0);
            const actualPrincipal = Number(paymentResult.repaymentDetails?.principalPortion || 0);
            
            console.log('\n🎯 COMPARISON:');
            console.log(`   Expected Interest: ₵${expectedInterest.toFixed(2)} | Actual: ₵${actualInterest.toFixed(2)} | Match: ${Math.abs(expectedInterest - actualInterest) < 0.01 ? '✅' : '❌'}`);
            console.log(`   Expected Principal: ₵${expectedPrincipal.toFixed(2)} | Actual: ₵${actualPrincipal.toFixed(2)} | Match: ${Math.abs(expectedPrincipal - actualPrincipal) < 0.01 ? '✅' : '❌'}`);

            // Check if bank income was created
            console.log('\n🏦 Checking bank income creation...');
            const updatedIncomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=10`, { headers });
            if (updatedIncomeResponse.ok) {
                const updatedIncomeData = await updatedIncomeResponse.json();
                const newInterestRecord = updatedIncomeData.records?.find(r => 
                    r.type === 'LOAN_INTEREST' && 
                    r.sourceId === paymentResult.reference
                );
                
                if (newInterestRecord) {
                    console.log(`   ✅ Bank income created: ₵${Number(newInterestRecord.amount).toFixed(2)}`);
                    console.log(`   Description: ${newInterestRecord.description}`);
                } else {
                    console.log('   ❌ No bank income record found for this payment');
                }
            }

        } else {
            const error = await paymentResponse.json();
            console.log('❌ Payment failed:', error.error);
        }

        console.log('\n🎯 DEBUG COMPLETE!\n');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

// Run the debug
debugInterestCalculation();
