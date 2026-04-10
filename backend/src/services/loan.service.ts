import { PrismaClient, Loan, LoanStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface LoanApplicationRequest {
  customerId: string;
  accountId: string;
  amount: number;
  interestRate: number;
  term: number; // months
  guarantors: {
    customerId: string;
    accountId: string;
    guaranteedAmount: number;
  }[];
}

export interface LoanEligibilityCheck {
  isEligible: boolean;
  customerMaxLoan: number;
  customerBalance: number;
  customerContribution: number;
  guaranteeRequired: number;
  guarantorDeficit: number;
  message: string;
  guarantorChecks: {
    customerId: string;
    accountId: string;
    currentBalance: number;
    availableForGuarantee: number;
    requestedAmount: number;
    isEligible: boolean;
    message: string;
  }[];
}

export class LoanService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check loan eligibility including guarantor capacity
   */
  async checkLoanEligibility(request: LoanApplicationRequest): Promise<LoanEligibilityCheck> {
    // Get customer's account balance
    const customerAccount = await this.prisma.account.findUnique({
      where: { id: request.accountId }
    });

    if (!customerAccount) {
      return {
        isEligible: false,
        customerMaxLoan: 0,
        customerBalance: 0,
        customerContribution: 0,
        guaranteeRequired: request.amount,
        guarantorDeficit: request.amount,
        message: "Customer account not found",
        guarantorChecks: []
      };
    }

    // Calculate current balance using legacy balance for now
    const customerBalance = customerAccount.balance.toNumber();

    // Maximum loan is 2x the account balance
    const maxLoanAmount = customerBalance * 2;
    
    if (request.amount > maxLoanAmount) {
      return {
        isEligible: false,
        customerMaxLoan: maxLoanAmount,
        customerBalance,
        customerContribution: customerBalance,
        guaranteeRequired: request.amount - customerBalance,
        guarantorDeficit: request.amount - customerBalance,
        message: `Loan amount exceeds maximum allowed (${maxLoanAmount}). Maximum is 2x account balance.`,
        guarantorChecks: []
      };
    }

    // Customer contributes their full balance, guarantors cover the rest
    const customerContribution = Math.min(customerBalance, request.amount);
    const guaranteeRequired = request.amount - customerContribution;

    // Check each guarantor's capacity
    const guarantorChecks = await Promise.all(
      request.guarantors.map(async (guarantor) => {
        const account = await this.prisma.account.findUnique({
          where: { id: guarantor.accountId }
        });

        if (!account) {
          return {
            customerId: guarantor.customerId,
            accountId: guarantor.accountId,
            currentBalance: 0,
            availableForGuarantee: 0,
            requestedAmount: guarantor.guaranteedAmount,
            isEligible: false,
            message: "Account not found"
          };
        }

        const currentBalance = account.balance.toNumber();
        
        // TODO: Implement restrictions when AccountRestriction model is available
        // For now, assume no existing restrictions
        const totalRestricted = 0;
        const availableForGuarantee = Math.max(0, currentBalance - totalRestricted);

        return {
          customerId: guarantor.customerId,
          accountId: guarantor.accountId,
          currentBalance,
          availableForGuarantee,
          requestedAmount: guarantor.guaranteedAmount,
          isEligible: guarantor.guaranteedAmount <= availableForGuarantee,
          message: guarantor.guaranteedAmount <= availableForGuarantee 
            ? "Eligible" 
            : `Insufficient balance. Available: ${availableForGuarantee}, Required: ${guarantor.guaranteedAmount}`
        };
      })
    );

    // Check if all guarantors are eligible
    const allGuarantorsEligible = guarantorChecks.every(g => g.isEligible);
    const totalGuaranteedAmount = request.guarantors.reduce((sum, g) => sum + g.guaranteedAmount, 0);
    const guarantorDeficit = Math.max(0, guaranteeRequired - totalGuaranteedAmount);

    const isEligible = guaranteeRequired <= totalGuaranteedAmount && allGuarantorsEligible;

    return {
      isEligible,
      customerMaxLoan: maxLoanAmount,
      customerBalance,
      customerContribution,
      guaranteeRequired,
      guarantorDeficit,
      message: isEligible 
        ? "Loan application is eligible"
        : guarantorDeficit > 0 
          ? `Insufficient guarantee coverage. Need additional ${guarantorDeficit}`
          : "One or more guarantors have insufficient balance",
      guarantorChecks
    };
  }

  /**
   * Create a new loan with guarantors
   */
  async createLoan(request: LoanApplicationRequest, createdBy: string): Promise<Loan> {
    // First check eligibility
    const eligibility = await this.checkLoanEligibility(request);
    
    if (!eligibility.isEligible) {
      throw new Error(`Loan application not eligible: ${eligibility.message}`);
    }

    // Calculate loan details
    const monthlyInterestRate = request.interestRate / 100 / 12;
    const totalPayable = request.amount * (1 + (request.interestRate / 100) * (request.term / 12));
    const monthlyPayment = totalPayable / request.term;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + request.term);

    return await this.prisma.$transaction(async (tx) => {
      // Create the loan
      const loan = await tx.loan.create({
        data: {
          customerId: request.customerId,
          accountId: request.accountId,
          amount: new Decimal(request.amount),
          interestRate: new Decimal(request.interestRate),
          term: request.term,
          totalPayable: new Decimal(totalPayable),
          outstandingBalance: new Decimal(request.amount),
          monthlyPayment: new Decimal(monthlyPayment),
          endDate,
          principalRemaining: new Decimal(request.amount),
          customerContribution: new Decimal(eligibility.customerContribution),
          guaranteeRequired: new Decimal(eligibility.guaranteeRequired),
          createdBy
        }
      });

      // TODO: Create guarantor records and restrictions when models are available
      // This will be implemented when LoanGuarantor and AccountRestriction models are generated

      return loan;
    });
  }

  /**
   * Process loan repayment
   */
  async processLoanRepayment(loanId: string, paymentAmount: number, userId: string): Promise<void> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId }
      // TODO: Add guarantors include when model is available
    });

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error('Loan is not active');
    }

    await this.prisma.$transaction(async (tx) => {
      const remainingBalance = loan.principalRemaining.toNumber();
      const actualPayment = Math.min(paymentAmount, remainingBalance);
      const newRemainingBalance = remainingBalance - actualPayment;

      // Update loan
      await tx.loan.update({
        where: { id: loanId },
        data: {
          totalPaid: loan.totalPaid.add(actualPayment),
          principalRemaining: new Decimal(newRemainingBalance),
          lastPaymentDate: new Date(),
          lastPaymentAmount: new Decimal(actualPayment),
          isCompleted: newRemainingBalance <= 0,
          status: newRemainingBalance <= 0 ? LoanStatus.PAID : LoanStatus.ACTIVE
        }
      });

      // If loan is completed, release guarantor restrictions
      if (newRemainingBalance <= 0) {
        await this.releaseLoanGuarantees(loanId, tx);
      } else {
        // Proportionally reduce guarantor restrictions
        await this.adjustGuarantorRestrictions(loanId, newRemainingBalance, tx);
      }
    });
  }

  /**
   * Release all guarantor restrictions for a completed loan
   */
  private async releaseLoanGuarantees(loanId: string, tx: any): Promise<void> {
    // TODO: Implement when guarantor models are available
    // This will release all guarantor restrictions when loan is completed
  }

  /**
   * Adjust guarantor restrictions based on remaining loan balance
   */
  private async adjustGuarantorRestrictions(loanId: string, remainingBalance: number, tx: any): Promise<void> {
    // TODO: Implement when guarantor models are available
    // This will proportionally adjust guarantor restrictions based on remaining loan balance
  }

  /**
   * Get available balance for withdrawal (considering restrictions)
   */
  async getAvailableBalanceForWithdrawal(accountId: string): Promise<number> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // For now, return full balance until restrictions are implemented
    const currentBalance = account.balance.toNumber();
    
    // TODO: Implement restrictions when AccountRestriction model is available
    const totalRestricted = 0;

    return Math.max(0, currentBalance - totalRestricted);
  }

  /**
   * Get all active loans for a customer
   */
  async getCustomerLoans(customerId: string): Promise<any[]> {
    return await this.prisma.loan.findMany({
      where: { customerId },
      include: {
        customer: true,
        account: true
        // TODO: Add guarantors include when model is available
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all loans where customer is a guarantor
   */
  async getGuarantorLoans(customerId: string): Promise<any[]> {
    // TODO: Implement when LoanGuarantor model is available
    return [];
    
    // This will return loans where the customer is acting as a guarantor
  }
}