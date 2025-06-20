/**
 * Simple test to check loan repayment transaction type detection
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let authToken = '';

async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function testTransactionType() {
  try {
    // Login
    console.log('🔐 Logging in...');
    const response = await apiRequest('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    authToken = response.token;
    console.log('✅ Login successful');

    // Test with existing loan account (use the last one created)
    const loanAccountId = 'e5f1b3a6-c8d9-4b7e-a9c2-3f4e5b6c7d8e'; // Replace with actual loan account ID
    
    const repaymentData = {
      accountId: loanAccountId,
      type: 'LOAN_REPAYMENT',
      amount: 100,
      description: 'Test loan repayment type detection',
      reference: `TYPE-TEST-${Date.now()}`
    };
    
    console.log('📋 Testing transaction with data:', JSON.stringify(repaymentData, null, 2));
    
    const result = await apiRequest('POST', '/transactions', repaymentData);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTransactionType();
