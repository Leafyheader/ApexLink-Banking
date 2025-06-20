import express from 'express';
import { 
  getAccounts, 
  getAccountById, 
  createAccount, 
  updateAccount, 
  deleteAccount,
  updateAccountStatus 
} from '../controllers/accounts.controller';
import { authenticateToken } from '../middleware/auth';
import { validateAccountData, validateAccountStatus } from '../middleware/validators';

const router = express.Router();

// Get all accounts
router.get('/', authenticateToken, getAccounts);

// Get specific account
router.get('/:id', authenticateToken, getAccountById);

// Create new account
router.post('/', authenticateToken, validateAccountData, createAccount);

// Update account
router.put('/:id', authenticateToken, updateAccount);

// Delete account
router.delete('/:id', authenticateToken, deleteAccount);

// Update account status
router.patch('/:id/status', authenticateToken, validateAccountStatus, updateAccountStatus);

export default router;
