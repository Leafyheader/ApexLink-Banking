import { Router, RequestHandler } from 'express';
import { 
  getLoans, 
  getLoan, 
  createLoan, 
  updateLoan, 
  deleteLoan,
  getCustomersForLoan,
  getLoanStats,
  checkLoanEligibility,
  getAvailableBalanceForWithdrawal,
  getCustomerGuarantorLoans,
  getLoanAuthorizations,
  approveLoan,
  rejectLoan
} from '../controllers/loans.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Loan authorization routes
router.get('/authorizations', getLoanAuthorizations as RequestHandler);
router.post('/authorizations/:id/approve', approveLoan as RequestHandler);
router.post('/authorizations/:id/reject', rejectLoan as RequestHandler);

// Loan routes
router.get('/', getLoans as RequestHandler);
router.get('/customers', getCustomersForLoan as RequestHandler);
router.get('/stats', getLoanStats as RequestHandler);
router.get('/:id', getLoan as RequestHandler);
router.post('/', createLoan as RequestHandler);
router.put('/:id', updateLoan as RequestHandler);
router.delete('/:id', deleteLoan as RequestHandler);

// Loan guarantee system routes
router.post('/check-eligibility', checkLoanEligibility as RequestHandler);
router.get('/account/:accountId/available-balance', getAvailableBalanceForWithdrawal as RequestHandler);
router.get('/guarantor/:customerId', getCustomerGuarantorLoans as RequestHandler);

export default router;
