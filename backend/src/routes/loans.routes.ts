import { Router, RequestHandler } from 'express';
import {
  getLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  getCustomersForLoan,
  getLoanStats,
  getLoanAuthorizations,
  approveLoan,
  rejectLoan
} from '../controllers/loans.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Loan authorization routes
router.get('/authorizations', getLoanAuthorizations as RequestHandler);
router.post('/authorizations/:id/approve', requireRole(['ADMIN', 'MANAGER']), approveLoan as RequestHandler);
router.post('/authorizations/:id/reject', requireRole(['ADMIN', 'MANAGER']), rejectLoan as RequestHandler);

// Loan routes
router.get('/', getLoans as RequestHandler);
router.get('/customers', getCustomersForLoan as RequestHandler);
router.get('/stats', getLoanStats as RequestHandler);
router.get('/:id', getLoan as RequestHandler);
router.post('/', createLoan as RequestHandler);
router.put('/:id', updateLoan as RequestHandler);
router.delete('/:id', deleteLoan as RequestHandler);

export default router;
