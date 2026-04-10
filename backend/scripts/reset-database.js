const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { showDatabaseStats } = require('./db-stats');
const { clearAllData } = require('./clear-all-data');

const prisma = new PrismaClient();

async function resetDatabase(options = {}) {
    const {
        showStatsBefore = true,
        showStatsAfter = true,
        createAdminUser = true,
        createSampleData = false,
        force = false
    } = options;

    console.log('🔄 Database Reset Process\n');

    try {
        // Show current database state
        if (showStatsBefore) {
            console.log('📊 Current Database State:');
            console.log('═'.repeat(50));
            await showDatabaseStats();
            console.log('═'.repeat(50));
            console.log('');
        }

        // Confirm reset
        if (!force) {
            console.log('⚠️  This will completely reset the database!');
            console.log('Run with --force to proceed automatically\n');
            return;
        }

        // Clear all data
        console.log('🗑️  Clearing all data...');
        // Set environment variable to force clear
        process.env.FORCE_CLEAR = 'true';
        await clearAllData();

        // Create admin user if requested
        if (createAdminUser) {
            console.log('\n👤 Creating admin user...');
            await createAdmin();
        }

        // Create sample data if requested
        if (createSampleData) {
            console.log('\n📋 Creating sample data...');
            await createSampleCustomersAndAccounts();
        }

        // Show final database state
        if (showStatsAfter) {
            console.log('\n📊 Database State After Reset:');
            console.log('═'.repeat(50));
            await showDatabaseStats();
            console.log('═'.repeat(50));
        }

        console.log('\n🎉 Database reset completed successfully!');
        
        if (createSampleData) {
            console.log('\n🚀 Ready to use! Sample data has been created.');
        } else {
            console.log('\n💡 Database is clean and ready for data.');
            console.log('   Run with --sample-data to include sample customers and accounts.');
        }

    } catch (error) {
        console.error('❌ Database reset failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function createAdmin() {
    const bcrypt = require('bcryptjs');
    
    try {
        // Check if admin exists
        const existingAdmin = await prisma.user.findUnique({
            where: { username: 'admin' }
        });

        if (existingAdmin) {
            console.log('   ✅ Admin user already exists');
            return existingAdmin;
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const adminUser = await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                name: 'System Administrator',
                role: 'ADMIN',
                email: 'admin@apexlink.com'
            }
        });

        console.log('   ✅ Admin user created successfully');
        console.log('   📧 Username: admin');
        console.log('   🔑 Password: admin123');
        
        return adminUser;
        
    } catch (error) {
        console.error('   ❌ Failed to create admin user:', error.message);
        throw error;
    }
}

async function createSampleCustomersAndAccounts() {
    try {
        // Get admin user for created by field
        const adminUser = await prisma.user.findUnique({
            where: { username: 'admin' }
        });

        if (!adminUser) {
            throw new Error('Admin user not found');
        }

        // Create sample customers
        const customers = await Promise.all([
            prisma.customer.create({
                data: {
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    phone: '1234567890',
                    address: '123 Main St, Anytown',
                    createdById: adminUser.id
                }
            }),
            prisma.customer.create({
                data: {
                    name: 'Jane Smith',
                    email: 'jane.smith@example.com',
                    phone: '9876543210',
                    address: '456 Oak Ave, Somewhere',
                    createdById: adminUser.id
                }
            }),
            prisma.customer.create({
                data: {
                    name: 'Bob Johnson',
                    email: 'bob.johnson@example.com',
                    phone: '5555551234',
                    address: '789 Pine Rd, Elsewhere',
                    createdById: adminUser.id
                }
            })
        ]);

        console.log(`   ✅ Created ${customers.length} sample customers`);

        // Create accounts for each customer
        let accountCounter = 1;
        for (const customer of customers) {
            // Create savings account
            await prisma.account.create({
                data: {
                    accountNumber: `SAV${String(accountCounter).padStart(6, '0')}`,
                    type: 'SAVINGS',
                    status: 'ACTIVE',
                    authorizationStatus: 'APPROVED',
                    balance: 1000 + (accountCounter * 500), // Different balances
                    currency: 'USD',
                    customerId: customer.id,
                    createdBy: adminUser.id,
                    approvedById: adminUser.id
                }
            });

            // Create current account for some customers
            if (accountCounter <= 2) {
                await prisma.account.create({
                    data: {
                        accountNumber: `CUR${String(accountCounter).padStart(6, '0')}`,
                        type: 'CURRENT',
                        status: 'ACTIVE',
                        authorizationStatus: 'APPROVED',
                        balance: 500 + (accountCounter * 300),
                        currency: 'USD',
                        customerId: customer.id,
                        createdBy: adminUser.id,
                        approvedById: adminUser.id
                    }
                });
            }

            accountCounter++;
        }

        console.log('   ✅ Created sample accounts for customers');
        console.log('   💰 Accounts have been funded with initial balances');

    } catch (error) {
        console.error('   ❌ Failed to create sample data:', error.message);
        throw error;
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    
    return {
        force: args.includes('--force'),
        createSampleData: args.includes('--sample-data'),
        skipStats: args.includes('--skip-stats'),
        noAdmin: args.includes('--no-admin')
    };
}

// Show usage
function showUsage() {
    console.log('🔄 Database Reset Tool\n');
    console.log('Usage: node reset-database.js [options]\n');
    console.log('Options:');
    console.log('  --force         Proceed without confirmation');
    console.log('  --sample-data   Create sample customers and accounts');
    console.log('  --skip-stats    Skip showing database statistics');
    console.log('  --no-admin      Skip creating admin user');
    console.log('\nExamples:');
    console.log('  node reset-database.js --force');
    console.log('  node reset-database.js --force --sample-data');
    console.log('  node reset-database.js --force --skip-stats --sample-data');
}

// Run the script
if (require.main === module) {
    const options = parseArgs();
    
    if (!options.force) {
        showUsage();
        console.log('\n⚠️  Add --force to proceed with database reset');
        process.exit(0);
    }

    resetDatabase({
        showStatsBefore: !options.skipStats,
        showStatsAfter: !options.skipStats,
        createAdminUser: !options.noAdmin,
        createSampleData: options.createSampleData,
        force: options.force
    });
}

module.exports = { resetDatabase };