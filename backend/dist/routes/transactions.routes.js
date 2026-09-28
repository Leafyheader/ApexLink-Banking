"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const transactions_controller_1 = require("../controllers/transactions.controller");
const router = express_1.default.Router();
// GET /api/transactions - Get all transactions with filtering and pagination
router.get('/', auth_1.authenticateToken, transactions_controller_1.getTransactions);
// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', auth_1.authenticateToken, transactions_controller_1.getTransactionStats);
// GET /api/transactions/:id - Get a specific transaction
router.get('/:id', auth_1.authenticateToken, transactions_controller_1.getTransactionById);
// POST /api/transactions - Create a new transaction (legacy implementation for loan repayments)
router.post('/', auth_1.authenticateToken, transactions_controller_1.createTransaction);
// POST /api/transactions/ledger - Create a new transaction using ledger system
router.post('/ledger', auth_1.authenticateToken, transactions_controller_1.createTransactionWithLedger);
// PUT /api/transactions/:id - Edit a pending/failed transaction's details
router.put('/:id', auth_1.authenticateToken, transactions_controller_1.updateTransaction);
// PUT /api/transactions/:id/status - Update transaction status
router.put('/:id/status', auth_1.authenticateToken, transactions_controller_1.updateTransactionStatus);
// GET /api/transactions/account/:accountId/notifications - Get account notifications
router.get('/account/:accountId/notifications', auth_1.authenticateToken, transactions_controller_1.getAccountNotifications);
// GET /api/transactions/account/:accountId/withdrawal-check - Check withdrawal availability
router.get('/account/:accountId/withdrawal-check', auth_1.authenticateToken, transactions_controller_1.checkWithdrawalAvailability);
// GET /api/transactions/account/:accountId/enhanced-balance - Get enhanced account balance information
router.get('/account/:accountId/enhanced-balance', auth_1.authenticateToken, transactions_controller_1.getEnhancedAccountBalance);
// GET /api/transactions/customer/:customerId/guarantees - Get customer guarantee information
router.get('/customer/:customerId/guarantees', auth_1.authenticateToken, transactions_controller_1.getCustomerGuaranteeInfo);
exports.default = router;
