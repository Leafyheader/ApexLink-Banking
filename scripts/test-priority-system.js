// Test to verify the corrected priority system: Guarantor → Interest → Principal
const API_BASE = 'http://localhost:5000/api';

async function testPrioritySystem() {
    try {
        console.log('🎯 PRIORITY SYSTEM TEST\n');
        console.log('Expected Priority: Guarantor → Interest → Principal\n');
        console.log('Test Scenario:');
        console.log('- Loan: ₵1,000 principal + ₵100 interest = ₵1,100 total');
        console.log('- Guarantor contributed: ₵500 (50% of principal)');
        console.log('- Payment: ₵200');
        console.log('- Expected calculation:');
        console.log('  • Interest: ₵200 × 9.09% = ₵18.18');
        console.log('  • Principal: ₵200 - ₵18.18 = ₵181.82');
        console.log('  • Priority: Guarantor gets reimbursed first from principal\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Create a fresh test scenario by finding a loan or creating one
        console.log('🔍 Finding a suitable test loan...\n');
        
        const loansResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loansResponse.json();
        
        // Find a loan that matches our criteria (₵1000 principal, 10% interest, with guarantors)
        let testLoan = loansData.loans?.find(loan => 
            Number(loan.amount) === 1000 && 
            Number(loan.interestRate) === 10 &&
            loan.guarantor1Id
        );

        if (!testLoan) {
            console.log('❌ No suitable test loan found with ₵1000 principal and 10% interest');
            return;
        }

        console.log('✅ Found test loan:');
        console.log(`   ID: ${testLoan.id}`);
        console.log(`   Principal: ₵${testLoan.amount}`);
        console.log(`   Interest Rate: ${testLoan.interestRate}%`);
        console.log(`   Total Payable: ₵${testLoan.totalPayable}`);
        console.log(`   Amount Paid: ₵${testLoan.amountPaid}`);
        console.log(`   Outstanding: ₵${testLoan.outstandingBalance}`);
        console.log(`   Status: ${testLoan.status}\n`);

        // Check current guarantor status
        const guarantor1Contribution = testLoan.guarantor1Percentage ? (testLoan.amount * testLoan.guarantor1Percentage) / 100 : 0;
        console.log('👥 Guarantor Status:');
        console.log(`   Expected Contribution: ₵${guarantor1Contribution}`);

        // Check guarantor reimbursement status
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
                
                console.log(`   Already Reimbursed: ₵${totalReimbursed.toFixed(2)}`);
                console.log(`   Still Owed: ₵${guarantorStillOwed.toFixed(2)}\n`);
            }
        }

        // Check current bank interest received
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

        // Make a test payment of ₵200
        console.log('💸 Making test payment of ₵200...\n');
        
        const paymentResponse = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                accountId: testLoan.accountId,
                type: 'LOAN_REPAYMENT',
                amount: 200,
                description: 'Test payment for priority system verification'
            })
        });

        if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            console.log('✅ PAYMENT PROCESSED!');
            console.log('📊 Payment Breakdown:');
            console.log(`   Total Payment: ₵200.00`);
            console.log(`   Interest Portion: ₵${Number(paymentResult.repaymentDetails?.interestPortion || 0).toFixed(2)}`);
            console.log(`   Principal Portion: ₵${Number(paymentResult.repaymentDetails?.principalPortion || 0).toFixed(2)}`);
            console.log(`   Guarantor Reimbursed: ₵${Number(paymentResult.repaymentDetails?.principalPortion || 0) - Number(paymentResult.repaymentDetails?.borrowerBenefitAmount || 0)}`);
            console.log(`   Borrower Benefit: ₵${Number(paymentResult.repaymentDetails?.borrowerBenefitAmount || 0).toFixed(2)}`);
            
            // Verify against expected calculations
            const expectedInterest = 200 * (100 / 1100); // 200 * 9.09% = 18.18
            const actualInterest = Number(paymentResult.repaymentDetails?.interestPortion || 0);
            const expectedPrincipal = 200 - expectedInterest;
            const actualPrincipal = Number(paymentResult.repaymentDetails?.principalPortion || 0);
            
            console.log('\n🎯 VERIFICATION:');
            console.log(`   Expected Interest: ₵${expectedInterest.toFixed(2)}`);
            console.log(`   Actual Interest: ₵${actualInterest.toFixed(2)}`);
            console.log(`   Interest Match: ${Math.abs(expectedInterest - actualInterest) < 0.01 ? '✅' : '❌'}`);
            console.log(`   Expected Principal: ₵${expectedPrincipal.toFixed(2)}`);
            console.log(`   Actual Principal: ₵${actualPrincipal.toFixed(2)}`);
            console.log(`   Principal Match: ${Math.abs(expectedPrincipal - actualPrincipal) < 0.01 ? '✅' : '❌'}`);

            if (paymentResult.repaymentDetails?.disbursements) {
                console.log('\n💰 Disbursements:');
                paymentResult.repaymentDetails.disbursements.forEach(d => {
                    console.log(`   ${d.guarantorName}: ₵${Number(d.amount).toFixed(2)}`);
                });
            }

            // Check if interest was properly recorded
            console.log('\n🔄 Checking bank income update...');
            const updatedIncomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=10`, { headers });
            if (updatedIncomeResponse.ok) {
                const updatedIncomeData = await updatedIncomeResponse.json();
                const recentInterest = updatedIncomeData.records?.find(r => 
                    r.type === 'LOAN_INTEREST' && 
                    r.accountId === testLoan.accountId &&
                    r.sourceId === paymentResult.reference
                );
                
                if (recentInterest) {
                    console.log(`   ✅ Interest recorded: ₵${Number(recentInterest.amount).toFixed(2)}`);
                } else {
                    console.log('   ❌ Interest not found in bank income records');
                }
            }

            console.log('\n🎉 Priority system test completed!');

        } else {
            const error = await paymentResponse.json();
            console.log('❌ Payment failed:', error.error);
        }

        console.log('\n🎯 TEST COMPLETE!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testPrioritySystem();
