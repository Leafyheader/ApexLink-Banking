// Debug account ID mismatch
const API_BASE = 'http://localhost:5000/api';

async function debugAccountId() {
    try {
        console.log('🔍 DEBUGGING ACCOUNT ID MISMATCH\n');

        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const { token } = await loginResponse.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get our test loan
        const loansResponse = await fetch(`${API_BASE}/loans?limit=100`, { headers });
        const loansData = await loansResponse.json();
        const testLoan = loansData.loans?.find(loan => loan.id === 'a17c7d27-a9d2-4557-a029-918cdc4894b4');

        if (!testLoan) {
            console.log('❌ Test loan not found');
            return;
        }

        console.log('📊 Test Loan Details:');
        console.log(`   Loan ID: ${testLoan.id}`);
        console.log(`   Account ID: ${testLoan.accountId}`);
        console.log(`   Account Number: ${testLoan.account?.accountNumber}`);
        console.log('   Server log showed: 82f979d7-84e0-41b5-b2e2-7bfed22b90fb\n');

        // Check if these match
        if (testLoan.accountId === '82f979d7-84e0-41b5-b2e2-7bfed22b90fb') {
            console.log('✅ Account IDs match!');
        } else {
            console.log('⚠️ Account IDs do NOT match!');
            console.log(`   Test loan account: ${testLoan.accountId}`);
            console.log(`   Server processed: 82f979d7-84e0-41b5-b2e2-7bfed22b90fb`);
        }

        // Check all bank income records with the server account ID
        const incomeResponse = await fetch(`${API_BASE}/bank-income/recent?limit=100`, { headers });
        if (incomeResponse.ok) {
            const incomeData = await incomeResponse.json();
            
            // Look for records with the account ID from server logs
            const serverAccountRecords = incomeData.records?.filter(r => 
                r.accountId === '82f979d7-84e0-41b5-b2e2-7bfed22b90fb'
            ) || [];
            
            console.log(`\n🏦 Records for server account ID (${serverAccountRecords.length} found):`);
            serverAccountRecords.forEach((record, index) => {
                console.log(`   ${index + 1}. Type: ${record.type}, Amount: ₵${Number(record.amount).toFixed(2)}`);
            });

            // Look for records with our test loan account ID
            const testLoanRecords = incomeData.records?.filter(r => 
                r.accountId === testLoan.accountId
            ) || [];
            
            console.log(`\n📝 Records for test loan account ID (${testLoanRecords.length} found):`);
            testLoanRecords.forEach((record, index) => {
                console.log(`   ${index + 1}. Type: ${record.type}, Amount: ₵${Number(record.amount).toFixed(2)}`);
            });

            // Check all loan interest records regardless of account
            const allLoanInterest = incomeData.records?.filter(r => r.type === 'LOAN_INTEREST') || [];
            console.log(`\n💰 All loan interest records (${allLoanInterest.length} found):`);
            allLoanInterest.forEach((record, index) => {
                console.log(`   ${index + 1}. Account: ${record.accountId}, Amount: ₵${Number(record.amount).toFixed(2)}`);
            });
        }

        console.log('\n🎯 DEBUG COMPLETE!\n');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

// Run the debug
debugAccountId();
