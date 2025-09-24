// Test script to verify expense approval API
const API_BASE_URL = 'http://localhost:5000/api';

async function testExpenseApprovalAPI() {
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

    // Test fetching expenses with different parameters
    console.log('\n--- Testing Expense Approval API ---');
    
    // Test 1: Get all expenses (default)
    console.log('\n1. Getting all expenses...');
    const allExpensesResponse = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (allExpensesResponse.ok) {
      const allData = await allExpensesResponse.json();
      console.log('All expenses response:', JSON.stringify(allData, null, 2));
      console.log('Total expenses found:', allData.expenses?.length || 0);
    } else {
      console.error('Failed to get all expenses:', await allExpensesResponse.text());
    }

    // Test 2: Get only pending expenses
    console.log('\n2. Getting pending expenses...');
    const pendingExpensesResponse = await fetch(`${API_BASE_URL}/expenses?status=PENDING&page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (pendingExpensesResponse.ok) {
      const pendingData = await pendingExpensesResponse.json();
      console.log('Pending expenses response:', JSON.stringify(pendingData, null, 2));
      console.log('Pending expenses found:', pendingData.expenses?.length || 0);
    } else {
      console.error('Failed to get pending expenses:', await pendingExpensesResponse.text());
    }

    // Test 3: Get expenses with pagination
    console.log('\n3. Getting expenses with pagination...');
    const paginatedResponse = await fetch(`${API_BASE_URL}/expenses?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (paginatedResponse.ok) {
      const paginatedData = await paginatedResponse.json();
      console.log('Paginated expenses response:', JSON.stringify(paginatedData, null, 2));
      console.log('Pagination info:', paginatedData.pagination);
    } else {
      console.error('Failed to get paginated expenses:', await paginatedResponse.text());
    }

  } catch (error) {
    console.error('Error testing expense approval API:', error);
  }
}

testExpenseApprovalAPI();
