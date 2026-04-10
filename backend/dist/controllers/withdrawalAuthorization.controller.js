"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseWithdrawalAuthorization = exports.createWithdrawalAuthorization = exports.rejectWithdrawalAuthorization = exports.approveWithdrawalAuthorization = exports.getWithdrawalAuthorizations = void 0;
const client_1 = require("@prisma/client");
const bankIncome_service_1 = require("../services/bankIncome.service");
const prisma = new client_1.PrismaClient();
const getWithdrawalAuthorizations = async (req, res) => {
    var _a, _b, _c;
    try {
        const { page = 1, limit = 10, search, status, type } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {};
        if (search) {
            where.OR = [
                {
                    account: {
                        accountNumber: {
                            contains: search
                        }
                    }
                },
                {
                    account: {
                        customer: {
                            name: {
                                contains: search
                            }
                        }
                    }
                },
                {
                    description: {
                        contains: search
                    }
                }
            ];
        }
        if (status && status !== 'all') {
            where.status = status.toString().toUpperCase();
        }
        if (type && type !== 'all') {
            where.type = type.toString().toUpperCase();
        }
        // Get total count for pagination
        const total = await prisma.withdrawalAuthorization.count({ where });
        // Get withdrawal authorizations with related data
        const withdrawalAuthorizations = await prisma.withdrawalAuthorization.findMany({
            where,
            include: {
                account: {
                    include: {
                        customer: true
                    }
                },
                requestedBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }, approvedBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                },
                reversedBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            },
            orderBy: {
                requestedAt: 'desc'
            },
            skip,
            take: Number(limit)
        }); // Transform data for frontend
        const transactions = withdrawalAuthorizations.map(auth => {
            var _a, _b, _c;
            return ({
                id: auth.id,
                accountNumber: auth.account.accountNumber,
                customerName: auth.account.customer.name,
                customerId: auth.account.customer.id,
                amount: Number(auth.amount),
                type: auth.type.toLowerCase(),
                description: auth.description || '',
                reference: auth.reference || '',
                toAccountNumber: auth.toAccountNumber || '',
                toCustomerName: auth.toCustomerName || '',
                requestedAt: auth.requestedAt.toISOString(),
                requestedBy: auth.requestedBy.name,
                approvedBy: ((_a = auth.approvedBy) === null || _a === void 0 ? void 0 : _a.name) || '',
                status: auth.status.toLowerCase(),
                availableBalance: Number(auth.account.balance),
                rejectedReason: auth.rejectedReason,
                isReversed: auth.isReversed || false,
                reversedBy: ((_b = auth.reversedBy) === null || _b === void 0 ? void 0 : _b.name) || '',
                reversedAt: ((_c = auth.reversedAt) === null || _c === void 0 ? void 0 : _c.toISOString()) || '',
                reversalReason: auth.reversalReason || ''
            });
        });
        // Calculate summary statistics
        const summary = await prisma.withdrawalAuthorization.groupBy({
            by: ['status'],
            _count: {
                id: true
            },
            _sum: {
                amount: true
            }
        });
        const summaryStats = {
            total: total,
            totalAmount: summary.reduce((acc, item) => acc + Number(item._sum.amount || 0), 0),
            approved: ((_a = summary.find(s => s.status === 'APPROVED')) === null || _a === void 0 ? void 0 : _a._count.id) || 0,
            pending: ((_b = summary.find(s => s.status === 'PENDING')) === null || _b === void 0 ? void 0 : _b._count.id) || 0,
            rejected: ((_c = summary.find(s => s.status === 'REJECTED')) === null || _c === void 0 ? void 0 : _c._count.id) || 0
        };
        res.json({
            transactions,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalItems: total,
                itemsPerPage: Number(limit)
            },
            summary: summaryStats
        });
    }
    catch (error) {
        console.error('Error fetching withdrawal authorizations:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawal authorizations' });
    }
};
exports.getWithdrawalAuthorizations = getWithdrawalAuthorizations;
const approveWithdrawalAuthorization = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Check if user has permission to approve (admin or manager)
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
            return res.status(403).json({ error: 'Insufficient permissions to approve withdrawals' });
        }
        // Get the withdrawal authorization
        const withdrawalAuth = await prisma.withdrawalAuthorization.findUnique({
            where: { id },
            include: {
                account: true
            }
        });
        if (!withdrawalAuth) {
            return res.status(404).json({ error: 'Withdrawal authorization not found' });
        }
        if (withdrawalAuth.status !== 'PENDING') {
            return res.status(400).json({ error: 'Withdrawal authorization is not pending' });
        }
        // Check available balance considering loan guarantees
        const { SimpleLoanService } = require('../services/simple-loan.service');
        const loanService = new SimpleLoanService(prisma);
        const availableForWithdrawal = await loanService.getAvailableBalanceForWithdrawal(withdrawalAuth.accountId);
        const chargeAmount = withdrawalAuth.type === client_1.WithdrawalType.WITHDRAWAL ? 5.00 : 0;
        const totalRequired = Number(withdrawalAuth.amount) + chargeAmount;
        if (totalRequired > availableForWithdrawal) {
            const currentBalance = Number(withdrawalAuth.account.balance);
            const restrictedAmount = currentBalance - availableForWithdrawal;
            return res.status(400).json({
                error: `Insufficient available balance. Account Balance: ${currentBalance}, Available: ${availableForWithdrawal}, Requested: ${withdrawalAuth.amount}, Charges: ${chargeAmount}` +
                    (restrictedAmount > 0 ? `. ${restrictedAmount} is restricted due to loan guarantees.` : '')
            });
        }
        // Start transaction
        const approvalResult = await prisma.$transaction(async (tx) => {
            const operationReference = withdrawalAuth.reference || `WTH-${withdrawalAuth.id}`;
            await tx.withdrawalAuthorization.update({
                where: { id },
                data: {
                    status: client_1.WithdrawalAuthorizationStatus.APPROVED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    reference: operationReference
                }
            });
            const totalDebit = Number(withdrawalAuth.amount) + chargeAmount;
            await tx.account.update({
                where: { id: withdrawalAuth.accountId },
                data: {
                    balance: {
                        decrement: totalDebit
                    },
                    lastTransactionDate: new Date()
                }
            });
            const mainTransaction = await tx.transaction.create({
                data: {
                    type: withdrawalAuth.type === client_1.WithdrawalType.WITHDRAWAL ? client_1.TransactionType.WITHDRAWAL : client_1.TransactionType.TRANSFER,
                    amount: withdrawalAuth.amount,
                    status: 'COMPLETED',
                    description: withdrawalAuth.description || `${withdrawalAuth.type} approved`,
                    accountId: withdrawalAuth.accountId,
                    reference: operationReference
                }
            });
            await tx.ledgerEntry.create({
                data: {
                    accountId: withdrawalAuth.accountId,
                    type: 'DEBIT',
                    amount: withdrawalAuth.amount,
                    currency: 'GHS',
                    reference: operationReference,
                    description: withdrawalAuth.description || `${withdrawalAuth.type} approved`,
                    transactionId: mainTransaction.id,
                    createdBy: userId
                }
            });
            // For withdrawals, add the 5 cedis withdrawal charge
            let chargeTransactionId = null;
            if (withdrawalAuth.type === client_1.WithdrawalType.WITHDRAWAL) {
                const withdrawalCharge = 5.00;
                const chargeTransaction = await tx.transaction.create({
                    data: {
                        type: client_1.TransactionType.WITHDRAWAL,
                        amount: withdrawalCharge,
                        status: 'COMPLETED',
                        description: 'withdrawal charge',
                        accountId: withdrawalAuth.accountId,
                        reference: `CHG-${operationReference}`
                    }
                });
                chargeTransactionId = chargeTransaction.id;
                await tx.ledgerEntry.create({
                    data: {
                        accountId: withdrawalAuth.accountId,
                        type: 'DEBIT',
                        amount: withdrawalCharge,
                        currency: 'GHS',
                        reference: `CHG-${operationReference}`,
                        description: 'withdrawal charge',
                        transactionId: chargeTransaction.id,
                        createdBy: userId
                    }
                });
            }
            return {
                mainTransactionId: mainTransaction.id,
                chargeTransactionId
            };
        });
        // Record withdrawal charge as bank income (outside transaction to avoid issues)
        if (withdrawalAuth.type === client_1.WithdrawalType.WITHDRAWAL) {
            try {
                await bankIncome_service_1.BankIncomeService.recordWithdrawalCharge(approvalResult.mainTransactionId, withdrawalAuth.accountId, withdrawalAuth.account.customerId, 5.00);
            }
            catch (error) {
                console.error('Error recording withdrawal charge as income:', error);
                // Don't fail the approval if income recording fails
            }
        }
        res.json({ message: 'Withdrawal authorization approved successfully' });
    }
    catch (error) {
        console.error('Error approving withdrawal authorization:', error);
        res.status(500).json({ error: 'Failed to approve withdrawal authorization' });
    }
};
exports.approveWithdrawalAuthorization = approveWithdrawalAuthorization;
const rejectWithdrawalAuthorization = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Check if user has permission to reject (admin or manager)
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
            return res.status(403).json({ error: 'Insufficient permissions to reject withdrawals' });
        }
        // Get the withdrawal authorization
        const withdrawalAuth = await prisma.withdrawalAuthorization.findUnique({
            where: { id }
        });
        if (!withdrawalAuth) {
            return res.status(404).json({ error: 'Withdrawal authorization not found' });
        }
        if (withdrawalAuth.status !== 'PENDING') {
            return res.status(400).json({ error: 'Withdrawal authorization is not pending' });
        } // Update withdrawal authorization status
        await prisma.withdrawalAuthorization.update({
            where: { id },
            data: {
                status: client_1.WithdrawalAuthorizationStatus.REJECTED,
                approvedById: userId,
                approvedAt: new Date(),
                rejectedReason: reason || 'No reason provided'
            }
        });
        res.json({ message: 'Withdrawal authorization rejected successfully' });
    }
    catch (error) {
        console.error('Error rejecting withdrawal authorization:', error);
        res.status(500).json({ error: 'Failed to reject withdrawal authorization' });
    }
};
exports.rejectWithdrawalAuthorization = rejectWithdrawalAuthorization;
const createWithdrawalAuthorization = async (req, res) => {
    var _a;
    try {
        const { accountId, amount, type, description, reference, toAccountNumber, toCustomerName } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Validate required fields
        if (!accountId || !amount || !type) {
            return res.status(400).json({ error: 'Account ID, amount, and type are required' });
        }
        // Validate account exists
        const account = await prisma.account.findUnique({
            where: { id: accountId }
        });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        } // Create withdrawal authorization
        const withdrawalAuth = await prisma.withdrawalAuthorization.create({
            data: {
                accountId,
                amount: Number(amount),
                type: type === 'withdrawal' ? client_1.WithdrawalType.WITHDRAWAL : client_1.WithdrawalType.TRANSFER,
                status: client_1.WithdrawalAuthorizationStatus.PENDING,
                description,
                reference,
                toAccountNumber,
                toCustomerName,
                requestedById: userId
            },
            include: {
                account: {
                    include: {
                        customer: true
                    }
                },
                requestedBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        });
        // Transform response
        const response = {
            id: withdrawalAuth.id,
            accountNumber: withdrawalAuth.account.accountNumber,
            customerName: withdrawalAuth.account.customer.name,
            customerId: withdrawalAuth.account.customer.id,
            amount: Number(withdrawalAuth.amount),
            type: withdrawalAuth.type.toLowerCase(),
            description: withdrawalAuth.description || '',
            reference: withdrawalAuth.reference || '',
            toAccountNumber: withdrawalAuth.toAccountNumber || '',
            toCustomerName: withdrawalAuth.toCustomerName || '',
            requestedAt: withdrawalAuth.requestedAt.toISOString(),
            requestedBy: withdrawalAuth.requestedBy.name,
            status: withdrawalAuth.status.toLowerCase(),
            availableBalance: Number(withdrawalAuth.account.balance)
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error creating withdrawal authorization:', error);
        res.status(500).json({ error: 'Failed to create withdrawal authorization' });
    }
};
exports.createWithdrawalAuthorization = createWithdrawalAuthorization;
const reverseWithdrawalAuthorization = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Check if user has permission to reverse (admin or manager)
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
            return res.status(403).json({ error: 'Insufficient permissions to reverse withdrawals' });
        }
        // Get the withdrawal authorization
        const withdrawalAuth = await prisma.withdrawalAuthorization.findUnique({
            where: { id },
            include: {
                account: true
            }
        });
        if (!withdrawalAuth) {
            return res.status(404).json({ error: 'Withdrawal authorization not found' });
        }
        if (withdrawalAuth.status !== 'APPROVED') {
            return res.status(400).json({ error: 'Only approved withdrawals can be reversed' });
        }
        if (withdrawalAuth.isReversed) {
            return res.status(400).json({ error: 'Withdrawal has already been reversed' });
        }
        // Start transaction to reverse the withdrawal
        await prisma.$transaction(async (tx) => {
            // Mark withdrawal as reversed
            await tx.withdrawalAuthorization.update({
                where: { id },
                data: {
                    isReversed: true,
                    reversedById: userId,
                    reversedAt: new Date(),
                    reversalReason: reason || 'No reason provided'
                }
            });
            const chargeAmount = withdrawalAuth.type === client_1.WithdrawalType.WITHDRAWAL ? 5.00 : 0;
            const totalCredit = Number(withdrawalAuth.amount) + chargeAmount;
            // Add the withdrawn amount (and fee where applicable) back to the account
            await tx.account.update({
                where: { id: withdrawalAuth.accountId },
                data: {
                    balance: {
                        increment: totalCredit
                    },
                    lastTransactionDate: new Date()
                }
            });
            // Create reversal transaction record
            const mainReversalReference = `REV-${withdrawalAuth.reference || withdrawalAuth.id}-${Date.now()}`;
            const reversalMainTransaction = await tx.transaction.create({
                data: {
                    type: client_1.TransactionType.DEPOSIT,
                    amount: withdrawalAuth.amount,
                    status: 'COMPLETED',
                    description: `Reversal: ${withdrawalAuth.description || withdrawalAuth.type} (${reason || 'No reason provided'})`,
                    accountId: withdrawalAuth.accountId,
                    reference: mainReversalReference
                }
            });
            await tx.ledgerEntry.create({
                data: {
                    accountId: withdrawalAuth.accountId,
                    type: 'CREDIT',
                    amount: withdrawalAuth.amount,
                    currency: 'GHS',
                    reference: mainReversalReference,
                    description: `Reversal: ${withdrawalAuth.description || withdrawalAuth.type}`,
                    transactionId: reversalMainTransaction.id,
                    createdBy: userId
                }
            });
            // For withdrawals, also reverse the withdrawal charge
            if (withdrawalAuth.type === client_1.WithdrawalType.WITHDRAWAL) {
                const withdrawalCharge = 5.00;
                // Create charge reversal transaction record
                const chargeReversalReference = `REV-CHG-${withdrawalAuth.reference || withdrawalAuth.id}-${Date.now()}`;
                const chargeReversalTransaction = await tx.transaction.create({
                    data: {
                        type: client_1.TransactionType.DEPOSIT,
                        amount: withdrawalCharge,
                        status: 'COMPLETED',
                        description: 'Reversal: withdrawal charge',
                        accountId: withdrawalAuth.accountId,
                        reference: chargeReversalReference
                    }
                });
                await tx.ledgerEntry.create({
                    data: {
                        accountId: withdrawalAuth.accountId,
                        type: 'CREDIT',
                        amount: withdrawalCharge,
                        currency: 'GHS',
                        reference: chargeReversalReference,
                        description: 'Reversal: withdrawal charge',
                        transactionId: chargeReversalTransaction.id,
                        createdBy: userId
                    }
                });
            }
        });
        // Reverse withdrawal charge from bank income (outside transaction to avoid issues)
        if (withdrawalAuth.type === client_1.WithdrawalType.WITHDRAWAL) {
            try {
                const originalMainTx = await prisma.transaction.findFirst({
                    where: {
                        accountId: withdrawalAuth.accountId,
                        type: client_1.TransactionType.WITHDRAWAL,
                        reference: withdrawalAuth.reference || `WTH-${withdrawalAuth.id}`,
                        status: 'COMPLETED'
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });
                if (originalMainTx) {
                    await bankIncome_service_1.BankIncomeService.reverseWithdrawalCharge(originalMainTx.id, 5.00);
                }
            }
            catch (error) {
                console.error('Error reversing withdrawal charge from income:', error);
                // Don't fail the reversal if income reversal fails
            }
        }
        res.json({ message: 'Withdrawal authorization reversed successfully' });
    }
    catch (error) {
        console.error('Error reversing withdrawal authorization:', error);
        res.status(500).json({ error: 'Failed to reverse withdrawal authorization' });
    }
};
exports.reverseWithdrawalAuthorization = reverseWithdrawalAuthorization;
