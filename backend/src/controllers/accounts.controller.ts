import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../types/auth';
import { generateAccountNumber } from '../utils/idGenerator';
import { toPesewas } from '../utils/cashReporting';

const prisma = new PrismaClient();

// Computes the next ACC-prefixed account number from the true highest existing numeric
// suffix (across all accounts, not just a paginated subset) - existing data has inconsistent
// zero-padding widths, so this compares by parsed numeric value rather than string sort.
async function computeNextAccountNumber(): Promise<string> {
  const accounts = await prisma.account.findMany({
    where: { accountNumber: { startsWith: 'ACC' } },
    select: { accountNumber: true }
  });

  let maxNumber = 0;
  for (const account of accounts) {
    const parsed = parseInt(account.accountNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > maxNumber) {
      maxNumber = parsed;
    }
  }

  return `ACC${(maxNumber + 1).toString().padStart(7, '0')}`;
}

// Preview-only endpoint for the "New Account" form to suggest the next account number.
// Does not reserve the number - createAccount still checks for a collision at insert time.
export const getNextAccountNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const nextAccountNumber = await computeNextAccountNumber();
    res.json({ nextAccountNumber });
  } catch (error) {
    console.error('Error computing next account number:', error);
    res.status(500).json({ message: 'Failed to compute next account number' });
  }
};

// Get all accounts with optional filtering
export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', status, type, customerId } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter conditions
    // System accounts (e.g. the treasury account) belong to a hidden system customer and are
    // managed from the Settings page, not the general account list - exclude them here.
    const where: any = { customer: { isHidden: false } };

    if (search) {
      where.OR = [
        { accountNumber: { contains: search as string } },
        { customer: { name: { contains: search as string } } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (customerId) {
      where.customerId = customerId as string;
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
          },
          // For LOAN accounts, the legacy `balance` field only ever tracks principal - it
          // understates what's actually still owed until near payoff, since interest and the
          // guarantor-backed portion are also part of the real remaining debt. `outstandingBalance`
          // is kept in sync with the true totalPayable-minus-totalPaid figure on every repayment
          // (see loanRepayment handling in transactions.controller.ts) and is the right number to
          // show/validate against.
          loan: {
            select: {
              outstandingBalance: true,
              isCompleted: true
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
    const formattedAccounts = accounts.map(account => ({
      ...account,
      customerName: account.customer?.name || 'Unknown Customer',
      loanOutstandingBalance: account.loan ? Number(account.loan.outstandingBalance) : null
    }));
    
    res.json({
      accounts: formattedAccounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: 'Failed to fetch accounts' });
  }
};

// Get account by ID
export const getAccountById = async (req: Request, res: Response): Promise<void> => {
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
        },
        // See getAccounts for why this - not the legacy `balance` field - is the real
        // remaining-debt figure for a LOAN account.
        loan: {
          select: {
            outstandingBalance: true,
            isCompleted: true
          }
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
    const [
      lastTransaction,
      lastDeposit,
      lastWithdrawal,
      transactionsThisMonth
    ] = await Promise.all([
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
    const formattedAccount = {
      ...account,
      customerName: account.customer?.name || 'Unknown Customer',
      loanOutstandingBalance: account.loan ? Number(account.loan.outstandingBalance) : null,
      lastTransactionDate: lastTransaction?.date?.toISOString() || null,
      lastDepositAmount: lastDeposit ? Number(lastDeposit.amount) : null,
      lastDepositDate: lastDeposit?.date?.toISOString() || null,
      lastWithdrawalAmount: lastWithdrawal ? Number(lastWithdrawal.amount) : null,
      lastWithdrawalDate: lastWithdrawal?.date?.toISOString() || null,
      transactionsThisMonth: transactionsThisMonth || 0
    };
    
    res.json(formattedAccount);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ message: 'Failed to fetch account details' });
  }
};

// Create new account
export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
      const { customerId, type, accountNumber, balance, currency, minimumBalance, overdraftLimit, shareBalance, sharesAvailableBalance } = req.body;
    
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
    const providedAccountNumber = typeof accountNumber === 'string' ? accountNumber.trim().toUpperCase() : '';
    const finalAccountNumber = providedAccountNumber || await generateAccountNumber();

    const existingWithAccountNumber = await prisma.account.findUnique({
      where: { accountNumber: finalAccountNumber }
    });

    if (existingWithAccountNumber) {
      res.status(409).json({ message: `Account number ${finalAccountNumber} already exists` });
      return;
    }

    // Create the account with pending authorization
    const createData: any = {
      accountNumber: finalAccountNumber,
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

    const initialBalance = Number(createData.balance || 0);
    const initialShareBalance = Number(createData.shareBalance || 0);

    if (initialBalance < 0 || initialShareBalance < 0 || !Number.isFinite(initialBalance) || !Number.isFinite(initialShareBalance)) {
      res.status(400).json({ message: 'Opening balances must be zero or positive numbers' });
      return;
    }

    // An opening balance typed on the new-account form is cash handed over at the counter.
    // Balances brought in by the spreadsheet import are carried over from the owners' books -
    // they still become the customer's balance, but no cash changed hands today, so they're
    // tagged OPEN- and left out of the cash totals. Only admins may bring balances in that way.
    const isImportedBalance = req.body.openingBalanceSource === 'import';
    if (isImportedBalance && (initialBalance > 0 || initialShareBalance > 0) && req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Only admins can import opening balances' });
      return;
    }
    const openingPrefix = isImportedBalance ? 'OPEN-' : 'DEP-OPEN-';

    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
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

      // Record the seed deposit as a real Transaction so it shows up in the account's
      // history and reconciliation reports instead of appearing to come from nowhere.
      if (initialBalance > 0) {
        await tx.transaction.create({
          data: {
            accountId: created.id,
            type: 'DEPOSIT',
            amount: initialBalance,
            description: isImportedBalance ? 'Opening balance brought forward (import)' : 'Initial deposit at account opening',
            reference: `${openingPrefix}${created.id.slice(-8)}`,
            status: 'COMPLETED'
          }
        });
      }

      if (initialShareBalance > 0) {
        await tx.transaction.create({
          data: {
            accountId: created.id,
            type: 'DEPOSIT_SHARES',
            amount: initialShareBalance,
            description: isImportedBalance ? 'Opening shares balance brought forward (import)' : 'Initial shares deposit at account opening',
            reference: `${openingPrefix}SH-${created.id.slice(-8)}`,
            status: 'COMPLETED'
          }
        });
      }

      return created;
    });

    // Format account to include customerName for backward compatibility
    const formattedAccount = {
      ...account,
      customerName: account.customer?.name || 'Unknown Customer'
    };
    
    res.status(201).json(formattedAccount);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Failed to create account' });
  }
};

// Update account
export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { status, minimumBalance, overdraftLimit, balance, shareBalance, sharesAvailableBalance } = req.body;

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({ where: { id } });
    if (!existingAccount) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    // Status changes here obey the same transition rules as PATCH /accounts/:id/status. Closing
    // is only allowed through the Close action, which checks the account is empty.
    const newStatus = status !== undefined ? String(status).toUpperCase() : undefined;
    const isStatusChange = newStatus !== undefined && newStatus !== existingAccount.status;
    if (isStatusChange) {
      if (newStatus === 'CLOSED') {
        res.status(400).json({ message: 'Use the Close Account action to close an account' });
        return;
      }
      const allowedNextStatuses = VALID_ACCOUNT_STATUS_TRANSITIONS[existingAccount.status] || [];
      if (!allowedNextStatuses.includes(newStatus!)) {
        res.status(400).json({ message: `Cannot change account status from ${existingAccount.status} to ${newStatus}` });
        return;
      }
    }

    if (balance !== undefined && !Number.isFinite(Number(balance))) {
      res.status(400).json({ message: 'balance must be a number' });
      return;
    }
    if (shareBalance !== undefined && !Number.isFinite(Number(shareBalance))) {
      res.status(400).json({ message: 'shareBalance must be a number' });
      return;
    }

    const oldBalance = Number(existingAccount.balance);
    const oldShareBalance = Number(existingAccount.shareBalance || 0);
    const balanceDelta = balance !== undefined ? toPesewas(Number(balance) - oldBalance) : 0;
    const shareBalanceDelta = shareBalance !== undefined ? toPesewas(Number(shareBalance) - oldShareBalance) : 0;
    const isDirectBalanceEdit = balanceDelta !== 0 || shareBalanceDelta !== 0;

    // Directly overwriting a balance is a manual correction, not a normal account-detail edit -
    // restrict it to admins and record it as a real Transaction, not a silent field update.
    if (isDirectBalanceEdit && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Only admins can directly adjust account balances' });
      return;
    }

    // Loan balances belong to the repayment engine and the treasury to expense payments/funding.
    if (isDirectBalanceEdit && (existingAccount.type === 'LOAN' || existingAccount.type === 'TREASURY')) {
      res.status(400).json({ message: `Balances of ${existingAccount.type.toLowerCase()} accounts cannot be edited directly` });
      return;
    }

      // Update the account
    const updateData: any = {
      minimumBalance,
      overdraftLimit,
      updatedAt: new Date()
    };

    if (isStatusChange) {
      updateData.status = newStatus;
    }

    // Apply corrections as increments of the delta the admin saw, never as a hard-set: if a
    // deposit lands between loading the form and saving it, a hard-set would wipe it out while
    // the correction transaction recorded a different amount.
    if (balanceDelta !== 0) {
      updateData.balance = { increment: balanceDelta };
    }

    if (shareBalanceDelta !== 0) {
      updateData.shareBalance = { increment: shareBalanceDelta };
    }

    if (sharesAvailableBalance !== undefined) {
      updateData.sharesAvailableBalance = sharesAvailableBalance;
    }

    const account = await prisma.$transaction(async (tx) => {
      // Only apply if the balances are still what the correction was computed from.
      const claim = await tx.account.updateMany({
        where: {
          id,
          balance: existingAccount.balance,
          ...(shareBalanceDelta !== 0 ? { shareBalance: existingAccount.shareBalance } : {})
        },
        data: updateData
      });

      if (claim.count === 0) {
        throw new Error('BALANCE_CHANGED');
      }

      const updated = await tx.account.findUniqueOrThrow({
        where: { id },
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

      if (balanceDelta !== 0) {
        await tx.transaction.create({
          data: {
            accountId: id,
            type: balanceDelta > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
            amount: Math.abs(balanceDelta),
            description: `Manual balance correction by admin (${req.user?.id}): ${oldBalance} -> ${Number(balance)}`,
            reference: `ADJ-${id.slice(-6)}-${Date.now()}`,
            status: 'COMPLETED'
          }
        });
      }

      if (shareBalanceDelta !== 0) {
        await tx.transaction.create({
          data: {
            accountId: id,
            type: shareBalanceDelta > 0 ? 'DEPOSIT_SHARES' : 'WITHDRAWAL_SHARES',
            amount: Math.abs(shareBalanceDelta),
            description: `Manual share balance correction by admin (${req.user?.id}): ${oldShareBalance} -> ${Number(shareBalance)}`,
            reference: `ADJ-SH-${id.slice(-6)}-${Date.now()}`,
            status: 'COMPLETED'
          }
        });
      }

      return updated;
    });

    // Format account to include customerName for backward compatibility
    const formattedAccount = {
      ...account,
      customerName: account.customer?.name || 'Unknown Customer'
    };

    res.json(formattedAccount);
  } catch (error) {
    if (error instanceof Error && error.message === 'BALANCE_CHANGED') {
      res.status(409).json({ message: 'The account balance changed while you were editing. Reload the account and re-enter the correction.' });
      return;
    }
    console.error('Error updating account:', error);
    res.status(500).json({ message: 'Failed to update account' });
  }
};

// Delete account
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
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

    // Never allow a hard delete to silently drop real money, even if (unusually) there are
    // no transactions recorded for this account yet.
    if (Number(account.balance) !== 0 || Number(account.shareBalance || 0) !== 0) {
      res.status(400).json({
        message: 'Cannot delete account with a nonzero balance. Withdraw or transfer out the funds first.'
      });
      return;
    }

    // Delete the account
    await prisma.account.delete({ where: { id } });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
};

// Valid account status transitions. CLOSED is terminal - an account can't be reopened
// through this endpoint once closed.
const VALID_ACCOUNT_STATUS_TRANSITIONS: Record<string, string[]> = {
  DORMANT: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['DORMANT', 'FROZEN', 'CLOSED'],
  FROZEN: ['ACTIVE', 'CLOSED'],
  CLOSED: []
};

// Update account status
export const updateAccountStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
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

    const currentStatus = existingAccount.status;
    if (status !== currentStatus) {
      const allowedNextStatuses = VALID_ACCOUNT_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedNextStatuses.includes(status)) {
        res.status(400).json({ message: `Cannot change account status from ${currentStatus} to ${status}` });
        return;
      }
    }

    if (status === 'CLOSED') {
      const balance = Number(existingAccount.balance);
      const shareBalance = Number(existingAccount.shareBalance || 0);
      if (balance !== 0 || shareBalance !== 0) {
        res.status(400).json({
          message: `Cannot close account with a nonzero balance (balance: ${balance}, shareBalance: ${shareBalance}). Withdraw or transfer out the funds first.`
        });
        return;
      }
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
  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({ message: 'Failed to update account status' });
  }
};

// Bulk activate accounts
export const bulkActivateAccounts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await prisma.account.updateMany({
      where: {
        status: {
          not: 'ACTIVE',
        },
      },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Bulk activation completed',
      activatedCount: result.count,
    });
  } catch (error) {
    console.error('Error bulk activating accounts:', error);
    res.status(500).json({ message: 'Failed to bulk activate accounts' });
  }
};
