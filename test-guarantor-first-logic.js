// Test to verify the corrected guarantor-first repayment logic
const API_BASE = 'http://localhost:5000/api';

async function testGuarantorFirstLogic() {
    try {
        console.log('🎯 GUARANTOR-FIRST REPAYMENT LOGIC TEST\n');
        console.log('=======================================\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get the loan we've been working with
        console.log('🔍 Checking current loan status...\n');
        
        const loanResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loanResponse.json();
        
        const targetLoan = loansData.loans?.find(loan => loan.id === 'a17c7d27-a9d2-4557-a029-918cdc4894b4');
        
        if (!targetLoan) {
            console.log('❌ Target loan not found');
            return;
        }

        console.log('📊 CURRENT LOAN STATUS:');
        console.log(`   Principal: GH₵${targetLoan.amount}`);
        console.log(`   Total Payable: GH₵${targetLoan.totalPayable}`);
        console.log(`   Amount Paid: GH₵${targetLoan.amountPaid}`);
        console.log(`   Outstanding: GH₵${targetLoan.outstandingBalance}`);
        console.log(`   Status: ${targetLoan.status}\n`);

        // Check guarantor status
        const guarantor1Contribution = targetLoan.guarantor1Percentage ? (targetLoan.amount * targetLoan.guarantor1Percentage) / 100 : 0;
        console.log('👥 GUARANTOR STATUS:');
        console.log(`   Expected Contribution: GH₵${guarantor1Contribution.toFixed(2)}\n`);

        // Get guarantor reimbursement status
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
                
                console.log(`   Current Reimbursed: GH₵${totalReimbursed.toFixed(2)}`);
                console.log(`   Still Owed: GH₵${stillOwed.toFixed(2)}\n`);

                // Calculate what we need to make the loan completion work correctly
                const remainingPayable = Math.max(0, targetLoan.totalPayable - targetLoan.amountPaid);
                console.log('💡 COMPLETION REQUIREMENTS:');
                console.log(`   Remaining Payable: GH₵${remainingPayable.toFixed(2)}`);
                console.log(`   Guarantor Still Owed: GH₵${stillOwed.toFixed(2)}`);
                
                // We need to pay enough to:
                // 1. Clear the remaining payable amount
                // 2. Fully reimburse the guarantor
                const totalNeeded = remainingPayable + stillOwed;
                console.log(`   Total Payment Needed: GH₵${totalNeeded.toFixed(2)}\n`);

                if (totalNeeded > 0) {
                    console.log(`💸 Making final payment of GH₵${totalNeeded.toFixed(2)}...\n`);
                    
                    const repaymentResponse = await fetch(`${API_BASE}/transactions`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            accountId: targetLoan.accountId,
                            type: 'LOAN_REPAYMENT',
                            amount: totalNeeded,
                            description: 'Final completion payment - guarantor first priority'
                        })
                    });

                    if (repaymentResponse.ok) {
                        const repaymentResult = await repaymentResponse.json();
                        console.log('✅ PAYMENT PROCESSED!');
                        console.log('📊 Payment Breakdown:');
                        console.log(`   Total Payment: GH₵${totalNeeded.toFixed(2)}`);
                        console.log(`   Interest Portion: GH₵${repaymentResult.repaymentDetails?.interestPortion?.toFixed(2) || 'N/A'}`);
                        console.log(`   Principal Portion: GH₵${repaymentResult.repaymentDetails?.principalPortion?.toFixed(2) || 'N/A'}`);
                        console.log(`   Guarantor Reimbursed: GH₵${Math.min(repaymentResult.repaymentDetails?.principalPortion || 0, stillOwed).toFixed(2)}`);
                        console.log(`   Borrower Benefit: GH₵${repaymentResult.repaymentDetails?.borrowerBenefitAmount?.toFixed(2) || 'N/A'}`);
                        console.log(`   Guarantor Still Owed: GH₵${repaymentResult.repaymentDetails?.guarantorStillOwed?.toFixed(2) || 'N/A'}`);
                        console.log(`   New Outstanding: GH₵${repaymentResult.repaymentDetails?.newOutstandingBalance?.toFixed(2) || 'N/A'}`);
                        console.log(`   New Amount Paid: GH₵${repaymentResult.repaymentDetails?.newAmountPaid?.toFixed(2) || 'N/A'}`);
                        console.log(`   Loan Fully Paid: ${repaymentResult.repaymentDetails?.isFullyPaid ? '✅ YES' : '❌ NO'}\n`);

                        // Check final loan status
                        console.log('🔄 Checking final loan status...');
                        const finalLoanResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
                        const finalLoansData = await finalLoanResponse.json();
                        const finalLoan = finalLoansData.loans?.find(loan => loan.id === targetLoan.id);
                        
                        if (finalLoan) {
                            console.log(`   Final Status: ${finalLoan.status}`);
                            console.log(`   Final Amount Paid: GH₵${finalLoan.amountPaid}`);
                            console.log(`   Final Outstanding: GH₵${finalLoan.outstandingBalance}\n`);
                            
                            // Verify final guarantor status
                            const finalTransactionsResponse = await fetch(`${API_BASE}/transactions?accountId=${targetLoan.guarantor1AccountId}&limit=100`, { headers });
                            if (finalTransactionsResponse.ok) {
                                const finalTransactionsData = await finalTransactionsResponse.json();
                                const finalReimbursements = finalTransactionsData.transactions?.filter(txn => 
                                    txn.description?.includes('Guarantor reimbursement') || 
                                    txn.description?.includes('reimbursement') ||
                                    txn.reference?.includes('GRB-')
                                ) || [];
                                
                                const finalTotalReimbursed = finalReimbursements.reduce((sum, txn) => sum + Number(txn.amount), 0);
                                const finalStillOwed = Math.max(0, guarantor1Contribution - finalTotalReimbursed);
                                
                                console.log('🎯 FINAL VERIFICATION:');
                                console.log(`   ✓ Total Payable Met: ${Number(finalLoan.amountPaid) >= Number(finalLoan.totalPayable) ? '✅ YES' : '❌ NO'} (${finalLoan.amountPaid}/${finalLoan.totalPayable})`);
                                console.log(`   ✓ Outstanding Balance Zero: ${Number(finalLoan.outstandingBalance) === 0 ? '✅ YES' : '❌ NO'} (${finalLoan.outstandingBalance})`);
                                console.log(`   ✓ Guarantor Fully Reimbursed: ${finalStillOwed === 0 ? '✅ YES' : '❌ NO'} (Still owed: ${finalStillOwed.toFixed(2)})`);
                                console.log(`   ✓ Loan Status: ${finalLoan.status}`);
                                
                                if (finalLoan.status === 'PAID' && finalStillOwed === 0 && Number(finalLoan.outstandingBalance) === 0) {
                                    console.log('\n🎉 SUCCESS! Guarantor-first logic working correctly!');
                                    console.log('✅ Loan is properly marked as PAID only after guarantor is fully reimbursed!');
                                } else {
                                    console.log('\n⚠️  There may still be issues with the completion logic');
                                }
                            }
                        }
                    } else {
                        const error = await repaymentResponse.json();
                        console.log('❌ Payment failed:', error.error);
                    }
                } else {
                    console.log('✅ Loan should already be complete!');
                    
                    // Verify current status is correct
                    if (targetLoan.status === 'PAID' && stillOwed === 0) {
                        console.log('✅ Confirmed: Loan is correctly marked as PAID with guarantor fully reimbursed!');
                    } else {
                        console.log('⚠️  Status mismatch - should be PAID but isn\'t');
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
testGuarantorFirstLogic();
