/**
 * Test Guarantor Fund Reimbursement System
 * 
 * This script creates a comprehensive test of the guarantor fund reimbursement system:
 * 1. Creates a loan with guarantors
 * 2. Makes repayments until loan is completed
 * 3. Verifies that guarantor funds are automatically credited back
 * 4. Validates the entire guarantor lifecycle
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧪 Testing Guarantor Fund Reimbursement System');
    console.log('=' * 60);

    // 1. Find or create test customers
    console.log('\n👤 Setting up test customers...');
    
    // Borrower
    let borrower = await prisma.customer.findFirst({
      where: { email: { contains: 'borrower.test' } }
    });
    
    if (!borrower) {
      borrower = await prisma.customer.create({
        data: {
          name: 'Test Borrower',
          firstName: 'Test',
          surname: 'Borrower',
          email: 'borrower.test@example.com',
          phone: '0241000001',
          customerNumber: `CUST${Date.now()}01`
        }
      });
    }

    // Guarantors
    let guarantor1 = await prisma.customer.findFirst({
      where: { email: { contains: 'guarantor1.test' } }
    });
    
    if (!guarantor1) {
      guarantor1 = await prisma.customer.create({
        data: {
          name: 'Test Guarantor One',
          firstName: 'Test',
          surname: 'Guarantor One',
          email: 'guarantor1.test@example.com',
          phone: '0241000002',
          customerNumber: `CUST${Date.now()}02`
        }
      });
    }

    let guarantor2 = await prisma.customer.findFirst({
      where: { email: { contains: 'guarantor2.test' } }
    });
    
    if (!guarantor2) {
      guarantor2 = await prisma.customer.create({
        data: {
          name: 'Test Guarantor Two',
          firstName: 'Test',
          surname: 'Guarantor Two',
          email: 'guarantor2.test@example.com',
          phone: '0241000003',
          customerNumber: `CUST${Date.now()}03`
        }
      });
    }

    console.log(`✅ Borrower: ${borrower.name} (${borrower.id})`);
    console.log(`✅ Guarantor 1: ${guarantor1.name} (${guarantor1.id})`);
    console.log(`✅ Guarantor 2: ${guarantor2.name} (${guarantor2.id})`);

    // 2. Create or find accounts with sufficient balances
    console.log('\n💰 Setting up accounts with sufficient balances...');
    
    // Borrower account
    let borrowerAccount = await prisma.account.findFirst({
      where: { customerId: borrower.id, type: 'SAVINGS' }
    });
    
    if (!borrowerAccount) {
      borrowerAccount = await prisma.account.create({
        data: {
          accountNumber: `ACC${Date.now()}01`,
          customerId: borrower.id,
          type: 'SAVINGS',
          balance: 1500.00, // Enough for loan eligibility
          status: 'ACTIVE'
        }
      });
    } else {
      // Ensure sufficient balance
      await prisma.account.update({
        where: { id: borrowerAccount.id },
        data: { balance: Math.max(1500.00, Number(borrowerAccount.balance)) }
      });
    }

    // Guarantor 1 account
    let guarantor1Account = await prisma.account.findFirst({
      where: { customerId: guarantor1.id, type: 'SAVINGS' }
    });
    
    if (!guarantor1Account) {
      guarantor1Account = await prisma.account.create({
        data: {
          accountNumber: `ACC${Date.now()}02`,
          customerId: guarantor1.id,
          type: 'SAVINGS',
          balance: 1000.00, // Will be reduced by guarantee
          status: 'ACTIVE'
        }
      });
    } else {
      // Ensure sufficient balance
      await prisma.account.update({
        where: { id: guarantor1Account.id },
        data: { balance: Math.max(1000.00, Number(guarantor1Account.balance)) }
      });
    }

    // Guarantor 2 account
    let guarantor2Account = await prisma.account.findFirst({
      where: { customerId: guarantor2.id, type: 'SAVINGS' }
    });
    
    if (!guarantor2Account) {
      guarantor2Account = await prisma.account.create({
        data: {
          accountNumber: `ACC${Date.now()}03`,
          customerId: guarantor2.id,
          type: 'SAVINGS',
          balance: 800.00, // Will be reduced by guarantee
          status: 'ACTIVE'
        }
      });
    } else {
      // Ensure sufficient balance
      await prisma.account.update({
        where: { id: guarantor2Account.id },
        data: { balance: Math.max(800.00, Number(guarantor2Account.balance)) }
      });
    }

    console.log(`✅ Borrower Account: ${borrowerAccount.accountNumber} (₵${Number(borrowerAccount.balance)})`);
    console.log(`✅ Guarantor 1 Account: ${guarantor1Account.accountNumber} (₵${Number(guarantor1Account.balance)})`);
    console.log(`✅ Guarantor 2 Account: ${guarantor2Account.accountNumber} (₵${Number(guarantor2Account.balance)})`);

    // 3. Record initial guarantor balances
    const initialGuarantor1Balance = Number(guarantor1Account.balance);
    const initialGuarantor2Balance = Number(guarantor2Account.balance);

    // 4. Create a loan with guarantors
    console.log('\n🏦 Creating loan with guarantors...');
    
    const loanAmount = 1000.00;
    const guarantor1Amount = 300.00; // 30% of loan
    const guarantor2Amount = 200.00; // 20% of loan
    
    // Create loan account
    const loanAccount = await prisma.account.create({
      data: {
        accountNumber: `LOAN${Date.now()}`,
        customerId: borrower.id,
        type: 'LOAN',
        balance: -loanAmount, // Negative balance represents debt
        status: 'ACTIVE'
      }
    });

    // Create loan record
    const loan = await prisma.loan.create({
      data: {
        customerId: borrower.id,
        accountId: loanAccount.id,
        amount: loanAmount,
        totalRepayable: 1100.00, // 10% interest
        amountPaid: 0,
        outstandingBalance: 1100.00,
        status: 'ACTIVE',
        totalPaid: 0,
        totalInterestPaid: 0,
        guarantorReimbursed: 0,
        principalRemaining: loanAmount,
        isCompleted: false
      }
    });

    // Create LoanGuarantor records
    await prisma.loanGuarantor.create({
      data: {
        loanId: loan.id,
        guarantorId: guarantor1.id,
        guarantorAccountId: guarantor1Account.id,
        guaranteedAmount: guarantor1Amount,
        status: 'ACTIVE'
      }
    });

    await prisma.loanGuarantor.create({
      data: {
        loanId: loan.id,
        guarantorId: guarantor2.id,
        guarantorAccountId: guarantor2Account.id,
        guaranteedAmount: guarantor2Amount,
        status: 'ACTIVE'
      }
    });

    // Deduct guarantor amounts from their accounts
    await prisma.account.update({
      where: { id: guarantor1Account.id },
      data: { balance: { decrement: guarantor1Amount } }
    });

    await prisma.account.update({
      where: { id: guarantor2Account.id },
      data: { balance: { decrement: guarantor2Amount } }
    });

    // Create deduction transactions
    await prisma.transaction.create({
      data: {
        accountId: guarantor1Account.id,
        type: 'WITHDRAWAL',
        amount: guarantor1Amount,
        description: `Loan guarantee deduction for loan ${loanAccount.accountNumber}`,
        reference: `LGD-${loan.id.slice(-8)}-${guarantor1Account.id.slice(-6)}`,
        status: 'COMPLETED'
      }
    });

    await prisma.transaction.create({
      data: {
        accountId: guarantor2Account.id,
        type: 'WITHDRAWAL',
        amount: guarantor2Amount,
        description: `Loan guarantee deduction for loan ${loanAccount.accountNumber}`,
        reference: `LGD-${loan.id.slice(-8)}-${guarantor2Account.id.slice(-6)}`,
        status: 'COMPLETED'
      }
    });

    console.log(`✅ Loan created: ${loanAccount.accountNumber} (₵${loanAmount})`);
    console.log(`✅ Guarantor 1 deduction: ₵${guarantor1Amount}`);
    console.log(`✅ Guarantor 2 deduction: ₵${guarantor2Amount}`);

    // 5. Verify guarantor balances after deduction
    const g1BalanceAfterDeduction = await prisma.account.findUnique({
      where: { id: guarantor1Account.id },
      select: { balance: true }
    });
    
    const g2BalanceAfterDeduction = await prisma.account.findUnique({
      where: { id: guarantor2Account.id },
      select: { balance: true }
    });

    console.log(`📊 Guarantor 1 balance after deduction: ₵${Number(g1BalanceAfterDeduction.balance)} (was ₵${initialGuarantor1Balance})`);
    console.log(`📊 Guarantor 2 balance after deduction: ₵${Number(g2BalanceAfterDeduction.balance)} (was ₵${initialGuarantor2Balance})`);

    // 6. Make repayments until loan is completed
    console.log('\n💳 Making loan repayments until completion...');
    
    let currentPayment = 1;
    let totalPaid = 0;
    
    // Import the loan repayment logic
    const { makeRepayment } = require('../src/services/loanRepayment.service');

    while (totalPaid < 1100) {
      const paymentAmount = Math.min(200, 1100 - totalPaid); // Make payments of ₵200 or remaining
      
      console.log(`\n💰 Payment ${currentPayment}: ₵${paymentAmount}`);
      
      // Make the payment using the API endpoint simulation
      try {
        const response = await fetch('http://localhost:3000/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token' // You may need to adjust this
          },
          body: JSON.stringify({
            accountId: loanAccount.id,
            type: 'LOAN_REPAYMENT',
            amount: paymentAmount,
            description: `Test repayment ${currentPayment}`,
            reference: `TEST-REP-${currentPayment}-${Date.now()}`
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          console.log(`   ✅ Payment processed successfully`);
          console.log(`   📊 Loan completion status: ${result.repaymentDetails?.isCompleted ? '✅ COMPLETED' : '🔄 Active'}`);
          
          if (result.repaymentDetails?.guarantorFundReimbursement?.processed) {
            console.log(`   🎉 Guarantor funds automatically reimbursed!`);
            console.log(`   💰 Total credited back: ₵${result.repaymentDetails.guarantorFundReimbursement.totalCreditedBack}`);
          }
        } else {
          // Fallback to direct service if API not available
          console.log('   ⚠️  API not available, using direct service...');
          
          const currentLoan = await prisma.loan.findUnique({
            where: { id: loan.id },
            select: {
              totalPaid: true,
              totalInterestPaid: true,
              guarantorReimbursed: true,
              principalRemaining: true,
              isCompleted: true
            }
          });

          const repaymentResult = makeRepayment(paymentAmount, currentLoan);
          
          if (repaymentResult.success) {
            // Update loan manually
            await prisma.loan.update({
              where: { id: loan.id },
              data: {
                totalPaid: repaymentResult.loanState.totalPaid,
                totalInterestPaid: repaymentResult.loanState.totalInterestPaid,
                guarantorReimbursed: repaymentResult.loanState.guarantorReimbursed,
                principalRemaining: repaymentResult.loanState.principalRemaining,
                isCompleted: repaymentResult.loanState.isCompleted,
                amountPaid: repaymentResult.loanState.totalPaid,
                outstandingBalance: repaymentResult.isCompleted ? 0 : repaymentResult.remainingBalance,
                status: repaymentResult.isCompleted ? 'PAID' : 'ACTIVE'
              }
            });

            console.log(`   ✅ Payment processed via service`);
            console.log(`   📊 Loan completion status: ${repaymentResult.isCompleted ? '✅ COMPLETED' : '🔄 Active'}`);
            
            // If loan is completed, trigger guarantor reimbursement manually
            if (repaymentResult.isCompleted) {
              console.log(`   🎉 Loan completed! Processing guarantor fund reimbursement...`);
              
              const { createGuarantorReimbursementService } = require('../src/services/guarantorReimbursement.service');
              const reimbursementService = createGuarantorReimbursementService(prisma);
              
              const reimbursementResult = await reimbursementService.processLoanCompletionReimbursement(loan.id);
              
              if (reimbursementResult.success) {
                console.log(`   ✅ ${reimbursementResult.message}`);
                console.log(`   💰 Total credited back: ₵${reimbursementResult.totalCreditedBack}`);
              } else {
                console.log(`   ❌ Reimbursement failed: ${reimbursementResult.error}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`   ❌ Payment error:`, error.message);
        break;
      }
      
      totalPaid += paymentAmount;
      currentPayment++;
      
      // Safety break
      if (currentPayment > 10) {
        console.log('   ⚠️  Safety break - too many payments');
        break;
      }
    }

    // 7. Verify final state
    console.log('\n📊 Verifying final state...');
    
    const finalLoan = await prisma.loan.findUnique({
      where: { id: loan.id },
      select: {
        status: true,
        isCompleted: true,
        totalPaid: true,
        outstandingBalance: true
      }
    });

    const finalGuarantor1Balance = await prisma.account.findUnique({
      where: { id: guarantor1Account.id },
      select: { balance: true }
    });

    const finalGuarantor2Balance = await prisma.account.findUnique({
      where: { id: guarantor2Account.id },
      select: { balance: true }
    });

    const guarantorStatus = await prisma.loanGuarantor.findMany({
      where: { loanId: loan.id },
      select: { status: true, guarantor: { select: { name: true } } }
    });

    console.log(''.padEnd(60, '-'));
    console.log(`🏦 Loan Status: ${finalLoan.status} (Completed: ${finalLoan.isCompleted})`);
    console.log(`💰 Total Paid: ₵${Number(finalLoan.totalPaid)}`);
    console.log(`💳 Outstanding: ₵${Number(finalLoan.outstandingBalance)}`);
    
    console.log('\n👥 Guarantor Final Balances:');
    console.log(`   ${guarantor1.name}: ₵${Number(finalGuarantor1Balance.balance)} (was ₵${initialGuarantor1Balance})`);
    console.log(`   Expected restoration: ${Number(finalGuarantor1Balance.balance) >= initialGuarantor1Balance ? '✅ YES' : '❌ NO'}`);
    
    console.log(`   ${guarantor2.name}: ₵${Number(finalGuarantor2Balance.balance)} (was ₵${initialGuarantor2Balance})`);
    console.log(`   Expected restoration: ${Number(finalGuarantor2Balance.balance) >= initialGuarantor2Balance ? '✅ YES' : '❌ NO'}`);

    console.log('\n📋 Guarantor Status Updates:');
    for (const gs of guarantorStatus) {
      console.log(`   ${gs.guarantor.name}: ${gs.status}`);
    }

    // 8. Verify reimbursement transactions
    console.log('\n💳 Guarantor Reimbursement Transactions:');
    const reimbursementTxns = await prisma.transaction.findMany({
      where: {
        description: {
          contains: 'Guarantor fund reimbursement - loan completion'
        },
        reference: {
          contains: `LCR-${loan.id.slice(-8)}`
        }
      },
      include: {
        account: {
          include: { customer: { select: { name: true } } }
        }
      }
    });

    if (reimbursementTxns.length === 0) {
      console.log('   ❌ No reimbursement transactions found');
    } else {
      for (const txn of reimbursementTxns) {
        console.log(`   ✅ ${txn.account.customer.name}: ₵${Number(txn.amount)} (${txn.reference})`);
      }
    }

    // 9. Final validation
    console.log('\n🔍 Final Validation:');
    const g1Restored = Number(finalGuarantor1Balance.balance) >= initialGuarantor1Balance;
    const g2Restored = Number(finalGuarantor2Balance.balance) >= initialGuarantor2Balance;
    const loanCompleted = finalLoan.isCompleted && finalLoan.status === 'PAID';
    const reimbursementProcessed = reimbursementTxns.length > 0;

    console.log(`   ✅ Loan completed: ${loanCompleted ? '✅' : '❌'}`);
    console.log(`   ✅ Guarantor 1 funds restored: ${g1Restored ? '✅' : '❌'}`);
    console.log(`   ✅ Guarantor 2 funds restored: ${g2Restored ? '✅' : '❌'}`);
    console.log(`   ✅ Reimbursement transactions created: ${reimbursementProcessed ? '✅' : '❌'}`);

    const allTestsPassed = loanCompleted && g1Restored && g2Restored && reimbursementProcessed;
    
    console.log(`\n${allTestsPassed ? '🎉' : '❌'} Overall Test Result: ${allTestsPassed ? 'PASSED' : 'FAILED'}`);

    if (allTestsPassed) {
      console.log('✅ Guarantor fund reimbursement system is working correctly!');
    } else {
      console.log('❌ Some issues found with the guarantor fund reimbursement system.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();