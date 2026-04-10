/**
 * Guarantor Reimbursement Service (JavaScript Version)
 * 
 * Handles the automatic crediting back of guarantor funds when loans are fully repaid.
 */

class GuarantorReimbursementService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Process guarantor fund reimbursement when a loan is completed
   */
  async processLoanCompletionReimbursement(loanId) {
    console.log(`🔄 Processing guarantor reimbursement for loan completion: ${loanId}`);

    try {
      // 1. Verify loan is actually completed
      const loan = await this.prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          id: true,
          accountId: true,
          customerId: true,
          amount: true,
          status: true,
          isCompleted: true,
          account: {
            select: {
              accountNumber: true,
              customer: { select: { name: true, firstName: true, surname: true } }
            }
          }
        }
      });

      if (!loan) {
        return {
          success: false,
          message: 'Loan not found',
          loanId,
          totalCreditedBack: 0,
          reimbursements: [],
          error: 'Loan not found'
        };
      }

      if (!loan.isCompleted || loan.status !== 'PAID') {
        return {
          success: false,
          message: 'Loan is not completed yet',
          loanId,
          totalCreditedBack: 0,
          reimbursements: [],
          error: 'Loan must be fully completed and marked as PAID'
        };
      }

      // 2. Get all guarantors for this loan
      const loanGuarantors = await this.prisma.loanGuarantor.findMany({
        where: {
          loanId,
          status: 'ACTIVE'
        },
        include: {
          guarantor: {
            select: { id: true, name: true, firstName: true, surname: true }
          },
          guarantorAccount: {
            select: { id: true, accountNumber: true, balance: true }
          }
        }
      });

      if (loanGuarantors.length === 0) {
        return {
          success: true,
          message: 'No guarantors found for this loan',
          loanId,
          totalCreditedBack: 0,
          reimbursements: []
        };
      }

      // 3. Check if guarantor funds have already been credited back
      const existingReimbursements = await this.prisma.transaction.findMany({
        where: {
          description: {
            contains: 'Guarantor fund reimbursement - loan completion'
          },
          reference: {
            contains: `LCR-${loanId.slice(-8)}`
          }
        }
      });

      if (existingReimbursements.length > 0) {
        return {
          success: true,
          message: 'Guarantor funds have already been credited back for this loan',
          loanId,
          totalCreditedBack: 0,
          reimbursements: []
        };
      }

      // 4. Find original guarantee deduction transactions for each guarantor
      const reimbursementResults = [];
      let totalCreditedBack = 0;

      // Execute all reimbursements in a single transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        for (const guarantor of loanGuarantors) {
          const guaranteedAmount = Number(guarantor.guaranteedAmount);
          
          if (guaranteedAmount <= 0) {
            console.log(`⚠️ Skipping guarantor ${guarantor.guarantor.name} - zero guaranteed amount`);
            continue;
          }

          // Get current account balance
          const currentAccount = await tx.account.findUnique({
            where: { id: guarantor.guarantorAccountId },
            select: { balance: true, accountNumber: true }
          });

          if (!currentAccount) {
            console.log(`⚠️ Guarantor account not found: ${guarantor.guarantorAccountId}`);
            continue;
          }

          const previousBalance = Number(currentAccount.balance);
          const newBalance = previousBalance + guaranteedAmount;

          // Create credit transaction for the guarantor
          const creditTransaction = await tx.transaction.create({
            data: {
              accountId: guarantor.guarantorAccountId,
              type: 'DEPOSIT',
              amount: guaranteedAmount,
              description: `Guarantor fund reimbursement - loan completion (Loan: ${loan.account.accountNumber}, Borrower: ${loan.account.customer.name})`,
              reference: `LCR-${loanId.slice(-8)}-${guarantor.guarantorAccountId.slice(-6)}`,
              status: 'COMPLETED'
            }
          });

          // Update guarantor account balance
          await tx.account.update({
            where: { id: guarantor.guarantorAccountId },
            data: {
              balance: newBalance,
              lastTransactionDate: new Date()
            }
          });

          // Update LoanGuarantor status to indicate funds have been returned
          await tx.loanGuarantor.update({
            where: { id: guarantor.id },
            data: {
              status: 'FUNDS_RETURNED'
            }
          });

          const reimbursement = {
            guarantorId: guarantor.guarantor.id,
            guarantorName: guarantor.guarantor.name,
            accountId: guarantor.guarantorAccountId,
            accountNumber: currentAccount.accountNumber,
            originalDeduction: guaranteedAmount,
            creditedBack: guaranteedAmount,
            transactionId: creditTransaction.id,
            previousBalance,
            newBalance
          };

          reimbursementResults.push(reimbursement);
          totalCreditedBack += guaranteedAmount;

          console.log(`✅ Credited ₵${guaranteedAmount} back to ${guarantor.guarantor.name} (${currentAccount.accountNumber})`);
        }

        return reimbursementResults;
      });

      console.log(`✅ Guarantor reimbursement completed for loan ${loanId}. Total credited: ₵${totalCreditedBack}`);

      return {
        success: true,
        message: `Successfully credited back ₵${totalCreditedBack} to ${result.length} guarantor(s)`,
        loanId,
        totalCreditedBack,
        reimbursements: result
      };

    } catch (error) {
      console.error('Error processing guarantor reimbursement:', error);
      return {
        success: false,
        message: 'Failed to process guarantor reimbursement',
        loanId,
        totalCreditedBack: 0,
        reimbursements: [],
        error: error.message
      };
    }
  }

  /**
   * Check which loans are completed but haven't had guarantor funds credited back
   */
  async findLoansNeedingGuarantorReimbursement() {
    try {
      // Find completed loans
      const completedLoans = await this.prisma.loan.findMany({
        where: {
          isCompleted: true,
          status: 'PAID'
        },
        include: {
          account: {
            select: { accountNumber: true, customer: { select: { name: true } } }
          },
          guarantors: {
            where: { status: 'ACTIVE' },
            select: { guaranteedAmount: true }
          }
        }
      });

      const loansNeedingReimbursement = [];

      for (const loan of completedLoans) {
        // Check if reimbursement has already been processed
        const existingReimbursements = await this.prisma.transaction.findMany({
          where: {
            description: {
              contains: 'Guarantor fund reimbursement - loan completion'
            },
            reference: {
              contains: `LCR-${loan.id.slice(-8)}`
            }
          }
        });

        if (existingReimbursements.length === 0 && loan.guarantors.length > 0) {
          const totalToCredit = loan.guarantors.reduce((sum, g) => sum + Number(g.guaranteedAmount), 0);
          
          loansNeedingReimbursement.push({
            loanId: loan.id,
            borrowerName: loan.account.customer.name,
            accountNumber: loan.account.accountNumber,
            guarantorCount: loan.guarantors.length,
            totalToCredit
          });
        }
      }

      return loansNeedingReimbursement;

    } catch (error) {
      console.error('Error finding loans needing guarantor reimbursement:', error);
      return [];
    }
  }

  /**
   * Process reimbursement for all completed loans that haven't been processed
   */
  async processAllPendingReimbursements() {
    const pendingLoans = await this.findLoansNeedingGuarantorReimbursement();
    const results = [];
    let totalCredited = 0;
    let processed = 0;

    console.log(`🔄 Processing ${pendingLoans.length} loans needing guarantor reimbursement...`);

    for (const loan of pendingLoans) {
      const result = await this.processLoanCompletionReimbursement(loan.loanId);
      results.push(result);
      
      if (result.success) {
        processed++;
        totalCredited += result.totalCreditedBack;
      }
    }

    console.log(`✅ Processed ${processed}/${pendingLoans.length} loans. Total credited: ₵${totalCredited}`);

    return {
      processed,
      totalCredited,
      results
    };
  }

  /**
   * Get reimbursement history for a loan
   */
  async getReimbursementHistory(loanId) {
    try {
      const reimbursements = await this.prisma.transaction.findMany({
        where: {
          description: {
            contains: 'Guarantor fund reimbursement - loan completion'
          },
          reference: {
            contains: `LCR-${loanId.slice(-8)}`
          }
        },
        include: {
          account: {
            include: {
              customer: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return reimbursements.map(txn => ({
        transactionId: txn.id,
        guarantorName: txn.account.customer.name,
        accountNumber: txn.account.accountNumber,
        amount: Number(txn.amount),
        date: txn.date,
        reference: txn.reference
      }));

    } catch (error) {
      console.error('Error getting reimbursement history:', error);
      return [];
    }
  }
}

// Export factory function
function createGuarantorReimbursementService(prismaClient) {
  return new GuarantorReimbursementService(prismaClient);
}

module.exports = {
  GuarantorReimbursementService,
  createGuarantorReimbursementService
};