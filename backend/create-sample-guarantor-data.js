/**
 * Test script to create sample loan guarantor data and test notifications
 * This will create a savings account that guarantees a loan to demonstrate the notification system
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleGuarantorData() {
  console.log('🧪 Creating Sample Guarantor Data for Testing...\n');

  try {
    // 1. Find or create a customer with savings account
    let savingsCustomer = await prisma.customer.findFirst({
      include: {
        accounts: {
          where: { type: 'SAVINGS' }
        }
      }
    });

    if (!savingsCustomer || savingsCustomer.accounts.length === 0) {
      console.log('Creating test savings customer and account...');
      
      savingsCustomer = await prisma.customer.create({
        data: {
          name: 'John Guarantor',
          firstName: 'John',
          surname: 'Guarantor', 
          email: 'john.guarantor@test.com',
          phone: '+233123456789',
          dateOfBirth: new Date('1985-01-01'),
          address: '123 Guarantor Street'
        }
      });

      await prisma.account.create({
        data: {
          accountNumber: `SAV${Date.now()}`,
          type: 'SAVINGS',
          balance: 5000.00,  // Good balance to guarantee loans
          customerId: savingsCustomer.id
        }
      });

      // Reload customer with accounts
      savingsCustomer = await prisma.customer.findUnique({
        where: { id: savingsCustomer.id },
        include: {
          accounts: {
            where: { type: 'SAVINGS' }
          }
        }
      });
    }

    const savingsAccount = savingsCustomer.accounts[0];
    console.log(`✅ Found/Created savings account: ${savingsAccount.accountNumber} (Balance: ₵${savingsAccount.balance})`);

    // 2. Find or create a customer with loan account
    let loanCustomer = await prisma.customer.findFirst({
      include: {
        accounts: {
          where: { type: 'LOAN' }
        }
      }
    });

    if (!loanCustomer || loanCustomer.accounts.length === 0) {
      console.log('Creating test loan customer and account...');
      
      loanCustomer = await prisma.customer.create({
        data: {
          name: 'Jane Borrower',
          firstName: 'Jane',
          surname: 'Borrower',
          email: 'jane.borrower@test.com', 
          phone: '+233987654321',
          dateOfBirth: new Date('1990-01-01'),
          address: '456 Borrower Avenue'
        }
      });

      const loanAccount = await prisma.account.create({
        data: {
          accountNumber: `LOAN${Date.now()}`,
          type: 'LOAN',
          balance: -2000.00,  // Outstanding loan balance
          customerId: loanCustomer.id
        }
      });

      // Create the loan record
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2); // 2 year loan

      await prisma.loan.create({
        data: {
          customerId: loanCustomer.id,
          accountId: loanAccount.id,
          amount: 3000.00,
          interestRate: 15.0,
          term: 24,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: endDate,
          totalPayable: 3450.00,
          outstandingBalance: 2000.00,
          monthlyPayment: 143.75,
          customerContribution: 1000.00,
          guaranteeRequired: 2000.00,
          principalRemaining: 2000.00
        }
      });

      // Reload customer with accounts
      loanCustomer = await prisma.customer.findFirst({
        include: {
          accounts: {
            where: { type: 'LOAN' }
          },
          loans: true
        }
      });
    }

    const loanAccount = loanCustomer.accounts[0];
    const loan = await prisma.loan.findFirst({
      where: { accountId: loanAccount.id }
    });

    console.log(`✅ Found/Created loan account: ${loanAccount.accountNumber} (Outstanding: ₵${Math.abs(loanAccount.balance)})`);

    // 3. Create the guarantor relationship
    const existingGuarantor = await prisma.loanGuarantor.findFirst({
      where: {
        loanId: loan.id,
        guarantorAccountId: savingsAccount.id
      }
    });

    if (!existingGuarantor) {
      console.log('Creating guarantor relationship...');
      
      await prisma.loanGuarantor.create({
        data: {
          loanId: loan.id,
          guarantorId: savingsCustomer.id,
          guarantorAccountId: savingsAccount.id,
          guaranteedAmount: 1500.00,  // Guaranteeing ₵1,500 of the ₵2,000 loan
          status: 'ACTIVE'
        }
      });

      console.log(`✅ Created guarantor relationship: ${savingsAccount.accountNumber} guarantees ₵1,500 for ${loanAccount.accountNumber}`);
    } else {
      console.log(`✅ Guarantor relationship already exists`);
    }

    console.log('\n🎯 Test Setup Complete!');
    console.log('=====================================');
    console.log(`Savings Account: ${savingsAccount.accountNumber} (${savingsCustomer.name})`);
    console.log(`- Balance: ₵${savingsAccount.balance}`);
    console.log(`- Guaranteeing: ₵1,500 for loan ${loanAccount.accountNumber}`);
    console.log(`- Should show notifications when selected in transaction form!`);
    console.log('');
    console.log('📱 To test:');
    console.log('1. Go to Transactions → New Transaction');
    console.log('2. Select the savings account above');
    console.log('3. You should see a notification panel about loan guarantee restrictions');
    console.log('4. Try different transaction types (withdrawal, transfer, deposit)');

    return {
      savingsAccount,
      loanAccount,
      savingsCustomer,
      loanCustomer
    };

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test data creation
createSampleGuarantorData().catch(console.error);