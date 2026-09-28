import express from 'express';
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountStatus,
  bulkActivateAccounts,
  getNextAccountNumber
} from '../controllers/accounts.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { validateAccountData, validateAccountStatus } from '../middleware/validators';

const router = express.Router();

// Get all accounts
router.get('/', authenticateToken, getAccounts);

// Suggest the next account number - must come before /:id so it isn't captured as an id param
router.get('/next-number', authenticateToken, getNextAccountNumber);

// Get specific account
router.get('/:id', authenticateToken, getAccountById);

// Create new account
router.post('/', authenticateToken, validateAccountData, createAccount);

// Bulk activate all accounts
router.post('/bulk-activate', authenticateToken, requireRole(['ADMIN', 'MANAGER']), bulkActivateAccounts);

// Update account
router.put('/:id', authenticateToken, updateAccount);

// Delete account
router.delete('/:id', authenticateToken, deleteAccount);

// Update account status
router.patch('/:id/status', authenticateToken, validateAccountStatus, updateAccountStatus);

export default router;
