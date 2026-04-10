"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loans_controller_1 = require("../controllers/loans.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.authenticateToken);
// Loan authorization routes
router.get('/authorizations', loans_controller_1.getLoanAuthorizations);
router.post('/authorizations/:id/approve', loans_controller_1.approveLoan);
router.post('/authorizations/:id/reject', loans_controller_1.rejectLoan);
// Loan routes
router.get('/', loans_controller_1.getLoans);
router.get('/customers', loans_controller_1.getCustomersForLoan);
router.get('/stats', loans_controller_1.getLoanStats);
router.get('/:id', loans_controller_1.getLoan);
router.post('/', loans_controller_1.createLoan);
router.put('/:id', loans_controller_1.updateLoan);
router.delete('/:id', loans_controller_1.deleteLoan);
// Loan guarantee system routes
router.post('/check-eligibility', loans_controller_1.checkLoanEligibility);
router.get('/account/:accountId/available-balance', loans_controller_1.getAvailableBalanceForWithdrawal);
router.get('/guarantor/:customerId', loans_controller_1.getCustomerGuarantorLoans);
exports.default = router;
