// Debug script to test guarantor details API
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function debugGuarantorDetails() {
    console.log('🔍 Debugging Guarantor Details Issue\n');

    try {
        // First, let's try to authenticate
        console.log('1️⃣ Attempting authentication...');
        
        // Try different auth formats
        const authFormats = [
            { username: 'admin', password: 'admin123' },
            { name: 'admin', password: 'admin123' },
            { email: 'admin@example.com', password: 'admin123' }
        ];

        let token = null;
        for (const format of authFormats) {
            try {
                const authResponse = await fetch(`${BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(format)
                });

                if (authResponse.ok) {
                    const authData = await authResponse.json();
                    token = authData.token;
                    console.log(`✅ Auth successful with format:`, Object.keys(format));
                    break;
                } else {
                    const errorText = await authResponse.text();
                    console.log(`❌ Auth failed with ${JSON.stringify(format)}:`, errorText);
                }
            } catch (err) {
                console.log(`❌ Auth error with ${JSON.stringify(format)}:`, err.message);
            }
        }

        if (!token) {
            console.log('❌ Could not authenticate with any format. Let\'s check available endpoints...');
            
            // Check available endpoints
            try {
                const response = await fetch(`${BASE_URL}/loans`, {
                    headers: { 'Authorization': 'Bearer invalid-token' }
                });
                const errorText = await response.text();
                console.log('API Response:', errorText);
            } catch (err) {
                console.log('API Connection Error:', err.message);
            }
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Test loans endpoint
        console.log('\n2️⃣ Testing loans endpoint...');
        const loansResponse = await fetch(`${BASE_URL}/loans?limit=5`, {
            headers
        });

        if (!loansResponse.ok) {
            const errorText = await loansResponse.text();
            console.log('❌ Loans endpoint failed:', errorText);
            return;
        }

        const loansData = await loansResponse.json();
        console.log(`✅ Found ${loansData.loans?.length || 0} loans`);

        if (loansData.loans && loansData.loans.length > 0) {
            const firstLoan = loansData.loans[0];
            console.log('\n📄 Sample loan data:');
            console.log(`   ID: ${firstLoan.id}`);
            console.log(`   Customer: ${firstLoan.customer?.name || 'N/A'}`);
            console.log(`   Amount: ${firstLoan.amount}`);
            console.log(`   Has guarantor1: ${!!firstLoan.guarantor1}`);
            console.log(`   Has guarantor2: ${!!firstLoan.guarantor2}`);
            console.log(`   Has guarantor3: ${!!firstLoan.guarantor3}`);

            // 3. Test individual loan details endpoint
            console.log('\n3️⃣ Testing enhanced loan details endpoint...');
            const detailsResponse = await fetch(`${BASE_URL}/loans/${firstLoan.id}`, {
                headers
            });

            if (!detailsResponse.ok) {
                const errorText = await detailsResponse.text();
                console.log('❌ Loan details failed:', errorText);
                return;
            }

            const detailsData = await detailsResponse.json();
            const loanDetails = detailsData.loan;

            console.log('✅ Loan details retrieved successfully!');
            console.log('\n📋 Enhanced loan details:');
            console.log(`   ID: ${loanDetails.id}`);
            console.log(`   Customer: ${loanDetails.customer?.name}`);
            console.log(`   Amount: ${loanDetails.amount}`);
            console.log(`   Has guarantorDetails: ${!!loanDetails.guarantorDetails}`);
            console.log(`   GuarantorDetails length: ${loanDetails.guarantorDetails?.length || 0}`);

            if (loanDetails.guarantorDetails && loanDetails.guarantorDetails.length > 0) {
                console.log('\n🤝 Enhanced guarantor details found:');
                loanDetails.guarantorDetails.forEach((guarantor, index) => {
                    console.log(`\n   Guarantor ${index + 1}:`);
                    console.log(`   ├─ Name: ${guarantor.name}`);
                    console.log(`   ├─ Status: ${guarantor.status}`);
                    console.log(`   ├─ Account: ${guarantor.account?.accountNumber}`);
                    console.log(`   └─ Guaranteed Amount: ${guarantor.guaranteedAmount}`);
                });
            } else {
                console.log('\n⚠️ No enhanced guarantor details found');
                console.log('   This could mean:');
                console.log('   - This loan has no guarantors');
                console.log('   - The LoanGuarantor table is empty');
                console.log('   - The loan was created with legacy guarantor format');
                
                // Check for legacy guarantor data
                if (firstLoan.guarantor1 || firstLoan.guarantor2 || firstLoan.guarantor3) {
                    console.log('\n📝 Legacy guarantor data detected:');
                    if (firstLoan.guarantor1) console.log(`   - Guarantor1: ${firstLoan.guarantor1.name}`);
                    if (firstLoan.guarantor2) console.log(`   - Guarantor2: ${firstLoan.guarantor2.name}`);
                    if (firstLoan.guarantor3) console.log(`   - Guarantor3: ${firstLoan.guarantor3.name}`);
                }
            }

            // 4. Check LoanGuarantor table directly
            console.log('\n4️⃣ Checking database state...');
            console.log('   Backend logs should show if LoanGuarantor query worked');
            
            return {
                hasLoans: true,
                hasGuarantorDetails: !!(loanDetails.guarantorDetails && loanDetails.guarantorDetails.length > 0),
                sampleLoanId: firstLoan.id
            };

        } else {
            console.log('\n⚠️ No loans found in the system');
            console.log('   You may need to create a loan with guarantors first');
            return {
                hasLoans: false,
                hasGuarantorDetails: false
            };
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the debug
debugGuarantorDetails().then(result => {
    console.log('\n🎯 Debug Summary:');
    if (result) {
        console.log(`   Has loans: ${result.hasLoans}`);
        console.log(`   Has guarantor details: ${result.hasGuarantorDetails}`);
        if (result.sampleLoanId) {
            console.log(`   Sample loan ID: ${result.sampleLoanId}`);
        }
    }
    console.log('\n💡 Next steps:');
    console.log('   1. Check backend logs for database query errors');
    console.log('   2. Verify LoanGuarantor table has data');
    console.log('   3. Test frontend with existing loan data');
    console.log('   4. Create new loan with guarantors if needed');
});