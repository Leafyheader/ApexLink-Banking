// Simple test to verify the API endpoints are working
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000';

async function quickAPITest() {
    console.log('🔍 Testing API Connectivity...\n');

    try {
        // Test 1: Check if basic API is responding
        console.log('1. Testing basic API endpoint...');
        const healthResponse = await fetch(`${API_BASE_URL}/api/auth/validate`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (healthResponse.status === 401) {
            console.log('   ✅ API is responding (401 is expected without auth token)');
        } else {
            console.log(`   ⚠️  API responded with status: ${healthResponse.status}`);
        }

        // Test 2: Try to login
        console.log('\n2. Testing login...');
        const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            const token = loginData.token;
            console.log('   ✅ Login successful');

            // Test 3: Check accounts endpoint with auth
            console.log('\n3. Testing accounts endpoint...');
            const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (accountsResponse.ok) {
                const accountsData = await accountsResponse.json();
                console.log(`   ✅ Accounts endpoint working (found ${accountsData.accounts?.length || 0} accounts)`);
                
                if (accountsData.accounts && accountsData.accounts.length > 0) {
                    const testAccount = accountsData.accounts[0];
                    
                    // Test 4: Check notification endpoint
                    console.log('\n4. Testing notifications endpoint...');
                    const notificationsResponse = await fetch(
                        `${API_BASE_URL}/api/transactions/account/${testAccount.id}/notifications`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    if (notificationsResponse.ok) {
                        const notifications = await notificationsResponse.json();
                        console.log(`   ✅ Notifications endpoint working (found ${notifications.length} notifications)`);
                        
                        if (notifications.length > 0) {
                            console.log('   📋 Sample notification:');
                            console.log(`      Type: ${notifications[0].type}`);
                            console.log(`      Message: ${notifications[0].message}`);
                        }
                    } else {
                        console.log(`   ❌ Notifications endpoint failed: ${notificationsResponse.status}`);
                        const errorText = await notificationsResponse.text();
                        console.log(`   Error: ${errorText.substring(0, 200)}`);
                    }
                } else {
                    console.log('   ⚠️  No accounts found to test notifications');
                }
            } else {
                console.log(`   ❌ Accounts endpoint failed: ${accountsResponse.status}`);
                const errorText = await accountsResponse.text();
                console.log(`   Error: ${errorText.substring(0, 200)}`);
            }
        } else {
            console.log(`   ❌ Login failed: ${loginResponse.status}`);
            const errorText = await loginResponse.text();
            console.log(`   Error: ${errorText.substring(0, 200)}`);
        }

        console.log('\n🎯 Summary:');
        console.log('If all tests pass, the notification system backend is working.');
        console.log('If notifications show in step 4, they should appear in the frontend.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
quickAPITest();