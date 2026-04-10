import { PrismaClient, LoanStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface SimpleLoanApplicationRequest {
  customerId: string;
  accountId: string;
  amount: number;
  interestRate: number;
  term: number; // months
  guarantor1Id?: string;
  guarantor1AccountId?: string;
  guarantor1Amount?: number;
  guarantor2Id?: string;
  guarantor2AccountId?: string;
  guarantor2Amount?: number;
  guarantor3Id?: string;
  guarantor3AccountId?: string;
  guarantor3Amount?: number;
}

export interface LoanEligibilityCheck {
  isEligible: boolean;
  customerMaxLoan: number;
  customerBalance: number;
  customerContribution: number;
  guaranteeRequired: number;
  message: string;
  guarantor1Check?: GuarantorEligibility;
  guarantor2Check?: GuarantorEligibility;
  guarantor3Check?: GuarantorEligibility;
}

interface GuarantorEligibility {
  customerId: string;
  accountId: string;
  currentBalance: number;
  availableForGuarantee: number;
  requestedAmount: number;
  isEligible: boolean;
  message: string;
}

export class SimpleLoanService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check loan eligibility with existing loan structure
   */
  async checkLoanEligibility(request: SimpleLoanApplicationRequest): Promise<LoanEligibilityCheck> {
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
        message: "Customer account not found"
      };
    }

    const customerBalance = customerAccount.balance.toNumber();
    const maxLoanAmount = customerBalance * 2; // Maximum loan is 2x account balance
    
    if (request.amount > maxLoanAmount) {
      return {
        isEligible: false,
        customerMaxLoan: maxLoanAmount,
        customerBalance,
        customerContribution: customerBalance,
        guaranteeRequired: request.amount - customerBalance,
        message: `Loan amount ${request.amount} exceeds maximum allowed ${maxLoanAmount}. Maximum is 2x account balance (${customerBalance} x 2).`
      };
    }

    const customerContribution = Math.min(customerBalance, request.amount);
    const guaranteeRequired = request.amount - customerContribution;

    // Check guarantors if any
    const guarantorChecks: { [key: string]: GuarantorEligibility } = {};
    let totalGuaranteedAmount = 0;

    // Check guarantor 1
    if (request.guarantor1Id && request.guarantor1AccountId && request.guarantor1Amount) {
      const check = await this.checkGuarantorEligibility(
        request.guarantor1Id,
        request.guarantor1AccountId,
        request.guarantor1Amount
      );
      guarantorChecks.guarantor1Check = check;
      if (check.isEligible) {
        totalGuaranteedAmount += request.guarantor1Amount;
      }
    }

    // Check guarantor 2
    if (request.guarantor2Id && request.guarantor2AccountId && request.guarantor2Amount) {
      const check = await this.checkGuarantorEligibility(
        request.guarantor2Id,
        request.guarantor2AccountId,
        request.guarantor2Amount
      );
      guarantorChecks.guarantor2Check = check;
      if (check.isEligible) {
        totalGuaranteedAmount += request.guarantor2Amount;
      }
    }

    // Check guarantor 3
    if (request.guarantor3Id && request.guarantor3AccountId && request.guarantor3Amount) {
      const check = await this.checkGuarantorEligibility(
        request.guarantor3Id,
        request.guarantor3AccountId,
        request.guarantor3Amount
      );
      guarantorChecks.guarantor3Check = check;
      if (check.isEligible) {
        totalGuaranteedAmount += request.guarantor3Amount;
      }
    }

    const isEligible = totalGuaranteedAmount >= guaranteeRequired &&
      Object.values(guarantorChecks).every(check => check.isEligible);

    return {
      isEligible,
      customerMaxLoan: maxLoanAmount,
      customerBalance,
      customerContribution,
      guaranteeRequired,
      message: isEligible 
        ? "Loan application is eligible"
        : `Need guarantee coverage of ${guaranteeRequired}. Currently have ${totalGuaranteedAmount}`,
      ...guarantorChecks
    };
  }

  /**
   * Check individual guarantor eligibility
   */
  private async checkGuarantorEligibility(
    customerId: string,
    accountId: string,
    requestedAmount: number
  ): Promise<GuarantorEligibility> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return {
        customerId,
        accountId,
        currentBalance: 0,
        availableForGuarantee: 0,
        requestedAmount,
        isEligible: false,
        message: "Account not found"
      };
    }

    const currentBalance = account.balance.toNumber();
    
    // For now, assume no existing guarantees (will be implemented when new schema is ready)
    let existingGuarantees = 0;
    
    // TODO: Implement proper guarantee tracking when new schema models are available
    // This is a placeholder until LoanGuarantor and AccountRestriction models are properly generated

    const availableForGuarantee = Math.max(0, currentBalance - existingGuarantees);
    const isEligible = requestedAmount <= availableForGuarantee;

    return {
      customerId,
      accountId,
      currentBalance,
      availableForGuarantee,
      requestedAmount,
      isEligible,
      message: isEligible 
        ? "Eligible" 
        : `Insufficient balance. Available: ${availableForGuarantee}, Required: ${requestedAmount}`
    };
  }

  /**
   * Create a loan with the existing structure
   */
  async createLoan(request: SimpleLoanApplicationRequest, createdBy: string): Promise<any> {
    const eligibility = await this.checkLoanEligibility(request);
    
    if (!eligibility.isEligible) {
      throw new Error(`Loan application not eligible: ${eligibility.message}`);
    }

    const monthlyInterestRate = request.interestRate / 100 / 12;
    const totalPayable = request.amount * (1 + (request.interestRate / 100) * (request.term / 12));
    const monthlyPayment = totalPayable / request.term;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + request.term);

    return await this.prisma.loan.create({
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
        // Note: Guarantor fields will be added when schema is updated
        // For now, store guarantor info in description or separate tracking
        createdBy
      }
    });
  }

  /**
   * Get available balance for withdrawal considering loan guarantees
   */
  async getAvailableBalanceForWithdrawal(accountId: string): Promise<number> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const currentBalance = account.balance.toNumber();
    
    // Get all active loans where this account is a guarantor
    const customer = await this.prisma.customer.findFirst({
      where: {
        accounts: {
          some: { id: accountId }
        }
      }
    });

    if (!customer) {
      return currentBalance;
    }

    // TODO: Implement proper guarantor loan tracking when schema is updated
    // For now, return full balance as available
    let restrictedAmount = 0;
    
    // This will be implemented when LoanGuarantor model is available

    return Math.max(0, currentBalance - restrictedAmount);
  }

  /**
   * Process loan repayment and adjust guarantor restrictions
   */
  async processLoanRepayment(loanId: string, paymentAmount: number): Promise<void> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId }
    });

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error('Loan is not active');
    }

    const remainingBalance = loan.principalRemaining.toNumber();
    const actualPayment = Math.min(paymentAmount, remainingBalance);
    const newRemainingBalance = remainingBalance - actualPayment;

    await this.prisma.loan.update({
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
  }

  /**
   * Get customer loans
   */
  async getCustomerLoans(customerId: string): Promise<any[]> {
    return await this.prisma.loan.findMany({
      where: { customerId },
      include: {
        customer: true,
        account: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get loans where customer is a guarantor
   */
  async getGuarantorLoans(customerId: string): Promise<any[]> {
    // TODO: Implement when guarantor fields are available in schema
    // For now, return empty array
    return [];
    
    // This will be implemented when guarantor fields are properly added to loan model
  }
}