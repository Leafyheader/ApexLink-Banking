import { Response } from 'express';
import { AuthRequest } from '../types/auth';
import { BankIncomeService } from '../services/bankIncome.service';
import { parseRangeStart, parseRangeEnd } from '../utils/cashReporting';

/**
 * Get bank income statistics
 */
export const getBankIncomeStats = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = parseRangeStart(startDate);
    const end = parseRangeEnd(endDate);

    const stats = await BankIncomeService.getIncomeStats(start, end);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching bank income stats:', error);
    res.status(500).json({ error: 'Failed to fetch bank income statistics' });
  }
};

/**
 * Get recent bank income records
 */
export const getRecentBankIncome = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const records = await BankIncomeService.getRecentIncome(Number(limit));
      // Format the response
    const formattedRecords = records.map((record: any) => ({
      id: record.id,
      type: record.type.toLowerCase(),
      amount: Number(record.amount),
      description: record.description,
      sourceId: record.sourceId,
      sourceType: record.sourceType,
      accountNumber: record.account?.accountNumber || 'N/A',
      customerName: record.account?.customer?.name || record.customer?.name || 'N/A',
      date: record.date.toISOString(),
      createdAt: record.createdAt.toISOString()
    }));

    res.json({
      records: formattedRecords,
      count: formattedRecords.length
    });
  } catch (error) {
    console.error('Error fetching recent bank income:', error);
    res.status(500).json({ error: 'Failed to fetch recent bank income' });
  }
};

/**
 * Disabled. Loan interest is booked as income when it is actually received, as part of each
 * loan repayment (see handleLoanRepaymentWithDisbursement). This endpoint booked accrued interest
 * a second time with no cash behind it, and every call (it had no idempotency) added more.
 */
export const calculateDailyLoanInterest = async (_req: AuthRequest, res: Response) => {
  res.status(410).json({
    error: 'Daily interest calculation is disabled. Loan interest is recorded as income automatically when repayments are received.'
  });
};

/**
 * Get detailed breakdown of bank income
 */
export const getBankIncomeBreakdown = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month', page = 1, limit = 10 } = req.query;
    
    let startDate: Date;
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

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string))); // Cap at 100
    const skip = (pageNum - 1) * limitNum;

    const stats = await BankIncomeService.getIncomeStats(startDate, endDate);
    const { records, totalRecords } = await BankIncomeService.getPaginatedIncome(startDate, endDate, skip, limitNum);
    
    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      period,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      },
      stats,
      recentRecords: records.map((record: any) => ({
        id: record.id,
        type: record.type.toLowerCase(),
        amount: Number(record.amount),
        description: record.description,
        sourceId: record.sourceId,
        sourceType: record.sourceType,
        accountNumber: record.account?.accountNumber || 'N/A',
        customerName: record.account?.customer?.name || record.customer?.name || 'N/A',
        date: record.date.toISOString(),
        createdAt: record.createdAt.toISOString()
      })),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords,
        recordsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching bank income breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch bank income breakdown' });
  }
};
