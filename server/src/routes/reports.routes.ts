import { Router, RequestHandler } from 'express';
import { 
  getFinancialSummary, 
  getAccountAnalytics, 
  getLoanPortfolio, 
  getTransactionSummary, 
  getCustomerMetrics 
} from '../controllers/reports.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Financial summary report
router.get('/financial-summary', getFinancialSummary as RequestHandler);

// Account analytics report
router.get('/account-analytics', getAccountAnalytics as RequestHandler);

// Loan portfolio report
router.get('/loan-portfolio', getLoanPortfolio as RequestHandler);

// Transaction summary report
router.get('/transaction-summary', getTransactionSummary as RequestHandler);

// Customer metrics report
router.get('/customer-metrics', getCustomerMetrics as RequestHandler);

export { router as reportsRouter };
