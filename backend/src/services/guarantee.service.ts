import { PrismaClient, Prisma } from '@prisma/client';

export interface GuaranteeInfo {
  loanId: string;
  borrowerName: string;
  borrowerAccountNumber: string;
  loanAmount: number;
  guaranteeAmount: number;
  guaranteePercentage: number;
  loanStatus: string;
  loanAuthorizationStatus: string;
  loanDate: Date;
  isActive: boolean;
}

export interface AccountRestriction {
  accountId: string;
  restrictedAmount: number;
  totalLoansGuaranteed: number;
  activeGuarantees: GuaranteeInfo[];
  ownLoans: {
    loanId: string;
    amount: number;
    outstandingBalance: number;
    status: string;
  }[];
}

export class GuaranteeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all guarantees for a customer's accounts
   */
  async getCustomerGuaranteeInfo(customerId: string): Promise<AccountRestriction[]> {
    // Get all customer accounts
    const customerAccounts = await this.prisma.account.findMany({
      where: { customerId },
      include: {
        customer: {
          select: { name: true, firstName: true, surname: true }
        }
      }
    });

    const guaranteeInfo: AccountRestriction[] = [];

    for (const account of customerAccounts) {
      const restriction = await this.getAccountGuaranteeInfo(account.id);
      if (restriction.totalLoansGuaranteed > 0 || restriction.ownLoans.length > 0) {
        guaranteeInfo.push(restriction);
      }
    }

    return guaranteeInfo;
  }

  /**
   * Get guarantee information for a specific account
   */
  async getAccountGuaranteeInfo(accountId: string): Promise<AccountRestriction> {
    // Get loans where this account is used as guarantor through LoanGuarantor model
    const guarantorRecords = await this.prisma.loanGuarantor.findMany({
      where: {
        guarantorAccountId: accountId,
        status: 'ACTIVE'  // Only active guarantees
      },
      include: {
        loan: {
          include: {
            customer: {
              select: { name: true, firstName: true, surname: true }
            },
            account: {
              select: { accountNumber: true }
            }
          }
        }
      }
    });

    // Loans this account backs for its own holder. Found through the LOAN_OWN_BACKING hold,
    // not loan.accountId - that is the LOAN account, never the borrower's savings account.
    const ownBackingHolds = await this.prisma.accountRestriction.findMany({
      where: { accountId, restrictionType: 'LOAN_OWN_BACKING', isActive: true, loanId: { not: null } },
      include: {
        loan: { select: { id: true, amount: true, outstandingBalance: true, status: true } }
      }
    });
    const ownLoans = ownBackingHolds
      .map(hold => hold.loan)
      .filter((loan): loan is NonNullable<typeof loan> => loan !== null);

    // Calculate total restricted amount
    // NOTE: For guarantor accounts, the guaranteed amount has already been deducted
    // from their balance when the loan was created. We should not double-restrict
    // the same amount. The current balance already reflects the deduction.
    let totalRestricted = 0;
    const activeGuarantees: GuaranteeInfo[] = [];

    // Process guaranteed loans for informational purposes only
    // The amounts shown are already deducted, so no additional restriction needed
    for (const guarantorRecord of guarantorRecords) {
      const loan = guarantorRecord.loan;
      
      // Skip if loan is not active
      if (loan.status !== 'ACTIVE') continue;
      
      const guaranteedAmount = Number(guarantorRecord.guaranteedAmount);
      
      // NOTE: We don't add to totalRestricted because the money was already deducted
      // when the loan was created. The account balance already reflects this deduction.
      // totalRestricted += 0;  // No additional restriction needed
      
      activeGuarantees.push({
        loanId: loan.id,
        borrowerName: loan.customer.name || `${loan.customer.firstName} ${loan.customer.surname}`,
        borrowerAccountNumber: loan.account.accountNumber,
        loanAmount: Number(loan.amount),
        guaranteeAmount: guaranteedAmount,
        guaranteePercentage: (guaranteedAmount / Number(loan.amount)) * 100,
        loanStatus: loan.status,
        loanAuthorizationStatus: loan.authorizationStatus,
        loanDate: loan.startDate,
        isActive: true
      });
    }

    // Calculate restriction from own loans
    const ownLoanRestrictions = ownLoans
      .filter(loan => loan.status === 'ACTIVE')
      .map(loan => ({
        loanId: loan.id,
        amount: Number(loan.amount),
        outstandingBalance: Number(loan.outstandingBalance),
        status: loan.status
      }));

    return {
      accountId,
      restrictedAmount: totalRestricted,
      totalLoansGuaranteed: guarantorRecords.length,
      activeGuarantees,
      ownLoans: ownLoanRestrictions
    };
  }

  /**
   * Enhanced calculation for available withdrawal amount
   * Considers both loan guarantees and own loans
   */
  async calculateAvailableForWithdrawal(accountId: string): Promise<{
    availableAmount: number;
    accountBalance: number;
    restrictedByGuarantees: number;
    restrictedByOwnLoans: number;
    restrictions: {
      type: 'GUARANTEE' | 'OWN_LOAN';
      amount: number;
      description: string;
    }[];
  }> {
    // Get account balance
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { balance: true, type: true }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const accountBalance = Number(account.balance);
    const restrictions: Array<{
      type: 'GUARANTEE' | 'OWN_LOAN';
      amount: number;
      description: string;
    }> = [];

    let restrictedByGuarantees = 0;
    let restrictedByOwnLoans = 0;

    // 1. Check restrictions from guaranteeing other loans.
    // Once a loan is APPROVED, the guaranteed amount has already been physically deducted
    // from the guarantor's balance, so no further restriction is needed at that point.
    // While a loan is still PENDING approval, the guarantee hasn't been deducted yet - an
    // active AccountRestriction row (created at loan-creation time, released on
    // approval/rejection/cancellation) reserves exactly that amount so it can't be
    // withdrawn out from under the loan while it awaits a decision.
    const guaranteeInfo = await this.getAccountGuaranteeInfo(accountId);

    const activeGuaranteeRestrictions = await this.prisma.accountRestriction.findMany({
      where: { accountId, restrictionType: 'LOAN_GUARANTEE', isActive: true }
    });
    restrictedByGuarantees = activeGuaranteeRestrictions.reduce(
      (sum, r) => sum + Number(r.restrictedAmount), 0
    );

    if (restrictedByGuarantees > 0) {
      restrictions.push({
        type: 'GUARANTEE',
        amount: restrictedByGuarantees,
        description: `₵${restrictedByGuarantees.toLocaleString()} reserved for ${activeGuaranteeRestrictions.length} pending loan guarantee(s)`
      });
    }

    // Add informational entry for already-approved guarantees only (no restriction - the
    // money is already deducted from the balance shown). Pending ones are covered by the
    // restriction above instead, so they aren't double-counted here.
    const approvedGuarantees = guaranteeInfo.activeGuarantees.filter(
      g => g.loanAuthorizationStatus === 'APPROVED'
    );
    if (approvedGuarantees.length > 0) {
      const totalGuaranteedAmount = approvedGuarantees.reduce((sum, g) => sum + g.guaranteeAmount, 0);
      restrictions.push({
        type: 'GUARANTEE',
        amount: 0, // No restriction - money already deducted
        description: `₵${totalGuaranteedAmount.toLocaleString()} already deducted for ${approvedGuarantees.length} loan guarantee(s)`
      });
    }

    // 2. The borrower's own backing: 50% of each loan this account backs is held from the moment
    // the loan is requested until it is fully repaid (or rejected/cancelled).
    const ownBackingHolds = await this.prisma.accountRestriction.findMany({
      where: { accountId, restrictionType: 'LOAN_OWN_BACKING', isActive: true }
    });

    for (const hold of ownBackingHolds) {
      const heldAmount = Number(hold.restrictedAmount);
      restrictedByOwnLoans += heldAmount;
      restrictions.push({
        type: 'OWN_LOAN',
        amount: heldAmount,
        description: `₵${heldAmount.toLocaleString()} held as your own backing for a loan until it is fully repaid`
      });
    }

    const totalRestricted = restrictedByGuarantees + restrictedByOwnLoans;
    const availableAmount = Math.max(0, accountBalance - totalRestricted);

    return {
      availableAmount,
      accountBalance,
      restrictedByGuarantees,
      restrictedByOwnLoans,
      restrictions
    };
  }

  /**
   * Get account status notifications including guarantee and loan information
   */
  async getAccountNotifications(accountId: string): Promise<{
    hasActiveLoans: boolean;
    hasGuaranteeObligations: boolean;
    notifications: {
      type: 'INFO' | 'WARNING' | 'RESTRICTION';
      title: string;
      message: string;
      amount?: number;
    }[];
  }> {
    const notifications: Array<{
      type: 'INFO' | 'WARNING' | 'RESTRICTION';
      title: string;
      message: string;
      amount?: number;
    }> = [];

    // Get guarantee and loan information
    const guaranteeInfo = await this.getAccountGuaranteeInfo(accountId);
    const withdrawalInfo = await this.calculateAvailableForWithdrawal(accountId);

    // Check for own loans
    const hasActiveLoans = guaranteeInfo.ownLoans.length > 0;
    if (hasActiveLoans) {
      const totalOwed = guaranteeInfo.ownLoans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
      
      notifications.push({
        type: 'INFO',
        title: 'Active Loan',
        message: `You have ${guaranteeInfo.ownLoans.length} active loan(s) with total outstanding balance of ₵${totalOwed.toLocaleString()}`,
        amount: totalOwed
      });

      // Warning if there's little or nothing left above the held amounts
      if (withdrawalInfo.restrictedByOwnLoans > 0 && withdrawalInfo.availableAmount <= withdrawalInfo.restrictedByOwnLoans * 0.1) {
        notifications.push({
          type: 'WARNING',
          title: 'Low Balance Warning',
          message: `₵${withdrawalInfo.restrictedByOwnLoans.toLocaleString()} of this balance is held as loan backing. Only ₵${withdrawalInfo.availableAmount.toLocaleString()} is available to withdraw.`
        });
      }
    }

    // Check for guarantee obligations
    const hasGuaranteeObligations = guaranteeInfo.totalLoansGuaranteed > 0;
    if (hasGuaranteeObligations) {
      notifications.push({
        type: 'INFO',
        title: 'Guarantee Obligations',
        message: `This account is guaranteeing ${guaranteeInfo.totalLoansGuaranteed} loan(s)`,
        amount: guaranteeInfo.restrictedAmount
      });
    }

    // Add withdrawal restrictions
    for (const restriction of withdrawalInfo.restrictions) {
      notifications.push({
        type: 'RESTRICTION',
        title: restriction.type === 'OWN_LOAN' ? 'Loan Restriction' : 'Guarantee Restriction',
        message: restriction.description,
        amount: restriction.amount
      });
    }

    return {
      hasActiveLoans,
      hasGuaranteeObligations,
      notifications
    };
  }
}