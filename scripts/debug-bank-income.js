// Debug bank income records for the test loan
const API_BASE = 'http://localhost:5000/api';

async function debugBankIncomeRecords() {
    try {
        console.log('🔍 DEBUGGING BANK INCOME RECORDS\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get all bank income records
        console.log('📊 Checking all bank income records...');
        const allIncomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=100`, { headers });
        if (allIncomeResponse.ok) {
            const allIncomeData = await allIncomeResponse.json();
            console.log(`   Total records found: ${allIncomeData.records?.length || 0}`);
            
            // Filter for loan interest
            const loanInterestRecords = allIncomeData.records?.filter(r => r.type === 'LOAN_INTEREST') || [];
            console.log(`   Loan interest records: ${loanInterestRecords.length}`);
            
            if (loanInterestRecords.length > 0) {
                console.log('\n📝 Loan Interest Records:');
                loanInterestRecords.forEach((record, index) => {
                    console.log(`   ${index + 1}. Account: ${record.accountId}`);
                    console.log(`      Amount: ₵${Number(record.amount).toFixed(2)}`);
                    console.log(`      Description: ${record.description}`);
                    console.log(`      Date: ${record.createdAt?.split('T')[0]}`);
                    console.log(`      Source: ${record.sourceId}\n`);
                });

                // Check for our specific loan
                const testLoanId = 'a17c7d27-a9d2-4557-a029-918cdc4894b4';
                const loansResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
                const loansData = await loansResponse.json();
                const testLoan = loansData.loans?.find(loan => loan.id === testLoanId);
                
                if (testLoan) {
                    console.log(`🎯 Records for test loan account ${testLoan.accountId}:`);
                    const testLoanRecords = loanInterestRecords.filter(r => r.accountId === testLoan.accountId);
                    console.log(`   Found ${testLoanRecords.length} records for this account`);
                    
                    if (testLoanRecords.length > 0) {
                        const totalInterest = testLoanRecords.reduce((sum, r) => sum + Number(r.amount), 0);
                        console.log(`   Total interest recorded: ₵${totalInterest.toFixed(2)}`);
                        console.log('   Records:');
                        testLoanRecords.forEach((record, index) => {
                            console.log(`     ${index + 1}. ₵${Number(record.amount).toFixed(2)} - ${record.description}`);
                        });
                    } else {
                        console.log('   ❌ No interest records found for this loan account');
                        console.log('   This explains why the system thinks no interest has been paid');
                    }
                }
            } else {
                console.log('\n❌ No loan interest records found in the system');
                console.log('   This means no interest has been recorded for any loans');
            }

            // Check other types of bank income
            const otherTypes = [...new Set(allIncomeData.records?.map(r => r.type) || [])];
            console.log(`\n📊 Bank income types found: ${otherTypes.join(', ')}`);
            
        } else {
            console.log('❌ Failed to fetch bank income records');
        }

        console.log('\n🎯 DEBUG COMPLETE!\n');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

// Run the debug
debugBankIncomeRecords();
