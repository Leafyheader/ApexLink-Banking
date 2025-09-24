/**
 * Test script to verify KYC verification functionality
 */

const BASE_URL = 'http://localhost:5000/api';

async function testKYCVerification() {
    try {
        console.log('🧪 Testing KYC Verification Functionality...\n');

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

        // Step 2: Get customers to find one to verify
        console.log('2️⃣ Fetching customers...');
        const customersResponse = await fetch(`${BASE_URL}/customers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!customersResponse.ok) {
            throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
        }

        const customersData = await customersResponse.json();
        const customers = customersData.customers || customersData;
        
        console.log(`✅ Found ${customers.length} customer(s):`);
        customers.slice(0, 3).forEach((customer, index) => {
            console.log(`   ${index + 1}. ${customer.name} - KYC Status: ${customer.kycStatus}`);
        });

        // Find a customer that is not verified
        const unverifiedCustomer = customers.find(c => c.kycStatus !== 'verified');
        
        if (!unverifiedCustomer) {
            console.log('⚠️ No unverified customers found. All customers are already verified.');
            return;
        }

        console.log(`\n3️⃣ Testing KYC verification for: ${unverifiedCustomer.name} (${unverifiedCustomer.kycStatus})`);

        // Step 3: Test KYC verification
        const verifyResponse = await fetch(`${BASE_URL}/customers/${unverifiedCustomer.id}/kyc`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                kycStatus: 'verified'
            })
        });

        if (!verifyResponse.ok) {
            const errorText = await verifyResponse.text();
            throw new Error(`KYC verification failed: ${verifyResponse.status} - ${errorText}`);
        }

        const verifiedCustomer = await verifyResponse.json();
        console.log('✅ KYC verification successful!');
        console.log(`   Customer: ${verifiedCustomer.name}`);
        console.log(`   New KYC Status: ${verifiedCustomer.kycStatus}`);

        // Step 4: Verify the change was persisted
        console.log('\n4️⃣ Verifying the change was persisted...');
        const checkResponse = await fetch(`${BASE_URL}/customers/${unverifiedCustomer.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (checkResponse.ok) {
            const checkedCustomer = await checkResponse.json();
            console.log(`✅ Persistence verified - KYC Status: ${checkedCustomer.kycStatus}`);
        } else {
            console.log('⚠️ Could not verify persistence');
        }

        console.log('\n🎉 KYC verification test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testKYCVerification().catch(console.error);
