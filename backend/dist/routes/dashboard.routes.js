"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.dashboardRouter = router;
// All dashboard routes require authentication
router.use(auth_1.authenticateToken);
router.get('/summary', dashboard_controller_1.getDashboardSummary);
router.get('/transactions', dashboard_controller_1.getRecentTransactions);
router.get('/stats', dashboard_controller_1.getDashboardStats);
