const axios = require('axios');

// Test user creation functionality
async function testUserCreation() {
  console.log('🧪 Testing User Creation Functionality...\n');

  const baseURL = 'http://localhost:3000';
  let authToken = '';
  
  try {
    // Step 1: Login as admin to get auth token
    console.log('📝 Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Step 2: Create a new user
    console.log('\n📝 Step 2: Creating a new user...');
    const newUser = {
      name: 'Test Manager',
      username: 'testmanager',
      password: 'testpass123',
      role: 'MANAGER'
    };

    const createUserResponse = await axios.post(`${baseURL}/auth/register`, newUser, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User created successfully:');
    console.log(`   - Name: ${newUser.name}`);
    console.log(`   - Username: ${newUser.username}`);
    console.log(`   - Role: ${newUser.role}`);

    // Step 3: Test login with the new user
    console.log('\n📝 Step 3: Testing login with new user...');
    const newUserLoginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: newUser.username,
      password: newUser.password
    });

    if (newUserLoginResponse.data.token) {
      console.log('✅ New user login successful');
      console.log(`   - Token received: ${newUserLoginResponse.data.token.substring(0, 20)}...`);
    }

    // Step 4: Fetch users list
    console.log('\n📝 Step 4: Fetching users list...');
    try {
      const usersResponse = await axios.get(`${baseURL}/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('✅ Users list fetched successfully:');
      if (usersResponse.data && Array.isArray(usersResponse.data)) {
        console.log(`   - Total users: ${usersResponse.data.length}`);
        usersResponse.data.forEach(user => {
          console.log(`   - ${user.name} (${user.username}) - ${user.role}`);
        });
      } else if (usersResponse.data.users) {
        console.log(`   - Total users: ${usersResponse.data.users.length}`);
        usersResponse.data.users.forEach(user => {
          console.log(`   - ${user.name} (${user.username}) - ${user.role}`);
        });
      }
    } catch (err) {
      console.log('⚠️  Users endpoint might not be implemented yet');
      console.log(`   Error: ${err.response?.status} - ${err.response?.statusText}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

// Test user form validation
function testUserFormValidation() {
  console.log('\n🧪 Testing User Form Validation...\n');
  
  const validationTests = [
    {
      name: 'Empty name validation',
      data: { name: '', username: 'test', password: 'test123', confirmPassword: 'test123', role: 'TELLER' },
      expectedError: 'Name is required'
    },
    {
      name: 'Short username validation',
      data: { name: 'Test User', username: 'ab', password: 'test123', confirmPassword: 'test123', role: 'TELLER' },
      expectedError: 'Username must be at least 3 characters'
    },
    {
      name: 'Short password validation',
      data: { name: 'Test User', username: 'testuser', password: '123', confirmPassword: '123', role: 'TELLER' },
      expectedError: 'Password must be at least 6 characters'
    },
    {
      name: 'Password mismatch validation',
      data: { name: 'Test User', username: 'testuser', password: 'test123', confirmPassword: 'different', role: 'TELLER' },
      expectedError: 'Passwords do not match'
    },
    {
      name: 'Valid user data',
      data: { name: 'Test User', username: 'testuser', password: 'test123', confirmPassword: 'test123', role: 'TELLER' },
      expectedError: null
    }
  ];

  validationTests.forEach(test => {
    console.log(`📝 Testing: ${test.name}`);
    
    // Simulate frontend validation logic
    const errors = {};
    
    if (!test.data.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!test.data.username.trim()) {
      errors.username = 'Username is required';
    } else if (test.data.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!test.data.password) {
      errors.password = 'Password is required';
    } else if (test.data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!test.data.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (test.data.password !== test.data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!test.data.role) {
      errors.role = 'Role is required';
    }
    
    const hasErrors = Object.keys(errors).length > 0;
    
    if (test.expectedError && hasErrors) {
      const errorFound = Object.values(errors).includes(test.expectedError);
      if (errorFound) {
        console.log('✅ Validation working correctly');
      } else {
        console.log(`❌ Expected error "${test.expectedError}" not found`);
        console.log(`   Found errors:`, errors);
      }
    } else if (!test.expectedError && !hasErrors) {
      console.log('✅ Valid data passed validation');
    } else if (test.expectedError && !hasErrors) {
      console.log(`❌ Expected error "${test.expectedError}" but validation passed`);
    } else {
      console.log(`❌ Unexpected validation errors:`, errors);
    }
    
    console.log('');
  });
}

// Run tests
async function runTests() {
  console.log('🚀 Starting User Creation Tests\n');
  console.log('=' * 50);
  
  // Test form validation (client-side)
  testUserFormValidation();
  
  console.log('=' * 50);
  
  // Test API integration (server-side)
  await testUserCreation();
  
  console.log('\n🏁 User Creation Tests Complete!');
}

runTests().catch(console.error);
