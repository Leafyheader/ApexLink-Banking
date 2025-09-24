"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const withdrawalAuthorization_controller_1 = require("../controllers/withdrawalAuthorization.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// GET /withdrawal-authorizations - Get all withdrawal authorizations with filtering and pagination
router.get('/', withdrawalAuthorization_controller_1.getWithdrawalAuthorizations);
// POST /withdrawal-authorizations - Create new withdrawal authorization
router.post('/', withdrawalAuthorization_controller_1.createWithdrawalAuthorization);
// POST /withdrawal-authorizations/:id/approve - Approve a withdrawal authorization
router.post('/:id/approve', withdrawalAuthorization_controller_1.approveWithdrawalAuthorization);
// POST /withdrawal-authorizations/:id/reject - Reject a withdrawal authorization
router.post('/:id/reject', withdrawalAuthorization_controller_1.rejectWithdrawalAuthorization);
// POST /withdrawal-authorizations/:id/reverse - Reverse an approved withdrawal authorization
router.post('/:id/reverse', withdrawalAuthorization_controller_1.reverseWithdrawalAuthorization);
exports.default = router;
