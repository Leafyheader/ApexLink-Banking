import { Router } from 'express';
import { getDashboardSummary, getRecentTransactions, getDashboardStats } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

router.get('/summary', getDashboardSummary);
router.get('/transactions', getRecentTransactions);
router.get('/stats', getDashboardStats);

export { router as dashboardRouter };
