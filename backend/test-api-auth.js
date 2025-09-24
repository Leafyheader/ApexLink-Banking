require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testBankIncomeWithAuth() {
  try {
    console.log('=== Testing Bank Income API with Authentication ===\n');
    
    // First, get a test user to authenticate with
    const testUser = await prisma.user.findFirst({
      where: {
        role: {
          in: ['ADMIN', 'MANAGER']
        }
      }
    });
    
    if (!testUser) {
      console.log('❌ No admin/manager user found. Creating one...');
      
      // Create a test admin user
      const newUser = await prisma.user.create({
        data: {
          username: 'test-admin',
          name: 'Test Admin',
          email: 'admin@test.com',
          password: 'hashedpassword', // In real app this would be properly hashed
          role: 'ADMIN'
        }
      });
      
      console.log('✅ Created test admin user:', newUser.username);
      testUser = newUser;
    } else {
      console.log('✅ Found test user:', testUser.username, `(${testUser.role})`);
    }
    
    // Generate a JWT token for the user
    const token = jwt.sign(
      {
        id: testUser.id,
        username: testUser.username,
        name: testUser.name,
        role: testUser.role
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Generated JWT token');
    
    // Test the API with authentication
    const baseURL = 'http://localhost:5000/api';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n📊 Testing /bank-income/breakdown endpoint...');
    
    try {
      const response = await axios.get(`${baseURL}/bank-income/breakdown?period=month&page=1&limit=10`, { headers });
      
      console.log('✅ API Response successful!');
      console.log('📄 Response structure:');
      console.log('   Period:', response.data.period);
      console.log('   Date Range:', response.data.dateRange.from, 'to', response.data.dateRange.to);
      console.log('   Total Income:', `$${response.data.stats.totalIncome}`);
      console.log('   Total Count:', response.data.stats.totalCount);
      console.log('   Breakdown:');
      
      Object.entries(response.data.stats.breakdown).forEach(([type, data]) => {
        console.log(`     ${type}: ${data.count} records, $${data.amount}`);
      });
      
      console.log('   Recent Records:', response.data.recentRecords.length);
      
      // Show recent records
      if (response.data.recentRecords.length > 0) {
        console.log('\n💰 Recent Income Records:');
        response.data.recentRecords.forEach((record, index) => {
          console.log(`${index + 1}. ${record.type} - $${record.amount} from ${record.customerName} (${record.accountNumber}) - ${record.description}`);
        });
      } else {
        console.log('\n📭 No recent income records found for the selected period');
      }
      
    } catch (apiError) {
      console.error('❌ API Error:', apiError.response ? apiError.response.data : apiError.message);
      
      if (apiError.code === 'ECONNREFUSED') {
        console.log('\n🔧 Backend server might not be running. Please start it with: npm run dev');
      }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBankIncomeWithAuth();
