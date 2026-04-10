import express, { RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getTransactions, 
  getTransactionById, 
  createTransaction,
  createTransactionWithLedger,
  updateTransactionStatus, 
  getTransactionStats,
  getAccountNotifications,
  getCustomerGuaranteeInfo,
  checkWithdrawalAvailability,
  getEnhancedAccountBalance
} from '../controllers/transactions.controller';

const router = express.Router();

// GET /api/transactions - Get all transactions with filtering and pagination
router.get('/', authenticateToken, getTransactions as RequestHandler);

// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', authenticateToken, getTransactionStats as RequestHandler);

// GET /api/transactions/:id - Get a specific transaction
router.get('/:id', authenticateToken, getTransactionById as RequestHandler);

// POST /api/transactions - Create a new transaction (legacy implementation for loan repayments)
router.post('/', authenticateToken, createTransaction as RequestHandler);

// POST /api/transactions/ledger - Create a new transaction using ledger system
router.post('/ledger', authenticateToken, createTransactionWithLedger as RequestHandler);

// PUT /api/transactions/:id/status - Update transaction status
router.put('/:id/status', authenticateToken, updateTransactionStatus as RequestHandler);

// GET /api/transactions/account/:accountId/notifications - Get account notifications
router.get('/account/:accountId/notifications', authenticateToken, getAccountNotifications as RequestHandler);

// GET /api/transactions/account/:accountId/withdrawal-check - Check withdrawal availability
router.get('/account/:accountId/withdrawal-check', authenticateToken, checkWithdrawalAvailability as RequestHandler);

// GET /api/transactions/account/:accountId/enhanced-balance - Get enhanced account balance information
router.get('/account/:accountId/enhanced-balance', authenticateToken, getEnhancedAccountBalance as RequestHandler);

// GET /api/transactions/customer/:customerId/guarantees - Get customer guarantee information
router.get('/customer/:customerId/guarantees', authenticateToken, getCustomerGuaranteeInfo as RequestHandler);

export default router;
