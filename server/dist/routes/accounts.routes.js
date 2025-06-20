"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const accounts_controller_1 = require("../controllers/accounts.controller");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../middleware/validators");
const router = express_1.default.Router();
// Get all accounts
router.get('/', auth_1.authenticateToken, accounts_controller_1.getAccounts);
// Get specific account
router.get('/:id', auth_1.authenticateToken, accounts_controller_1.getAccountById);
// Create new account
router.post('/', auth_1.authenticateToken, validators_1.validateAccountData, accounts_controller_1.createAccount);
// Update account
router.put('/:id', auth_1.authenticateToken, accounts_controller_1.updateAccount);
// Delete account
router.delete('/:id', auth_1.authenticateToken, accounts_controller_1.deleteAccount);
// Update account status
router.patch('/:id/status', auth_1.authenticateToken, validators_1.validateAccountStatus, accounts_controller_1.updateAccountStatus);
exports.default = router;
