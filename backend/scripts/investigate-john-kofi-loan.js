/**
 * Investigate John Kofi Eshun's Loan Issue
 *
 * The user reports a loan of ₵12,000 with ₵6,000 guarantor contribution
 * was marked as fully paid after only ₵6,000 payment, showing amount paid as ₵1,100
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

async function investigateJohnKofiLoan() {
  try {
    console.log('🔍 Investigating John Kofi Eshun\'s Loan Issue');
    console.log('='.repeat(50));

    // Find John Kofi Eshun
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: 'John' } },
          { firstName: { contains: 'John' } },
          { surname: { contains: 'Kofi' } },
          { name: { contains: 'Eshun' } }
        ]
      },
      include: {
        accounts: {
          include: {
            loans: {
              include: {
                guarantors: {
                  include: {
                    guarantorAccount: {
                      select: {
                        accountNumber: true,
                        balance: true,
                        customer: { select: { name: true } }
                      }
                    }
                  }
                }
              }
            },
            transactions: {
              where: {
                OR: [
                  { type: 'LOAN_REPAYMENT' },
                  { description: { contains: 'loan' } },
                  { description: { contains: 'Loan' } }
                ]
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        }
      }
    });

    if (customers.length === 0) {
      console.log('❌ No customers found with name containing John, Kofi, or Eshun');
      return;
    }

    console.log(`📊 Found ${customers.length} potential customers:`);

    for (const customer of customers) {
      console.log(`\n👤 Customer: ${customer.name || (customer.firstName + ' ' + customer.surname)}`);

      for (const account of customer.accounts) {
        console.log(`📊 Account: ${account.accountNumber}`);
        console.log(`💰 Balance: ₵${Number(account.balance).toLocaleString()}`);

        for (const loan of account.loans) {
          const loanAmount = Number(loan.amount);
          const guaranteeRequired = Number(loan.guaranteeRequired);
          const amountPaid = Number(loan.amountPaid);
          const outstandingBalance = Number(loan.outstandingBalance);

          console.log(`\n🏦 LOAN ANALYSIS:`);
          console.log(`💳 Loan Amount: ₵${loanAmount.toLocaleString()}`);
          console.log(`🤝 Guarantee Required: ₵${guaranteeRequired.toLocaleString()}`);
          console.log(`💰 Amount Paid: ₵${amountPaid.toLocaleString()}`);
          console.log(`📈 Outstanding Balance: ₵${outstandingBalance.toLocaleString()}`);
          console.log(`📊 Status: ${loan.status}`);
          console.log(`✅ Is Completed: ${loan.isCompleted}`);

          // Check if this matches the reported issue
          const matchesScenario = (
            loanAmount === 12000 &&
            guaranteeRequired >= 6000 &&
            amountPaid === 1100 &&
            loan.isCompleted
          );

          if (matchesScenario) {
            console.log(`\n🎯 ISSUE FOUND! This matches the reported problem.`);

            console.log(`\n🔍 PROBLEM ANALYSIS:`);
            console.log(`❌ Expected: Loan ₵12,000, Payment ₵6,000`);
            console.log(`❌ Actual: Amount Paid ₵${amountPaid.toLocaleString()}, Status: ${loan.status}`);
            console.log(`❌ Issue: Loan marked complete with insufficient payment`);

            // Calculate what should be correct
            const interestRate = 0.10; // 10%
            const totalInterest = loanAmount * interestRate;
            const totalPayable = loanAmount + totalInterest;

            console.log(`\n📊 CORRECT CALCULATIONS:`);
            console.log(`💰 Loan Amount: ₵${loanAmount.toLocaleString()}`);
            console.log(`📈 Interest (10%): ₵${totalInterest.toLocaleString()}`);
            console.log(`💳 Total Payable: ₵${totalPayable.toLocaleString()}`);
            console.log(`💸 Payment Made: ₵6,000`);
            console.log(`📊 Should Be Paid: ₵${Math.min(6000, totalPayable).toLocaleString()}`);
            console.log(`📈 Should Owe: ₵${Math.max(0, totalPayable - 6000).toLocaleString()}`);

            // Check guarantors
            if (loan.guarantors.length > 0) {
              console.log(`\n🤝 GUARANTOR STATUS:`);
              for (const guarantor of loan.guarantors) {
                console.log(`👥 ${guarantor.guarantorAccount.customer.name}`);
                console.log(`   Guaranteed: ₵${Number(guarantor.guaranteedAmount).toLocaleString()}`);
                console.log(`   Status: ${guarantor.status}`);
              }
            }

            // Check transactions
            if (account.transactions.length > 0) {
              console.log(`\n💳 LOAN TRANSACTIONS:`);
              for (const txn of account.transactions) {
                console.log(`   ${txn.type}: ₵${Number(txn.amount).toLocaleString()}`);
                console.log(`   Description: ${txn.description}`);
                console.log(`   Date: ${txn.createdAt.toLocaleDateString()}`);
              }
            }

            console.log(`\n🔧 REQUIRED FIXES:`);
            console.log(`1. Correct amountPaid from ₵${amountPaid} to ₵6,000`);
            console.log(`2. Recalculate outstandingBalance`);
            console.log(`3. Reset loan status to ACTIVE if not fully paid`);
            console.log(`4. Reverse incorrect guarantor reimbursements`);

            return loan; // Return the problematic loan
          }
        }
      }
    }

    console.log(`\n❌ No loan matching the reported issue was found.`);
    console.log(`Searched for: ₵12,000 loan, ₵6,000 guarantee, ₵1,100 amount paid, completed status`);

  } catch (error) {
    console.error('❌ Investigation failed:', error);
    return null;
  }
}

async function main() {
  try {
    const problematicLoan = await investigateJohnKofiLoan();

    if (problematicLoan) {
      console.log(`\n🚨 CRITICAL ISSUE DETECTED:`);
      console.log(`The loan repayment system has a serious bug where payments are being`);
      console.log(`incorrectly recorded and loans are being prematurely marked as complete.`);
      console.log(`This could lead to significant financial losses and incorrect guarantor reimbursements.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();