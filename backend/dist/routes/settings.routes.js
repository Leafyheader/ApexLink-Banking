"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const auth_1 = require("../middleware/auth");
const roleAuth_1 = require("../middleware/roleAuth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Readable by any authenticated user - the withdrawal fee is shown on transaction forms.
router.get('/', settings_controller_1.getSettings);
// Readable by any authenticated user - shown on the Expenses page.
router.get('/treasury/balance', settings_controller_1.getTreasuryBalance);
// Admin-only.
router.put('/', roleAuth_1.requireAdmin, settings_controller_1.updateSettings);
router.get('/treasury', roleAuth_1.requireAdmin, settings_controller_1.getTreasurySummary);
router.post('/treasury/fund', roleAuth_1.requireAdmin, settings_controller_1.fundTreasury);
exports.default = router;
