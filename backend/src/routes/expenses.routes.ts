import { Router, RequestHandler } from 'express';
import { 
  getExpenses, 
  getExpenseSummary, 
  createExpense, 
  updateExpenseStatus, 
  deleteExpense, 
  getExpenseById 
} from '../controllers/expenses.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all expenses with filtering
router.get('/', getExpenses as RequestHandler);

// Get expense summary
router.get('/summary', getExpenseSummary as RequestHandler);

// Get expense by ID
router.get('/:id', getExpenseById as RequestHandler);

// Create new expense
router.post('/', createExpense as RequestHandler);

// Update expense status
router.patch('/:id/status', updateExpenseStatus as RequestHandler);

// Delete expense
router.delete('/:id', deleteExpense as RequestHandler);

export default router;
