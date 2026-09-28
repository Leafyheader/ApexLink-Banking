"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBankIncomeBreakdown = exports.calculateDailyLoanInterest = exports.getRecentBankIncome = exports.getBankIncomeStats = void 0;
const bankIncome_service_1 = require("../services/bankIncome.service");
const cashReporting_1 = require("../utils/cashReporting");
/**
 * Get bank income statistics
 */
const getBankIncomeStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = (0, cashReporting_1.parseRangeStart)(startDate);
        const end = (0, cashReporting_1.parseRangeEnd)(endDate);
        const stats = await bankIncome_service_1.BankIncomeService.getIncomeStats(start, end);
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching bank income stats:', error);
        res.status(500).json({ error: 'Failed to fetch bank income statistics' });
    }
};
exports.getBankIncomeStats = getBankIncomeStats;
/**
 * Get recent bank income records
 */
const getRecentBankIncome = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const records = await bankIncome_service_1.BankIncomeService.getRecentIncome(Number(limit));
        // Format the response
        const formattedRecords = records.map((record) => {
            var _a, _b, _c, _d;
            return ({
                id: record.id,
                type: record.type.toLowerCase(),
                amount: Number(record.amount),
                description: record.description,
                sourceId: record.sourceId,
                sourceType: record.sourceType,
                accountNumber: ((_a = record.account) === null || _a === void 0 ? void 0 : _a.accountNumber) || 'N/A',
                customerName: ((_c = (_b = record.account) === null || _b === void 0 ? void 0 : _b.customer) === null || _c === void 0 ? void 0 : _c.name) || ((_d = record.customer) === null || _d === void 0 ? void 0 : _d.name) || 'N/A',
                date: record.date.toISOString(),
                createdAt: record.createdAt.toISOString()
            });
        });
        res.json({
            records: formattedRecords,
            count: formattedRecords.length
        });
    }
    catch (error) {
        console.error('Error fetching recent bank income:', error);
        res.status(500).json({ error: 'Failed to fetch recent bank income' });
    }
};
exports.getRecentBankIncome = getRecentBankIncome;
/**
 * Disabled. Loan interest is booked as income when it is actually received, as part of each
 * loan repayment (see handleLoanRepaymentWithDisbursement). This endpoint booked accrued interest
 * a second time with no cash behind it, and every call (it had no idempotency) added more.
 */
const calculateDailyLoanInterest = async (_req, res) => {
    res.status(410).json({
        error: 'Daily interest calculation is disabled. Loan interest is recorded as income automatically when repayments are received.'
    });
};
exports.calculateDailyLoanInterest = calculateDailyLoanInterest;
/**
 * Get detailed breakdown of bank income
 */
const getBankIncomeBreakdown = async (req, res) => {
    try {
        const { period = 'month', page = 1, limit = 10 } = req.query;
        let startDate;
        const endDate = new Date();
        switch (period) {
            case 'day':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
        }
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit))); // Cap at 100
        const skip = (pageNum - 1) * limitNum;
        const stats = await bankIncome_service_1.BankIncomeService.getIncomeStats(startDate, endDate);
        const { records, totalRecords } = await bankIncome_service_1.BankIncomeService.getPaginatedIncome(startDate, endDate, skip, limitNum);
        const totalPages = Math.ceil(totalRecords / limitNum);
        res.json({
            period,
            dateRange: {
                from: startDate.toISOString(),
                to: endDate.toISOString()
            },
            stats,
            recentRecords: records.map((record) => {
                var _a, _b, _c, _d;
                return ({
                    id: record.id,
                    type: record.type.toLowerCase(),
                    amount: Number(record.amount),
                    description: record.description,
                    sourceId: record.sourceId,
                    sourceType: record.sourceType,
                    accountNumber: ((_a = record.account) === null || _a === void 0 ? void 0 : _a.accountNumber) || 'N/A',
                    customerName: ((_c = (_b = record.account) === null || _b === void 0 ? void 0 : _b.customer) === null || _c === void 0 ? void 0 : _c.name) || ((_d = record.customer) === null || _d === void 0 ? void 0 : _d.name) || 'N/A',
                    date: record.date.toISOString(),
                    createdAt: record.createdAt.toISOString()
                });
            }),
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalRecords,
                recordsPerPage: limitNum
            }
        });
    }
    catch (error) {
        console.error('Error fetching bank income breakdown:', error);
        res.status(500).json({ error: 'Failed to fetch bank income breakdown' });
    }
};
exports.getBankIncomeBreakdown = getBankIncomeBreakdown;
