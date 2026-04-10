// Script to check available customers and accounts
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function checkCustomersAndAccounts() {
    console.log('📋 Checking Available Customers and Accounts\n');

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

        // 2. Get customers
        const customersResponse = await fetch(`${BASE_URL}/customers?limit=10`, {
            headers
        });
        const customersData = await customersResponse.json();
        const customers = customersData.customers || [];

        console.log(`Found ${customers.length} customers:\n`);

        // 3. Check each customer's accounts
        for (const customer of customers.slice(0, 5)) {
            console.log(`👤 ${customer.name} (ID: ${customer.id})`);
            
            try {
                const accountsResponse = await fetch(`${BASE_URL}/accounts?customerId=${customer.id}`, {
                    headers
                });

                if (accountsResponse.ok) {
                    const accountsData = await accountsResponse.json();
                    const accounts = accountsData.accounts || [];
                    
                    if (accounts.length > 0) {
                        accounts.forEach(acc => {
                            console.log(`   📊 Account: ${acc.accountNumber}`);
                            console.log(`      Type: ${acc.type}`);
                            console.log(`      Balance: $${acc.balance}`);
                            console.log(`      Status: ${acc.status || 'N/A'}`);
                            console.log(`      Suitable: ${(acc.type === 'SAVINGS' || acc.type === 'CURRENT') && Number(acc.balance) >= 500 ? '✅' : '❌'}`);
                        });
                    } else {
                        console.log('   ❌ No accounts found');
                    }
                } else {
                    console.log('   ❌ Could not fetch accounts');
                }
            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
            }
            console.log('');
        }

        // 4. Suggest creating accounts if needed
        console.log('\n💡 Analysis:');
        console.log('   If customers don\'t have suitable accounts, we have options:');
        console.log('   1. Create accounts for existing customers');
        console.log('   2. Deposit money into existing accounts');
        console.log('   3. Use a loan that already has guarantors');
        console.log('   4. Test with lower balance requirements');

    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkCustomersAndAccounts();