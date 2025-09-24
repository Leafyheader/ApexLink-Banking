"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenses_controller_1 = require("../controllers/expenses.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all expenses with filtering
router.get('/', expenses_controller_1.getExpenses);
// Get expense summary
router.get('/summary', expenses_controller_1.getExpenseSummary);
// Get expense by ID
router.get('/:id', expenses_controller_1.getExpenseById);
// Create new expense
router.post('/', expenses_controller_1.createExpense);
// Update expense status
router.patch('/:id/status', expenses_controller_1.updateExpenseStatus);
// Delete expense
router.delete('/:id', expenses_controller_1.deleteExpense);
exports.default = router;
