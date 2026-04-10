/**
 * Simple Guarantor Reimbursement Test
 * 
 * Tests the core guarantor fund reimbursement functionality
 * by creating a minimal test scenario and verifying the system works.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Load environment variables from the backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧪 Simple Guarantor Fund Reimbursement Test');
    console.log('=' * 50);

    // 1. Test the reimbursement service
    console.log('\n📦 Testing Guarantor Reimbursement Service...');
    
    const { createGuarantorReimbursementService } = require('../src/services/guarantorReimbursement.service.js');
    const reimbursementService = createGuarantorReimbursementService(prisma);

    console.log('✅ Guarantor Reimbursement Service loaded successfully');

    // 2. Check for existing completed loans
    console.log('\n🔍 Checking for existing completed loans...');
    
    const completedLoans = await prisma.loan.findMany({
      where: {
        isCompleted: true,
        status: 'PAID'
      },
      include: {
        account: {
          select: { 
            accountNumber: true,
            customer: { select: { name: true } }
          }
        },
        guarantors: {
          where: { status: 'ACTIVE' },
          select: { 
            guaranteedAmount: true,
            guarantor: { select: { name: true } }
          }
        }
      }
    });

    console.log(`📊 Found ${completedLoans.length} completed loans`);

    if (completedLoans.length === 0) {
      console.log('\n⚠️  No completed loans found. Let me create a test scenario...');
      
      // Create a simple test scenario
      await createTestScenario();
      
    } else {
      console.log('\n📋 Completed loans found:');
      for (const loan of completedLoans) {
        console.log(`   🏦 ${loan.account.accountNumber} (${loan.account.customer.name})`);
        console.log(`   👥 Guarantors: ${loan.guarantors.length}`);
        if (loan.guarantors.length > 0) {
          for (const g of loan.guarantors) {
            console.log(`     - ${g.guarantor.name}: ₵${Number(g.guaranteedAmount)}`);
          }
        }
      }

      // Test reimbursement on existing loans
      console.log('\n🔄 Testing reimbursement service...');
      
      const pendingLoans = await reimbursementService.findLoansNeedingGuarantorReimbursement();
      
      if (pendingLoans.length > 0) {
        console.log(`📊 Found ${pendingLoans.length} loans needing reimbursement`);
        
        // Process the first one as a test
        const testLoan = pendingLoans[0];
        console.log(`\n🧪 Testing reimbursement for loan ${testLoan.loanId.slice(-8)}...`);
        
        const result = await reimbursementService.processLoanCompletionReimbursement(testLoan.loanId);
        
        if (result.success) {
          console.log(`✅ ${result.message}`);
          console.log(`💰 Total credited back: ₵${result.totalCreditedBack}`);
          
          for (const reimbursement of result.reimbursements) {
            console.log(`👤 ${reimbursement.guarantorName} (${reimbursement.accountNumber}): ₵${reimbursement.creditedBack}`);
          }
        } else {
          console.log(`❌ Reimbursement failed: ${result.error}`);
        }
      } else {
        console.log('✅ All completed loans have already been reimbursed');
      }
    }

    // 3. Show system statistics
    console.log('\n📊 Guarantor Fund Reimbursement Statistics:');
    console.log(''.padEnd(50, '-'));
    
    const stats = await prisma.transaction.aggregate({
      where: {
        description: {
          contains: 'Guarantor fund reimbursement - loan completion'
        }
      },
      _sum: { amount: true },
      _count: true
    });

    const totalReimbursed = Number(stats._sum.amount || 0);
    const transactionCount = stats._count;

    console.log(`💰 Total guarantor funds reimbursed: ₵${totalReimbursed.toLocaleString()}`);
    console.log(`📊 Total reimbursement transactions: ${transactionCount.toLocaleString()}`);

    // 4. Show recent reimbursement transactions
    if (transactionCount > 0) {
      console.log('\n📋 Recent Reimbursement Transactions:');
      
      const recentReimbursements = await prisma.transaction.findMany({
        where: {
          description: {
            contains: 'Guarantor fund reimbursement - loan completion'
          }
        },
        include: {
          account: {
            include: {
              customer: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      for (const txn of recentReimbursements) {
        console.log(`💳 ${txn.createdAt.toLocaleDateString()} - ${txn.account.customer.name} (${txn.account.accountNumber}): ₵${Number(txn.amount).toLocaleString()}`);
      }
    }

    console.log('\n✅ Guarantor fund reimbursement test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createTestScenario() {
  console.log('\n🏗️  Creating test scenario...');
  
  try {
    // Create test customers
    const borrower = await prisma.customer.create({
      data: {
        name: 'Test Borrower',
        firstName: 'Test',
        surname: 'Borrower',
        email: `test.borrower.${Date.now()}@example.com`,
        phone: '0241000001',
        customerNumber: `TBOR${Date.now()}`
      }
    });

    const guarantor1 = await prisma.customer.create({
      data: {
        name: 'Test Guarantor 1',
        firstName: 'Test',
        surname: 'Guarantor 1',
        email: `test.guarantor1.${Date.now()}@example.com`,
        phone: '0241000002',
        customerNumber: `TGU1${Date.now()}`
      }
    });

    const guarantor2 = await prisma.customer.create({
      data: {
        name: 'Test Guarantor 2',
        firstName: 'Test',
        surname: 'Guarantor 2',
        email: `test.guarantor2.${Date.now()}@example.com`,
        phone: '0241000003',
        customerNumber: `TGU2${Date.now()}`
      }
    });

    console.log('✅ Created test customers');

    // Create accounts
    const borrowerAccount = await prisma.account.create({
      data: {
        accountNumber: `LOAN${Date.now()}`,
        customerId: borrower.id,
        type: 'LOAN',
        balance: 0, // Will be set when loan is completed
        status: 'ACTIVE'
      }
    });

    const guarantor1Account = await prisma.account.create({
      data: {
        accountNumber: `GAR1${Date.now()}`,
        customerId: guarantor1.id,
        type: 'SAVINGS',
        balance: 700.00, // After deduction of 300
        status: 'ACTIVE'
      }
    });

    const guarantor2Account = await prisma.account.create({
      data: {
        accountNumber: `GAR2${Date.now()}`,
        customerId: guarantor2.id,
        type: 'SAVINGS',
        balance: 600.00, // After deduction of 200
        status: 'ACTIVE'
      }
    });

    console.log('✅ Created test accounts');

    // Create completed loan
    const loan = await prisma.loan.create({
      data: {
        customerId: borrower.id,
        accountId: borrowerAccount.id,
        amount: 1000.00,
        totalRepayable: 1100.00,
        amountPaid: 1100.00,
        outstandingBalance: 0,
        status: 'PAID',
        totalPaid: 1100.00,
        totalInterestPaid: 100.00,
        guarantorReimbursed: 500.00,
        principalRemaining: 0,
        isCompleted: true
      }
    });

    console.log('✅ Created completed loan');

    // Create LoanGuarantor records
    await prisma.loanGuarantor.create({
      data: {
        loanId: loan.id,
        guarantorId: guarantor1.id,
        guarantorAccountId: guarantor1Account.id,
        guaranteedAmount: 300.00,
        status: 'ACTIVE'
      }
    });

    await prisma.loanGuarantor.create({
      data: {
        loanId: loan.id,
        guarantorId: guarantor2.id,
        guarantorAccountId: guarantor2Account.id,
        guaranteedAmount: 200.00,
        status: 'ACTIVE'
      }
    });

    console.log('✅ Created loan guarantor records');

    // Create deduction transactions (simulating original guarantee deductions)
    await prisma.transaction.create({
      data: {
        accountId: guarantor1Account.id,
        type: 'WITHDRAWAL',
        amount: 300.00,
        description: `Loan guarantee deduction for loan ${borrowerAccount.accountNumber}`,
        reference: `LGD-${loan.id.slice(-8)}-${guarantor1Account.id.slice(-6)}`,
        status: 'COMPLETED'
      }
    });

    await prisma.transaction.create({
      data: {
        accountId: guarantor2Account.id,
        type: 'WITHDRAWAL',
        amount: 200.00,
        description: `Loan guarantee deduction for loan ${borrowerAccount.accountNumber}`,
        reference: `LGD-${loan.id.slice(-8)}-${guarantor2Account.id.slice(-6)}`,
        status: 'COMPLETED'
      }
    });

    console.log('✅ Created deduction transactions');

    console.log('\n🎯 Test scenario ready:');
    console.log(`   📄 Loan: ${borrowerAccount.accountNumber} (COMPLETED)`);
    console.log(`   👤 Guarantor 1: ${guarantor1.name} - ₵300 to be reimbursed`);
    console.log(`   👤 Guarantor 2: ${guarantor2.name} - ₵200 to be reimbursed`);
    console.log(`   💰 Total to reimburse: ₵500`);

    return {
      loan,
      borrower,
      guarantor1,
      guarantor2,
      borrowerAccount,
      guarantor1Account,
      guarantor2Account
    };

  } catch (error) {
    console.error('❌ Failed to create test scenario:', error);
    throw error;
  }
}

main();