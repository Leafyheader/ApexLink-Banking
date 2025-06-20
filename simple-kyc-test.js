/**
 * Simple KYC test script
 */

const BASE_URL = 'http://localhost:5000/api';

async function simpleKYCTest() {
    console.log('Testing KYC verification...');
    
    try {
        // Login first
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        if (!loginResponse.ok) {
            console.log('Login failed:', loginResponse.status);
            return;
        }
        
        const { token } = await loginResponse.json();
        console.log('Login successful');
        
        // Get customers
        const customersResponse = await fetch(`${BASE_URL}/customers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!customersResponse.ok) {
            console.log('Customers fetch failed:', customersResponse.status);
            return;
        }
        
        const customersData = await customersResponse.json();
        const customers = customersData.customers || customersData;
        console.log(`Found ${customers.length} customers`);
        
        if (customers.length === 0) {
            console.log('No customers found');
            return;
        }
        
        const testCustomer = customers[0];
        console.log(`Testing with customer: ${testCustomer.name} (Status: ${testCustomer.kycStatus})`);
        
        // Try to verify KYC
        const verifyResponse = await fetch(`${BASE_URL}/customers/${testCustomer.id}/kyc`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ kycStatus: 'verified' })
        });
        
        console.log('Verify response status:', verifyResponse.status);
        
        if (verifyResponse.ok) {
            const result = await verifyResponse.json();
            console.log('KYC verification successful:', result.kycStatus);
        } else {
            const errorText = await verifyResponse.text();
            console.log('KYC verification failed:', errorText);
        }
        
    } catch (error) {
        console.log('Error:', error.message);
    }
}

simpleKYCTest();
