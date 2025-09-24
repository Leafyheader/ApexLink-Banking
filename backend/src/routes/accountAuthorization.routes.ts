import express from 'express';
import { 
  getAccountAuthorizations, 
  approveAccount, 
  rejectOrReverseAccount 
} from '../controllers/accountAuthorization.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all account authorizations with filtering
router.get('/', authenticateToken, getAccountAuthorizations);

// Approve an account
router.post('/:id/approve', authenticateToken, approveAccount);

// Reject or reverse approval of an account
router.post('/:id/reject', authenticateToken, rejectOrReverseAccount);

export default router;
