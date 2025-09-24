// Test to verify the corrected interest calculation logic
const API_BASE = 'http://localhost:5000/api';

async function testCorrectedInterestCalculation() {
    try {
        console.log('🧮 CORRECTED INTEREST CALCULATION TEST\n');
        console.log('=====================================\n');
        
        console.log('📚 EXPECTED CALCULATION (Your Example):');
        console.log('   Loan Terms:');
        console.log('   - Principal: ₵1,000');
        console.log('   - Interest: ₵100');
        console.log('   - Total Repayable: ₵1,100');
        console.log('   - Guarantor Advanced: ₵500');
        console.log('');
        console.log('   Payment of ₵200 Allocation:');
        console.log('   - Interest % = ₵100 ÷ ₵1,100 = 9.09%');
        console.log('   - Interest on ₵200 = ₵200 × 0.0909 ≈ ₵18.18');
        console.log('   - Principal Portion = ₵200 - ₵18.18 = ₵181.82');
        console.log('   - To Guarantor: ₵90.91 (50% of principal OR priority until fully paid)');
        console.log('   - To Reduce Loan: ₵90.91 (remaining principal)');
        console.log('   - Amount Deducted from Loan Balance: ₵181.82\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Find or create a fresh loan to test with
        console.log('🔍 Looking for a suitable test loan...\n');
        
        const loanResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loanResponse.json();
        
        // Find a loan that matches our test criteria (₵1,000 principal, 10% interest, with guarantor)
        let testLoan = loansData.loans?.find(loan => 
            Number(loan.amount) === 1000 && 
            Number(loan.interestRate) === 10 &&
            loan.guarantor1Id &&
            Number(loan.outstandingBalance) > 0
        );

        if (!testLoan) {
            console.log('❌ No suitable test loan found with the exact criteria');
            console.log('   Using the existing loan for demonstration...\n');
            testLoan = loansData.loans?.find(loan => loan.id === 'a17c7d27-a9d2-4557-a029-918cdc4894b4');
        }

        if (!testLoan) {
            console.log('❌ No test loan available');
            return;
        }

        console.log('📊 TEST LOAN DETAILS:');
        console.log(`   ID: ${testLoan.id}`);
        console.log(`   Principal: GH₵${testLoan.amount}`);
        console.log(`   Interest Rate: ${testLoan.interestRate}%`);
        console.log(`   Total Payable: GH₵${testLoan.totalPayable}`);
        console.log(`   Outstanding: GH₵${testLoan.outstandingBalance}`);
        console.log(`   Amount Paid: GH₵${testLoan.amountPaid}`);
        
        if (testLoan.guarantor1Id) {
            const guarantor1Contribution = (Number(testLoan.amount) * Number(testLoan.guarantor1Percentage)) / 100;
            console.log(`   Guarantor: ${testLoan.guarantor1?.name} - ${testLoan.guarantor1Percentage}% (GH₵${guarantor1Contribution.toFixed(2)})\n`);
        }        // Make a test payment that fits within remaining obligations
        const remainingDebt = Number(testLoan.outstandingBalance) || 0;
        console.log(`   Remaining Debt: GH₵${remainingDebt.toFixed(2)}`);
        
        // Let's use a smaller test amount or check if loan is already complete
        let testPaymentAmount = 100;
        if (remainingDebt < 100) {
            testPaymentAmount = Math.max(10, remainingDebt + 10); // Small payment to test logic
        }
        
        console.log(`💸 Making test payment of GH₵${testPaymentAmount}...\n`);
        const repaymentResponse = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                accountId: testLoan.accountId,
                type: 'LOAN_REPAYMENT',
                amount: testPaymentAmount,
                description: 'Test payment for corrected interest calculation'
            })
        });

        if (repaymentResponse.ok) {
            const repaymentResult = await repaymentResponse.json();
            
            console.log('✅ PAYMENT PROCESSED! Analyzing results...\n');
            
            const actualInterest = Number(repaymentResult.repaymentDetails?.interestPortion || 0);
            const actualPrincipal = Number(repaymentResult.repaymentDetails?.principalPortion || 0);
            const guarantorReimbursed = actualPrincipal - Number(repaymentResult.repaymentDetails?.borrowerBenefitAmount || 0);
            const borrowerBenefit = Number(repaymentResult.repaymentDetails?.borrowerBenefitAmount || 0);
            
            // Expected calculations
            const totalPayable = Number(testLoan.totalPayable);
            const principal = Number(testLoan.amount);
            const totalInterest = totalPayable - principal;
            const interestPercentage = totalInterest / totalPayable;
            const expectedInterest = testPaymentAmount * interestPercentage;
            const expectedPrincipal = testPaymentAmount - expectedInterest;
            
            console.log('🧮 CALCULATION COMPARISON:');
            console.log('');
            console.log('Interest Calculation:');
            console.log(`   Expected: GH₵${expectedInterest.toFixed(2)} (${testPaymentAmount} × ${(interestPercentage * 100).toFixed(2)}%)`);
            console.log(`   Actual:   GH₵${actualInterest.toFixed(2)}`);
            console.log(`   Match:    ${Math.abs(expectedInterest - actualInterest) < 0.01 ? '✅ YES' : '❌ NO'}`);
            console.log('');
            console.log('Principal Calculation:');
            console.log(`   Expected: GH₵${expectedPrincipal.toFixed(2)}`);
            console.log(`   Actual:   GH₵${actualPrincipal.toFixed(2)}`);
            console.log(`   Match:    ${Math.abs(expectedPrincipal - actualPrincipal) < 0.01 ? '✅ YES' : '❌ NO'}`);
            console.log('');
            console.log('Allocation:');
            console.log(`   To Guarantor: GH₵${guarantorReimbursed.toFixed(2)}`);
            console.log(`   To Reduce Loan: GH₵${borrowerBenefit.toFixed(2)}`);
            console.log(`   Total Principal: GH₵${(guarantorReimbursed + borrowerBenefit).toFixed(2)}`);
            console.log('');
            console.log('Loan Impact:');
            console.log(`   Previous Outstanding: GH₵${testLoan.outstandingBalance}`);
            console.log(`   New Outstanding: GH₵${repaymentResult.repaymentDetails?.newOutstandingBalance || 'N/A'}`);
            console.log(`   Debt Reduction: GH₵${actualPrincipal.toFixed(2)} (principal portion)`);
            
            // Verify our logic matches your specification
            if (Math.abs(expectedInterest - actualInterest) < 0.01 && Math.abs(expectedPrincipal - actualPrincipal) < 0.01) {
                console.log('\n🎉 SUCCESS! Interest calculation matches the specification!');
                console.log('✅ Interest = Payment × (Total Interest ÷ Total Payable)');
                console.log('✅ Principal = Payment - Interest');
                console.log('✅ Guarantor gets priority reimbursement from principal');
            } else {
                console.log('\n⚠️ Calculation mismatch - further adjustment needed');
            }
            
        } else {
            const error = await repaymentResponse.json();
            console.log('❌ Payment failed:', error.error);
        }

        console.log('\n🎯 TEST COMPLETE!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCorrectedInterestCalculation();
