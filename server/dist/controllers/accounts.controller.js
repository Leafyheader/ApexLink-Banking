"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAccountStatus = exports.deleteAccount = exports.updateAccount = exports.createAccount = exports.getAccountById = exports.getAccounts = void 0;
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new client_1.PrismaClient();
// Get all accounts with optional filtering
const getAccounts = async (req, res) => {
    try {
        const { page = '1', limit = '10', search = '', status, type, customerId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter conditions
        const where = {};
        if (search) {
            where.OR = [
                { accountNumber: { contains: search } },
                { customer: { name: { contains: search } } }
            ];
        }
        if (status) {
            where.status = status;
        }
        if (type) {
            where.type = type;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        // Get accounts with customer info
        const [accounts, total] = await Promise.all([
            prisma.account.findMany({
                skip,
                take: limitNum,
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    },
                    approvedBy: {
                        select: {
                            id: true,
                            name: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.account.count({ where })
        ]);
        const totalPages = Math.ceil(total / limitNum);
        // Format accounts to include customerName for backward compatibility
        const formattedAccounts = accounts.map(account => {
            var _a;
            return (Object.assign(Object.assign({}, account), { customerName: ((_a = account.customer) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Customer' }));
        });
        res.json({
            accounts: formattedAccounts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    }
    catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Failed to fetch accounts' });
    }
};
exports.getAccounts = getAccounts;
// Get account by ID
const getAccountById = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const account = await prisma.account.findUnique({
            where: { id },
            include: {
                customer: true,
                approvedBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                },
                transactions: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 10
                }
            }
        });
        if (!account) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }
        // Calculate transaction summary data
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        // Get transaction summary data
        const [lastTransaction, lastDeposit, lastWithdrawal, transactionsThisMonth] = await Promise.all([
            // Last transaction
            prisma.transaction.findFirst({
                where: { accountId: id },
                orderBy: { date: 'desc' }
            }),
            // Last deposit
            prisma.transaction.findFirst({
                where: {
                    accountId: id,
                    type: 'DEPOSIT'
                },
                orderBy: { date: 'desc' }
            }),
            // Last withdrawal
            prisma.transaction.findFirst({
                where: {
                    accountId: id,
                    type: 'WITHDRAWAL'
                },
                orderBy: { date: 'desc' }
            }),
            // Transactions count this month
            prisma.transaction.count({
                where: {
                    accountId: id,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            })
        ]);
        // Format account to include customerName and transaction summary for backward compatibility
        const formattedAccount = Object.assign(Object.assign({}, account), { customerName: ((_a = account.customer) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Customer', lastTransactionDate: ((_b = lastTransaction === null || lastTransaction === void 0 ? void 0 : lastTransaction.date) === null || _b === void 0 ? void 0 : _b.toISOString()) || null, lastDepositAmount: lastDeposit ? Number(lastDeposit.amount) : null, lastDepositDate: ((_c = lastDeposit === null || lastDeposit === void 0 ? void 0 : lastDeposit.date) === null || _c === void 0 ? void 0 : _c.toISOString()) || null, lastWithdrawalAmount: lastWithdrawal ? Number(lastWithdrawal.amount) : null, lastWithdrawalDate: ((_d = lastWithdrawal === null || lastWithdrawal === void 0 ? void 0 : lastWithdrawal.date) === null || _d === void 0 ? void 0 : _d.toISOString()) || null, transactionsThisMonth: transactionsThisMonth || 0 });
        res.json(formattedAccount);
    }
    catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).json({ message: 'Failed to fetch account details' });
    }
};
exports.getAccountById = getAccountById;
// Create new account
const createAccount = async (req, res) => {
    var _a;
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { customerId, type, balance, currency, minimumBalance, overdraftLimit, shareBalance, sharesAvailableBalance } = req.body;
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const userId = req.user.id;
        // Check if customer exists
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }
        // Generate account number using the new ID generator
        const accountNumber = await (0, idGenerator_1.generateAccountNumber)(); // Create the account with pending authorization
        const createData = {
            accountNumber,
            type,
            balance: balance || 0,
            currency: currency || 'USD',
            minimumBalance,
            overdraftLimit,
            customerId,
            authorizationStatus: 'PENDING',
            status: 'DORMANT', // Account starts as dormant until approved
            createdBy: userId
        };
        // Add optional fields if provided
        if (shareBalance !== undefined) {
            createData.shareBalance = shareBalance;
        }
        if (sharesAvailableBalance !== undefined) {
            createData.sharesAvailableBalance = sharesAvailableBalance;
        }
        const account = await prisma.account.create({
            data: createData,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                approvedBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        });
        // Format account to include customerName for backward compatibility
        const formattedAccount = Object.assign(Object.assign({}, account), { customerName: ((_a = account.customer) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Customer' });
        res.status(201).json(formattedAccount);
    }
    catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ message: 'Failed to create account' });
    }
};
exports.createAccount = createAccount;
// Update account
const updateAccount = async (req, res) => {
    var _a;
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { id } = req.params;
        const { status, minimumBalance, overdraftLimit, shareBalance, sharesAvailableBalance } = req.body;
        // Check if account exists
        const existingAccount = await prisma.account.findUnique({ where: { id } });
        if (!existingAccount) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }
        // Update the account
        const updateData = {
            status,
            minimumBalance,
            overdraftLimit,
            updatedAt: new Date()
        };
        if (shareBalance !== undefined) {
            updateData.shareBalance = shareBalance;
        }
        if (sharesAvailableBalance !== undefined) {
            updateData.sharesAvailableBalance = sharesAvailableBalance;
        }
        const account = await prisma.account.update({
            where: { id },
            data: updateData,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });
        // Format account to include customerName for backward compatibility
        const formattedAccount = Object.assign(Object.assign({}, account), { customerName: ((_a = account.customer) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Customer' });
        res.json(formattedAccount);
    }
    catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ message: 'Failed to update account' });
    }
};
exports.updateAccount = updateAccount;
// Delete account
const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if account exists
        const account = await prisma.account.findUnique({
            where: { id },
            include: { transactions: true }
        });
        if (!account) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }
        // Check if account has transactions
        if (account.transactions.length > 0) {
            res.status(400).json({
                message: 'Cannot delete account with transactions. Close the account instead.'
            });
            return;
        }
        // Delete the account
        await prisma.account.delete({ where: { id } });
        res.json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Failed to delete account' });
    }
};
exports.deleteAccount = deleteAccount;
// Update account status
const updateAccountStatus = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { id } = req.params;
        const { status } = req.body;
        // Check if account exists
        const existingAccount = await prisma.account.findUnique({ where: { id } });
        if (!existingAccount) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }
        // Update account status
        const account = await prisma.account.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date()
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });
        res.json(account);
    }
    catch (error) {
        console.error('Error updating account status:', error);
        res.status(500).json({ message: 'Failed to update account status' });
    }
};
exports.updateAccountStatus = updateAccountStatus;
