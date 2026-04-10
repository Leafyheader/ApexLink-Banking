// Script to create a loan with guarantors for testing
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function createTestLoanWithGuarantor() {
    console.log('🏗️ Creating Test Loan with Guarantor\n');

    try {
        // 1. Authenticate
        console.log('1️⃣ Authenticating...');
        const authResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!authResponse.ok) {
            const errorText = await authResponse.text();
            console.log('❌ Auth failed:', errorText);
            return;
        }

        const authData = await authResponse.json();
        const token = authData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('✅ Authenticated successfully\n');

        // 2. Get customers
        console.log('2️⃣ Fetching customers...');
        const customersResponse = await fetch(`${BASE_URL}/customers?limit=10`, {
            headers
        });

        if (!customersResponse.ok) {
            const errorText = await customersResponse.text();
            console.log('❌ Failed to fetch customers:', errorText);
            return;
        }

        const customersData = await customersResponse.json();
        const customers = customersData.customers || [];
        console.log(`✅ Found ${customers.length} customers\n`);

        if (customers.length < 2) {
            console.log('❌ Need at least 2 customers to create loan with guarantor');
            return;
        }

        // 3. Find customers with suitable accounts
        console.log('3️⃣ Finding customers with suitable accounts...');
        let borrower = null;
        let guarantor = null;

        for (const customer of customers.slice(0, 5)) { // Check first 5 customers
            try {
                const accountsResponse = await fetch(`${BASE_URL}/accounts?customerId=${customer.id}`, {
                    headers
                });

                if (accountsResponse.ok) {
                    const accountsData = await accountsResponse.json();
                    const accounts = accountsData.accounts || [];
                    
                    const suitableAccount = accounts.find(acc => 
                        (acc.type === 'SAVINGS' || acc.type === 'CURRENT') && 
                        Number(acc.balance) >= 500
                    );

                    if (suitableAccount) {
                        if (!borrower) {
                            borrower = { customer, account: suitableAccount };
                            console.log(`👤 Borrower: ${customer.name} (Account: ${suitableAccount.accountNumber}, Balance: $${suitableAccount.balance})`);
                        } else if (!guarantor && customer.id !== borrower.customer.id) {
                            guarantor = { customer, account: suitableAccount };
                            console.log(`🤝 Guarantor: ${customer.name} (Account: ${suitableAccount.accountNumber}, Balance: $${suitableAccount.balance})`);
                            break;
                        }
                    }
                }
            } catch (err) {
                console.log(`⚠️ Could not fetch accounts for ${customer.name}:`, err.message);
            }
        }

        if (!borrower || !guarantor) {
            console.log('❌ Could not find suitable customers with accounts');
            console.log('   Available customers:');
            customers.slice(0, 3).forEach(c => console.log(`   - ${c.name} (ID: ${c.id})`));
            return;
        }

        console.log('\n4️⃣ Creating loan with guarantor...');
        
        // Calculate loan amount based on guarantor's balance
        // If guarantor has $500 and percentage is 50%, max loan is $1000
        const maxLoanForGuarantor = (Number(guarantor.account.balance) / 50) * 100;
        const loanAmount = Math.min(1000, Math.floor(maxLoanForGuarantor));
        
        const loanData = {
            customerId: borrower.customer.id,
            amount: loanAmount,
            interestRate: 15,
            term: 18,
            repaymentFrequency: 'MONTHLY',
            guarantor1Id: guarantor.customer.id,
            guarantor1AccountId: guarantor.account.id,
            guarantor1Percentage: 50
        };

        console.log('📋 Loan details:');
        console.log(`   Amount: $${loanData.amount}`);
        console.log(`   Interest Rate: ${loanData.interestRate}%`);
        console.log(`   Term: ${loanData.term} months`);
        console.log(`   Guarantor Percentage: ${loanData.guarantor1Percentage}%`);

        const createLoanResponse = await fetch(`${BASE_URL}/loans`, {
            method: 'POST',
            headers,
            body: JSON.stringify(loanData)
        });

        if (!createLoanResponse.ok) {
            const errorText = await createLoanResponse.text();
            console.log('❌ Failed to create loan:', errorText);
            return;
        }

        const loanResult = await createLoanResponse.json();
        console.log('\n✅ Loan created successfully!');
        console.log(`📄 Loan ID: ${loanResult.loan.id}`);

        // 5. Test the enhanced loan details API
        console.log('\n5️⃣ Testing enhanced loan details API...');
        const detailsResponse = await fetch(`${BASE_URL}/loans/${loanResult.loan.id}`, {
            headers
        });

        if (!detailsResponse.ok) {
            const errorText = await detailsResponse.text();
            console.log('❌ Failed to fetch loan details:', errorText);
            return;
        }

        const detailsData = await detailsResponse.json();
        const loanDetails = detailsData.loan;

        console.log('✅ Loan details retrieved successfully!');
        console.log(`   Has guarantorDetails: ${!!loanDetails.guarantorDetails}`);
        console.log(`   GuarantorDetails count: ${loanDetails.guarantorDetails?.length || 0}`);

        if (loanDetails.guarantorDetails && loanDetails.guarantorDetails.length > 0) {
            console.log('\n🎉 Enhanced guarantor details working!');
            loanDetails.guarantorDetails.forEach((guarantor, index) => {
                console.log(`\n   Guarantor ${index + 1}:`);
                console.log(`   ├─ Name: ${guarantor.name}`);
                console.log(`   ├─ Phone: ${guarantor.phone || 'N/A'}`);
                console.log(`   ├─ Status: ${guarantor.status}`);
                console.log(`   ├─ Account: ${guarantor.account.accountNumber} (${guarantor.account.type})`);
                console.log(`   ├─ Account Balance: $${guarantor.account.balance}`);
                console.log(`   └─ Guaranteed Amount: $${guarantor.guaranteedAmount}`);
            });
            
            return {
                success: true,
                loanId: loanResult.loan.id,
                hasGuarantorDetails: true
            };
        } else {
            console.log('\n⚠️ No guarantor details found - this indicates an issue with the LoanGuarantor creation');
            return {
                success: true,
                loanId: loanResult.loan.id,
                hasGuarantorDetails: false
            };
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
createTestLoanWithGuarantor().then(result => {
    console.log('\n📊 Test Summary:');
    if (result) {
        console.log(`   Success: ${result.success}`);
        if (result.loanId) {
            console.log(`   Loan ID: ${result.loanId}`);
            console.log(`   Has Guarantor Details: ${result.hasGuarantorDetails}`);
            
            if (result.hasGuarantorDetails) {
                console.log('\n🚀 Ready to test frontend!');
                console.log('   1. Open http://localhost:5174');
                console.log('   2. Go to Loans page');
                console.log('   3. Click View Details on the new loan');
                console.log('   4. Check for enhanced guarantor information');
            }
        }
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }
});