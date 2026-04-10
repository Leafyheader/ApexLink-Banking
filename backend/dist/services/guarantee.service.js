"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuaranteeService = void 0;
class GuaranteeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Get all guarantees for a customer's accounts
     */
    async getCustomerGuaranteeInfo(customerId) {
        // Get all customer accounts
        const customerAccounts = await this.prisma.account.findMany({
            where: { customerId },
            include: {
                customer: {
                    select: { name: true, firstName: true, surname: true }
                }
            }
        });
        const guaranteeInfo = [];
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
    async getAccountGuaranteeInfo(accountId) {
        // Get loans where this account is used as guarantor through LoanGuarantor model
        const guarantorRecords = await this.prisma.loanGuarantor.findMany({
            where: {
                guarantorAccountId: accountId,
                status: 'ACTIVE' // Only active guarantees
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
        // Get loans owned by the account holder
        const ownLoans = await this.prisma.loan.findMany({
            where: { accountId },
            select: {
                id: true,
                amount: true,
                outstandingBalance: true,
                status: true
            }
        });
        // Calculate total restricted amount
        // NOTE: For guarantor accounts, the guaranteed amount has already been deducted
        // from their balance when the loan was created. We should not double-restrict
        // the same amount. The current balance already reflects the deduction.
        let totalRestricted = 0;
        const activeGuarantees = [];
        // Process guaranteed loans for informational purposes only
        // The amounts shown are already deducted, so no additional restriction needed
        for (const guarantorRecord of guarantorRecords) {
            const loan = guarantorRecord.loan;
            // Skip if loan is not active
            if (loan.status !== 'ACTIVE')
                continue;
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
    async calculateAvailableForWithdrawal(accountId) {
        // Get account balance
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { balance: true, type: true }
        });
        if (!account) {
            throw new Error('Account not found');
        }
        const accountBalance = Number(account.balance);
        const restrictions = [];
        let restrictedByGuarantees = 0;
        let restrictedByOwnLoans = 0;
        // 1. Check restrictions from guaranteeing other loans
        // NOTE: For guarantor accounts, the guaranteed amounts have already been deducted
        // from their balance when loans were created. No additional restriction needed.
        const guaranteeInfo = await this.getAccountGuaranteeInfo(accountId);
        restrictedByGuarantees = 0; // No restriction since amounts already deducted
        // Add informational entry if there are active guarantees (but no restriction)
        if (guaranteeInfo.totalLoansGuaranteed > 0) {
            const totalGuaranteedAmount = guaranteeInfo.activeGuarantees.reduce((sum, g) => sum + g.guaranteeAmount, 0);
            restrictions.push({
                type: 'GUARANTEE',
                amount: 0, // No restriction - money already deducted
                description: `₵${totalGuaranteedAmount.toLocaleString()} already deducted for ${guaranteeInfo.totalLoansGuaranteed} loan guarantee(s)`
            });
        }
        // 2. Enhanced restriction for own loans - must have more than loan amount to withdraw
        const ownActiveLoans = await this.prisma.loan.findMany({
            where: {
                accountId,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                amount: true,
                outstandingBalance: true
            }
        });
        for (const loan of ownActiveLoans) {
            const loanAmount = Number(loan.amount);
            // For own loans, customer must maintain balance > loan amount to withdraw
            // This ensures they always have enough to cover their loan obligation
            if (accountBalance <= loanAmount) {
                const restrictedAmount = loanAmount - accountBalance + 1; // +1 to ensure they have MORE than loan amount
                restrictedByOwnLoans += restrictedAmount;
                restrictions.push({
                    type: 'OWN_LOAN',
                    amount: restrictedAmount,
                    description: `Must maintain balance greater than loan amount (₵${loanAmount.toLocaleString()})`
                });
            }
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
    async getAccountNotifications(accountId) {
        const notifications = [];
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
            // Warning if balance is close to loan amount
            const maxLoanAmount = Math.max(...guaranteeInfo.ownLoans.map(l => l.amount));
            if (withdrawalInfo.accountBalance <= maxLoanAmount * 1.1) { // Within 10% of loan amount
                notifications.push({
                    type: 'WARNING',
                    title: 'Low Balance Warning',
                    message: `Your balance is close to your loan amount. Maintain balance above ₵${maxLoanAmount.toLocaleString()} to continue withdrawals.`
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
exports.GuaranteeService = GuaranteeService;
