// Test script to verify dashboard stats API
const API_BASE_URL = 'http://localhost:5000/api';

async function testDashboardStats() {
  try {
    console.log('Testing Dashboard Stats API...\n');

    // First, login to get a token
    console.log('1. Logging in...');
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
    console.log('✅ Login successful');

    // Test the dashboard stats API
    console.log('\n2. Testing Dashboard Stats API...');
    const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!statsResponse.ok) {
      throw new Error(`Dashboard Stats API failed: ${statsResponse.status} ${statsResponse.statusText}`);
    }

    const statsData = await statsResponse.json();
    console.log('✅ Dashboard Stats API successful');
    console.log('Stats Data:', JSON.stringify(statsData, null, 2));

    console.log('\n🎉 Dashboard Stats API testing completed!');

  } catch (error) {
    console.error('❌ Error during API testing:', error.message);
  }
}

// Run the test
testDashboardStats();
