// Simple script to add money to Elizabeth's account and create a new loan
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function addMoneyAndCreateLoan() {
    console.log('💰 Adding Money to Account and Creating New Loan\n');

    try {
        // 1. Authenticate
        const authResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const authData = await authResponse.json();
        const token = authData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('✅ Authenticated successfully\n');

        // 2. Add money to Elizabeth's account via deposit transaction
        console.log('2️⃣ Adding money to Elizabeth\'s account...');
        
        // Elizabeth's account ID from our check: a4bbe10e-e2a3-49f7-b0a4-61aa78c5b2cc
        const depositResponse = await fetch(`${BASE_URL}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                accountId: 'a4bbe10e-e2a3-49f7-b0a4-61aa78c5b2cc', // Elizabeth's savings account ID
                type: 'DEPOSIT',
                amount: 1000,
                description: 'Test deposit for guarantor capability'
            })
        });

        if (!depositResponse.ok) {
            const errorText = await depositResponse.text();
            console.log('❌ Failed to add deposit:', errorText);
            return;
        }

        console.log('✅ Deposited $1000 to Elizabeth\'s account\n');

        // 3. Now create a new loan with guarantor
        console.log('3️⃣ Creating new loan with guarantor...');
        
        const loanData = {
            customerId: 'c76f2d78-7e64-447a-8672-8d11cdd92171', // Marian Otoo Pra
            amount: 800,
            interestRate: 12,
            term: 12,
            repaymentFrequency: 'MONTHLY',
            guarantor1Id: 'e851e707-87dc-4660-baf6-9ccca0645457', // Elizabeth Acquah
            guarantor1AccountId: 'a4bbe10e-e2a3-49f7-b0a4-61aa78c5b2cc', // Elizabeth's savings account ID
            guarantor1Percentage: 50
        };

        console.log('📋 New loan details:');
        console.log(`   Borrower: Marian Otoo Pra`);
        console.log(`   Amount: $${loanData.amount}`);
        console.log(`   Guarantor: Elizabeth Acquah`);
        console.log(`   Guarantee: ${loanData.guarantor1Percentage}% ($${loanData.amount * loanData.guarantor1Percentage / 100})`);

        const createResponse = await fetch(`${BASE_URL}/loans`, {
            method: 'POST',
            headers,
            body: JSON.stringify(loanData)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.log('❌ Failed to create loan:', errorText);
            return;
        }

        const loanResult = await createResponse.json();
        const newLoanId = loanResult.loan.id;
        
        console.log('\n✅ New loan created successfully!');
        console.log(`📄 Loan ID: ${newLoanId}`);

        // 4. Test the loan details immediately
        console.log('\n4️⃣ Testing loan details immediately...');
        
        const detailsResponse = await fetch(`${BASE_URL}/loans/${newLoanId}`, {
            headers
        });

        if (!detailsResponse.ok) {
            const errorText = await detailsResponse.text();
            console.log('❌ Failed to fetch loan details:', errorText);
            return;
        }

        const detailsData = await detailsResponse.json();
        console.log('✅ Loan details retrieved!');
        console.log(`   GuarantorDetails count: ${detailsData.loan.guarantorDetails?.length || 0}`);

        if (detailsData.loan.guarantorDetails && detailsData.loan.guarantorDetails.length > 0) {
            console.log('\n🎉 SUCCESS! Enhanced guarantor details are working!');
            detailsData.loan.guarantorDetails.forEach((guarantor, index) => {
                console.log(`\n   Guarantor ${index + 1}:`);
                console.log(`   ├─ Name: ${guarantor.name}`);
                console.log(`   ├─ Status: ${guarantor.status}`);
                console.log(`   ├─ Account: ${guarantor.account.accountNumber}`);
                console.log(`   └─ Guaranteed Amount: $${guarantor.guaranteedAmount}`);
            });
            
            return {
                success: true,
                loanId: newLoanId,
                hasGuarantorDetails: true
            };
        } else {
            console.log('\n⚠️ Still no guarantor details - checking backend logs needed');
            return {
                success: false,
                loanId: newLoanId,
                hasGuarantorDetails: false
            };
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return { success: false, error: error.message };
    }
}

addMoneyAndCreateLoan().then(result => {
    console.log('\n📊 Final Result:');
    if (result) {
        console.log(`   Success: ${result.success}`);
        if (result.loanId) {
            console.log(`   New Loan ID: ${result.loanId}`);
            console.log(`   Has Guarantor Details: ${result.hasGuarantorDetails}`);
        }
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }
    
    if (result?.hasGuarantorDetails) {
        console.log('\n🚀 Ready for Frontend Testing!');
        console.log('   1. Open http://localhost:5174');
        console.log('   2. Go to Loans page');
        console.log('   3. Find the newest loan and click View Details');
        console.log('   4. You should see comprehensive guarantor information!');
    }
});