/**
 * Simple test for loan creation with guarantor deductions
 */

const BASE_URL = 'http://localhost:5000/api';

async function testGuarantorLoan() {
    try {
        console.log('🧪 Testing Loan Creation with Guarantor Deductions...\n');

        // Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful\n');

        // Get customers
        console.log('2️⃣ Fetching customers...');
        const customersResponse = await fetch(`${BASE_URL}/loans/customers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const customersData = await customersResponse.json();
        const customers = customersData.customers || customersData;
        
        console.log(`Found ${customers.length} customers`);
        customers.forEach((customer, index) => {
            console.log(`  ${index}: ${customer.name} - ${customer.accounts?.length || 0} accounts`);
            if (customer.accounts) {
                customer.accounts.forEach(acc => {
                    console.log(`    ${acc.accountNumber}: ${acc.type}, Balance: $${acc.balance}`);
                });
            }
        });

        // Find John Doe and Jane Smith specifically
        const johnDoe = customers.find(c => c.name === 'John Doe');
        const janeSmith = customers.find(c => c.name === 'Jane Smith');

        if (!johnDoe || !janeSmith) {
            console.log('⚠️ Could not find John Doe and Jane Smith');
            return;
        }

        console.log(`\n3️⃣ Using John Doe as borrower and Jane Smith as guarantor`);

        // Find their accounts
        const borrowerAccount = johnDoe.accounts?.find(acc => acc.type === 'SAVINGS');
        const guarantorAccount = janeSmith.accounts?.find(acc => acc.type === 'CURRENT');

        if (!borrowerAccount || !guarantorAccount) {
            console.log('⚠️ Could not find suitable accounts');
            console.log('John accounts:', johnDoe.accounts);
            console.log('Jane accounts:', janeSmith.accounts);
            return;
        }

        console.log(`Borrower account: ${borrowerAccount.accountNumber} ($${borrowerAccount.balance})`);
        console.log(`Guarantor account: ${guarantorAccount.accountNumber} ($${guarantorAccount.balance})`);

        // Create loan
        console.log(`\n4️⃣ Creating loan with guarantor...`);
        const loanAmount = 1000;
        const guarantorPercentage = 50;
        const expectedDeduction = (loanAmount * guarantorPercentage) / 100;

        const loanData = {
            customerId: johnDoe.id,
            amount: loanAmount,
            interestRate: 10,
            term: 12,
            repaymentFrequency: 'MONTHLY',
            guarantor1Id: janeSmith.id,
            guarantor1AccountId: guarantorAccount.id,
            guarantor1Percentage: guarantorPercentage
        };

        console.log(`Expected deduction from guarantor: $${expectedDeduction}`);

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
            console.log('❌ Loan creation failed:', errorText);
            return;
        }

        const loan = await loanResponse.json();
        console.log('✅ Loan created successfully!');
        console.log(`Loan ID: ${loan.loan.id}`);

        // Verify deduction
        console.log(`\n5️⃣ Verifying guarantor deduction...`);
        const accountResponse = await fetch(`${BASE_URL}/accounts/${guarantorAccount.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (accountResponse.ok) {
            const updatedAccount = await accountResponse.json();
            const newBalance = Number(updatedAccount.account.balance);
            const originalBalance = Number(guarantorAccount.balance);
            const actualDeduction = originalBalance - newBalance;

            console.log(`Original balance: $${originalBalance}`);
            console.log(`New balance: $${newBalance}`);
            console.log(`Actual deduction: $${actualDeduction}`);
            
            if (Math.abs(actualDeduction - expectedDeduction) < 0.01) {
                console.log('✅ Guarantor deduction verified!');
            } else {
                console.log('❌ Deduction amount mismatch!');
            }
        }

        console.log('\n🎉 Test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

testGuarantorLoan().catch(console.error);
