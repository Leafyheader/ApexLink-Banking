const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'ADMIN'
      },
    });
    
    console.log('✅ Admin user created successfully:');
    console.log('   Username:', admin.username);
    console.log('   Name:', admin.name);
    console.log('   Password: admin123');
    console.log('   Role:', admin.role);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
