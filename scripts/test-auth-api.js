// Test script to verify account authorization API
const API_BASE_URL = 'http://localhost:5000/api';

async function loginAndTestAPI() {
  try {
    // First, login to get a token
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
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
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('Login successful, token received');

    // Test the account authorization API
    const authResponse = await fetch(`${API_BASE_URL}/account-authorizations?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!authResponse.ok) {
      throw new Error('Account authorization API failed');
    }

    const authData = await authResponse.json();
    console.log('Account Authorization API Response:');
    console.log(JSON.stringify(authData, null, 2));

    // Test approve account if there are pending accounts
    if (authData.accounts && authData.accounts.length > 0) {
      const pendingAccount = authData.accounts.find(acc => acc.status === 'pending');
      if (pendingAccount) {
        console.log(`\nTesting approval for account: ${pendingAccount.accountNumber}`);
        
        const approveResponse = await fetch(`${API_BASE_URL}/account-authorizations/${pendingAccount.id}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (approveResponse.ok) {
          console.log('Account approval successful');
        } else {
          console.log('Account approval failed:', await approveResponse.text());
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

loginAndTestAPI();
