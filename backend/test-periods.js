require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testDifferentPeriods() {
  try {
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
    
    console.log('=== Testing Different Time Periods ===\n');
    
    const periods = ['day', 'week', 'month', 'year'];
    
    for (const period of periods) {
      console.log(`📊 Testing period: ${period}`);
      try {
        const response = await axios.get(`${baseURL}/bank-income/breakdown?period=${period}&page=1&limit=10`, { headers });
        console.log(`   Total Income: $${response.data.stats.totalIncome}`);
        console.log(`   Total Count: ${response.data.stats.totalCount}`);
        console.log(`   Date Range: ${response.data.dateRange.from.split('T')[0]} to ${response.data.dateRange.to.split('T')[0]}`);
        
        if (response.data.recentRecords.length > 0) {
          console.log(`   Records found: ${response.data.recentRecords.length}`);
          response.data.recentRecords.forEach((record, index) => {
            console.log(`     ${index + 1}. ${record.type} - $${record.amount} from ${record.customerName} (${record.date.split('T')[0]})`);
          });
        }
      } catch (err) {
        console.log(`   Error: ${err.message}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDifferentPeriods();
