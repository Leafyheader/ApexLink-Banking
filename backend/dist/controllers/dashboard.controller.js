"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getRecentTransactions = exports.getDashboardSummary = void 0;
const client_1 = require("@prisma/client");
const cashReporting_1 = require("../utils/cashReporting");
const prisma = new client_1.PrismaClient();
// Dashboard deposit/withdrawal figures are cash at the counter only (savings + shares) - fees,
// transfers, opening balances, corrections, treasury and loan/guarantor bookkeeping excluded.
const sumCash = async (types, date) => {
    const result = await prisma.transaction.aggregate({
        where: Object.assign(Object.assign({ type: { in: types }, status: 'COMPLETED' }, (date ? { date } : {})), { AND: [cashReporting_1.cashOnlyWhere] }),
        _sum: { amount: true }
    });
    return Number(result._sum.amount || 0);
};
const getDashboardSummary = async (req, res) => {
    try {
        // Get date ranges for current and previous month
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const currentMonth = { gte: currentMonthStart, lte: currentMonthEnd };
        const previousMonth = { gte: previousMonthStart, lte: previousMonthEnd };
        const visibleCustomerWhere = {
            isHidden: false
        };
        // Count only visible customers so hidden no-account customers do not inflate dashboard totals.
        const totalCustomers = await prisma.customer.count({
            where: visibleCustomerWhere
        });
        // Get customers from previous month for comparison
        const customersLastMonth = await prisma.customer.count({
            where: Object.assign(Object.assign({}, visibleCustomerWhere), { createdAt: { lte: previousMonthEnd } })
        });
        // Savings only, as before - share movements have their own figures on the Transactions page.
        const depositTypes = ['DEPOSIT'];
        const withdrawalTypes = ['WITHDRAWAL'];
        const [totalDeposits, depositsLastMonth, depositsThisMonth, totalWithdrawals, withdrawalsLastMonth, withdrawalsThisMonth] = await Promise.all([
            sumCash(depositTypes),
            sumCash(depositTypes, previousMonth),
            sumCash(depositTypes, currentMonth),
            sumCash(withdrawalTypes),
            sumCash(withdrawalTypes, previousMonth),
            sumCash(withdrawalTypes, currentMonth)
        ]);
        // Total loans = what borrowers still owe on approved loans (principal + interest). Loan
        // account balances are negative and principal-only, so they understate what is owed.
        const loansResult = await prisma.loan.aggregate({
            where: {
                authorizationStatus: 'APPROVED',
                status: 'ACTIVE'
            },
            _sum: {
                outstandingBalance: true
            }
        });
        // Get loans from previous month for comparison
        const loansLastMonth = await prisma.transaction.aggregate({
            where: {
                type: 'LOAN_REPAYMENT',
                status: 'COMPLETED',
                date: previousMonth
            },
            _sum: {
                amount: true
            }
        });
        const loansThisMonth = await prisma.transaction.aggregate({
            where: {
                type: 'LOAN_REPAYMENT',
                status: 'COMPLETED',
                date: currentMonth
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
            }
        });
        // Calculate percentage changes
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };
        // Calculate month-over-month changes
        const customersChange = calculatePercentageChange(totalCustomers, customersLastMonth);
        const depositsChange = calculatePercentageChange(depositsThisMonth, depositsLastMonth);
        const withdrawalsChange = calculatePercentageChange(withdrawalsThisMonth, withdrawalsLastMonth);
        const loansChange = calculatePercentageChange(Number(loansThisMonth._sum.amount || 0), Number(loansLastMonth._sum.amount || 0));
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
        const transactionsChange = calculatePercentageChange(transactionsThisMonth, transactionsLastMonth);
        const summary = {
            totalCustomers,
            totalDeposits,
            totalWithdrawals,
            totalLoans: Number(loansResult._sum.outstandingBalance || 0),
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
    }
    catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard summary' });
    }
};
exports.getDashboardSummary = getDashboardSummary;
const getRecentTransactions = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
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
    }
    catch (error) {
        console.error('Recent transactions error:', error);
        res.status(500).json({ message: 'Failed to fetch recent transactions' });
    }
};
exports.getRecentTransactions = getRecentTransactions;
const getDashboardStats = async (req, res) => {
    try {
        // Get monthly transaction trends (last 12 months)
        const monthlyStats = await prisma.$queryRaw `
      SELECT
        DATE_FORMAT(t.date, '%Y-%m') as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN t.type = 'DEPOSIT' AND ${cashReporting_1.SQL_IS_CASH} THEN t.amount ELSE 0 END) as deposits,
        SUM(CASE WHEN t.type = 'WITHDRAWAL' AND ${cashReporting_1.SQL_IS_CASH} THEN t.amount ELSE 0 END) as withdrawals
      FROM Transaction t
      JOIN Account a ON a.id = t.accountId
      WHERE t.date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        AND t.status = 'COMPLETED'
      GROUP BY DATE_FORMAT(t.date, '%Y-%m')
      ORDER BY month ASC
    `;
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
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
    }
};
exports.getDashboardStats = getDashboardStats;
