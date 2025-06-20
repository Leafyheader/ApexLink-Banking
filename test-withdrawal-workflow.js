// Test script to verify withdrawal authorization workflow
const API_BASE_URL = 'http://localhost:5000/api';

async function testWithdrawalAuthorizationWorkflow() {
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

    // Test 1: Get accounts to use in withdrawal test
    console.log('\n--- Getting Accounts ---');
    const accountsResponse = await fetch(`${API_BASE_URL}/accounts?limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      console.log('Available accounts:', accountsData.accounts.length);
      
      if (accountsData.accounts.length > 0) {
        const testAccount = accountsData.accounts.find(acc => acc.balance > 100) || accountsData.accounts[0];
        
        // Test 2: Create withdrawal authorization request
        console.log('\n--- Creating Withdrawal Authorization Request ---');
        const withdrawalData = {
          accountId: testAccount.id,
          amount: 50.00,
          type: 'withdrawal',
          description: 'Test withdrawal for approval workflow',
          reference: 'TEST-WD-001'
        };

        const createResponse = await fetch(`${API_BASE_URL}/withdrawal-authorizations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(withdrawalData)
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('Withdrawal authorization created:', JSON.stringify(createData, null, 2));
          
          // Test 3: Get withdrawal authorizations to verify it was created
          console.log('\n--- Checking Withdrawal Authorizations List ---');
          const listResponse = await fetch(`${API_BASE_URL}/withdrawal-authorizations?limit=5`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (listResponse.ok) {
            const listData = await listResponse.json();
            console.log('Withdrawal authorizations found:', listData.transactions.length);
            console.log('Recent authorization:', JSON.stringify(listData.transactions[0], null, 2));
            
            // Test 4: Approve the withdrawal (this should create a transaction)
            if (listData.transactions.length > 0) {
              const authId = listData.transactions[0].id;
              console.log('\n--- Approving Withdrawal Authorization ---');
              
              const approveResponse = await fetch(`${API_BASE_URL}/withdrawal-authorizations/${authId}/approve`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (approveResponse.ok) {
                const approveData = await approveResponse.json();
                console.log('Withdrawal approved:', JSON.stringify(approveData, null, 2));
                
                // Test 5: Check if transaction was created
                console.log('\n--- Checking if Transaction was Created ---');
                const transactionsResponse = await fetch(`${API_BASE_URL}/transactions?limit=5`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (transactionsResponse.ok) {
                  const transactionsData = await transactionsResponse.json();
                  const recentWithdrawal = transactionsData.transactions.find(t => 
                    t.type === 'withdrawal' && t.reference === 'TEST-WD-001'
                  );
                  
                  if (recentWithdrawal) {
                    console.log('✅ Transaction created successfully:', JSON.stringify(recentWithdrawal, null, 2));
                  } else {
                    console.log('❌ No matching transaction found');
                  }
                } else {
                  console.error('Failed to get transactions:', await transactionsResponse.text());
                }
              } else {
                console.error('Failed to approve withdrawal:', await approveResponse.text());
              }
            }
          } else {
            console.error('Failed to get withdrawal authorizations:', await listResponse.text());
          }
        } else {
          console.error('Failed to create withdrawal authorization:', await createResponse.text());
        }
      } else {
        console.log('No accounts available for testing');
      }
    } else {
      console.error('Failed to get accounts:', await accountsResponse.text());
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testWithdrawalAuthorizationWorkflow();
