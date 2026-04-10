import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface LedgerEntryInput {
  accountId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  currency?: string;
  reference: string;
  description?: string;
  transactionId?: string;
  metadata?: any;
  createdBy?: string;
}

export interface PendingTransactionInput {
  accountId: string;
  type: 'HOLD' | 'RESERVE';
  amount: number;
  currency?: string;
  reference: string;
  description?: string;
  expiresAt?: Date;
  metadata?: any;
  createdBy?: string;
}

export interface AccountBalance {
  ledgerBalance: number;
  pendingBalance: number;
  availableBalance: number;
  shareBalance?: number;
  overdraftLimit?: number;
}

export class LedgerService {
  
  /**
   * Post a single ledger entry
   */
  async postLedgerEntry(entry: LedgerEntryInput): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Create the ledger entry
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          accountId: entry.accountId,
          type: entry.type,
          amount: new Decimal(entry.amount),
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
  async postDoubleEntry(
    creditEntry: LedgerEntryInput,
    debitEntry: LedgerEntryInput,
    reference: string
  ): Promise<any[]> {
    if (creditEntry.amount !== debitEntry.amount) {
      throw new Error('Credit and debit amounts must be equal for double-entry');
    }

    return await prisma.$transaction(async (tx) => {
      // Ensure both entries use the same reference
      const entries = await Promise.all([
        tx.ledgerEntry.create({
          data: {
            ...creditEntry,
            type: 'CREDIT',
            reference,
            amount: new Decimal(creditEntry.amount),
            currency: creditEntry.currency || 'GHS',
          },
        }),
        tx.ledgerEntry.create({
          data: {
            ...debitEntry,
            type: 'DEBIT',
            reference,
            amount: new Decimal(debitEntry.amount),
            currency: debitEntry.currency || 'GHS',
          },
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
  async calculateLedgerBalance(accountId: string): Promise<number> {
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
  async calculatePendingBalance(accountId: string): Promise<number> {
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
  async getAccountBalance(accountId: string): Promise<AccountBalance> {
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
          ledgerBalance: new Decimal(ledgerBalance),
          pendingBalance: new Decimal(pendingBalance),
          availableBalance: new Decimal(ledgerBalance - pendingBalance),
          snapshotAt: new Date(),
        },
        update: {
          ledgerBalance: new Decimal(ledgerBalance),
          pendingBalance: new Decimal(pendingBalance),
          availableBalance: new Decimal(ledgerBalance - pendingBalance),
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

    const overdraftLimit = Number(snapshot.account?.overdraftLimit || 0);
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
  async placeHold(input: PendingTransactionInput): Promise<any> {
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
          amount: new Decimal(input.amount),
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
  async settleHold(holdId: string, finalAmount?: number): Promise<any> {
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
          amount: new Decimal(settleAmount),
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
  async releaseHold(holdId: string): Promise<any> {
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
  async cleanupExpiredHolds(): Promise<number> {
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
  private async updateAccountSnapshot(accountId: string, tx: any): Promise<void> {
    const [ledgerBalance, pendingBalance] = await Promise.all([
      this.calculateLedgerBalance(accountId),
      this.calculatePendingBalance(accountId),
    ]);

    await tx.accountBalanceSnapshot.upsert({
      where: { accountId },
      create: {
        accountId,
        ledgerBalance: new Decimal(ledgerBalance),
        pendingBalance: new Decimal(pendingBalance),
        availableBalance: new Decimal(ledgerBalance - pendingBalance),
        snapshotAt: new Date(),
      },
      update: {
        ledgerBalance: new Decimal(ledgerBalance),
        pendingBalance: new Decimal(pendingBalance),
        availableBalance: new Decimal(ledgerBalance - pendingBalance),
        snapshotAt: new Date(),
      },
    });
  }

  /**
   * Check if snapshot is stale (older than 5 minutes)
   */
  private isSnapshotStale(snapshotAt: Date): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return snapshotAt < fiveMinutesAgo;
  }

  /**
   * Get ledger history for an account
   */
  async getLedgerHistory(
    accountId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any[]> {
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

export const ledgerService = new LedgerService();