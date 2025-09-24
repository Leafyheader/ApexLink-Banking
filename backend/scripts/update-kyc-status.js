require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateCustomerKycStatus() {
  try {
    console.log('🔄 Updating KYC status for existing customers...');
    
    // Update all PENDING customers to VERIFIED
    const updateResult = await prisma.customer.updateMany({
      where: { 
        kycStatus: 'PENDING' 
      },
      data: { 
        kycStatus: 'VERIFIED' 
      }
    });
    
    console.log(`✅ Successfully updated ${updateResult.count} customers to VERIFIED status`);
    console.log('🎉 All customers now have VERIFIED KYC status!');
    
  } catch (error) {
    console.error('❌ Error updating customer KYC status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCustomerKycStatus();
