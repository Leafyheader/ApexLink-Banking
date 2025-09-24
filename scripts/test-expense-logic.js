// Test script to verify expense approval business logic
const API_BASE_URL = 'http://localhost:5000/api';

async function testExpenseApprovalLogic() {
  try {
    // Login first
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 1: Get current summary
    console.log('\n--- Step 1: Current Summary ---');
    const summaryResponse = await fetch(`${API_BASE_URL}/expenses/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const initialSummary = await summaryResponse.json();
    console.log('Initial Summary:', {
      totalExpenses: initialSummary.totalExpenses,
      pendingExpenses: initialSummary.pendingExpenses,
      approvedExpenses: initialSummary.approvedExpenses
    });

    // Step 2: Create a new expense (should be PENDING by default)
    console.log('\n--- Step 2: Creating New Expense ---');
    const newExpenseData = {
      date: new Date().toISOString().split('T')[0],
      category: 'Technology',
      description: 'New laptop for development team',
      amount: 1500.00,
      vendor: 'Tech Store Inc',
      department: 'IT',
      paymentMethod: 'Credit Card',
      notes: 'Business logic test expense'
    };

    const createResponse = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newExpenseData)
    });

    if (!createResponse.ok) {
      console.error('Failed to create expense:', await createResponse.text());
      return;
    }

    const newExpense = await createResponse.json();
    console.log('✅ New expense created:');
    console.log('- ID:', newExpense.id);
    console.log('- Status:', newExpense.status);
    console.log('- Amount:', newExpense.amount);

    // Step 3: Check summary after creating pending expense
    console.log('\n--- Step 3: Summary After Creating Pending Expense ---');
    const summaryAfterCreate = await (await fetch(`${API_BASE_URL}/expenses/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })).json();

    console.log('Summary after creation:', {
      totalExpenses: summaryAfterCreate.totalExpenses,
      pendingExpenses: summaryAfterCreate.pendingExpenses,
      approvedExpenses: summaryAfterCreate.approvedExpenses
    });

    console.log('Expected behavior:');
    console.log('- Total expenses should NOT increase (only approved count)');
    console.log('- Pending expenses should increase by $1500');

    // Step 4: Approve the expense
    console.log('\n--- Step 4: Approving the Expense ---');
    const approveResponse = await fetch(`${API_BASE_URL}/expenses/${newExpense.id}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });

    if (approveResponse.ok) {
      console.log('✅ Expense approved successfully');
    }

    // Step 5: Check final summary
    console.log('\n--- Step 5: Final Summary After Approval ---');
    const finalSummary = await (await fetch(`${API_BASE_URL}/expenses/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })).json();

    console.log('Final Summary:', {
      totalExpenses: finalSummary.totalExpenses,
      pendingExpenses: finalSummary.pendingExpenses,
      approvedExpenses: finalSummary.approvedExpenses
    });

    console.log('\nExpected behavior:');
    console.log('- Total expenses should NOW increase by $1500');
    console.log('- Pending expenses should decrease by $1500');
    console.log('- Approved expenses should increase by $1500');

    // Cleanup: Delete the test expense
    console.log('\n--- Cleanup ---');
    await fetch(`${API_BASE_URL}/expenses/${newExpense.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Test expense cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testExpenseApprovalLogic();
