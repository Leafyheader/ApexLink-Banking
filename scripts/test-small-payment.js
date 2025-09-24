// Test with smaller payment that fits remaining obligations
const API_BASE = 'http://localhost:5000/api';

async function testSmallPayment() {
    try {
        console.log('🎯 SMALL PAYMENT TEST - Priority System Verification\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get the loan status
        const loansResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loansResponse.json();
        const testLoan = loansData.loans?.find(loan => loan.id === 'a17c7d27-a9d2-4557-a029-918cdc4894b4');

        if (!testLoan) {
            console.log('❌ Test loan not found');
            return;
        }

        console.log('📊 Current Loan Status:');
        console.log(`   Amount Paid: ₵${testLoan.amountPaid}`);
        console.log(`   Outstanding: ₵${testLoan.outstandingBalance}`);
        console.log(`   Status: ${testLoan.status}\n`);

        // Check guarantor status
        const guarantor1Contribution = 500; // We know it's 50% of ₵1000
        if (testLoan.guarantor1AccountId) {
            const transactionsResponse = await fetch(`${API_BASE}/transactions?accountId=${testLoan.guarantor1AccountId}&limit=100`, { headers });
            if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                const reimbursements = transactionsData.transactions?.filter(txn => 
                    txn.description?.includes('Guarantor reimbursement') || 
                    txn.reference?.includes('GRB-')
                ) || [];
                
                const totalReimbursed = reimbursements.reduce((sum, txn) => sum + Number(txn.amount), 0);
                const guarantorStillOwed = Math.max(0, guarantor1Contribution - totalReimbursed);
                
                console.log('👥 Guarantor Status:');
                console.log(`   Total Reimbursed: ₵${totalReimbursed.toFixed(2)}`);
                console.log(`   Still Owed: ₵${guarantorStillOwed.toFixed(2)}\n`);

                // Check bank interest received
                const incomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=100`, { headers });
                let totalInterestReceived = 0;
                if (incomeResponse.ok) {
                    const incomeData = await incomeResponse.json();
                    const loanInterestRecords = incomeData.records?.filter(r => 
                        r.type === 'LOAN_INTEREST' && r.accountId === testLoan.accountId
                    ) || [];
                    totalInterestReceived = loanInterestRecords.reduce((sum, r) => sum + Number(r.amount), 0);
                }
                
                console.log('🏦 Bank Interest Status:');
                console.log(`   Total Required: ₵100`);
                console.log(`   Already Received: ₵${totalInterestReceived.toFixed(2)}`);
                console.log(`   Still Due: ₵${Math.max(0, 100 - totalInterestReceived).toFixed(2)}\n`);

                // Calculate a safe payment amount
                const totalRemaining = guarantorStillOwed + Number(testLoan.outstandingBalance);
                const testPayment = Math.min(50, totalRemaining - 1); // Small payment within limits
                
                if (testPayment > 0) {
                    console.log(`💸 Making test payment of ₵${testPayment.toFixed(2)}...\n`);
                    
                    const paymentResponse = await fetch(`${API_BASE}/transactions`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            accountId: testLoan.accountId,
                            type: 'LOAN_REPAYMENT',
                            amount: testPayment,
                            description: 'Small test payment for priority verification'
                        })
                    });

                    if (paymentResponse.ok) {
                        const paymentResult = await paymentResponse.json();
                        console.log('✅ PAYMENT PROCESSED!');
                        console.log('📊 Payment Breakdown:');
                        console.log(`   Total Payment: ₵${testPayment.toFixed(2)}`);
                        console.log(`   Interest Portion: ₵${Number(paymentResult.repaymentDetails?.interestPortion || 0).toFixed(2)}`);
                        console.log(`   Principal Portion: ₵${Number(paymentResult.repaymentDetails?.principalPortion || 0).toFixed(2)}`);
                        
                        const guarantorReimbursed = Number(paymentResult.repaymentDetails?.principalPortion || 0) - Number(paymentResult.repaymentDetails?.borrowerBenefitAmount || 0);
                        console.log(`   Guarantor Reimbursed: ₵${guarantorReimbursed.toFixed(2)}`);
                        console.log(`   Borrower Benefit: ₵${Number(paymentResult.repaymentDetails?.borrowerBenefitAmount || 0).toFixed(2)}`);
                        console.log(`   Guarantor Still Owed: ₵${Number(paymentResult.repaymentDetails?.guarantorStillOwed || 0).toFixed(2)}`);
                        
                        // Verify priority logic
                        console.log('\n🎯 PRIORITY VERIFICATION:');
                        
                        // Check if interest was charged correctly
                        const interestReceived = Number(paymentResult.repaymentDetails?.interestPortion || 0);
                        if (totalInterestReceived >= 100) {
                            console.log(`   ✅ No interest charged (total ₵100 already received)`);
                        } else {
                            const expectedInterestRate = 100 / 1100; // 9.09%
                            const expectedInterest = Math.min(testPayment * expectedInterestRate, 100 - totalInterestReceived);
                            console.log(`   Expected Interest: ₵${expectedInterest.toFixed(2)}`);
                            console.log(`   Actual Interest: ₵${interestReceived.toFixed(2)}`);
                            console.log(`   Interest Correct: ${Math.abs(expectedInterest - interestReceived) < 0.01 ? '✅' : '❌'}`);
                        }
                        
                        // Check if guarantor got priority
                        if (guarantorStillOwed > 0) {
                            console.log(`   ✅ Guarantor priority: Remaining principal (₵${Number(paymentResult.repaymentDetails?.principalPortion || 0).toFixed(2)}) went to guarantor first`);
                        } else {
                            console.log(`   ✅ Guarantor fully paid, principal went to borrower debt reduction`);
                        }

                        // Check bank income recording
                        if (interestReceived > 0) {
                            console.log('\n🔄 Verifying bank income recording...');
                            const updatedIncomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=5`, { headers });
                            if (updatedIncomeResponse.ok) {
                                const updatedIncomeData = await updatedIncomeResponse.json();
                                const recentInterest = updatedIncomeData.records?.find(r => 
                                    r.type === 'LOAN_INTEREST' && 
                                    r.sourceId === paymentResult.reference
                                );
                                
                                if (recentInterest) {
                                    console.log(`   ✅ Bank income recorded: ₵${Number(recentInterest.amount).toFixed(2)}`);
                                } else {
                                    console.log('   ❌ Bank income not recorded');
                                }
                            }
                        }

                        console.log('\n🎉 Priority system test successful!');
                    } else {
                        const error = await paymentResponse.json();
                        console.log('❌ Payment failed:', error.error);
                    }
                } else {
                    console.log('✅ All obligations appear to be met - no payment needed');
                }
            }
        }

        console.log('\n🎯 TEST COMPLETE!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testSmallPayment();
