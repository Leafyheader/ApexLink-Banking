"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankIncomeService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BankIncomeService {
    /**
     * Record bank income from various sources
     */
    static async recordIncome(params) {
        try {
            const income = await prisma.bankIncome.create({
                data: {
                    type: params.type,
                    amount: params.amount,
                    description: params.description,
                    sourceId: params.sourceId,
                    sourceType: params.sourceType,
                    accountId: params.accountId,
                    customerId: params.customerId,
                },
                include: {
                    account: {
                        include: {
                            customer: true
                        }
                    },
                    customer: true
                }
            });
            console.log(`✅ Bank income recorded: ${params.type} - $${params.amount}`);
            return income;
        }
        catch (error) {
            console.error('❌ Error recording bank income:', error);
            throw error;
        }
    }
    /**
     * Record withdrawal charge (5 cedis per withdrawal)
     */
    static async recordWithdrawalCharge(transactionId, accountId, customerId, amount = 5.00) {
        return this.recordIncome({
            type: 'WITHDRAWAL_CHARGE',
            amount,
            description: `Withdrawal charge for transaction ${transactionId}`,
            sourceId: transactionId,
            sourceType: 'transaction',
            accountId,
            customerId
        });
    }
    /**
     * Reverse withdrawal charge (when withdrawal is reversed)
     */
    static async reverseWithdrawalCharge(transactionId, amount = 5.00) {
        return this.recordIncome({
            type: 'WITHDRAWAL_CHARGE',
            amount: -amount, // Negative amount to reverse the income
            description: `Reversal of withdrawal charge for transaction ${transactionId}`,
            sourceId: transactionId,
            sourceType: 'reversal'
        });
    }
    /**
     * Record loan interest income
     */
    static async recordLoanInterest(loanId, accountId, customerId, interestAmount, period) {
        const description = period
            ? `Loan interest for ${period}`
            : 'Loan interest income';
        return this.recordIncome({
            type: 'LOAN_INTEREST',
            amount: interestAmount,
            description,
            sourceId: loanId,
            sourceType: 'loan',
            accountId,
            customerId
        });
    }
    /**
     * Get bank income statistics
     */
    static async getIncomeStats(startDate, endDate) {
        const where = {};
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = startDate;
            if (endDate)
                where.date.lte = endDate;
        }
        const [totalIncome, incomeByType, incomeCount] = await Promise.all([
            // Total income
            prisma.bankIncome.aggregate({
                where,
                _sum: {
                    amount: true
                }
            }),
            // Income by type
            prisma.bankIncome.groupBy({
                by: ['type'],
                where,
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                }
            }),
            // Total count
            prisma.bankIncome.count({ where })
        ]);
        const incomeBreakdown = incomeByType.reduce((acc, item) => {
            acc[item.type.toLowerCase()] = {
                amount: Number(item._sum.amount || 0),
                count: item._count.id
            };
            return acc;
        }, {});
        return {
            totalIncome: Number(totalIncome._sum.amount || 0),
            totalCount: incomeCount,
            breakdown: incomeBreakdown
        };
    }
    /**
     * Get recent income records
     */
    static async getRecentIncome(limit = 50) {
        return prisma.bankIncome.findMany({
            take: limit,
            orderBy: {
                date: 'desc'
            },
            include: {
                account: {
                    include: {
                        customer: {
                            select: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                },
                customer: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });
    }
    /**
     * Calculate and record daily loan interest for all active loans
     */
    static async calculateDailyLoanInterest() {
        try {
            const activeLoans = await prisma.loan.findMany({
                where: {
                    status: 'ACTIVE'
                },
                include: {
                    account: true,
                    customer: true
                }
            });
            const incomeRecords = [];
            for (const loan of activeLoans) {
                // Calculate daily interest
                const annualInterestRate = Number(loan.interestRate) / 100;
                const dailyInterestRate = annualInterestRate / 365;
                const outstandingBalance = Math.abs(Number(loan.account.balance)); // Convert negative balance to positive
                const dailyInterest = outstandingBalance * dailyInterestRate;
                if (dailyInterest > 0) {
                    const income = await this.recordLoanInterest(loan.id, loan.accountId, loan.customerId, dailyInterest, new Date().toDateString());
                    incomeRecords.push(income);
                }
            }
            console.log(`✅ Calculated daily interest for ${incomeRecords.length} loans`);
            return incomeRecords;
        }
        catch (error) {
            console.error('❌ Error calculating daily loan interest:', error);
            throw error;
        }
    }
    /**
     * Get paginated income records for a date range
     */
    static async getPaginatedIncome(startDate, endDate, skip, take) {
        const where = {
            date: {
                gte: startDate,
                lte: endDate
            }
        };
        const [records, totalRecords] = await Promise.all([
            prisma.bankIncome.findMany({
                where,
                skip,
                take,
                orderBy: {
                    date: 'desc'
                },
                include: {
                    account: {
                        include: {
                            customer: {
                                select: {
                                    name: true,
                                    phone: true
                                }
                            }
                        }
                    },
                    customer: {
                        select: {
                            name: true,
                            phone: true
                        }
                    }
                }
            }),
            prisma.bankIncome.count({ where })
        ]);
        return { records, totalRecords };
    }
}
exports.BankIncomeService = BankIncomeService;
