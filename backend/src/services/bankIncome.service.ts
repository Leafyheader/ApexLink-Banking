import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBankIncomeParams {
  type: 'WITHDRAWAL_CHARGE' | 'LOAN_INTEREST' | 'TRANSFER_FEE' | 'OTHER';
  amount: number;
  description?: string;
  sourceId?: string;
  sourceType?: string;
  accountId?: string;
  customerId?: string;
}

export class BankIncomeService {
  
  /**
   * Record bank income from various sources
   */
  static async recordIncome(params: CreateBankIncomeParams) {
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
    } catch (error) {
      console.error('❌ Error recording bank income:', error);
      throw error;
    }
  }

  /**
   * Record withdrawal charge (5 cedis per withdrawal)
   */
  static async recordWithdrawalCharge(
    transactionId: string,
    accountId: string,
    customerId: string,
    amount: number = 5.00
  ) {
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
  static async reverseWithdrawalCharge(
    transactionId: string,
    amount: number = 5.00
  ) {
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
  static async recordLoanInterest(
    loanId: string,
    accountId: string,
    customerId: string,
    interestAmount: number,
    period?: string
  ) {
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
  static async getIncomeStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
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
    ]);    const incomeBreakdown = incomeByType.reduce((acc: Record<string, { amount: number; count: number }>, item: any) => {
      acc[item.type.toLowerCase()] = {
        amount: Number(item._sum.amount || 0),
        count: item._count.id
      };
      return acc;
    }, {} as Record<string, { amount: number; count: number }>);

    return {
      totalIncome: Number(totalIncome._sum.amount || 0),
      totalCount: incomeCount,
      breakdown: incomeBreakdown
    };
  }

  /**
   * Get recent income records
   */
  static async getRecentIncome(limit: number = 50) {
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
          const income = await this.recordLoanInterest(
            loan.id,
            loan.accountId,
            loan.customerId,
            dailyInterest,
            new Date().toDateString()
          );
          incomeRecords.push(income);
        }
      }

      console.log(`✅ Calculated daily interest for ${incomeRecords.length} loans`);
      return incomeRecords;
    } catch (error) {
      console.error('❌ Error calculating daily loan interest:', error);
      throw error;
    }
  }

  /**
   * Get paginated income records for a date range
   */
  static async getPaginatedIncome(startDate: Date, endDate: Date, skip: number, take: number) {
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
