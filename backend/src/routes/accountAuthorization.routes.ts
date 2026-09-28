import express from 'express';
import {
  getAccountAuthorizations,
  approveAccount,
  bulkApproveAccounts,
  rejectOrReverseAccount
} from '../controllers/accountAuthorization.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Get all account authorizations with filtering
router.get('/', authenticateToken, getAccountAuthorizations);

// Approve every pending account
router.post('/approve-all', authenticateToken, requireRole(['ADMIN', 'MANAGER']), bulkApproveAccounts);

// Approve an account
router.post('/:id/approve', authenticateToken, requireRole(['ADMIN', 'MANAGER']), approveAccount);

// Reject or reverse approval of an account
router.post('/:id/reject', authenticateToken, requireRole(['ADMIN', 'MANAGER']), rejectOrReverseAccount);

export default router;
