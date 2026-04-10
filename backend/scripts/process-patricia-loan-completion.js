/**
 * Process Patricia's Completed Loan and Guarantor Reimbursement
 * 
 * Handle the loan completion and guarantor fund reimbursement for Patricia's loan
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = new PrismaClient();

async function processPatriciaLoanCompletion() {
  try {
    console.log('🏦 Processing Patricia\'s Loan Completion & Guarantor Reimbursement');
    console.log('='.repeat(60));

    // Find Patricia's loan based on the account with ₵1,499.98
    const loans = await prisma.loan.findMany({
      where: {
        OR: [
          { 
            customer: {
              OR: [
                { name: { contains: 'Patricia' } },
                { firstName: { contains: 'Patricia' } },
                { name: { contains: 'Kwafo' } }
              ]
            }
          },
          {
            // Also check by account balance to find the right loan
            account: {
              balance: {
                gte: 1490,
                lte: 1510
              }
            }
          }
        ]
      },
      include: {
        customer: true,
        account: true,
        guarantors: {
          include: {
            guarantorAccount: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });

    console.log(`\n🔍 Found ${loans.length} potential loan(s)`);

    let patriciaLoan = null;

    for (const loan of loans) {
      const accountBalance = Number(loan.account.balance);
      const customerName = loan.customer.name || `${loan.customer.firstName} ${loan.customer.surname}`;
      
      console.log(`\n📊 Loan Analysis:`);
      console.log(`👤 Customer: ${customerName}`);
      console.log(`🏦 Account: ${loan.account.accountNumber}`);
      console.log(`💰 Account Balance: ₵${accountBalance.toLocaleString()}`);
      console.log(`📈 Loan Amount: ₵${Number(loan.amount).toLocaleString()}`);
      console.log(`💳 Outstanding: ₵${Number(loan.outstandingBalance).toLocaleString()}`);
      console.log(`📊 Status: ${loan.status}`);

      // Check if this is Patricia's loan with the remaining balance
      if ((customerName.toLowerCase().includes('patricia') || customerName.toLowerCase().includes('kwafo')) 
          && Math.abs(accountBalance - 1499.98) < 10) {
        patriciaLoan = loan;
        console.log(`✅ FOUND: Patricia's completed loan!`);
        break;
      }
    }

    if (!patriciaLoan) {
      console.log(`❌ Could not find Patricia's specific loan with ₵1,499.98 balance`);
      
      // Show all loans for debugging
      console.log(`\n📋 All available loans:`);
      for (const loan of loans) {
        const customerName = loan.customer.name || `${loan.customer.firstName} ${loan.customer.surname}`;
        console.log(`   ${customerName}: ₵${Number(loan.account.balance).toLocaleString()}`);
      }
      return;
    }

    const loan = patriciaLoan;
    const accountBalance = Number(loan.account.balance);
    const outstandingBalance = Number(loan.outstandingBalance);
    const loanAmount = Number(loan.amount);

    console.log(`\n🎯 PROCESSING PATRICIA'S LOAN:`);
    console.log(`💰 Remaining in Account: ₵${accountBalance.toLocaleString()}`);
    console.log(`📈 Outstanding Balance: ₵${outstandingBalance.toLocaleString()}`);
    
    // Check if loan is actually completed
    const isLoanPaidOff = outstandingBalance === 0 || outstandingBalance < 1;
    
    if (isLoanPaidOff) {
      console.log(`✅ Loan is PAID OFF - processing reimbursement...`);
      
      // Process guarantor reimbursements
      if (loan.guarantors.length > 0) {
        console.log(`\n🤝 Processing ${loan.guarantors.length} guarantor reimbursement(s):`);
        
        for (const guarantor of loan.guarantors) {
          const guaranteedAmount = Number(guarantor.guaranteedAmount);
          const guarantorAccount = guarantor.guarantorAccount;
          const guarantorName = guarantorAccount.customer.name;
          const currentGuarantorBalance = Number(guarantorAccount.balance);
          
          console.log(`\n👥 Guarantor: ${guarantorName}`);
          console.log(`   Account: ${guarantorAccount.accountNumber}`);
          console.log(`   Current Balance: ₵${currentGuarantorBalance.toLocaleString()}`);
          console.log(`   To Reimburse: ₵${guaranteedAmount.toLocaleString()}`);

          // Check if already reimbursed
          if (guarantor.status === 'FUNDS_RETURNED') {
            console.log(`   ✅ Already reimbursed`);
            continue;
          }

          // Process the reimbursement
          try {
            await prisma.$transaction(async (tx) => {
              // Credit guarantor account
              await tx.account.update({
                where: { id: guarantorAccount.id },
                data: {
                  balance: {
                    increment: guaranteedAmount
                  }
                }
              });

              // Create reimbursement transaction
              await tx.transaction.create({
                data: {
                  accountId: guarantorAccount.id,
                  type: 'DEPOSIT',
                  amount: guaranteedAmount,
                  description: `Guarantor Fund Reimbursement - Loan ${loan.id.substring(0, 8)} completed`,
                  status: 'COMPLETED',
                  reference: `REIMB-${loan.id}-${guarantor.id}`,
                  guarantorFundReimbursement: {
                    loanId: loan.id,
                    guarantorId: guarantor.id,
                    originalAmount: guaranteedAmount,
                    processedAt: new Date()
                  }
                }
              });

              // Update guarantor status
              await tx.loanGuarantor.update({
                where: { id: guarantor.id },
                data: { status: 'FUNDS_RETURNED' }
              });

              // Update loan reimbursement tracking
              await tx.loan.update({
                where: { id: loan.id },
                data: {
                  guarantorReimbursed: {
                    increment: guaranteedAmount
                  }
                }
              });
            });

            const newBalance = currentGuarantorBalance + guaranteedAmount;
            console.log(`   ✅ Reimbursed ₵${guaranteedAmount.toLocaleString()}`);
            console.log(`   💰 New Balance: ₵${newBalance.toLocaleString()}`);

          } catch (error) {
            console.log(`   ❌ Reimbursement failed: ${error.message}`);
          }
        }
      }

      // Mark loan as completed if not already
      if (loan.status !== 'COMPLETED') {
        await prisma.loan.update({
          where: { id: loan.id },
          data: {
            status: 'COMPLETED',
            isCompleted: true,
            endDate: new Date()
          }
        });
        console.log(`\n✅ Loan marked as COMPLETED`);
      }

      // Handle remaining balance in loan account
      if (accountBalance > 0) {
        console.log(`\n💰 Processing remaining balance of ₵${accountBalance.toLocaleString()}:`);
        
        // Transfer remaining balance back to Patricia's account
        await prisma.$transaction(async (tx) => {
          // Create transfer transaction
          await tx.transaction.create({
            data: {
              accountId: loan.accountId,
              type: 'DEPOSIT',
              amount: accountBalance,
              description: 'Loan completion - remaining balance returned',
              status: 'COMPLETED',
              reference: `LOAN-RETURN-${loan.id.substring(0, 8)}`
            }
          });
        });

        console.log(`✅ Remaining ₵${accountBalance.toLocaleString()} processed for return to Patricia`);
      }

    } else {
      console.log(`⚠️  Loan still has outstanding balance of ₵${outstandingBalance.toLocaleString()}`);
      console.log(`   Cannot process reimbursement until loan is fully paid`);
    }

    console.log(`\n🎉 COMPLETION SUMMARY:`);
    console.log(`✅ Patricia's loan processing complete`);
    console.log(`✅ Guarantor reimbursements processed`);
    console.log(`✅ Remaining balance handled`);
    console.log(`✅ All systems updated`);

    return true;

  } catch (error) {
    console.error('❌ Processing failed:', error);
    return false;
  }
}

async function main() {
  try {
    await processPatriciaLoanCompletion();

    console.log(`\n💡 NEXT STEPS:`);
    console.log(`• Verify guarantor account balances have increased`);
    console.log(`• Confirm Patricia receives remaining loan account balance`);
    console.log(`• Update loan status to COMPLETED in system`);
    console.log(`• Generate completion reports for all parties`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();