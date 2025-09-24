// Test script to verify expenses API
const API_BASE_URL = 'http://localhost:5000/api';

async function loginAndTestExpensesAPI() {
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

    // Test 1: Get expenses summary
    console.log('\n--- Testing Expenses Summary ---');
    const summaryResponse = await fetch(`${API_BASE_URL}/expenses/summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      console.log('Expenses Summary:', JSON.stringify(summaryData, null, 2));
    } else {
      console.error('Summary API failed:', await summaryResponse.text());
    }

    // Test 2: Get all expenses
    console.log('\n--- Testing Get All Expenses ---');
    const expensesResponse = await fetch(`${API_BASE_URL}/expenses?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (expensesResponse.ok) {
      const expensesData = await expensesResponse.json();
      console.log('Expenses List:', JSON.stringify(expensesData, null, 2));
    } else {
      console.error('Get Expenses API failed:', await expensesResponse.text());
    }

    // Test 3: Create a new expense
    console.log('\n--- Testing Create Expense ---');
    const newExpense = {
      date: new Date().toISOString(),
      category: 'Office Supplies',
      description: 'Printer paper and ink cartridges',
      amount: 150.75,
      vendor: 'Office Depot',
      department: 'Administration',
      paymentMethod: 'Credit Card',
      notes: 'Monthly office supplies purchase'
    };

    const createResponse = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newExpense)
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('Created Expense:', JSON.stringify(createData, null, 2));
      
      // Test 4: Update expense status
      console.log('\n--- Testing Update Expense Status ---');
      const expenseId = createData.id;
      const updateResponse = await fetch(`${API_BASE_URL}/expenses/${expenseId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'APPROVED'
        })
      });

      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        console.log('Updated Expense Status:', JSON.stringify(updateData, null, 2));
      } else {
        console.error('Update Status API failed:', await updateResponse.text());
      }

      // Test 5: Get specific expense
      console.log('\n--- Testing Get Specific Expense ---');
      const getOneResponse = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (getOneResponse.ok) {
        const getOneData = await getOneResponse.json();
        console.log('Specific Expense:', JSON.stringify(getOneData, null, 2));
      } else {
        console.error('Get One Expense API failed:', await getOneResponse.text());
      }

    } else {
      console.error('Create Expense API failed:', await createResponse.text());
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
loginAndTestExpensesAPI();
