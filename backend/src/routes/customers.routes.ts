import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateKYCStatus,
  exportCustomers,
  hideCustomersWithoutAccounts,
  unhideCustomer
} from '../controllers/customers.controller';
import { authenticateToken } from '../middleware/auth';
import { validateCustomerData, validateKYCStatus } from '../middleware/validators';

const router = Router();

// GET /api/customers/export - Export all customers (must be before /:id route)
router.get('/export', authenticateToken, exportCustomers);

// PATCH /api/customers/visibility/hide-without-accounts - Hide customers with no accounts
router.patch('/visibility/hide-without-accounts', authenticateToken, hideCustomersWithoutAccounts);

// PATCH /api/customers/:id/unhide - Unhide a hidden customer
router.patch('/:id/unhide', authenticateToken, unhideCustomer);

// GET /api/customers - Get all customers with pagination and search
router.get('/', authenticateToken, getCustomers);

// GET /api/customers/:id - Get single customer by ID
router.get('/:id', authenticateToken, getCustomerById);

// POST /api/customers - Create new customer
router.post('/', authenticateToken, ...validateCustomerData, createCustomer);

// PUT /api/customers/:id - Update customer
router.put('/:id', authenticateToken, ...validateCustomerData, updateCustomer);

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', authenticateToken, deleteCustomer);

// PATCH /api/customers/:id/kyc - Update KYC status
router.patch('/:id/kyc', authenticateToken, ...validateKYCStatus, updateKYCStatus);

export default router;
