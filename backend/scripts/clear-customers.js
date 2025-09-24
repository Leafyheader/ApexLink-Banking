require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearCustomers() {
  try {
    console.log('🗑️  Starting to delete all customer data...');
    
    // Delete in order due to foreign key constraints
    console.log('Deleting withdrawal authorizations...');
    await prisma.withdrawalAuthorization.deleteMany({});
    
    console.log('Deleting transactions...');
    await prisma.transaction.deleteMany({});
    
    console.log('Deleting loans...');
    await prisma.loan.deleteMany({});
    
    console.log('Deleting bank income records...');
    await prisma.bankIncome.deleteMany({});
    
    console.log('Deleting accounts...');
    await prisma.account.deleteMany({});
    
    console.log('Deleting customers...');
    const deleteResult = await prisma.customer.deleteMany({});
    
    console.log(`✅ Successfully deleted ${deleteResult.count} customers and all related data`);
    console.log('🎉 Customer table is now empty!');
    
  } catch (error) {
    console.error('❌ Error deleting customer data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearCustomers();
