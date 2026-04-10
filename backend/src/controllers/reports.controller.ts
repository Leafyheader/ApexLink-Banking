import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/auth';

const prisma = new PrismaClient();

// Get financial summary report
export const getFinancialSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Set default date range (last 30 days if not provided)
    const endDate = dateTo ? new Date(dateTo as string) : new Date();
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get total deposits and withdrawals for the period
    const transactionSummary = await prisma.transaction.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get deposits specifically
    const deposits = await prisma.transaction.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'DEPOSIT',
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    // Get withdrawals specifically
    const withdrawals = await prisma.transaction.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    // Get loan repayments
    const loanRepayments = await prisma.transaction.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'LOAN_REPAYMENT',
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    // Get active accounts count
    const activeAccounts = await prisma.account.count({
      where: {
        status: 'ACTIVE',
      },
    });

    // Get new accounts created in the period
    const newAccounts = await prisma.account.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });    // Get total loans outstanding
    const totalLoans = await prisma.loan.aggregate({
      where: {
        status: 'ACTIVE',
      },
      _sum: {
        outstandingBalance: true,
      },
    });

    // Get overdue loans (using a mock calculation since OVERDUE is not in enum)
    const overdueLoans = await prisma.loan.aggregate({
      where: {
        status: 'ACTIVE',
        nextPaymentDate: {
          lt: new Date(), // Past due date
        },
      },
      _sum: {
        outstandingBalance: true,
      },
    });

    // Get bank income from the BankIncome table
    const bankIncome = await prisma.bankIncome.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate net cash flow
    const totalDeposits = Number(deposits._sum.amount || 0);
    const totalWithdrawals = Number(withdrawals._sum.amount || 0);
    const netCashFlow = totalDeposits - totalWithdrawals;    // Get actual operating expenses from expenses table (only approved/paid expenses)    // Get actual operating expenses from expenses table (only approved/paid expenses)
    const operatingExpensesResult = await prisma.expense.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['APPROVED', 'PAID'], // Only count approved/paid expenses in financial reports
        },
      },
      _sum: {
        amount: true,
      },
    });

    const operatingExpenses = Number(operatingExpensesResult._sum.amount || 0);
    const netProfit = Number(bankIncome._sum.amount || 0) - operatingExpenses;const financialSummary = {
      totalDeposits,
      totalWithdrawals,
      netCashFlow,
      activeAccounts,
      newAccounts,
      totalLoans: Number(totalLoans._sum.outstandingBalance || 0),
      loanRepayments: Number(loanRepayments._sum.amount || 0),
      overdueLoans: Number(overdueLoans._sum.outstandingBalance || 0),
      bankIncome: Number(bankIncome._sum.amount || 0),
      operatingExpenses,
      netProfit,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    };

    res.json(financialSummary);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
};

// Get account analytics report
export const getAccountAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const endDate = dateTo ? new Date(dateTo as string) : new Date();
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const periodMs = Math.max(24 * 60 * 60 * 1000, endDate.getTime() - startDate.getTime());
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodMs);

    // Get account distribution by type
    const accountsByType = await prisma.account.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
      _sum: {
        balance: true,
      },
      _avg: {
        balance: true,
      },
      where: {
        status: 'ACTIVE',
      },
    });

    const previousAccountsByType = await prisma.account.groupBy({
      by: ['type'],
      _sum: {
        balance: true,
      },
      where: {
        status: 'ACTIVE',
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
    });

    const previousTotalsByType = new Map<string, number>();
    previousAccountsByType.forEach((row) => {
      previousTotalsByType.set(row.type, Number(row._sum.balance || 0));
    });

    const accountAnalytics = accountsByType.map((account) => ({
      accountType: account.type,
      count: account._count.id,
      totalBalance: Number(account._sum.balance || 0),
      averageBalance: Number(account._avg.balance || 0),
      growthRate: (() => {
        const current = Number(account._sum.balance || 0);
        const previous = previousTotalsByType.get(account.type) || 0;
        if (previous > 0) {
          return ((current - previous) / previous) * 100;
        }
        return current > 0 ? 100 : 0;
      })(),
    }));

    res.json(accountAnalytics);
  } catch (error) {
    console.error('Error fetching account analytics:', error);
    res.status(500).json({ error: 'Failed to fetch account analytics' });
  }
};

// Get loan portfolio report
export const getLoanPortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const totalLoans = await prisma.loan.count();
    
    const activeLoans = await prisma.loan.count({
      where: { status: 'ACTIVE' },
    });

    const completedLoans = await prisma.loan.count({
      where: { status: 'PAID' },
    });

    const defaultedLoans = await prisma.loan.count({
      where: { status: 'DEFAULTED' },
    });

    const disbursedAmount = await prisma.loan.aggregate({
      _sum: { amount: true },
    });

    const repaidAmount = await prisma.loan.aggregate({
      _sum: { totalPaid: true },
    });

    const outstandingAmount = await prisma.loan.aggregate({
      where: {
        status: 'ACTIVE',
      },
      _sum: { outstandingBalance: true },
    });

    // Calculate portfolio at risk (PAR) - percentage of overdue loans
    const overdueAmount = await prisma.loan.aggregate({
      where: { 
        status: 'ACTIVE',
        nextPaymentDate: {
          lt: new Date(), // Past due date
        },
      },
      _sum: { outstandingBalance: true },
    });

    const portfolioAtRisk = totalLoans > 0 
      ? (Number(overdueAmount._sum?.outstandingBalance || 0) / Number(outstandingAmount._sum?.outstandingBalance || 1)) * 100
      : 0;

    const loanPortfolio = {
      totalLoans,
      activeLoans,
      completedLoans,
      defaultedLoans,
      totalDisbursed: Number(disbursedAmount._sum?.amount || 0),
      totalRepaid: Number(repaidAmount._sum?.totalPaid || 0),
      outstandingAmount: Number(outstandingAmount._sum?.outstandingBalance || 0),
      portfolioAtRisk,
    };

    res.json(loanPortfolio);
  } catch (error) {
    console.error('Error fetching loan portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch loan portfolio' });
  }
};

// Get transaction summary report
export const getTransactionSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const endDate = dateTo ? new Date(dateTo as string) : new Date();
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Get daily transaction summary
    const dailySummary = await prisma.$queryRaw`
      SELECT 
        DATE(date) as date,
        SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as withdrawals,
        SUM(CASE WHEN type = 'TRANSFER' THEN amount ELSE 0 END) as transfers,
        SUM(CASE WHEN type = 'LOAN_REPAYMENT' THEN amount ELSE 0 END) as loanRepayments,
        SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END) as fees,
        SUM(amount) as totalVolume
      FROM Transaction
      WHERE date >= ${startDate} AND date <= ${endDate} AND status = 'COMPLETED'
      GROUP BY DATE(date)
      ORDER BY date DESC
      LIMIT 10
    `;

    const transactionSummary = (dailySummary as any[]).map((row) => ({
      date: row.date,
      deposits: Number(row.deposits || 0),
      withdrawals: Number(row.withdrawals || 0),
      transfers: Number(row.transfers || 0),
      loanRepayments: Number(row.loanRepayments || 0),
      fees: Number(row.fees || 0),
      totalVolume: Number(row.totalVolume || 0),
    }));

    res.json(transactionSummary);
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
};

// Get customer metrics report
export const getCustomerMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const endDate = dateTo ? new Date(dateTo as string) : new Date();
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const totalCustomers = await prisma.customer.count();
    
    // Active customers (with at least one active account)
    const activeCustomers = await prisma.customer.count({
      where: {
        accounts: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
    });

    const newCustomers = await prisma.customer.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate retention rate (mock - in real system, use proper cohort analysis)
    const customerRetentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

    // Average accounts per customer
    const totalAccounts = await prisma.account.count();
    const averageAccountsPerCustomer = totalCustomers > 0 ? totalAccounts / totalCustomers : 0;

    // True top customers by combined account balance + share balance.
    const topCustomersByBalanceRaw = await prisma.$queryRaw<Array<{
      customerId: string;
      name: string;
      totalBalance: number;
      accountCount: number;
    }>>`
      SELECT
        c.id AS customerId,
        c.name AS name,
        CAST(SUM(COALESCE(a.balance, 0) + COALESCE(a.shareBalance, 0)) AS DECIMAL(18,2)) AS totalBalance,
        COUNT(a.id) AS accountCount
      FROM Customer c
      JOIN Account a ON a.customerId = c.id
      GROUP BY c.id, c.name
      ORDER BY totalBalance DESC
      LIMIT 5
    `;

    const topCustomersByBalance = topCustomersByBalanceRaw.map((row) => ({
      name: row.name,
      totalBalance: Number(row.totalBalance || 0),
      accountCount: Number(row.accountCount || 0),
    }));

    const customerMetrics = {
      totalCustomers,
      activeCustomers,
      newCustomers,
      customerRetentionRate,
      averageAccountsPerCustomer,
      topCustomersByBalance,
    };

    res.json(customerMetrics);
  } catch (error) {
    console.error('Error fetching customer metrics:', error);
    res.status(500).json({ error: 'Failed to fetch customer metrics' });
  }
};
