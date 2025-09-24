"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../controllers/users.controller");
const auth_1 = require("../middleware/auth");
const roleAuth_1 = require("../middleware/roleAuth");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Get all users (with pagination and search) - Admin and Manager only
router.get('/', (0, roleAuth_1.requireRole)(['ADMIN', 'MANAGER']), users_controller_1.getUsers);
// Get user by ID - Admin and Manager only
router.get('/:id', (0, roleAuth_1.requireRole)(['ADMIN', 'MANAGER']), users_controller_1.getUserById);
// Update user - Admin only
router.put('/:id', (0, roleAuth_1.requireRole)(['ADMIN']), users_controller_1.updateUser);
// Delete user - Admin only
router.delete('/:id', (0, roleAuth_1.requireRole)(['ADMIN']), users_controller_1.deleteUser);
// Toggle user active status - Admin only
router.patch('/:id/toggle-status', (0, roleAuth_1.requireRole)(['ADMIN']), users_controller_1.toggleUserStatus);
exports.default = router;
