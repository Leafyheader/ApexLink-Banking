import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/auth';

const prisma = new PrismaClient();

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    // Get date ranges for current and previous month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Get total customers
    const totalCustomers = await prisma.customer.count({
      where: { kycStatus: 'VERIFIED' }
    });

    // Get customers from previous month for comparison
    const customersLastMonth = await prisma.customer.count({
      where: { 
        kycStatus: 'VERIFIED',
        createdAt: { lte: previousMonthEnd }
      }
    });    // Get total deposits (sum of all deposit transactions)
    const depositsResult = await prisma.transaction.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    // Get deposits from previous month for comparison
    const depositsLastMonth = await prisma.transaction.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd
        }
      },
      _sum: {
        amount: true
      }
    });

    const depositsThisMonth = await prisma.transaction.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      },
      _sum: {
        amount: true
      }
    });    // Get total loans (sum of all loan account balances)
    const loansResult = await prisma.account.aggregate({
      where: {
        status: 'ACTIVE',
        type: 'LOAN'
      },
      _sum: {
        balance: true
      }
    });

    // Get loans from previous month for comparison
    const loansLastMonth = await prisma.transaction.aggregate({
      where: {
        type: 'LOAN_REPAYMENT',
        status: 'COMPLETED',
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd
        }
      },
      _sum: {
        amount: true
      }
    });

    const loansThisMonth = await prisma.transaction.aggregate({
      where: {
        type: 'LOAN_REPAYMENT',
        status: 'COMPLETED',
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      },
      _sum: {
        amount: true
      }
    });

    // Get total withdrawals (sum of all withdrawal transactions)
    const withdrawalsResult = await prisma.transaction.aggregate({
      where: {
        type: 'WITHDRAWAL',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    // Get withdrawals for month-over-month comparison
    const withdrawalsLastMonth = await prisma.transaction.aggregate({
      where: {
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd
        }
      },
      _sum: {
        amount: true
      }
    });

    const withdrawalsThisMonth = await prisma.transaction.aggregate({
      where: {
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      },
      _sum: {
        amount: true
      }
    });

    // Get today's transactions count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTransactions = await prisma.transaction.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        },
        status: 'COMPLETED'
      }    });

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Calculate month-over-month changes
    const customersChange = calculatePercentageChange(
      totalCustomers, 
      customersLastMonth
    );

    const depositsChange = calculatePercentageChange(
      Number(depositsThisMonth._sum.amount || 0),
      Number(depositsLastMonth._sum.amount || 0)
    );

    const withdrawalsChange = calculatePercentageChange(
      Number(withdrawalsThisMonth._sum.amount || 0),
      Number(withdrawalsLastMonth._sum.amount || 0)
    );

    const loansChange = calculatePercentageChange(
      Number(loansThisMonth._sum.amount || 0),
      Number(loansLastMonth._sum.amount || 0)
    );

    // Calculate transactions change (comparing this month vs last month)
    const transactionsThisMonth = await prisma.transaction.count({
      where: {
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        },
        status: 'COMPLETED'
      }
    });

    const transactionsLastMonth = await prisma.transaction.count({
      where: {
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd
        },
        status: 'COMPLETED'
      }
    });

    const transactionsChange = calculatePercentageChange(
      transactionsThisMonth,
      transactionsLastMonth
    );    const summary = {
      totalCustomers,
      totalDeposits: Number(depositsResult._sum.amount || 0),
      totalWithdrawals: Number(withdrawalsResult._sum.amount || 0),
      totalLoans: Number(loansResult._sum.balance || 0),
      todayTransactions,
      // Month-over-month percentage changes
      changes: {
        customers: Math.round(customersChange * 100) / 100,
        deposits: Math.round(depositsChange * 100) / 100,
        withdrawals: Math.round(withdrawalsChange * 100) / 100,
        loans: Math.round(loansChange * 100) / 100,
        transactions: Math.round(transactionsChange * 100) / 100
      }
    };

    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
};

export const getRecentTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const transactions = await prisma.transaction.findMany({
      take: limit,
      orderBy: {
        date: 'desc'
      },
      include: {
        account: {
          include: {
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      accountId: transaction.accountId,
      accountNumber: transaction.account.accountNumber,
      customerName: transaction.account.customer.name,
      amount: Number(transaction.amount),
      type: transaction.type.toLowerCase(),
      status: transaction.status.toLowerCase(),
      date: transaction.date.toISOString(),
      description: transaction.description || `${transaction.type} transaction`,
      reference: transaction.reference
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Recent transactions error:', error);
    res.status(500).json({ message: 'Failed to fetch recent transactions' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Get monthly transaction trends (last 12 months)
    const monthlyStats = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as withdrawals
      FROM Transaction 
      WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        AND status = 'COMPLETED'
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month ASC
    ` as any[];

    // Get account type distribution
    const accountTypes = await prisma.account.groupBy({
      by: ['type'],
      where: {
        status: 'ACTIVE'
      },
      _count: {
        type: true
      },
      _sum: {
        balance: true
      }
    });

    const stats = {
      monthlyTransactions: monthlyStats.map(stat => ({
        month: stat.month,
        transactionCount: Number(stat.transaction_count),
        deposits: Number(stat.deposits || 0),
        withdrawals: Number(stat.withdrawals || 0)
      })),
      accountDistribution: accountTypes.map(type => ({
        type: type.type.toLowerCase(),
        count: type._count.type,
        totalBalance: Number(type._sum.balance || 0)
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};
