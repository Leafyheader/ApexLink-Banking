import { Router, RequestHandler } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/users.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all users (with pagination and search) - Admin and Manager only
router.get('/', requireRole(['ADMIN', 'MANAGER']), getUsers as RequestHandler);

// Get user by ID - Admin and Manager only
router.get('/:id', requireRole(['ADMIN', 'MANAGER']), getUserById as RequestHandler);

// Update user - Admin only
router.put('/:id', requireRole(['ADMIN']), updateUser as RequestHandler);

// Delete user - Admin only
router.delete('/:id', requireRole(['ADMIN']), deleteUser as RequestHandler);

// Toggle user active status - Admin only
router.patch('/:id/toggle-status', requireRole(['ADMIN']), toggleUserStatus as RequestHandler);

export default router;
