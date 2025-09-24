// Test to verify loan completion logic fix
const API_BASE = 'http://localhost:5000/api';

async function testLoanCompletionLogic() {
    try {
        console.log('🎯 LOAN COMPLETION LOGIC FIX TEST\n');
        console.log('=====================================\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get the specific loan that was incorrectly marked as PAID
        console.log('🔍 Checking loan a17c7d27-a9d2-4557-a029-918cdc4894b4...\n');
        
        const loanResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loanResponse.json();
        
        const targetLoan = loansData.loans?.find(loan => loan.id === 'a17c7d27-a9d2-4557-a029-918cdc4894b4');
        
        if (!targetLoan) {
            console.log('❌ Target loan not found');
            return;
        }

        console.log('📊 CURRENT LOAN STATUS:');
        console.log(`   ID: ${targetLoan.id}`);
        console.log(`   Account: ${targetLoan.account?.accountNumber}`);
        console.log(`   Customer: ${targetLoan.customer?.name}`);
        console.log(`   Status: ${targetLoan.status}`);
        console.log(`   Principal: GH₵${targetLoan.amount}`);
        console.log(`   Total Payable: GH₵${targetLoan.totalPayable}`);
        console.log(`   Amount Paid: GH₵${targetLoan.amountPaid}`);
        console.log(`   Outstanding: GH₵${targetLoan.outstandingBalance}\n`);

        // Check guarantor details
        const guarantor1Contribution = targetLoan.guarantor1Percentage ? (targetLoan.amount * targetLoan.guarantor1Percentage) / 100 : 0;
        console.log('👥 GUARANTOR DETAILS:');
        if (targetLoan.guarantor1Id) {
            console.log(`   Guarantor 1: ${targetLoan.guarantor1?.name} - ${targetLoan.guarantor1Percentage}% (GH₵${guarantor1Contribution.toFixed(2)})`);
        }
        
        // Check guarantor reimbursement status
        console.log('\n🔍 GUARANTOR REIMBURSEMENT STATUS:');
        if (targetLoan.guarantor1AccountId) {
            const transactionsResponse = await fetch(`${API_BASE}/transactions?accountId=${targetLoan.guarantor1AccountId}&limit=100`, { headers });
            if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                const reimbursements = transactionsData.transactions?.filter(txn => 
                    txn.description?.includes('Guarantor reimbursement') || 
                    txn.description?.includes('reimbursement') ||
                    txn.reference?.includes('GRB-')
                ) || [];
                
                const totalReimbursed = reimbursements.reduce((sum, txn) => sum + Number(txn.amount), 0);
                const stillOwed = Math.max(0, guarantor1Contribution - totalReimbursed);
                
                console.log(`   Total Contribution: GH₵${guarantor1Contribution.toFixed(2)}`);
                console.log(`   Total Reimbursed: GH₵${totalReimbursed.toFixed(2)}`);
                console.log(`   Still Owed: GH₵${stillOwed.toFixed(2)}`);
                
                // Test our fix: make a small payment to see if loan status updates correctly
                if (stillOwed > 0) {
                    console.log(`\n💸 Making a payment of GH₵${stillOwed.toFixed(2)} to complete guarantor reimbursement...\n`);
                    
                    const repaymentResponse = await fetch(`${API_BASE}/transactions`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            accountId: targetLoan.accountId,
                            type: 'LOAN_REPAYMENT',
                            amount: stillOwed + 10, // Pay a bit more than what's owed to guarantor
                            description: 'Final payment to complete guarantor reimbursement'
                        })
                    });

                    if (repaymentResponse.ok) {
                        const repaymentResult = await repaymentResponse.json();
                        console.log('✅ PAYMENT PROCESSED!');
                        console.log(`   Interest Portion: GH₵${repaymentResult.repaymentDetails?.interestPortion?.toFixed(2) || 'N/A'}`);
                        console.log(`   Principal Portion: GH₵${repaymentResult.repaymentDetails?.principalPortion?.toFixed(2) || 'N/A'}`);
                        console.log(`   Guarantor Reimbursed: GH₵${(repaymentResult.repaymentDetails?.principalPortion - repaymentResult.repaymentDetails?.borrowerBenefitAmount)?.toFixed(2) || 'N/A'}`);
                        console.log(`   Guarantor Still Owed: GH₵${repaymentResult.repaymentDetails?.guarantorStillOwed?.toFixed(2) || 'N/A'}`);
                        console.log(`   New Outstanding: GH₵${repaymentResult.repaymentDetails?.newOutstandingBalance?.toFixed(2) || 'N/A'}`);
                        console.log(`   New Amount Paid: GH₵${repaymentResult.repaymentDetails?.newAmountPaid?.toFixed(2) || 'N/A'}`);
                        console.log(`   Loan Fully Paid: ${repaymentResult.repaymentDetails?.isFullyPaid ? '✅ YES' : '❌ NO'}`);

                        // Check updated loan status
                        console.log('\n🔄 Checking updated loan status...');
                        const updatedLoanResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
                        const updatedLoansData = await updatedLoanResponse.json();
                        const updatedLoan = updatedLoansData.loans?.find(loan => loan.id === targetLoan.id);
                        
                        if (updatedLoan) {
                            console.log(`   Updated Status: ${updatedLoan.status}`);
                            console.log(`   Updated Amount Paid: GH₵${updatedLoan.amountPaid}`);
                            console.log(`   Updated Outstanding: GH₵${updatedLoan.outstandingBalance}`);
                            
                            // Verify loan completion conditions
                            const totalPayable = Number(updatedLoan.totalPayable);
                            const amountPaid = Number(updatedLoan.amountPaid);
                            const outstandingBalance = Number(updatedLoan.outstandingBalance);
                            const guarantorStillOwed = Number(repaymentResult.repaymentDetails?.guarantorStillOwed || 0);
                            
                            console.log('\n🎯 LOAN COMPLETION CONDITIONS:');
                            console.log(`   ✓ Total Payable Met: ${amountPaid >= totalPayable ? '✅ YES' : '❌ NO'} (${amountPaid}/${totalPayable})`);
                            console.log(`   ✓ Outstanding Balance Zero: ${outstandingBalance === 0 ? '✅ YES' : '❌ NO'} (${outstandingBalance})`);
                            console.log(`   ✓ Guarantors Fully Reimbursed: ${guarantorStillOwed === 0 ? '✅ YES' : '❌ NO'} (Still owed: ${guarantorStillOwed})`);
                            console.log(`   ✓ Loan Status: ${updatedLoan.status}`);
                            
                            if (amountPaid >= totalPayable && outstandingBalance === 0 && guarantorStillOwed === 0 && updatedLoan.status === 'PAID') {
                                console.log('\n🎉 SUCCESS! All loan completion conditions are now properly enforced!');
                            } else if (guarantorStillOwed === 0 && updatedLoan.status === 'PAID') {
                                console.log('\n✅ GOOD! Loan is correctly marked as PAID now that guarantors are fully reimbursed!');
                            } else {
                                console.log('\n⚠️  Loan completion logic still needs adjustment');
                            }
                        }
                    } else {
                        const error = await repaymentResponse.json();
                        console.log('❌ Payment failed:', error.error);
                    }
                } else {
                    console.log('\n✅ All guarantors are already fully reimbursed');
                    if (targetLoan.status === 'PAID') {
                        console.log('✅ Loan is correctly marked as PAID');
                    } else {
                        console.log('⚠️  Loan should be marked as PAID but isn\'t');
                    }
                }
            }
        }

        console.log('\n🎯 TEST COMPLETE!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testLoanCompletionLogic();
