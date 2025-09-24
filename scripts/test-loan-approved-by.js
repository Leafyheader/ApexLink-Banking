const BASE_URL = 'http://localhost:5000/api';

async function testLoanApprovedBy() {
    try {
        console.log('🧪 Testing Loan Creation with Approved By Fields...\n');

        // Step 1: Login first
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful\n');

        // Step 2: Get customers for loan creation
        console.log('2️⃣ Fetching customers...');
        const customersResponse = await fetch(`${BASE_URL}/loans/customers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!customersResponse.ok) {
            throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
        }

        const customersData = await customersResponse.json();
        const customers = customersData.customers || customersData;
        
        if (customers.length === 0) {
            console.log('⚠️ No customers found for loan creation');
            return;
        }

        // Find a customer with active accounts
        const customerWithAccounts = customers.find(customer => 
            customer.accounts && customer.accounts.length > 0
        );

        if (!customerWithAccounts) {
            console.log('⚠️ No customers found with active accounts');
            return;
        }

        console.log(`✅ Found customer: ${customerWithAccounts.name}`);
        console.log(`   Customer ID: ${customerWithAccounts.id}`);
        console.log(`   Active accounts: ${customerWithAccounts.accounts.length}\n`);

        // Step 3: Create a test loan
        console.log('3️⃣ Creating test loan...');
        const loanData = {
            customerId: customerWithAccounts.id,
            amount: 5000,
            interestRate: 8.5,
            term: 24,
            repaymentFrequency: 'MONTHLY'
        };

        console.log('📤 Sending loan data:');
        console.log(JSON.stringify(loanData, null, 2));

        const loanResponse = await fetch(`${BASE_URL}/loans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(loanData)
        });

        if (!loanResponse.ok) {
            const errorText = await loanResponse.text();
            throw new Error(`Loan creation failed: ${loanResponse.status} - ${errorText}`);
        }

        const loanResult = await loanResponse.json();
        console.log('✅ Loan created successfully!');
        console.log(`   Loan ID: ${loanResult.loan.id}`);
        console.log(`   Account Number: ${loanResult.loan.account.accountNumber}`);
        console.log(`   Amount: $${loanResult.loan.amount}`);
        console.log(`   Created By: ${loanResult.loan.createdBy || 'Not set'}`);

        // Step 4: Fetch the loan details to verify approved by fields
        console.log('\n4️⃣ Fetching loan details to verify approved by fields...');
        const loanDetailResponse = await fetch(`${BASE_URL}/loans/${loanResult.loan.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!loanDetailResponse.ok) {
            throw new Error(`Failed to fetch loan details: ${loanDetailResponse.status}`);
        }

        const loanDetail = await loanDetailResponse.json();
        console.log('✅ Loan details fetched successfully:');
        console.log(`   Approved By ID: ${loanDetail.loan.approvedById || 'Not set'}`);
        console.log(`   Approved At: ${loanDetail.loan.approvedAt || 'Not set'}`);
        
        if (loanDetail.loan.approvedBy) {
            console.log(`   Approved By User: ${loanDetail.loan.approvedBy.name} (${loanDetail.loan.approvedBy.username})`);
        } else {
            console.log('   Approved By User: Not set');
        }

        // Step 5: Fetch all loans to verify the field is included in lists
        console.log('\n5️⃣ Fetching loans list to verify approved by field...');
        const loansResponse = await fetch(`${BASE_URL}/loans?limit=5`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!loansResponse.ok) {
            throw new Error(`Failed to fetch loans list: ${loansResponse.status}`);
        }

        const loansData = await loansResponse.json();
        console.log(`✅ Found ${loansData.loans.length} loans in list:`);
        
        loansData.loans.forEach((loan, index) => {
            console.log(`   ${index + 1}. ${loan.account.accountNumber} - $${loan.amount}`);
            console.log(`      Approved By: ${loan.approvedBy ? loan.approvedBy.name : 'Not set'}`);
            console.log(`      Approved At: ${loan.approvedAt || 'Not set'}`);
        });

        console.log('\n🎉 Loan approved by fields test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testLoanApprovedBy().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
});
