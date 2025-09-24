"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectOrReverseAccount = exports.approveAccount = exports.getAccountAuthorizations = void 0;
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
// Get all account authorizations with filtering
const getAccountAuthorizations = async (req, res) => {
    try {
        const { page = '1', limit = '10', search = '', status } = req.query;
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
            where.authorizationStatus = status;
        }
        // When no status is provided, show all accounts (don't add authorizationStatus filter)
        // Get accounts with authorization status
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
        ]); // Get user info for createdBy fields (since it's not a relation)
        const userIds = [...new Set(accounts.map(account => account.createdBy).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, username: true }
        });
        const userMap = new Map(users.map(user => [user.id, user]));
        // Format the response data to match the frontend interface
        const formattedAccounts = accounts.map((account) => {
            var _a, _b;
            return ({
                id: account.id,
                accountNumber: account.accountNumber,
                accountName: account.customer.name,
                accountType: account.type.toLowerCase(),
                createdAt: account.createdAt.toISOString(),
                createdBy: account.createdBy ? ((_a = userMap.get(account.createdBy)) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown User' : 'System',
                approvedBy: (_b = account.approvedBy) === null || _b === void 0 ? void 0 : _b.name,
                status: account.authorizationStatus.toLowerCase()
            });
        });
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            accounts: formattedAccounts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            },
            summary: {
                total: await prisma.account.count(), // Always show total count of all accounts
                approved: await prisma.account.count({ where: { authorizationStatus: 'APPROVED' } }),
                pending: await prisma.account.count({ where: { authorizationStatus: 'PENDING' } }),
                rejected: await prisma.account.count({ where: { authorizationStatus: 'REJECTED' } })
            }
        });
    }
    catch (error) {
        console.error('Error fetching account authorizations:', error);
        res.status(500).json({ message: 'Failed to fetch account authorizations' });
    }
};
exports.getAccountAuthorizations = getAccountAuthorizations;
// Approve account
const approveAccount = async (req, res) => {
    var _a;
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // Check if account exists
        const existingAccount = await prisma.account.findUnique({ where: { id } });
        if (!existingAccount) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }
        // Update account status to approved and set the approver
        const account = await prisma.account.update({
            where: { id },
            data: {
                authorizationStatus: 'APPROVED',
                status: 'ACTIVE',
                approvedById: userId,
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
        res.json(account);
    }
    catch (error) {
        console.error('Error approving account:', error);
        res.status(500).json({ message: 'Failed to approve account' });
    }
};
exports.approveAccount = approveAccount;
// Reject or reverse account approval
const rejectOrReverseAccount = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { id } = req.params;
        const { reason } = req.body;
        // Check if account exists
        const existingAccount = await prisma.account.findUnique({ where: { id } });
        if (!existingAccount) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }
        // Update account status to PENDING (reversal) or REJECTED
        const account = await prisma.account.update({
            where: { id },
            data: {
                authorizationStatus: 'PENDING',
                approvedById: null, // Remove approver
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
        console.error('Error rejecting/reversing account:', error);
        res.status(500).json({ message: 'Failed to reject/reverse account' });
    }
};
exports.rejectOrReverseAccount = rejectOrReverseAccount;
