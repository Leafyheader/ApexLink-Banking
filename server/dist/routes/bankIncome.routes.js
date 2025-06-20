"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const bankIncome_controller_1 = require("../controllers/bankIncome.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get bank income statistics
router.get('/stats', bankIncome_controller_1.getBankIncomeStats);
// Get recent bank income records
router.get('/recent', bankIncome_controller_1.getRecentBankIncome);
// Calculate daily loan interest (should be called daily via cron job)
router.post('/calculate-daily-interest', bankIncome_controller_1.calculateDailyLoanInterest);
// Get detailed breakdown of bank income
router.get('/breakdown', bankIncome_controller_1.getBankIncomeBreakdown);
exports.default = router;
