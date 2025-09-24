import express, { RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getTransactions, 
  getTransactionById, 
  createTransaction, 
  updateTransactionStatus, 
  getTransactionStats 
} from '../controllers/transactions.controller';

const router = express.Router();

// GET /api/transactions - Get all transactions with filtering and pagination
router.get('/', authenticateToken, getTransactions as RequestHandler);

// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', authenticateToken, getTransactionStats as RequestHandler);

// GET /api/transactions/:id - Get a specific transaction
router.get('/:id', authenticateToken, getTransactionById as RequestHandler);

// POST /api/transactions - Create a new transaction
router.post('/', authenticateToken, createTransaction as RequestHandler);

// PUT /api/transactions/:id/status - Update transaction status
router.put('/:id/status', authenticateToken, updateTransactionStatus as RequestHandler);

export default router;
