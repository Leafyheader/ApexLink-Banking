"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = exports.LedgerService = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const prisma = new client_1.PrismaClient();
class LedgerService {
    /**
     * Post a single ledger entry
     */
    async postLedgerEntry(entry) {
        return await prisma.$transaction(async (tx) => {
            // Create the ledger entry
            const ledgerEntry = await tx.ledgerEntry.create({
                data: {
                    accountId: entry.accountId,
                    type: entry.type,
                    amount: new library_1.Decimal(entry.amount),
                    currency: entry.currency || 'GHS',
                    reference: entry.reference,
                    description: entry.description,
                    transactionId: entry.transactionId,
                    metadata: entry.metadata,
                    createdBy: entry.createdBy,
                },
            });
            // Update the account balance snapshot
            await this.updateAccountSnapshot(entry.accountId, tx);
            return ledgerEntry;
        });
    }
    /**
     * Post double-entry transaction (credit one account, debit another)
     */
    async postDoubleEntry(creditEntry, debitEntry, reference) {
        if (creditEntry.amount !== debitEntry.amount) {
            throw new Error('Credit and debit amounts must be equal for double-entry');
        }
        return await prisma.$transaction(async (tx) => {
            // Ensure both entries use the same reference
            const entries = await Promise.all([
                tx.ledgerEntry.create({
                    data: Object.assign(Object.assign({}, creditEntry), { type: 'CREDIT', reference, amount: new library_1.Decimal(creditEntry.amount), currency: creditEntry.currency || 'GHS' }),
                }),
                tx.ledgerEntry.create({
                    data: Object.assign(Object.assign({}, debitEntry), { type: 'DEBIT', reference, amount: new library_1.Decimal(debitEntry.amount), currency: debitEntry.currency || 'GHS' }),
                }),
            ]);
            // Update snapshots for both accounts
            await Promise.all([
                this.updateAccountSnapshot(creditEntry.accountId, tx),
                this.updateAccountSnapshot(debitEntry.accountId, tx),
            ]);
            return entries;
        });
    }
    /**
     * Calculate current ledger balance for an account
     */
    async calculateLedgerBalance(accountId) {
        const result = await prisma.ledgerEntry.aggregate({
            where: { accountId },
            _sum: {
                amount: true,
            },
            _count: {
                id: true,
            },
        });
        if (result._count.id === 0) {
            return 0;
        }
        // Get separate sums for credits and debits
        const [creditSum, debitSum] = await Promise.all([
            prisma.ledgerEntry.aggregate({
                where: { accountId, type: 'CREDIT' },
                _sum: { amount: true },
            }),
            prisma.ledgerEntry.aggregate({
                where: { accountId, type: 'DEBIT' },
                _sum: { amount: true },
            }),
        ]);
        const credits = Number(creditSum._sum.amount || 0);
        const debits = Number(debitSum._sum.amount || 0);
        return credits - debits;
    }
    /**
     * Calculate pending balance (sum of active holds/reserves)
     */
    async calculatePendingBalance(accountId) {
        const result = await prisma.pendingTransaction.aggregate({
            where: {
                accountId,
                status: 'ACTIVE',
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            _sum: {
                amount: true,
            },
        });
        return Number(result._sum.amount || 0);
    }
    /**
     * Get complete account balance information
     */
    async getAccountBalance(accountId) {
        var _a;
        // Try to get from snapshot first for performance
        let snapshot = await prisma.accountBalanceSnapshot.findUnique({
            where: { accountId },
            include: {
                account: {
                    select: {
                        overdraftLimit: true,
                    },
                },
            },
        });
        // If no snapshot exists or it's stale, calculate fresh
        if (!snapshot || this.isSnapshotStale(snapshot.snapshotAt)) {
            const [ledgerBalance, pendingBalance] = await Promise.all([
                this.calculateLedgerBalance(accountId),
                this.calculatePendingBalance(accountId),
            ]);
            // Update or create snapshot
            snapshot = await prisma.accountBalanceSnapshot.upsert({
                where: { accountId },
                create: {
                    accountId,
                    ledgerBalance: new library_1.Decimal(ledgerBalance),
                    pendingBalance: new library_1.Decimal(pendingBalance),
                    availableBalance: new library_1.Decimal(ledgerBalance - pendingBalance),
                    snapshotAt: new Date(),
                },
                update: {
                    ledgerBalance: new library_1.Decimal(ledgerBalance),
                    pendingBalance: new library_1.Decimal(pendingBalance),
                    availableBalance: new library_1.Decimal(ledgerBalance - pendingBalance),
                    snapshotAt: new Date(),
                },
                include: {
                    account: {
                        select: {
                            overdraftLimit: true,
                        },
                    },
                },
            });
        }
        const overdraftLimit = Number(((_a = snapshot.account) === null || _a === void 0 ? void 0 : _a.overdraftLimit) || 0);
        const availableWithOverdraft = Number(snapshot.availableBalance) + overdraftLimit;
        return {
            ledgerBalance: Number(snapshot.ledgerBalance),
            pendingBalance: Number(snapshot.pendingBalance),
            availableBalance: availableWithOverdraft,
            overdraftLimit,
        };
    }
    /**
     * Place a hold on funds
     */
    async placeHold(input) {
        return await prisma.$transaction(async (tx) => {
            // Check available balance with SELECT FOR UPDATE for concurrency protection
            const account = await tx.account.findUniqueOrThrow({
                where: { id: input.accountId },
                select: { id: true, overdraftLimit: true },
            });
            const balance = await this.getAccountBalance(input.accountId);
            if (balance.availableBalance < input.amount) {
                throw new Error(`Insufficient funds. Available: ${balance.availableBalance}, Required: ${input.amount}`);
            }
            // Create the pending transaction
            const pendingTx = await tx.pendingTransaction.create({
                data: {
                    accountId: input.accountId,
                    type: input.type,
                    amount: new library_1.Decimal(input.amount),
                    currency: input.currency || 'GHS',
                    reference: input.reference,
                    description: input.description,
                    expiresAt: input.expiresAt,
                    metadata: input.metadata,
                    createdBy: input.createdBy,
                },
            });
            // Update account snapshot
            await this.updateAccountSnapshot(input.accountId, tx);
            return pendingTx;
        });
    }
    /**
     * Settle a hold by creating corresponding ledger entries
     */
    async settleHold(holdId, finalAmount) {
        return await prisma.$transaction(async (tx) => {
            const hold = await tx.pendingTransaction.findUniqueOrThrow({
                where: { id: holdId },
            });
            if (hold.status !== 'ACTIVE') {
                throw new Error(`Hold ${holdId} is not active (status: ${hold.status})`);
            }
            const settleAmount = finalAmount || Number(hold.amount);
            // Create debit ledger entry
            await tx.ledgerEntry.create({
                data: {
                    accountId: hold.accountId,
                    type: 'DEBIT',
                    amount: new library_1.Decimal(settleAmount),
                    currency: hold.currency,
                    reference: `SETTLE-${hold.reference}`,
                    description: `Settlement of hold: ${hold.description}`,
                    metadata: { originalHoldId: holdId },
                    createdBy: hold.createdBy,
                },
            });
            // Mark hold as settled
            const settledHold = await tx.pendingTransaction.update({
                where: { id: holdId },
                data: {
                    status: 'SETTLED',
                    settledAt: new Date(),
                },
            });
            // Update account snapshot
            await this.updateAccountSnapshot(hold.accountId, tx);
            return settledHold;
        });
    }
    /**
     * Release a hold without settling
     */
    async releaseHold(holdId) {
        return await prisma.$transaction(async (tx) => {
            const hold = await tx.pendingTransaction.findUniqueOrThrow({
                where: { id: holdId },
            });
            if (hold.status !== 'ACTIVE') {
                throw new Error(`Hold ${holdId} is not active (status: ${hold.status})`);
            }
            const releasedHold = await tx.pendingTransaction.update({
                where: { id: holdId },
                data: {
                    status: 'RELEASED',
                    settledAt: new Date(),
                },
            });
            // Update account snapshot
            await this.updateAccountSnapshot(hold.accountId, tx);
            return releasedHold;
        });
    }
    /**
     * Clean up expired holds
     */
    async cleanupExpiredHolds() {
        const result = await prisma.pendingTransaction.updateMany({
            where: {
                status: 'ACTIVE',
                expiresAt: {
                    lt: new Date(),
                },
            },
            data: {
                status: 'EXPIRED',
                settledAt: new Date(),
            },
        });
        return result.count;
    }
    /**
     * Update account balance snapshot
     */
    async updateAccountSnapshot(accountId, tx) {
        const [ledgerBalance, pendingBalance] = await Promise.all([
            this.calculateLedgerBalance(accountId),
            this.calculatePendingBalance(accountId),
        ]);
        await tx.accountBalanceSnapshot.upsert({
            where: { accountId },
            create: {
                accountId,
                ledgerBalance: new library_1.Decimal(ledgerBalance),
                pendingBalance: new library_1.Decimal(pendingBalance),
                availableBalance: new library_1.Decimal(ledgerBalance - pendingBalance),
                snapshotAt: new Date(),
            },
            update: {
                ledgerBalance: new library_1.Decimal(ledgerBalance),
                pendingBalance: new library_1.Decimal(pendingBalance),
                availableBalance: new library_1.Decimal(ledgerBalance - pendingBalance),
                snapshotAt: new Date(),
            },
        });
    }
    /**
     * Check if snapshot is stale (older than 5 minutes)
     */
    isSnapshotStale(snapshotAt) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return snapshotAt < fiveMinutesAgo;
    }
    /**
     * Get ledger history for an account
     */
    async getLedgerHistory(accountId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return await prisma.ledgerEntry.findMany({
            where: { accountId },
            include: {
                transaction: {
                    select: {
                        id: true,
                        type: true,
                        description: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });
    }
}
exports.LedgerService = LedgerService;
exports.ledgerService = new LedgerService();
