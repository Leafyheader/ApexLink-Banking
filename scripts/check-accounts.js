// Quick check for available accounts
const API_BASE = 'http://localhost:5000/api';

async function checkAccounts() {
    try {
        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const { token } = await loginResponse.json();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Get customers
        const customersResponse = await fetch(`${API_BASE}/customers?limit=5`, { headers });
        const customersData = await customersResponse.json();
        
        console.log('Available Customers:');
        for (const customer of customersData.customers.slice(0, 3)) {
            console.log(`\n${customer.name} (ID: ${customer.id})`);
            
            // Get their accounts
            const accountsResponse = await fetch(`${API_BASE}/accounts?customerId=${customer.id}`, { headers });
            const accountsData = await accountsResponse.json();
            
            console.log('  Accounts:');
            accountsData.accounts?.forEach(account => {
                console.log(`    ${account.accountNumber} (${account.type}) - Balance: GH₵${Number(account.balance).toFixed(2)}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAccounts();
