// Test script to verify reports API integration
const API_BASE_URL = 'http://localhost:5000/api';

async function loginAndTestReportsAPI() {
  try {
    console.log('Testing Reports API integration...\n');

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
    console.log('✅ Login successful, token received');

    // Test the financial summary API
    console.log('\n2. Testing Financial Summary API...');
    const financialSummaryResponse = await fetch(`${API_BASE_URL}/reports/financial-summary?dateFrom=2025-05-01&dateTo=2025-06-18`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!financialSummaryResponse.ok) {
      throw new Error(`Financial Summary API failed: ${financialSummaryResponse.status} ${financialSummaryResponse.statusText}`);
    }

    const financialData = await financialSummaryResponse.json();
    console.log('✅ Financial Summary API successful');
    console.log('Financial Summary Data:', JSON.stringify(financialData, null, 2));

    // Test other report APIs
    console.log('\n3. Testing Account Analytics API...');
    const accountAnalyticsResponse = await fetch(`${API_BASE_URL}/reports/account-analytics?dateFrom=2025-05-01&dateTo=2025-06-18`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (accountAnalyticsResponse.ok) {
      const accountData = await accountAnalyticsResponse.json();
      console.log('✅ Account Analytics API successful');
      console.log('Account Analytics Data:', JSON.stringify(accountData, null, 2));
    } else {
      console.log('❌ Account Analytics API failed:', accountAnalyticsResponse.status);
    }

    console.log('\n4. Testing Loan Portfolio API...');
    const loanPortfolioResponse = await fetch(`${API_BASE_URL}/reports/loan-portfolio?dateFrom=2025-05-01&dateTo=2025-06-18`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (loanPortfolioResponse.ok) {
      const loanData = await loanPortfolioResponse.json();
      console.log('✅ Loan Portfolio API successful');
      console.log('Loan Portfolio Data:', JSON.stringify(loanData, null, 2));
    } else {
      console.log('❌ Loan Portfolio API failed:', loanPortfolioResponse.status);
    }

    console.log('\n🎉 Reports API testing completed!');

  } catch (error) {
    console.error('❌ Error during API testing:', error.message);
  }
}

// Run the test
loginAndTestReportsAPI();
