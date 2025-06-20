// const fetch = require('node-fetch'); // Not needed in Node.js 18+

const API_BASE_URL = 'http://localhost:5000/api';

async function login() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

async function testAccountAuthorizationFilters() {
  try {
    const token = await login();
    console.log('Login successful, testing account authorization filters...\n');

    // Test all accounts (no status filter)
    console.log('Testing "All Accounts" filter...');
    const allResponse = await fetch(`${API_BASE_URL}/account-authorizations?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (allResponse.ok) {
      const allData = await allResponse.json();
      console.log(`All accounts count: ${allData.accounts.length}`);
      console.log(`Summary - Total: ${allData.summary.total}, Approved: ${allData.summary.approved}, Pending: ${allData.summary.pending}, Rejected: ${allData.summary.rejected}`);
    } else {
      console.log('All accounts failed:', allResponse.statusText);
    }

    // Test approved filter
    console.log('\nTesting "APPROVED" filter...');
    const approvedResponse = await fetch(`${API_BASE_URL}/account-authorizations?page=1&limit=10&status=APPROVED`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (approvedResponse.ok) {
      const approvedData = await approvedResponse.json();
      console.log(`Approved accounts count: ${approvedData.accounts.length}`);
      console.log(`Summary - Total: ${approvedData.summary.total}, Approved: ${approvedData.summary.approved}, Pending: ${approvedData.summary.pending}, Rejected: ${approvedData.summary.rejected}`);
    } else {
      console.log('Approved accounts failed:', approvedResponse.statusText);
    }

    // Test pending filter
    console.log('\nTesting "PENDING" filter...');
    const pendingResponse = await fetch(`${API_BASE_URL}/account-authorizations?page=1&limit=10&status=PENDING`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (pendingResponse.ok) {
      const pendingData = await pendingResponse.json();
      console.log(`Pending accounts count: ${pendingData.accounts.length}`);
      console.log(`Summary - Total: ${pendingData.summary.total}, Approved: ${pendingData.summary.approved}, Pending: ${pendingData.summary.pending}, Rejected: ${pendingData.summary.rejected}`);
    } else {
      console.log('Pending accounts failed:', pendingResponse.statusText);
    }

    // Test rejected filter
    console.log('\nTesting "REJECTED" filter...');
    const rejectedResponse = await fetch(`${API_BASE_URL}/account-authorizations?page=1&limit=10&status=REJECTED`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (rejectedResponse.ok) {
      const rejectedData = await rejectedResponse.json();
      console.log(`Rejected accounts count: ${rejectedData.accounts.length}`);
      console.log(`Summary - Total: ${rejectedData.summary.total}, Approved: ${rejectedData.summary.approved}, Pending: ${rejectedData.summary.pending}, Rejected: ${rejectedData.summary.rejected}`);
    } else {
      console.log('Rejected accounts failed:', rejectedResponse.statusText);
    }

  } catch (error) {
    console.error('Error testing account authorization filters:', error);
  }
}

testAccountAuthorizationFilters();
