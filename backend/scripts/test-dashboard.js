require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDashboardData() {
  try {
    console.log('🔍 Testing dashboard data...');
    
    // Test customer count
    const totalCustomers = await prisma.customer.count();
    const verifiedCustomers = await prisma.customer.count({
      where: { kycStatus: 'VERIFIED' }
    });
    const pendingCustomers = await prisma.customer.count({
      where: { kycStatus: 'PENDING' }
    });
    
    console.log('\n📊 Customer Counts:');
    console.log(`  • Total Customers: ${totalCustomers}`);
    console.log(`  • Verified Customers: ${verifiedCustomers}`);
    console.log(`  • Pending Customers: ${pendingCustomers}`);
    
    // Test accounts count
    const totalAccounts = await prisma.account.count();
    const activeAccounts = await prisma.account.count({
      where: { status: 'ACTIVE' }
    });
    
    console.log('\n🏦 Account Counts:');
    console.log(`  • Total Accounts: ${totalAccounts}`);
    console.log(`  • Active Accounts: ${activeAccounts}`);
    
    // Test sample customer data
    const sampleCustomers = await prisma.customer.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        email: true,
        kycStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n👥 Sample Customers:');
    sampleCustomers.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name} (${customer.kycStatus}) - ${customer.email || 'No email'}`);
    });
    
    console.log('\n✅ Dashboard data test complete!');
    
  } catch (error) {
    console.error('❌ Error testing dashboard data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardData();
