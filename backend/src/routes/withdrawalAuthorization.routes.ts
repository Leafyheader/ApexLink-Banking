import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getWithdrawalAuthorizations,
  approveWithdrawalAuthorization,
  rejectWithdrawalAuthorization,
  createWithdrawalAuthorization,
  reverseWithdrawalAuthorization
} from '../controllers/withdrawalAuthorization.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /withdrawal-authorizations - Get all withdrawal authorizations with filtering and pagination
router.get('/', getWithdrawalAuthorizations as RequestHandler);

// POST /withdrawal-authorizations - Create new withdrawal authorization
router.post('/', createWithdrawalAuthorization as RequestHandler);

// POST /withdrawal-authorizations/:id/approve - Approve a withdrawal authorization
router.post('/:id/approve', approveWithdrawalAuthorization as RequestHandler);

// POST /withdrawal-authorizations/:id/reject - Reject a withdrawal authorization
router.post('/:id/reject', rejectWithdrawalAuthorization as RequestHandler);

// POST /withdrawal-authorizations/:id/reverse - Reverse an approved withdrawal authorization
router.post('/:id/reverse', reverseWithdrawalAuthorization as RequestHandler);

export default router;
