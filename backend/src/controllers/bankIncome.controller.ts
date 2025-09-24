import { Response } from 'express';
import { AuthRequest } from '../types/auth';
import { BankIncomeService } from '../services/bankIncome.service';

/**
 * Get bank income statistics
 */
export const getBankIncomeStats = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

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
 * Calculate and record daily loan interest for all active loans
 * This endpoint should be called daily (ideally via a cron job)
 */
export const calculateDailyLoanInterest = async (req: AuthRequest, res: Response) => {
  try {
    const incomeRecords = await BankIncomeService.calculateDailyLoanInterest();
    
    const totalInterest = incomeRecords.reduce((sum, record) => sum + Number(record.amount), 0);
    
    res.json({
      message: 'Daily loan interest calculated successfully',
      recordsCreated: incomeRecords.length,
      totalInterestIncome: totalInterest,
      records: incomeRecords.map(record => ({
        id: record.id,
        amount: Number(record.amount),
        loanId: record.sourceId,
        customerName: record.customer?.name || 'Unknown'
      }))
    });
  } catch (error) {
    console.error('Error calculating daily loan interest:', error);
    res.status(500).json({ error: 'Failed to calculate daily loan interest' });
  }
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
