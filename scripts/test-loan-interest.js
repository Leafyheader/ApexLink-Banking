// Test loan interest calculation

const BASE_URL = 'http://localhost:5000/api';

async function testLoanInterest() {
    try {
        console.log('🧪 Testing Loan Interest Implementation...\n');

        // Step 1: Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const { token } = await loginResponse.json();
        console.log('✅ Login successful\n');

        // Step 2: Check if there are any active loans
        console.log('2️⃣ Checking for active loans...');
        const loansResponse = await fetch(`${BASE_URL}/loans`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!loansResponse.ok) {
            throw new Error(`Failed to fetch loans: ${loansResponse.status}`);
        }

        const loansData = await loansResponse.json();
        const loans = loansData.loans || loansData;
        const activeLoans = loans.filter(loan => loan.status === 'ACTIVE');

        console.log(`✅ Found ${activeLoans.length} active loans`);
        
        if (activeLoans.length > 0) {
            const loan = activeLoans[0];
            console.log(`   Sample loan: Amount $${loan.amount}, Interest Rate: ${loan.interestRate}%`);
            console.log(`   Outstanding Balance: $${Math.abs(loan.outstandingBalance || loan.account?.balance || 0)}\n`);
        } else {
            console.log('⚠️ No active loans found for interest calculation\n');
        }

        // Step 3: Calculate daily loan interest
        console.log('3️⃣ Calculating daily loan interest...');
        const interestResponse = await fetch(`${BASE_URL}/bank-income/calculate-daily-interest`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!interestResponse.ok) {
            const errorText = await interestResponse.text();
            throw new Error(`Interest calculation failed: ${interestResponse.status} - ${errorText}`);
        }

        const interestResult = await interestResponse.json();
        console.log('✅ Daily loan interest calculated!');
        console.log(`   Records created: ${interestResult.recordsCreated}`);
        console.log(`   Total interest income: $${interestResult.totalInterestIncome}`);
        
        if (interestResult.records && interestResult.records.length > 0) {
            console.log('   Individual records:');
            interestResult.records.forEach((record, index) => {
                console.log(`     ${index + 1}. $${record.amount} - ${record.customerName}`);
            });
        }
        console.log('');

        // Step 4: Check updated bank income stats
        console.log('4️⃣ Checking updated bank income statistics...');
        const statsResponse = await fetch(`${BASE_URL}/bank-income/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Bank income statistics:');
            console.log(`   Total income: $${stats.totalIncome}`);
            console.log(`   Total records: ${stats.totalCount}`);
            
            if (stats.breakdown.withdrawal_charge) {
                console.log(`   Withdrawal charges: $${stats.breakdown.withdrawal_charge.amount} (${stats.breakdown.withdrawal_charge.count} charges)`);
            }
            
            if (stats.breakdown.loan_interest) {
                console.log(`   Loan interest: $${stats.breakdown.loan_interest.amount} (${stats.breakdown.loan_interest.count} records)`);
            }
        } else {
            console.log('⚠️ Could not fetch bank income statistics');
        }

        // Step 5: Get breakdown by period
        console.log('\n5️⃣ Getting income breakdown...');
        const breakdownResponse = await fetch(`${BASE_URL}/bank-income/breakdown?period=day`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (breakdownResponse.ok) {
            const breakdown = await breakdownResponse.json();
            console.log('✅ Daily income breakdown:');
            console.log(`   Period: ${breakdown.period}`);
            console.log(`   Date range: ${new Date(breakdown.dateRange.from).toLocaleDateString()} - ${new Date(breakdown.dateRange.to).toLocaleDateString()}`);
            console.log(`   Total income: $${breakdown.stats.totalIncome}`);
            console.log(`   Recent records: ${breakdown.recentRecords.length}`);
            
            if (breakdown.recentRecords.length > 0) {
                console.log('   Latest records:');
                breakdown.recentRecords.slice(0, 3).forEach((record, index) => {
                    console.log(`     ${index + 1}. ${record.type.toUpperCase()}: $${record.amount} - ${record.customerName}`);
                });
            }
        } else {
            console.log('⚠️ Could not fetch income breakdown');
        }

        console.log('\n🎉 Loan interest test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoanInterest();
