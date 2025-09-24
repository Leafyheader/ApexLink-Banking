"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loans_controller_1 = require("../controllers/loans.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.authenticateToken);
// Loan routes
router.get('/', loans_controller_1.getLoans);
router.get('/customers', loans_controller_1.getCustomersForLoan);
router.get('/:id', loans_controller_1.getLoan);
router.post('/', loans_controller_1.createLoan);
router.put('/:id', loans_controller_1.updateLoan);
router.delete('/:id', loans_controller_1.deleteLoan);
exports.default = router;
