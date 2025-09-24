// Test to verify guarantor reimbursement logic
const API_BASE = 'http://localhost:5000/api';

async function verifyGuarantorReimbursement() {
    try {
        console.log('🔍 GUARANTOR REIMBURSEMENT VERIFICATION TEST\n');
        console.log('==============================================\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get all loans to find one with guarantors
        console.log('📋 Finding loan with guarantors...\n');
        const loansResponse = await fetch(`${API_BASE}/loans?limit=50`, { headers });
        const loansData = await loansResponse.json();
        
        if (!loansData.loans || loansData.loans.length === 0) {
            console.log('❌ No loans found');
            return;
        }

        // Find a loan with guarantors
        const loanWithGuarantors = loansData.loans.find(loan => 
            loan.guarantor1Id || loan.guarantor2Id || loan.guarantor3Id
        );

        if (!loanWithGuarantors) {
            console.log('❌ No loans with guarantors found');
            return;
        }

        console.log(`✅ Found loan: ${loanWithGuarantors.id}`);
        console.log(`   Account: ${loanWithGuarantors.account?.accountNumber}`);
        console.log(`   Customer: ${loanWithGuarantors.customer?.name}`);
        console.log(`   Principal: GH₵${loanWithGuarantors.amount}`);
        console.log(`   Interest Rate: ${loanWithGuarantors.interestRate}%`);
        console.log(`   Total Payable: GH₵${loanWithGuarantors.totalPayable}`);
        console.log(`   Outstanding: GH₵${loanWithGuarantors.outstandingBalance}`);
        console.log(`   Amount Paid: GH₵${loanWithGuarantors.amountPaid}\n`);

        // Display guarantor information
        console.log('👥 Guarantors:');
        let totalGuarantorPercentage = 0;
        let guarantorContributions = [];

        if (loanWithGuarantors.guarantor1Id) {
            const percentage = loanWithGuarantors.guarantor1Percentage || 0;
            const contribution = (loanWithGuarantors.amount * percentage) / 100;
            totalGuarantorPercentage += percentage;
            guarantorContributions.push({
                name: loanWithGuarantors.guarantor1?.name || 'Unknown',
                percentage,
                contribution,
                accountId: loanWithGuarantors.guarantor1AccountId
            });
            console.log(`   1. ${loanWithGuarantors.guarantor1?.name || 'Unknown'} - ${percentage}% (GH₵${contribution.toFixed(2)})`);
        }

        if (loanWithGuarantors.guarantor2Id) {
            const percentage = loanWithGuarantors.guarantor2Percentage || 0;
            const contribution = (loanWithGuarantors.amount * percentage) / 100;
            totalGuarantorPercentage += percentage;
            guarantorContributions.push({
                name: loanWithGuarantors.guarantor2?.name || 'Unknown',
                percentage,
                contribution,
                accountId: loanWithGuarantors.guarantor2AccountId
            });
            console.log(`   2. ${loanWithGuarantors.guarantor2?.name || 'Unknown'} - ${percentage}% (GH₵${contribution.toFixed(2)})`);
        }

        if (loanWithGuarantors.guarantor3Id) {
            const percentage = loanWithGuarantors.guarantor3Percentage || 0;
            const contribution = (loanWithGuarantors.amount * percentage) / 100;
            totalGuarantorPercentage += percentage;
            guarantorContributions.push({
                name: loanWithGuarantors.guarantor3?.name || 'Unknown',
                percentage,
                contribution,
                accountId: loanWithGuarantors.guarantor3AccountId
            });
            console.log(`   3. ${loanWithGuarantors.guarantor3?.name || 'Unknown'} - ${percentage}% (GH₵${contribution.toFixed(2)})`);
        }

        const totalGuarantorContribution = guarantorContributions.reduce((sum, g) => sum + g.contribution, 0);
        console.log(`\n💰 Total Guarantor Contribution: GH₵${totalGuarantorContribution.toFixed(2)} (${totalGuarantorPercentage}%)\n`);

        // Get guarantor reimbursement transactions
        console.log('🔍 Checking guarantor reimbursement history...\n');
        
        const guarantorAccountIds = guarantorContributions.map(g => g.accountId).filter(Boolean);
        let totalReimbursedSoFar = 0;
        
        for (const contribution of guarantorContributions) {
            if (!contribution.accountId) continue;
            
            const transactionsResponse = await fetch(`${API_BASE}/transactions?accountId=${contribution.accountId}&limit=100`, { headers });
            if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                const reimbursements = transactionsData.transactions?.filter(txn => 
                    txn.description?.includes('Guarantor reimbursement') || 
                    txn.description?.includes('reimbursement') ||
                    txn.reference?.includes('GRB-')
                ) || [];
                
                const totalReimbursed = reimbursements.reduce((sum, txn) => sum + Number(txn.amount), 0);
                totalReimbursedSoFar += totalReimbursed;
                
                console.log(`   ${contribution.name}:`);
                console.log(`     Original Contribution: GH₵${contribution.contribution.toFixed(2)}`);
                console.log(`     Total Reimbursed: GH₵${totalReimbursed.toFixed(2)}`);
                console.log(`     Still Owed: GH₵${Math.max(0, contribution.contribution - totalReimbursed).toFixed(2)}`);
                console.log(`     Reimbursement Transactions: ${reimbursements.length}\n`);
                
                if (reimbursements.length > 0) {
                    console.log('     Recent Reimbursements:');
                    reimbursements.slice(-3).forEach(txn => {
                        console.log(`       GH₵${Number(txn.amount).toFixed(2)} - ${txn.date?.split('T')[0]} - ${txn.description}`);
                    });
                    console.log('');
                }
            }
        }

        const totalStillOwed = Math.max(0, totalGuarantorContribution - totalReimbursedSoFar);
        console.log(`📊 SUMMARY:`);
        console.log(`   Total Guarantor Contribution: GH₵${totalGuarantorContribution.toFixed(2)}`);
        console.log(`   Total Reimbursed So Far: GH₵${totalReimbursedSoFar.toFixed(2)}`);
        console.log(`   Total Still Owed to Guarantors: GH₵${totalStillOwed.toFixed(2)}\n`);

        // Test a small repayment to see the logic in action
        if (loanWithGuarantors.outstandingBalance > 0) {
            console.log('💸 Testing a small repayment of GH₵100...\n');
            
            const repaymentResponse = await fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    accountId: loanWithGuarantors.accountId,
                    type: 'LOAN_REPAYMENT',
                    amount: 100,
                    description: 'Test repayment for guarantor verification'
                })
            });

            if (repaymentResponse.ok) {
                const repaymentResult = await repaymentResponse.json();
                console.log('✅ Repayment processed successfully!');
                console.log(`   Interest Portion: GH₵${repaymentResult.repaymentDetails?.interestPortion?.toFixed(2) || 'N/A'}`);
                console.log(`   Principal Portion: GH₵${repaymentResult.repaymentDetails?.principalPortion?.toFixed(2) || 'N/A'}`);
                console.log(`   Guarantor Reimbursed: GH₵${(repaymentResult.repaymentDetails?.principalPortion - repaymentResult.repaymentDetails?.borrowerBenefitAmount)?.toFixed(2) || 'N/A'}`);
                console.log(`   Borrower Benefit: GH₵${repaymentResult.repaymentDetails?.borrowerBenefitAmount?.toFixed(2) || 'N/A'}`);
                console.log(`   Guarantor Still Owed: GH₵${repaymentResult.repaymentDetails?.guarantorStillOwed?.toFixed(2) || 'N/A'}`);
                
                if (repaymentResult.repaymentDetails?.disbursements) {
                    console.log('\n   Disbursements:');
                    repaymentResult.repaymentDetails.disbursements.forEach(d => {
                        console.log(`     ${d.guarantorName}: GH₵${Number(d.amount).toFixed(2)} (${d.percentage}%)`);
                    });
                }
            } else {
                const error = await repaymentResponse.json();
                console.log('❌ Repayment failed:', error.error);
            }
        }

        console.log('\n🎯 VERIFICATION COMPLETE!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
verifyGuarantorReimbursement();
