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
// POST /api/transactions - Create a new transaction
router.post('/', auth_1.authenticateToken, transactions_controller_1.createTransaction);
// PUT /api/transactions/:id/status - Update transaction status
router.put('/:id/status', auth_1.authenticateToken, transactions_controller_1.updateTransactionStatus);
exports.default = router;
