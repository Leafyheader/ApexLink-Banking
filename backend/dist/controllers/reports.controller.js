"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerMetrics = exports.getTransactionSummary = exports.getLoanPortfolio = exports.getAccountAnalytics = exports.getFinancialSummary = void 0;
const client_1 = require("@prisma/client");
const cashReporting_1 = require("../utils/cashReporting");
const prisma = new client_1.PrismaClient();
// Date range for a report: an explicit YYYY-MM-DD "to" date covers that whole day.
const reportRange = (dateFrom, dateTo, defaultDays) => {
    var _a, _b;
    const endDate = (_a = (0, cashReporting_1.parseRangeEnd)(dateTo)) !== null && _a !== void 0 ? _a : new Date();
    const startDate = (_b = (0, cashReporting_1.parseRangeStart)(dateFrom)) !== null && _b !== void 0 ? _b : new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
};
// Only loans that were actually approved (and so disbursed) belong in the loan book - pending
// and rejected loans keep status ACTIVE but no money ever went out.
const disbursedLoans = { authorizationStatus: 'APPROVED' };
// Get financial summary report
const getFinancialSummary = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const { startDate, endDate } = reportRange(dateFrom, dateTo, 30);
        const period = { gte: startDate, lte: endDate };
        const sum = async (where) => {
            const result = await prisma.transaction.aggregate({
                where: Object.assign({ date: period, status: 'COMPLETED' }, where),
                _sum: { amount: true }
            });
            return Number(result._sum.amount || 0);
        };
        const cash = (type) => sum({ type, AND: [cashReporting_1.cashOnlyWhere] });
        // Cash at the counter only - fees, transfers, opening balances, corrections, treasury and
        // guarantor bookkeeping are not cash and are excluded (see utils/cashReporting.ts).
        const [totalDeposits, totalWithdrawals, sharesDeposits, sharesWithdrawals, loanRepayments, loanDisbursements, reversals, withdrawalFees] = await Promise.all([
            cash('DEPOSIT'),
            cash('WITHDRAWAL'),
            cash('DEPOSIT_SHARES'),
            cash('WITHDRAWAL_SHARES'),
            sum(cashReporting_1.cashLoanRepaymentWhere),
            sum(cashReporting_1.loanDisbursementWhere),
            sum({ type: { in: ['DEPOSIT', 'DEPOSIT_SHARES'] }, AND: [cashReporting_1.cashReversalWhere] }),
            sum({ AND: [cashReporting_1.feesOnlyWhere] })
        ]);
        // Get active accounts count
        const activeAccounts = await prisma.account.count({
            where: {
                status: 'ACTIVE',
                type: { not: 'TREASURY' }
            },
        });
        // Get new accounts created in the period
        const newAccounts = await prisma.account.count({
            where: {
                createdAt: period,
                type: { not: 'TREASURY' }
            },
        });
        // Get total loans outstanding
        const totalLoans = await prisma.loan.aggregate({
            where: Object.assign(Object.assign({}, disbursedLoans), { status: 'ACTIVE' }),
            _sum: {
                outstandingBalance: true,
            },
        });
        // Get overdue loans (using a mock calculation since OVERDUE is not in enum)
        const overdueLoans = await prisma.loan.aggregate({
            where: Object.assign(Object.assign({}, disbursedLoans), { status: 'ACTIVE', nextPaymentDate: {
                    lt: new Date(), // Past due date
                } }),
            _sum: {
                outstandingBalance: true,
            },
        });
        // Get bank income from the BankIncome table
        const bankIncome = await prisma.bankIncome.aggregate({
            where: { date: period },
            _sum: {
                amount: true,
            },
        });
        const cashIn = (0, cashReporting_1.toPesewas)(totalDeposits + sharesDeposits + loanRepayments + reversals);
        const cashOut = (0, cashReporting_1.toPesewas)(totalWithdrawals + sharesWithdrawals + loanDisbursements);
        const netCashFlow = (0, cashReporting_1.toPesewas)(cashIn - cashOut);
        // Operating expenses = expenses actually PAID out of the treasury in the period. APPROVED
        // expenses are only authorized - no money has moved yet - so they're reported separately.
        const [paidExpensesResult, approvedUnpaidResult] = await Promise.all([
            prisma.expense.aggregate({
                where: { status: 'PAID', OR: [{ paidDate: period }, { paidDate: null, date: period }] },
                _sum: { amount: true },
            }),
            prisma.expense.aggregate({
                where: { status: 'APPROVED', date: period },
                _sum: { amount: true },
            })
        ]);
        const operatingExpenses = Number(paidExpensesResult._sum.amount || 0);
        const netProfit = (0, cashReporting_1.toPesewas)(Number(bankIncome._sum.amount || 0) - operatingExpenses);
        const financialSummary = {
            totalDeposits,
            totalWithdrawals,
            sharesDeposits,
            sharesWithdrawals,
            loanDisbursements,
            reversals,
            withdrawalFees,
            cashIn,
            cashOut,
            netCashFlow,
            activeAccounts,
            newAccounts,
            totalLoans: Number(totalLoans._sum.outstandingBalance || 0),
            loanRepayments,
            overdueLoans: Number(overdueLoans._sum.outstandingBalance || 0),
            bankIncome: Number(bankIncome._sum.amount || 0),
            operatingExpenses,
            approvedUnpaidExpenses: Number(approvedUnpaidResult._sum.amount || 0),
            netProfit,
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString(),
        };
        res.json(financialSummary);
    }
    catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
};
exports.getFinancialSummary = getFinancialSummary;
// Get account analytics report
const getAccountAnalytics = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const { startDate, endDate } = reportRange(dateFrom, dateTo, 30);
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
        const previousTotalsByType = new Map();
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
    }
    catch (error) {
        console.error('Error fetching account analytics:', error);
        res.status(500).json({ error: 'Failed to fetch account analytics' });
    }
};
exports.getAccountAnalytics = getAccountAnalytics;
// Get loan portfolio report
const getLoanPortfolio = async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        const totalLoans = await prisma.loan.count({ where: disbursedLoans });
        const activeLoans = await prisma.loan.count({
            where: Object.assign(Object.assign({}, disbursedLoans), { status: 'ACTIVE' }),
        });
        const completedLoans = await prisma.loan.count({
            where: Object.assign(Object.assign({}, disbursedLoans), { status: 'PAID' }),
        });
        const defaultedLoans = await prisma.loan.count({
            where: Object.assign(Object.assign({}, disbursedLoans), { status: 'DEFAULTED' }),
        });
        const disbursedAmount = await prisma.loan.aggregate({
            where: disbursedLoans,
            _sum: { amount: true },
        });
        const repaidAmount = await prisma.loan.aggregate({
            where: disbursedLoans,
            _sum: { totalPaid: true },
        });
        const outstandingAmount = await prisma.loan.aggregate({
            where: Object.assign(Object.assign({}, disbursedLoans), { status: 'ACTIVE' }),
            _sum: { outstandingBalance: true },
        });
        // Calculate portfolio at risk (PAR) - percentage of overdue loans
        const overdueAmount = await prisma.loan.aggregate({
            where: Object.assign(Object.assign({}, disbursedLoans), { status: 'ACTIVE', nextPaymentDate: {
                    lt: new Date(), // Past due date
                } }),
            _sum: { outstandingBalance: true },
        });
        const portfolioAtRisk = totalLoans > 0
            ? (Number(((_a = overdueAmount._sum) === null || _a === void 0 ? void 0 : _a.outstandingBalance) || 0) / Number(((_b = outstandingAmount._sum) === null || _b === void 0 ? void 0 : _b.outstandingBalance) || 1)) * 100
            : 0;
        const loanPortfolio = {
            totalLoans,
            activeLoans,
            completedLoans,
            defaultedLoans,
            totalDisbursed: Number(((_c = disbursedAmount._sum) === null || _c === void 0 ? void 0 : _c.amount) || 0),
            totalRepaid: Number(((_d = repaidAmount._sum) === null || _d === void 0 ? void 0 : _d.totalPaid) || 0),
            outstandingAmount: Number(((_e = outstandingAmount._sum) === null || _e === void 0 ? void 0 : _e.outstandingBalance) || 0),
            portfolioAtRisk,
        };
        res.json(loanPortfolio);
    }
    catch (error) {
        console.error('Error fetching loan portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch loan portfolio' });
    }
};
exports.getLoanPortfolio = getLoanPortfolio;
// Get transaction summary report
const getTransactionSummary = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const { startDate, endDate } = reportRange(dateFrom, dateTo, 7);
        // Daily cash summary. deposits/withdrawals (incl. shares) are cash at the counter only;
        // fees and transfers are shown separately and are not cash. Returns every day in the
        // range (the old LIMIT 10 silently cut longer ranges short).
        const dailySummary = await prisma.$queryRaw `
      SELECT
        DATE(t.date) as date,
        SUM(CASE WHEN t.type IN ('DEPOSIT', 'DEPOSIT_SHARES') AND ${cashReporting_1.SQL_IS_CASH} THEN t.amount ELSE 0 END) as deposits,
        SUM(CASE WHEN t.type IN ('WITHDRAWAL', 'WITHDRAWAL_SHARES') AND ${cashReporting_1.SQL_IS_CASH} THEN t.amount ELSE 0 END) as withdrawals,
        SUM(CASE WHEN t.type = 'TRANSFER' THEN t.amount ELSE 0 END) as transfers,
        SUM(CASE WHEN t.type = 'LOAN_REPAYMENT' THEN t.amount ELSE 0 END) as loanRepayments,
        SUM(CASE WHEN ${cashReporting_1.SQL_IS_LOAN_DISBURSEMENT} THEN t.amount ELSE 0 END) as loanDisbursements,
        SUM(CASE WHEN t.type IN ('DEPOSIT', 'DEPOSIT_SHARES') AND ${cashReporting_1.SQL_IS_CASH_REVERSAL} THEN t.amount ELSE 0 END) as reversals,
        SUM(CASE WHEN ${cashReporting_1.SQL_IS_FEE} THEN t.amount ELSE 0 END) as fees
      FROM Transaction t
      JOIN Account a ON a.id = t.accountId
      WHERE t.date >= ${startDate} AND t.date <= ${endDate} AND t.status = 'COMPLETED'
      GROUP BY DATE(t.date)
      ORDER BY DATE(t.date) DESC
    `;
        const transactionSummary = dailySummary.map((row) => {
            const deposits = Number(row.deposits || 0);
            const withdrawals = Number(row.withdrawals || 0);
            const loanRepayments = Number(row.loanRepayments || 0);
            const loanDisbursements = Number(row.loanDisbursements || 0);
            const reversals = Number(row.reversals || 0);
            const cashIn = (0, cashReporting_1.toPesewas)(deposits + loanRepayments + reversals);
            const cashOut = (0, cashReporting_1.toPesewas)(withdrawals + loanDisbursements);
            return {
                date: row.date,
                deposits,
                withdrawals,
                transfers: Number(row.transfers || 0),
                loanRepayments,
                loanDisbursements,
                reversals,
                fees: Number(row.fees || 0),
                cashIn,
                cashOut,
                netCash: (0, cashReporting_1.toPesewas)(cashIn - cashOut),
                // Total cash handled at the counter that day
                totalVolume: (0, cashReporting_1.toPesewas)(cashIn + cashOut),
            };
        });
        res.json(transactionSummary);
    }
    catch (error) {
        console.error('Error fetching transaction summary:', error);
        res.status(500).json({ error: 'Failed to fetch transaction summary' });
    }
};
exports.getTransactionSummary = getTransactionSummary;
// Get customer metrics report
const getCustomerMetrics = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const { startDate, endDate } = reportRange(dateFrom, dateTo, 30);
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
        const topCustomersByBalanceRaw = await prisma.$queryRaw `
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
    }
    catch (error) {
        console.error('Error fetching customer metrics:', error);
        res.status(500).json({ error: 'Failed to fetch customer metrics' });
    }
};
exports.getCustomerMetrics = getCustomerMetrics;
