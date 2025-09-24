// Test script to verify frontend expense approval is working
async function testFrontendExpenseApproval() {
  console.log('Testing Frontend Expense Approval...');
  
  // Test 1: Check if the page loads
  try {
    console.log('\n1. Testing page load...');
    
    // Simulate what the component does
    const params = {
      page: 1,
      limit: 10,
      search: '',
      status: 'PENDING',
    };
    
    console.log('Parameters that would be sent:', params);
    
    // Test the actual API call that the frontend makes
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Test the API call with the same parameters the frontend uses
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        urlParams.append(key, value.toString());
      }
    });
    
    const apiUrl = `http://localhost:5000/api/expenses?${urlParams.toString()}`;
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response successful');
      console.log('Expenses found:', data.expenses?.length || 0);
      console.log('Pagination:', data.pagination);
      
      if (data.expenses && data.expenses.length > 0) {
        console.log('Sample expense:', {
          id: data.expenses[0].id,
          description: data.expenses[0].description,
          status: data.expenses[0].status,
          amount: data.expenses[0].amount
        });
      }
      
      // Test summary calculation
      const pendingCount = data.expenses?.filter(exp => exp.status === 'PENDING').length || 0;
      const approvedCount = data.expenses?.filter(exp => exp.status === 'APPROVED').length || 0;
      
      console.log('Summary calculations:');
      console.log('- Pending:', pendingCount);
      console.log('- Approved:', approvedCount);
      
    } else {
      console.error('❌ API call failed:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFrontendExpenseApproval();
