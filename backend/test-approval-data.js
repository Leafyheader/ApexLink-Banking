require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testApprovalData() {
  try {
    console.log('=== Testing Approval Data in APIs ===\n');
    
    const testUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'MANAGER'] } }
    });
    
    const token = jwt.sign(
      { id: testUser.id, username: testUser.username, name: testUser.name, role: testUser.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '1h' }
    );
    
    const baseURL = 'http://localhost:5000/api';
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    // Test Withdrawal Authorizations
    console.log('📊 Testing Withdrawal Authorizations API...');
    try {
      const withdrawalResponse = await axios.get(`${baseURL}/withdrawal-authorizations?page=1&limit=5`, { headers });
      
      if (withdrawalResponse.data.transactions.length > 0) {
        console.log('✅ Withdrawal authorization data structure:');
        const sample = withdrawalResponse.data.transactions[0];
        console.log('   ID:', sample.id);
        console.log('   Status:', sample.status);
        console.log('   Approved By:', sample.approvedBy || 'Not approved');
        console.log('   Customer:', sample.customerName);
        console.log('   Amount:', sample.amount);
      } else {
        console.log('📭 No withdrawal authorizations found');
      }
    } catch (err) {
      console.log('❌ Withdrawal API Error:', err.message);
    }
    
    console.log('');
    
    // Test Expenses
    console.log('📊 Testing Expenses API...');
    try {
      const expenseResponse = await axios.get(`${baseURL}/expenses?page=1&limit=5`, { headers });
      
      if (expenseResponse.data.expenses.length > 0) {
        console.log('✅ Expense data structure:');
        const sample = expenseResponse.data.expenses[0];
        console.log('   ID:', sample.id);
        console.log('   Status:', sample.status);
        console.log('   Approved By User:', sample.approvedByUser ? sample.approvedByUser.name : 'Not approved');
        console.log('   Approved Date:', sample.approvedDate || 'Not approved');
        console.log('   Description:', sample.description);
        console.log('   Amount:', sample.amount);
      } else {
        console.log('📭 No expenses found');
      }
    } catch (err) {
      console.log('❌ Expense API Error:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalData();
