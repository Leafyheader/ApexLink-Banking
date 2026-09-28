import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/auth';
import { getSystemSettings } from '../utils/systemSettings';
import { getOrCreateTreasuryAccount } from '../utils/treasuryAccount';

const prisma = new PrismaClient();

function formatSettings(settings: Awaited<ReturnType<typeof getSystemSettings>>, updatedByName?: string | null) {
  return {
    withdrawalFee: Number(settings.withdrawalFee),
    defaultLoanInterestRate: Number(settings.defaultLoanInterestRate),
    updatedAt: settings.updatedAt,
    updatedBy: updatedByName ?? null
  };
}

// Readable by any authenticated user - the withdrawal fee is displayed to tellers
// on transaction forms, not just admins.
export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await getSystemSettings(prisma);
    let updatedByName: string | null = null;
    if (settings.updatedById) {
      const user = await prisma.user.findUnique({ where: { id: settings.updatedById }, select: { name: true } });
      updatedByName = user?.name ?? null;
    }
    res.json(formatSettings(settings, updatedByName));
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Admin-only (enforced by route middleware).
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { withdrawalFee, defaultLoanInterestRate } = req.body;

    const data: { withdrawalFee?: number; defaultLoanInterestRate?: number } = {};

    if (withdrawalFee !== undefined) {
      const fee = Number(withdrawalFee);
      if (isNaN(fee) || fee < 0) {
        return res.status(400).json({ error: 'withdrawalFee must be a non-negative number' });
      }
      data.withdrawalFee = fee;
    }

    if (defaultLoanInterestRate !== undefined) {
      const rate = Number(defaultLoanInterestRate);
      if (isNaN(rate) || rate < 0) {
        return res.status(400).json({ error: 'defaultLoanInterestRate must be a non-negative number' });
      }
      data.defaultLoanInterestRate = rate;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid settings fields provided' });
    }

    const previous = await getSystemSettings(prisma);
    const updated = await prisma.systemSettings.update({
      where: { id: previous.id },
      data: { ...data, updatedById: req.user!.id }
    });

    // Response body is captured by the global audit trail middleware, so returning
    // both previous and updated values here gives a full before/after change record
    // without needing a dedicated settings-history table.
    res.json({
      previous: formatSettings(previous),
      updated: formatSettings(updated, req.user!.name)
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Readable by any authenticated user - staff creating/reviewing expenses need to know whether
// there are enough treasury funds to eventually pay them, without seeing transaction-level detail.
export const getTreasuryBalance = async (req: AuthRequest, res: Response) => {
  try {
    const treasury = await getOrCreateTreasuryAccount(prisma, req.user!.id);
    res.json({ balance: Number(treasury.balance), currency: treasury.currency });
  } catch (error) {
    console.error('Error fetching treasury balance:', error);
    res.status(500).json({ error: 'Failed to fetch treasury balance' });
  }
};

// Admin-only. Shows the treasury account used to fund expense payments.
export const getTreasurySummary = async (req: AuthRequest, res: Response) => {
  try {
    const treasury = await getOrCreateTreasuryAccount(prisma, req.user!.id);
    const recentTransactions = await prisma.transaction.findMany({
      where: { accountId: treasury.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({
      accountId: treasury.id,
      accountNumber: treasury.accountNumber,
      balance: Number(treasury.balance),
      currency: treasury.currency,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        reference: t.reference,
        date: t.date
      }))
    });
  } catch (error) {
    console.error('Error fetching treasury summary:', error);
    res.status(500).json({ error: 'Failed to fetch treasury summary' });
  }
};

// Admin-only. Manually credits the treasury account so expense payments have funds to draw from.
export const fundTreasury = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, description } = req.body;
    const fundAmount = Number(amount);

    if (isNaN(fundAmount) || fundAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const treasury = await getOrCreateTreasuryAccount(tx, req.user!.id);

      await tx.account.update({
        where: { id: treasury.id },
        data: {
          balance: { increment: fundAmount },
          lastTransactionDate: new Date()
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          accountId: treasury.id,
          type: 'DEPOSIT',
          amount: fundAmount,
          description: description || 'Treasury account funding',
          reference: `TREASURY-FUND-${Date.now()}`,
          status: 'COMPLETED'
        }
      });

      const updatedTreasury = await tx.account.findUniqueOrThrow({ where: { id: treasury.id } });

      return { treasury: updatedTreasury, transaction };
    });

    res.status(201).json({
      accountId: result.treasury.id,
      accountNumber: result.treasury.accountNumber,
      balance: Number(result.treasury.balance),
      transaction: {
        id: result.transaction.id,
        amount: Number(result.transaction.amount),
        description: result.transaction.description,
        reference: result.transaction.reference,
        date: result.transaction.date
      }
    });
  } catch (error) {
    console.error('Error funding treasury account:', error);
    res.status(500).json({ error: 'Failed to fund treasury account' });
  }
};
