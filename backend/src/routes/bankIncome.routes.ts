import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getBankIncomeStats,
  getRecentBankIncome,
  calculateDailyLoanInterest,
  getBankIncomeBreakdown
} from '../controllers/bankIncome.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get bank income statistics
router.get('/stats', getBankIncomeStats);

// Get recent bank income records
router.get('/recent', getRecentBankIncome);

// Calculate daily loan interest (should be called daily via cron job)
router.post('/calculate-daily-interest', calculateDailyLoanInterest);

// Get detailed breakdown of bank income
router.get('/breakdown', getBankIncomeBreakdown);

export default router;
