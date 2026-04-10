// Test script to verify enhanced guarantor details in loan modal
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function testEnhancedGuarantorDetails() {
    console.log('🔍 Testing Enhanced Guarantor Details in Loan Modal\n');

    try {
        // Step 1: Get admin token
        console.log('1️⃣ Getting admin token...');
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

        console.log('✅ Authentication successful!\n');

        // Step 2: Get all loans to find one with guarantors
        console.log('2️⃣ Fetching loans to find one with guarantors...');
        const loansResponse = await fetch(`${BASE_URL}/loans?limit=50`, {
            headers
        });

        if (!loansResponse.ok) {
            const errorText = await loansResponse.text();
            console.log('❌ Failed to fetch loans:', errorText);
            return;
        }

        const loansData = await loansResponse.json();
        const loans = loansData.loans || [];

        console.log(`📊 Found ${loans.length} loans`);

        // Find a loan with guarantors (looking for loans that have guarantor fields or were created with guarantors)
        const loanWithGuarantors = loans.find(loan => 
            loan.guarantor1 || loan.guarantor2 || loan.guarantor3 || 
            loan.guarantor1Id || loan.guarantor2Id || loan.guarantor3Id
        );

        if (!loanWithGuarantors) {
            console.log('⚠️ No loans with guarantors found. Creating a new loan with guarantor...\n');

            // Step 3: Get customers to create a loan with guarantor
            const customersResponse = await fetch(`${BASE_URL}/customers?limit=10`, {
                headers
            });

            if (!customersResponse.ok) {
                console.log('❌ Failed to fetch customers');
                return;
            }

            const customersData = await customersResponse.json();
            const customers = customersData.customers || [];

            if (customers.length < 2) {
                console.log('❌ Need at least 2 customers to create loan with guarantor');
                return;
            }

            // Find customers with suitable accounts
            let borrower = null;
            let guarantor = null;

            for (const customer of customers) {
                const accountsResponse = await fetch(`${BASE_URL}/accounts/${customer.id}`, {
                    headers
                });

                if (accountsResponse.ok) {
                    const accountsData = await accountsResponse.json();
                    const accounts = accountsData.accounts || [];
                    
                    const suitableAccount = accounts.find(acc => 
                        (acc.type === 'SAVINGS' || acc.type === 'CURRENT') && 
                        Number(acc.balance) >= 500
                    );

                    if (suitableAccount && !borrower) {
                        borrower = { customer, account: suitableAccount };
                    } else if (suitableAccount && !guarantor && customer.id !== borrower?.customer.id) {
                        guarantor = { customer, account: suitableAccount };
                        break;
                    }
                }
            }

            if (!borrower || !guarantor) {
                console.log('❌ Could not find suitable customers with accounts');
                return;
            }

            console.log(`👤 Borrower: ${borrower.customer.name} (Account: ${borrower.account.accountNumber})`);
            console.log(`🤝 Guarantor: ${guarantor.customer.name} (Account: ${guarantor.account.accountNumber})\n`);

            // Create loan with guarantor
            const loanData = {
                customerId: borrower.customer.id,
                amount: 1000,
                interestRate: 12,
                term: 12,
                repaymentFrequency: 'MONTHLY',
                guarantor1Id: guarantor.customer.id,
                guarantor1AccountId: guarantor.account.id,
                guarantor1Percentage: 50
            };

            console.log('3️⃣ Creating loan with guarantor...');
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

            const newLoan = await createLoanResponse.json();
            console.log('✅ Loan created successfully!');
            console.log(`📋 Loan ID: ${newLoan.loan.id}\n`);

            // Step 4: Test the enhanced API endpoint with the new loan
            console.log('4️⃣ Testing enhanced loan details API...');
            const detailsResponse = await fetch(`${BASE_URL}/loans/${newLoan.loan.id}`, {
                headers
            });

            if (!detailsResponse.ok) {
                const errorText = await detailsResponse.text();
                console.log('❌ Failed to fetch loan details:', errorText);
                return;
            }

            const detailsData = await detailsResponse.json();
            const loanDetails = detailsData.loan;

            console.log('✅ Enhanced loan details retrieved successfully!');
            console.log('\n📄 Loan Information:');
            console.log(`   ID: ${loanDetails.id}`);
            console.log(`   Customer: ${loanDetails.customer?.name}`);
            console.log(`   Amount: GH₵${loanDetails.amount}`);
            console.log(`   Account: ${loanDetails.account?.accountNumber}`);

            if (loanDetails.guarantorDetails && loanDetails.guarantorDetails.length > 0) {
                console.log('\n🤝 Enhanced Guarantor Details:');
                loanDetails.guarantorDetails.forEach((guarantor, index) => {
                    console.log(`\n   Guarantor ${index + 1}:`);
                    console.log(`   ├─ Name: ${guarantor.name}`);
                    console.log(`   ├─ Phone: ${guarantor.phone || 'N/A'}`);
                    console.log(`   ├─ Email: ${guarantor.email || 'N/A'}`);
                    console.log(`   ├─ Status: ${guarantor.status}`);
                    console.log(`   ├─ Account: ${guarantor.account.accountNumber} (${guarantor.account.type})`);
                    console.log(`   ├─ Account Balance: GH₵${guarantor.account.balance}`);
                    console.log(`   ├─ Guaranteed Amount: GH₵${guarantor.guaranteedAmount}`);
                    console.log(`   └─ Percentage: ${((guarantor.guaranteedAmount / loanDetails.amount) * 100).toFixed(1)}%`);
                });

                const totalGuaranteed = loanDetails.guarantorDetails.reduce((sum, g) => sum + g.guaranteedAmount, 0);
                const totalPercentage = loanDetails.guarantorDetails.reduce((sum, g) => sum + ((g.guaranteedAmount / loanDetails.amount) * 100), 0);
                
                console.log('\n📊 Guarantee Summary:');
                console.log(`   Total Guaranteed: GH₵${totalGuaranteed}`);
                console.log(`   Total Percentage: ${totalPercentage.toFixed(1)}%`);
                console.log(`   Active Guarantors: ${loanDetails.guarantorDetails.filter(g => g.status === 'ACTIVE').length}`);
            } else {
                console.log('\n⚠️ No enhanced guarantor details found');
            }

        } else {
            console.log(`✅ Found existing loan with guarantors: ${loanWithGuarantors.id}\n`);

            // Test enhanced API with existing loan
            console.log('3️⃣ Testing enhanced loan details API with existing loan...');
            const detailsResponse = await fetch(`${BASE_URL}/loans/${loanWithGuarantors.id}`, {
                headers
            });

            if (!detailsResponse.ok) {
                const errorText = await detailsResponse.text();
                console.log('❌ Failed to fetch loan details:', errorText);
                return;
            }

            const detailsData = await detailsResponse.json();
            console.log('✅ Enhanced loan details retrieved!');
            console.log('📄 Response contains guarantorDetails:', !!detailsData.loan.guarantorDetails);
        }

        console.log('\n🎉 Enhanced guarantor details test completed!');
        console.log('\n💡 Frontend Testing Instructions:');
        console.log('   1. Open the frontend: http://localhost:5174');
        console.log('   2. Navigate to the Loans page');
        console.log('   3. Click the "View Details" (👁️) button on any loan with guarantors');
        console.log('   4. The modal should now show comprehensive guarantor information including:');
        console.log('      - Personal details (name, phone, email, address)');
        console.log('      - Account details (number, type, balance)');
        console.log('      - Guarantee details (amount, percentage, status)');
        console.log('      - Summary section with totals');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testEnhancedGuarantorDetails();