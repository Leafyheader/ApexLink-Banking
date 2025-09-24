import { Router, RequestHandler } from 'express';
import { 
  getLoans, 
  getLoan, 
  createLoan, 
  updateLoan, 
  deleteLoan,
  getCustomersForLoan 
} from '../controllers/loans.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Loan routes
router.get('/', getLoans as RequestHandler);
router.get('/customers', getCustomersForLoan as RequestHandler);
router.get('/:id', getLoan as RequestHandler);
router.post('/', createLoan as RequestHandler);
router.put('/:id', updateLoan as RequestHandler);
router.delete('/:id', deleteLoan as RequestHandler);

export default router;
