"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const accountAuthorization_controller_1 = require("../controllers/accountAuthorization.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all account authorizations with filtering
router.get('/', auth_1.authenticateToken, accountAuthorization_controller_1.getAccountAuthorizations);
// Approve an account
router.post('/:id/approve', auth_1.authenticateToken, accountAuthorization_controller_1.approveAccount);
// Reject or reverse approval of an account
router.post('/:id/reject', auth_1.authenticateToken, accountAuthorization_controller_1.rejectOrReverseAccount);
exports.default = router;
