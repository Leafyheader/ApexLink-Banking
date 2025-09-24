"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const reports_controller_1 = require("../controllers/reports.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.reportsRouter = router;
// All routes require authentication
router.use(auth_1.authenticateToken);
// Financial summary report
router.get('/financial-summary', reports_controller_1.getFinancialSummary);
// Account analytics report
router.get('/account-analytics', reports_controller_1.getAccountAnalytics);
// Loan portfolio report
router.get('/loan-portfolio', reports_controller_1.getLoanPortfolio);
// Transaction summary report
router.get('/transaction-summary', reports_controller_1.getTransactionSummary);
// Customer metrics report
router.get('/customer-metrics', reports_controller_1.getCustomerMetrics);
