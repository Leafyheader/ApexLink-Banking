import { Request, Response } from 'express';
import { PrismaClient, Prisma, TransactionType } from '@prisma/client';
import { AuthRequest } from '../types/auth';
import { BankIncomeService } from '../services/bankIncome.service';
import { makeRepayment, LoanState, allocateGuarantorReimbursement } from '../services/loanRepayment.service';
import { ledgerService } from '../services/ledger.service';
import { GuaranteeService } from '../services/guarantee.service';
import { getWithdrawalFee } from '../utils/systemSettings';
import {
  parseRangeStart,
  parseRangeEnd,
  cashOnlyWhere,
  cashReversalWhere,
  cashLoanRepaymentWhere,
  loanDisbursementWhere,
  feesOnlyWhere,
  toPesewas,
  isValidAmount,
  isReservedReference
} from '../utils/cashReporting';

const prisma = new PrismaClient();

// DB enums use underscores (WITHDRAWAL_SHARES); the frontend uses hyphens (withdrawal-shares)
const formatTransactionType = (type: string): string => type.toLowerCase().replace(/_/g, '-');

// Get all transactions with filters
export const getTransactions = async (req: AuthRequest, res: Response) => {  try {
    const { page = 1, limit = 10, search, status, type, accountId, customerId, dateFrom, dateTo } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;    // Build where clause for filtering
    const where: any = {};
    const accountWhere: any = {};    // Build search conditions
    if (search) {
      where.OR = [
        {
          account: {
            accountNumber: {
              contains: search as string
            }
          }
        },
        {
          account: {
            customer: {
              name: {
                contains: search as string
              }
            }
          }
        },
        {
          description: {
            contains: search as string
          }
        },
        {
          reference: {
            contains: search as string
          }
        }
      ];
    }

    // Build other filter conditions
    if (status && status !== '') {
      where.status = status.toString().toUpperCase();
    }

    if (type && type !== '') {
      where.type = type.toString().toUpperCase().replace(/-/g, '_');
    }

    if (accountId) {
      where.accountId = accountId as string;
    }

    if (customerId) {
      accountWhere.customerId = customerId as string;
    }

    // Add account conditions if any exist and no search OR clause
    if (Object.keys(accountWhere).length > 0 && !where.OR) {
      where.account = accountWhere;
    } else if (Object.keys(accountWhere).length > 0 && where.OR) {
      // If we have both search OR clause and account filters, combine them with AND
      const searchCondition = where.OR;
      delete where.OR;
      where.AND = [
        { OR: searchCondition },
        { account: accountWhere }
      ];
    }

    const rangeStart = parseRangeStart(dateFrom);
    const rangeEnd = parseRangeEnd(dateTo);
    if (rangeStart || rangeEnd) {
      where.date = {};
      if (rangeStart) where.date.gte = rangeStart;
      if (rangeEnd) where.date.lte = rangeEnd;
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  surname: true
                }
              }
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip: offset,
        take: limitNumber
      }),
      prisma.transaction.count({ where })
    ]);

    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      accountId: transaction.accountId,
      accountNumber: transaction.account.accountNumber,
      customerName: transaction.account.customer.name
        || `${transaction.account.customer.firstName || ''} ${transaction.account.customer.surname || ''}`.trim()
        || 'Unknown Customer',
      customerId: transaction.account.customer.id,
      amount: Number(transaction.amount),
      type: formatTransactionType(transaction.type),
      status: transaction.status.toLowerCase(),
      date: transaction.date.toISOString(),
      description: transaction.description || `${transaction.type} transaction`,
      reference: transaction.reference,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    }));    res.json({
      transactions: formattedTransactions,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNumber),
        pages: Math.ceil(totalCount / limitNumber)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Get a single transaction by ID
export const getTransactionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                firstName: true,
                surname: true,
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Format transaction for frontend
    const formattedTransaction = {
      id: transaction.id,
      accountId: transaction.accountId,
      accountNumber: transaction.account.accountNumber,
      customer: transaction.account.customer,
      amount: Number(transaction.amount),
      type: formatTransactionType(transaction.type),
      status: transaction.status.toLowerCase(),
      date: transaction.date.toISOString(),
      description: transaction.description || `${transaction.type} transaction`,
      reference: transaction.reference,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };

    res.json(formattedTransaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

// Create a new transaction using the ledger system
export const createTransactionWithLedger = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, type, amount, description, reference } = req.body;
    const actorId = (req.user as any)?.id || 'SYSTEM';

    // Validate required fields
    if (!accountId || !type || !amount) {
      return res.status(400).json({ 
        error: 'Account ID, type, and amount are required' 
      });
    }

    // Validate account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { customer: true }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Validate account is active
    if (account.status.toUpperCase() !== 'ACTIVE') {
      return res.status(400).json({ error: 'Account is not active' });
    }

    // Convert type and validate
    const transactionType = type.toUpperCase().replace('-', '_');
    const transactionAmount = Number(amount);

    if (!isValidAmount(transactionAmount)) {
      return res.status(400).json({ error: 'Amount must be a positive value with at most 2 decimal places' });
    }

    // Withdrawals must go through the withdrawal-authorization (manager approval) flow.
    if (!['DEPOSIT', 'DEPOSIT_SHARES'].includes(transactionType)) {
      return res.status(400).json({
        error: 'Only deposits can be posted directly. Withdrawals and transfers must be submitted for authorization.'
      });
    }

    // Loan balances are driven by the repayment engine and the treasury by expenses/funding -
    // a plain deposit into either would desync them from their own records.
    if (account.type === 'LOAN' || account.type === 'TREASURY') {
      return res.status(400).json({ error: `Deposits cannot be posted to a ${account.type.toLowerCase()} account` });
    }

    if (isReservedReference(reference)) {
      return res.status(400).json({ error: 'This reference prefix is reserved for system transactions' });
    }

    // Generate unique reference
    const txReference = reference || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    let transaction;

    // Process different transaction types
    switch (transactionType) {
      case 'DEPOSIT':
        transaction = await prisma.$transaction(async (tx) => {
          const createdTransaction = await tx.transaction.create({
            data: {
              accountId,
              type: 'DEPOSIT',
              amount: transactionAmount,
              description: description || 'Deposit transaction',
              reference: txReference,
              status: 'COMPLETED'
            },
            include: {
              account: {
                include: {
                  customer: {
                    select: { id: true, name: true, firstName: true, surname: true }
                  }
                }
              }
            }
          });

          await tx.ledgerEntry.create({
            data: {
              accountId,
              type: 'CREDIT',
              amount: transactionAmount,
              currency: 'GHS',
              reference: txReference,
              description: description || 'Deposit transaction',
              transactionId: createdTransaction.id,
              createdBy: actorId
            }
          });

          await tx.account.update({
            where: { id: accountId },
            data: {
              balance: {
                increment: transactionAmount
              },
              lastTransactionDate: new Date()
            }
          });

          return createdTransaction;
        });
        break;

      case 'DEPOSIT_SHARES':
        if (typeof account.shareBalance === 'undefined') {
          return res.status(400).json({
            error: 'Account does not support share deposits'
          });
        }

        transaction = await prisma.$transaction(async (tx) => {
          const createdTransaction = await tx.transaction.create({
            data: {
              accountId,
              type: 'DEPOSIT_SHARES',
              amount: transactionAmount,
              description: description || 'Share deposit transaction',
              reference: txReference,
              status: 'COMPLETED'
            },
            include: {
              account: {
                include: {
                  customer: {
                    select: { id: true, name: true, firstName: true, surname: true }
                  }
                }
              }
            }
          });

          await tx.ledgerEntry.create({
            data: {
              accountId,
              type: 'CREDIT',
              amount: transactionAmount,
              currency: 'GHS',
              reference: txReference,
              description: description || 'Share deposit transaction',
              transactionId: createdTransaction.id,
              metadata: { shareDeposit: true },
              createdBy: actorId
            }
          });

          await tx.account.update({
            where: { id: accountId },
            data: {
              shareBalance: {
                increment: transactionAmount
              },
              lastTransactionDate: new Date()
            }
          });

          return createdTransaction;
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid transaction type for ledger processing' });
    }

    // Format response using the account data we already have
    const formattedTransaction = {
      id: transaction.id,
      accountId: transaction.accountId,
      accountNumber: account.accountNumber,
      customerName: account.customer.name,
      customerId: account.customer.id,
      amount: Number(transaction.amount),
      type: formatTransactionType(transaction.type),
      status: transaction.status.toLowerCase(),
      date: transaction.date.toISOString(),
      description: transaction.description,
      reference: transaction.reference,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: formattedTransaction
    });

  } catch (error) {
    console.error('Error creating transaction with ledger:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

// Post a loan repayment. Deposits go through POST /transactions/ledger and withdrawals/transfers
// through the withdrawal-authorization flow; this endpoint only handles loan repayments.
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, type, amount, description, reference } = req.body;

    // Validate required fields
    if (!accountId || !type || !amount) {
      return res.status(400).json({
        error: 'Account ID, type, and amount are required'
      });
    }

    const transactionType = type.toUpperCase().replace('-', '_');
    if (transactionType !== 'LOAN_REPAYMENT') {
      return res.status(400).json({
        error: 'Invalid transaction type. Deposits use /transactions/ledger; withdrawals and transfers must be submitted for authorization.'
      });
    }

    const transactionAmount = Number(amount);
    if (!isValidAmount(transactionAmount)) {
      return res.status(400).json({ error: 'Amount must be a positive value with at most 2 decimal places' });
    }

    if (isReservedReference(reference)) {
      return res.status(400).json({ error: 'This reference prefix is reserved for system transactions' });
    }

    // Validate account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { customer: true }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.status.toUpperCase() !== 'ACTIVE') {
      return res.status(400).json({ error: 'Account is not active' });
    }

    if (account.type !== 'LOAN') {
      return res.status(400).json({ error: 'Loan repayments can only be made to loan accounts' });
    }

    const transactionReference = reference || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return await handleLoanRepaymentWithDisbursement(
      accountId,
      transactionAmount,
      description,
      transactionReference,
      res
    );
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Transaction reference must be unique' });
    } else {
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }
};

// Edit a transaction's details. Only pending/failed transactions can be edited since
// completed transactions have already moved money - editing those would silently
// desync the transaction record from the balance/ledger effect that already happened.
export const updateTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { accountId, type, amount, description, reference } = req.body;

    const existingTransaction = await prisma.transaction.findUnique({ where: { id } });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (existingTransaction.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Completed transactions cannot be edited because the balance/ledger effect has already been applied.'
      });
    }

    const updateData: any = {};

    if (accountId !== undefined) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      updateData.accountId = accountId;
    }

    if (type !== undefined) {
      updateData.type = type.toString().toUpperCase().replace(/-/g, '_');
    }

    if (amount !== undefined) {
      const amountNumber = Number(amount);
      if (!isValidAmount(amountNumber)) {
        return res.status(400).json({ error: 'Amount must be a positive value with at most 2 decimal places' });
      }
      updateData.amount = amountNumber;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (reference !== undefined) {
      if (isReservedReference(reference)) {
        return res.status(400).json({ error: 'This reference prefix is reserved for system transactions' });
      }
      updateData.reference = reference;
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        account: {
          include: {
            customer: {
              select: { id: true, name: true, firstName: true, surname: true }
            }
          }
        }
      }
    });

    res.json({
      id: updatedTransaction.id,
      accountId: updatedTransaction.accountId,
      accountNumber: updatedTransaction.account.accountNumber,
      customerName: updatedTransaction.account.customer.name,
      customerId: updatedTransaction.account.customer.id,
      amount: Number(updatedTransaction.amount),
      type: formatTransactionType(updatedTransaction.type),
      status: updatedTransaction.status.toLowerCase(),
      date: updatedTransaction.date.toISOString(),
      description: updatedTransaction.description,
      reference: updatedTransaction.reference,
      createdAt: updatedTransaction.createdAt.toISOString(),
      updatedAt: updatedTransaction.updatedAt.toISOString()
    });
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Transaction reference must be unique' });
    } else {
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  }
};

// Update transaction status (for pending transactions)
export const updateTransactionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // A pending transaction can only be failed here. Completing one by flipping its status
    // would move money without the checks its real flow applies (withdrawal approval, fees,
    // guarantee holds, the loan repayment engine) - money must move through those flows.
    if (status.toUpperCase() !== 'FAILED') {
      return res.status(400).json({
        error: 'Pending transactions can only be marked as failed. Re-post the transaction through its normal flow to complete it.'
      });
    }

    // Find transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Only allow status updates for pending transactions
    if (existingTransaction.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Can only update status of pending transactions' 
      });
    }

    const claim = await prisma.transaction.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'FAILED' }
    });

    if (claim.count === 0) {
      return res.status(409).json({ error: 'Transaction status has already changed' });
    }

    const updatedTransaction = await prisma.transaction.findUniqueOrThrow({
      where: { id },
      include: {
        account: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                firstName: true,
                surname: true
              }
            }
          }
        }
      }
    });

    // Format transaction for response
    const formattedTransaction = {
      id: updatedTransaction.id,
      accountId: updatedTransaction.accountId,
      accountNumber: updatedTransaction.account.accountNumber,
      customerName: updatedTransaction.account.customer.name,
      customerId: updatedTransaction.account.customer.id,
      amount: Number(updatedTransaction.amount),
      type: formatTransactionType(updatedTransaction.type),
      status: updatedTransaction.status.toLowerCase(),
      date: updatedTransaction.date.toISOString(),
      description: updatedTransaction.description,
      reference: updatedTransaction.reference,
      createdAt: updatedTransaction.createdAt.toISOString(),
      updatedAt: updatedTransaction.updatedAt.toISOString()
    };

    res.json(formattedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

// Get transaction statistics
export const getTransactionStats = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Build date filter
    const dateFilter: any = {};
    const rangeStart = parseRangeStart(dateFrom);
    const rangeEnd = parseRangeEnd(dateTo);
    if (rangeStart || rangeEnd) {
      if (rangeStart) dateFilter.gte = rangeStart;
      if (rangeEnd) dateFilter.lte = rangeEnd;
    } else {
      // Default to current month if no date range provided
      const now = new Date();
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Deposit/withdrawal figures are CASH at the counter only - fees, transfer legs, opening
    // balances, admin corrections, treasury and loan/guarantor bookkeeping are excluded (see
    // utils/cashReporting.ts) so the totals can be reconciled against the physical drawer.
    const sumWhere = (where: Prisma.TransactionWhereInput) => prisma.transaction.aggregate({
      where: { status: 'COMPLETED', date: dateFilter, ...where },
      _sum: { amount: true },
      _count: true
    });
    const cash = (type: TransactionType) => sumWhere({ type, AND: [cashOnlyWhere] });

    const [
      totalTransactions,
      totalDeposits,
      totalSharesDeposits,
      totalWithdrawals,
      totalSharesWithdrawals,
      totalTransfers,
      loanRepayments,
      loanDisbursements,
      reversals,
      fees,
      completedTransactions,
      pendingTransactions,
      failedTransactions
    ] = await Promise.all([
      prisma.transaction.count({ where: { date: dateFilter } }),
      cash('DEPOSIT'),
      cash('DEPOSIT_SHARES'),
      cash('WITHDRAWAL'),
      cash('WITHDRAWAL_SHARES'),
      sumWhere({ type: 'TRANSFER' }),
      sumWhere(cashLoanRepaymentWhere),
      sumWhere(loanDisbursementWhere),
      sumWhere({ type: { in: ['DEPOSIT', 'DEPOSIT_SHARES'] }, AND: [cashReversalWhere] }),
      sumWhere({ AND: [feesOnlyWhere] }),
      prisma.transaction.count({ where: { status: 'COMPLETED', date: dateFilter } }),
      prisma.transaction.count({ where: { status: 'PENDING', date: dateFilter } }),
      prisma.transaction.count({ where: { status: 'FAILED', date: dateFilter } })
    ]);

    const bucket = (agg: { _count: number; _sum: { amount: Prisma.Decimal | null } }) => ({
      count: agg._count,
      amount: Number(agg._sum.amount || 0)
    });

    const deposits = bucket(totalDeposits);
    const sharesDeposits = bucket(totalSharesDeposits);
    const withdrawals = bucket(totalWithdrawals);
    const sharesWithdrawals = bucket(totalSharesWithdrawals);
    const repayments = bucket(loanRepayments);
    const disbursements = bucket(loanDisbursements);
    const returned = bucket(reversals);

    const cashIn = toPesewas(deposits.amount + sharesDeposits.amount + repayments.amount + returned.amount);
    const cashOut = toPesewas(withdrawals.amount + sharesWithdrawals.amount + disbursements.amount);

    const stats = {
      totalTransactions,
      transactionsByType: {
        deposits,
        sharesDeposits,
        withdrawals,
        sharesWithdrawals,
        transfers: bucket(totalTransfers),
        loanRepayments: repayments,
        loanDisbursements: disbursements,
        reversals: returned,
        fees: bucket(fees)
      },
      // Expected movement of the physical cash drawer for the period.
      cashSummary: {
        cashIn,
        cashOut,
        net: toPesewas(cashIn - cashOut)
      },
      transactionsByStatus: {
        completed: completedTransactions,
        pending: pendingTransactions,
        failed: failedTransactions
      },
      periodStart: dateFilter.gte?.toISOString(),
      periodEnd: dateFilter.lte?.toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ error: 'Failed to fetch transaction statistics' });
  }
};

// Handle loan repayment with proper business logic.
// Everything - reading the loan's current state, running the repayment waterfall and writing the
// result - happens inside ONE database transaction, and the loan update is a compare-and-swap on
// totalPaid. Otherwise two repayments posted at the same time (double-click, two tellers) would
// both compute from the same stale state: both cash receipts get recorded but the loan only
// reflects one of them.
class RepaymentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function handleLoanRepaymentWithDisbursement(
  accountId: string,
  repaymentAmount: number,
  description: string,
  transactionReference: string,
  res: Response
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { accountId },
        include: {
          account: { select: { accountNumber: true } },
          guarantors: {
            where: { status: 'ACTIVE' },
            include: { guarantorAccount: { include: { customer: true } } },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!loan) {
        throw new RepaymentError(404, 'Loan not found for this account');
      }
      if (loan.authorizationStatus !== 'APPROVED') {
        throw new RepaymentError(400, 'Loan has not been approved and disbursed yet');
      }
      if (loan.isCompleted) {
        throw new RepaymentError(400, 'Loan is already fully paid');
      }

      // totalPayable must come from the loan's own record (computed at creation from its actual
      // interestRate) - recomputing it from a fixed rate would misallocate every payment.
      const loanAmount = Number(loan.amount);
      const totalPayable = Number(loan.totalPayable);
      const remainingOwed = toPesewas(totalPayable - Number(loan.totalPaid || 0));

      // Reject overpayment outright. The repayment engine would otherwise silently cap the
      // payment, recording less than the cash the teller actually took in.
      if (repaymentAmount > remainingOwed) {
        throw new RepaymentError(400, `Repayment amount (₵${repaymentAmount.toFixed(2)}) exceeds the amount still owed on this loan (₵${remainingOwed.toFixed(2)})`);
      }

      const currentLoanState: Partial<LoanState> = {
        loanAmount,
        totalRepayable: totalPayable,
        guarantorAdvance: Number(loan.guaranteeRequired || 0),
        totalPaid: Number(loan.totalPaid || 0),
        totalInterestPaid: Number(loan.totalInterestPaid || 0),
        guarantorReimbursed: Number(loan.guarantorReimbursed || 0),
        principalRemaining: Number(loan.principalRemaining ?? loanAmount),
        isCompleted: Boolean(loan.isCompleted)
      };

      const repaymentResult = makeRepayment(repaymentAmount, currentLoanState);
      if (!repaymentResult.success) {
        throw new RepaymentError(400, repaymentResult.error || 'Repayment failed');
      }

      const payment = repaymentResult.payment!;
      const breakdown = payment.breakdown;
      const updatedLoanState = repaymentResult.loanState!;
      const isLoanCompleted = repaymentResult.isCompleted;

      // 1. Claim the loan state we computed from. If another repayment committed in between,
      // totalPaid no longer matches and this one aborts instead of overwriting it.
      const claim = await tx.loan.updateMany({
        where: { id: loan.id, totalPaid: loan.totalPaid, isCompleted: false },
        data: {
          totalPaid: updatedLoanState.totalPaid,
          totalInterestPaid: updatedLoanState.totalInterestPaid,
          guarantorReimbursed: updatedLoanState.guarantorReimbursed,
          principalRemaining: updatedLoanState.principalRemaining,
          isCompleted: updatedLoanState.isCompleted,
          lastPaymentDate: new Date(),
          lastPaymentAmount: payment.amount,
          // Legacy fields kept in sync for compatibility
          amountPaid: updatedLoanState.totalPaid,
          outstandingBalance: isLoanCompleted ? 0 : repaymentResult.remainingBalance!,
          status: isLoanCompleted ? 'PAID' : 'ACTIVE'
        }
      });

      if (claim.count === 0) {
        throw new RepaymentError(409, 'Another repayment was just posted to this loan. Refresh and check the balance before trying again.');
      }

      // 2. The main loan repayment transaction (the cash received)
      const loanRepaymentTransaction = await tx.transaction.create({
        data: {
          accountId,
          type: 'LOAN_REPAYMENT',
          amount: payment.amount,
          description: description || `Loan repayment - GH₵${payment.amount} (Interest: GH₵${breakdown.interestPaid.toFixed(2)}, Guarantor: GH₵${breakdown.guarantorReimbursement.toFixed(2)}, Loan: GH₵${breakdown.loanReduction.toFixed(2)})`,
          reference: transactionReference,
          status: 'COMPLETED'
        },
        include: {
          account: {
            include: {
              customer: { select: { id: true, name: true, firstName: true, surname: true } }
            }
          }
        }
      });

      // 3. Reimburse guarantors in proportion to what each guaranteed, in whole pesewas. The
      // split is based on each guarantor's cumulative entitlement vs. what they've actually been
      // paid (amountReimbursed), so the shares always add up to exactly this reimbursement and
      // each guarantor ends up with exactly their guaranteed amount when the loan completes.
      const disbursementTransactions: Array<{
        guarantorName: string;
        accountNumber: string;
        amount: number;
        percentage: number;
        reference: string | null;
      }> = [];
      const guarantorReimbursement = breakdown.guarantorReimbursement;

      if (guarantorReimbursement > 0 && loan.guarantors.length > 0) {
        const shares = allocateGuarantorReimbursement(
          loan.guarantors.map(g => ({
            guaranteedAmount: Number(g.guaranteedAmount),
            reimbursedSoFar: Number(g.amountReimbursed || 0)
          })),
          updatedLoanState.guarantorReimbursed,
          guarantorReimbursement
        );

        for (let i = 0; i < loan.guarantors.length; i++) {
          const guarantor = loan.guarantors[i];
          const guaranteedAmount = Number(guarantor.guaranteedAmount);
          const guarantorShare = shares[i];
          const percentage = loanAmount > 0 ? (guaranteedAmount / loanAmount) * 100 : 0;

          if (guarantorShare > 0) {
            await tx.loanGuarantor.update({
              where: { id: guarantor.id },
              data: { amountReimbursed: { increment: guarantorShare } }
            });

            await tx.account.update({
              where: { id: guarantor.guarantorAccountId },
              data: {
                balance: { increment: guarantorShare },
                lastTransactionDate: new Date()
              }
            });

            const disbursementTransaction = await tx.transaction.create({
              data: {
                accountId: guarantor.guarantorAccountId,
                type: 'DEPOSIT',
                amount: guarantorShare,
                description: `Guarantor reimbursement from loan repayment - ${loan.account.accountNumber} (${percentage.toFixed(2)}% share)`,
                reference: `GRB-${transactionReference}-${guarantor.guarantorAccountId.slice(-6)}`,
                status: 'COMPLETED'
              }
            });

            disbursementTransactions.push({
              guarantorName: guarantor.guarantorAccount?.customer?.name || 'Unknown',
              accountNumber: guarantor.guarantorAccount?.accountNumber || 'Unknown',
              amount: Number(disbursementTransaction.amount),
              percentage,
              reference: disbursementTransaction.reference
            });
          }
        }
      }

      // 4. Move the loan account toward zero by the principal retired. Both the guarantor
      // reimbursement (phase 1) and the loan-reduction portion (phase 2) are principal - see
      // principalPortion in loanRepayment.service.ts. Incremented atomically, never hard-set.
      const principalPortion = toPesewas(breakdown.loanReduction + breakdown.guarantorReimbursement);
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: principalPortion },
          lastTransactionDate: new Date()
        }
      });

      // 5. Loan fully repaid: guarantors have been paid back in full by the waterfall, and the
      // borrower's own 50% backing hold is no longer needed.
      if (isLoanCompleted) {
        await tx.accountRestriction.updateMany({
          where: { loanId: loan.id, restrictionType: 'LOAN_OWN_BACKING', isActive: true },
          data: { isActive: false, releasedAt: new Date() }
        });
        await tx.loanGuarantor.updateMany({
          where: { loanId: loan.id, status: 'ACTIVE' },
          data: { status: 'FUNDS_RETURNED' }
        });
      }

      // 6. Record interest as bank income
      if (breakdown.interestPaid > 0) {
        await tx.bankIncome.create({
          data: {
            type: 'LOAN_INTEREST',
            amount: breakdown.interestPaid,
            description: `Interest income from loan repayment - ${loan.account.accountNumber}`,
            sourceId: transactionReference,
            sourceType: 'LOAN_REPAYMENT',
            accountId,
            customerId: loan.customerId
          }
        });
      }

      return {
        loanRepaymentTransaction,
        disbursementTransactions,
        newLoanBalance: Number(updatedAccount.balance),
        breakdown,
        loanState: updatedLoanState,
        remainingBalance: repaymentResult.remainingBalance!,
        isCompleted: isLoanCompleted,
        activeGuarantorsCount: loan.guarantors.length,
        paymentAmount: payment.amount
      };
    }, {
      timeout: 10000
    });

    const txn = result.loanRepaymentTransaction;
    // Note: guarantors are already reimbursed incrementally on every repayment (step 3), capped
    // at their guaranteedAmount by the repayment logic. Do NOT also run guarantorReimbursementService's
    // lump-sum "loan completion" reimbursement - it would pay each guarantor a second time.
    return res.status(201).json({
      id: txn.id,
      accountId: txn.accountId,
      accountNumber: txn.account.accountNumber,
      customerName: txn.account.customer.name,
      customerId: txn.account.customer.id,
      amount: Number(txn.amount),
      type: formatTransactionType(txn.type),
      status: txn.status.toLowerCase(),
      date: txn.date.toISOString(),
      description: txn.description,
      reference: txn.reference,
      createdAt: txn.createdAt.toISOString(),
      updatedAt: txn.updatedAt.toISOString(),
      accountBalance: result.newLoanBalance,
      repaymentDetails: {
        totalRepayment: result.paymentAmount,
        breakdown: {
          interestPaid: result.breakdown.interestPaid,
          guarantorReimbursement: result.breakdown.guarantorReimbursement,
          loanReduction: result.breakdown.loanReduction
        },
        loanState: {
          totalPaid: result.loanState.totalPaid,
          totalInterestPaid: result.loanState.totalInterestPaid,
          guarantorReimbursed: result.loanState.guarantorReimbursed,
          principalRemaining: result.loanState.principalRemaining,
          isCompleted: result.loanState.isCompleted
        },
        remainingBalance: result.remainingBalance,
        isCompleted: result.isCompleted,
        guarantorsCount: result.activeGuarantorsCount,
        disbursements: result.disbursementTransactions
      }
    });
  } catch (error: any) {
    if (error instanceof RepaymentError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Transaction reference must be unique' });
    }
    console.error('Error processing loan repayment:', error);
    return res.status(500).json({ error: 'Failed to process loan repayment' });
  }
}

// Get account notifications including loan and guarantee information
export const getAccountNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const guaranteeService = new GuaranteeService(prisma);
    const notifications = await guaranteeService.getAccountNotifications(accountId);
    const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(accountId);

    res.json({
      accountId,
      notifications: notifications.notifications,
      hasActiveLoans: notifications.hasActiveLoans,
      hasGuaranteeObligations: notifications.hasGuaranteeObligations,
      withdrawalInfo: {
        availableAmount: withdrawalInfo.availableAmount,
        accountBalance: withdrawalInfo.accountBalance,
        totalRestricted: withdrawalInfo.restrictedByGuarantees + withdrawalInfo.restrictedByOwnLoans,
        restrictionBreakdown: {
          ownLoans: withdrawalInfo.restrictedByOwnLoans,
          guarantees: withdrawalInfo.restrictedByGuarantees
        },
        restrictions: withdrawalInfo.restrictions
      }
    });
  } catch (error) {
    console.error('Error getting account notifications:', error);
    res.status(500).json({ error: 'Failed to get account notifications' });
  }
};

// Get customer guarantee information across all accounts
export const getCustomerGuaranteeInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const guaranteeService = new GuaranteeService(prisma);
    const guaranteeInfo = await guaranteeService.getCustomerGuaranteeInfo(customerId);

    res.json({
      customerId,
      accountsWithRestrictions: guaranteeInfo.length,
      accounts: guaranteeInfo
    });
  } catch (error) {
    console.error('Error getting customer guarantee info:', error);
    res.status(500).json({ error: 'Failed to get customer guarantee information' });
  }
};

// Get withdrawal availability check
export const checkWithdrawalAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const { amount } = req.query;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const guaranteeService = new GuaranteeService(prisma);
    const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(accountId);
    
    const requestedAmount = amount ? parseFloat(amount as string) : 0;
    const canWithdraw = requestedAmount <= withdrawalInfo.availableAmount;

    res.json({
      accountId,
      requestedAmount,
      canWithdraw,
      availableAmount: withdrawalInfo.availableAmount,
      accountBalance: withdrawalInfo.accountBalance,
      restrictions: withdrawalInfo.restrictions,
      message: canWithdraw 
        ? 'Withdrawal approved' 
        : `Insufficient funds. You can withdraw up to ₵${withdrawalInfo.availableAmount.toLocaleString()}`
    });
  } catch (error) {
    console.error('Error checking withdrawal availability:', error);
    res.status(500).json({ error: 'Failed to check withdrawal availability' });
  }
};

// Get enhanced account balance information including original balance before guarantor deductions
export const getEnhancedAccountBalance = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Get account details
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { 
        id: true,
        accountNumber: true,
        balance: true,
        customerId: true,
        type: true
      }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = Number(account.balance);

    // Calculate total guarantor deductions made from this account
    const guarantorDeductions = await prisma.transaction.findMany({
      where: {
        accountId,
        type: 'WITHDRAWAL',
        description: {
          contains: 'Loan guarantee deduction'
        }
      },
      select: { amount: true }
    });

    const totalDeducted = guarantorDeductions.reduce((sum, txn) => sum + Number(txn.amount), 0);

    // Calculate total guarantor reimbursements received by this account
    const guarantorReimbursements = await prisma.transaction.findMany({
      where: {
        accountId,
        description: {
          contains: 'Guarantor fund reimbursement - loan completion'
        }
      },
      select: { amount: true }
    });

    const totalReimbursed = guarantorReimbursements.reduce((sum, txn) => sum + Number(txn.amount), 0);

    // Calculate original balance (before any guarantor deductions)
    const netGuarantorImpact = totalDeducted - totalReimbursed;
    const originalBalance = currentBalance + netGuarantorImpact;

    // Get current guarantee obligations
    const guaranteeService = new GuaranteeService(prisma);
    const guaranteeInfo = await guaranteeService.getAccountGuaranteeInfo(accountId);
    const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(accountId);

    res.json({
      accountId,
      accountNumber: account.accountNumber,
      balanceInformation: {
        originalBalance, // Balance before any guarantor deductions
        currentBalance,  // Current balance after deductions and reimbursements
        availableBalance: withdrawalInfo.availableAmount, // Available for withdrawal
        guarantorActivity: {
          totalDeducted,     // Total amount deducted for guarantees
          totalReimbursed,   // Total amount reimbursed from completed loans
          netImpact: netGuarantorImpact // Net impact on balance
        }
      },
      currentGuarantees: {
        activeGuarantees: guaranteeInfo.totalLoansGuaranteed,
        guaranteeDetails: guaranteeInfo.activeGuarantees.map(g => ({
          loanId: g.loanId,
          borrowerName: g.borrowerName,
          borrowerAccount: g.borrowerAccountNumber,
          guaranteedAmount: g.guaranteeAmount,
          loanAmount: g.loanAmount,
          percentage: g.guaranteePercentage,
          status: g.loanStatus
        }))
      },
      withdrawalInfo: {
        availableAmount: withdrawalInfo.availableAmount,
        restrictions: withdrawalInfo.restrictions,
        restrictionBreakdown: {
          ownLoans: withdrawalInfo.restrictedByOwnLoans,
          guarantees: withdrawalInfo.restrictedByGuarantees
        }
      }
    });
  } catch (error) {
    console.error('Error getting enhanced account balance:', error);
    res.status(500).json({ error: 'Failed to get enhanced account balance' });
  }
};
