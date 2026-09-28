import { Response } from 'express';
import { PrismaClient, WithdrawalType, TransactionType, WithdrawalAuthorizationStatus } from '@prisma/client';
import { AuthRequest } from '../types/auth';
import { JwtPayload } from 'jsonwebtoken';
import { GuaranteeService } from '../services/guarantee.service';
import { getWithdrawalFee } from '../utils/systemSettings';
import { isValidAmount, isReservedReference } from '../utils/cashReporting';

const prisma = new PrismaClient();
const guaranteeService = new GuaranteeService(prisma);

interface AuthenticatedUser extends JwtPayload {
  id: string;
  username: string;
  name: string;
  role: string;
}

// Maps the DB enum (WITHDRAWAL_SHARES) to the frontend's hyphenated convention (withdrawal-shares)
const formatWithdrawalType = (type: WithdrawalType): string =>
  type === WithdrawalType.WITHDRAWAL_SHARES ? 'withdrawal-shares' : type.toLowerCase();

export const getWithdrawalAuthorizations = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      type 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};    if (search) {
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
        }
      ];
    }

    if (status && status !== 'all') {
      where.status = status.toString().toUpperCase();
    }

    if (type && type !== 'all') {
      where.type = type.toString().toUpperCase().replace(/-/g, '_');
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
        },        approvedBy: {
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
    });    // Transform data for frontend. For regular (non-shares) withdrawals, "available" must be
    // the balance actually available for withdrawal - i.e. minus any active loan-guarantee holds
    // on the account - not the raw balance, since that's exactly what approveWithdrawalAuthorization
    // itself checks. Showing raw balance here would tell an approver a request looks safe to
    // approve when a guarantee restriction could still cause the actual approval call to fail.
    const transactions = await Promise.all(withdrawalAuthorizations.map(async (auth) => {
      const availableBalance = auth.type === WithdrawalType.WITHDRAWAL_SHARES
        ? Number(auth.account.shareBalance || 0)
        : (await guaranteeService.calculateAvailableForWithdrawal(auth.accountId)).availableAmount;

      return {
        id: auth.id,
        accountNumber: auth.account.accountNumber,
        customerName: auth.account.customer.name,
        customerId: auth.account.customer.id,
        amount: Number(auth.amount),
        type: formatWithdrawalType(auth.type),
        description: auth.description || '',
        reference: auth.reference || '',
        toAccountNumber: auth.toAccountNumber || '',
        toCustomerName: auth.toCustomerName || '',
        requestedAt: auth.requestedAt.toISOString(),
        requestedBy: auth.requestedBy.name,
        approvedBy: auth.approvedBy?.name || '',
        status: auth.status.toLowerCase(),
        availableBalance,
        rejectedReason: auth.rejectedReason,
        isReversed: auth.isReversed || false,
        reversedBy: auth.reversedBy?.name || '',
        reversedAt: auth.reversedAt?.toISOString() || '',
        reversalReason: auth.reversalReason || ''
      };
    }));

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
      approved: summary.find(s => s.status === 'APPROVED')?._count.id || 0,
      pending: summary.find(s => s.status === 'PENDING')?._count.id || 0,
      rejected: summary.find(s => s.status === 'REJECTED')?._count.id || 0
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
  } catch (error) {
    console.error('Error fetching withdrawal authorizations:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal authorizations' });
  }
};

export const approveWithdrawalAuthorization = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

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
        account: true,
        toAccount: true
      }
    });

    if (!withdrawalAuth) {
      return res.status(404).json({ error: 'Withdrawal authorization not found' });
    }

    if (withdrawalAuth.status !== 'PENDING') {
      return res.status(400).json({ error: 'Withdrawal authorization is not pending' });
    }

    // Guards requests created before amount validation existed - a non-positive amount
    // would credit the account instead of debiting it.
    if (!isValidAmount(Number(withdrawalAuth.amount))) {
      return res.status(400).json({ error: 'Withdrawal amount is invalid (must be positive). Reject this request.' });
    }

    const isSharesWithdrawal = withdrawalAuth.type === WithdrawalType.WITHDRAWAL_SHARES;
    const isTransfer = withdrawalAuth.type === WithdrawalType.TRANSFER;
    // Use the currently configured fee, not a hardcoded 5.00 - this must match what the actual
    // debit and the "withdrawal charge" ledger entry below use, or an admin changing the fee in
    // Settings would make the account get debited one amount while the books record another.
    const chargeAmount = (withdrawalAuth.type === WithdrawalType.WITHDRAWAL || isSharesWithdrawal)
      ? await getWithdrawalFee(prisma)
      : 0;
    const totalRequired = Number(withdrawalAuth.amount) + chargeAmount;

    if (isTransfer) {
      if (!withdrawalAuth.toAccountId || !withdrawalAuth.toAccount) {
        return res.status(400).json({ error: 'Transfer is missing a destination account and cannot be approved' });
      }
      if (withdrawalAuth.toAccount.status.toUpperCase() !== 'ACTIVE') {
        return res.status(400).json({ error: 'Destination account is not active' });
      }
    }

    if (isSharesWithdrawal) {
      // Shares are not subject to loan guarantee restrictions - those only encumber the main balance
      const availableShares = Number(withdrawalAuth.account.shareBalance || 0);
      if (totalRequired > availableShares) {
        return res.status(400).json({
          error: `Insufficient share balance. Share Balance: ${availableShares}, Requested: ${withdrawalAuth.amount}, Charges: ${chargeAmount}`
        });
      }
    } else {
      // Check available balance considering loan guarantees
      const { availableAmount: availableForWithdrawal } = await guaranteeService.calculateAvailableForWithdrawal(withdrawalAuth.accountId);

      if (totalRequired > availableForWithdrawal) {
        const currentBalance = Number(withdrawalAuth.account.balance);
        const restrictedAmount = currentBalance - availableForWithdrawal;
        return res.status(400).json({
          error: `Insufficient available balance. Account Balance: ${currentBalance}, Available: ${availableForWithdrawal}, Requested: ${withdrawalAuth.amount}, Charges: ${chargeAmount}` +
                 (restrictedAmount > 0 ? `. ${restrictedAmount} is restricted due to loan guarantees.` : '')
        });
      }
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      const operationReference = withdrawalAuth.reference || `WTH-${withdrawalAuth.id}`;

      // Atomically claim this request: if two approval calls for the same request race,
      // only one updateMany will match status=PENDING and the loser aborts immediately.
      const claimResult = await tx.withdrawalAuthorization.updateMany({
        where: { id, status: WithdrawalAuthorizationStatus.PENDING },
        data: {
          status: WithdrawalAuthorizationStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          reference: operationReference
        }
      });

      if (claimResult.count === 0) {
        throw new Error('ALREADY_PROCESSED');
      }

      const totalDebit = Number(withdrawalAuth.amount) + chargeAmount;
      const mainTransactionType = isSharesWithdrawal
        ? TransactionType.WITHDRAWAL_SHARES
        : withdrawalAuth.type === WithdrawalType.WITHDRAWAL
          ? TransactionType.WITHDRAWAL
          : TransactionType.TRANSFER;

      // Atomically debit only if the balance still covers it - the earlier availability
      // check read a balance from before this transaction started, so a second pending
      // request on the same account approved concurrently could otherwise slip through
      // on stale data and overdraw the account.
      const debitResult = isSharesWithdrawal
        ? await tx.account.updateMany({
            where: { id: withdrawalAuth.accountId, shareBalance: { gte: totalDebit } },
            data: { shareBalance: { decrement: totalDebit }, lastTransactionDate: new Date() }
          })
        : await tx.account.updateMany({
            where: { id: withdrawalAuth.accountId, balance: { gte: totalDebit } },
            data: { balance: { decrement: totalDebit }, lastTransactionDate: new Date() }
          });

      if (debitResult.count === 0) {
        throw new Error('INSUFFICIENT_FUNDS_AT_APPROVAL');
      }

      const mainTransaction = await tx.transaction.create({
        data: {
          type: mainTransactionType,
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
          metadata: isSharesWithdrawal ? { shareWithdrawal: true } : undefined,
          createdBy: userId
        }
      });

      // For withdrawals (savings or shares), add the withdrawal charge - reuse the same
      // chargeAmount already used for the availability check and the actual debit above,
      // rather than looking the fee up again, so the ledger entry can never disagree with
      // what was actually taken out of the balance.
      let chargeTransactionId: string | null = null;
      if ((withdrawalAuth.type === WithdrawalType.WITHDRAWAL || isSharesWithdrawal) && chargeAmount > 0) {
        const withdrawalCharge = chargeAmount;

        const chargeTransaction = await tx.transaction.create({
          data: {
            type: isSharesWithdrawal ? TransactionType.WITHDRAWAL_SHARES : TransactionType.WITHDRAWAL,
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
            metadata: isSharesWithdrawal ? { shareWithdrawal: true } : undefined,
            createdBy: userId
          }
        });

        // Book the fee as bank income in the same DB transaction, so income can never
        // disagree with the fees actually taken from customer balances.
        await tx.bankIncome.create({
          data: {
            type: 'WITHDRAWAL_CHARGE',
            amount: withdrawalCharge,
            description: `Withdrawal charge for transaction ${mainTransaction.id}`,
            sourceId: mainTransaction.id,
            sourceType: 'transaction',
            accountId: withdrawalAuth.accountId,
            customerId: withdrawalAuth.account.customerId
          }
        });
      }

      // For transfers, credit the destination account so the money actually arrives
      if (isTransfer && withdrawalAuth.toAccountId) {
        await tx.account.update({
          where: { id: withdrawalAuth.toAccountId },
          data: {
            balance: { increment: Number(withdrawalAuth.amount) },
            lastTransactionDate: new Date()
          }
        });

        const creditReference = `${operationReference}-CR`;
        const creditTransaction = await tx.transaction.create({
          data: {
            type: TransactionType.DEPOSIT,
            amount: withdrawalAuth.amount,
            status: 'COMPLETED',
            description: `Transfer from account ${withdrawalAuth.account.accountNumber}`,
            accountId: withdrawalAuth.toAccountId,
            reference: creditReference
          }
        });

        await tx.ledgerEntry.create({
          data: {
            accountId: withdrawalAuth.toAccountId,
            type: 'CREDIT',
            amount: withdrawalAuth.amount,
            currency: 'GHS',
            reference: creditReference,
            description: `Transfer from account ${withdrawalAuth.account.accountNumber}`,
            transactionId: creditTransaction.id,
            createdBy: userId
          }
        });
      }

      return {
        mainTransactionId: mainTransaction.id,
        chargeTransactionId
      };
    });

    res.json({ message: 'Withdrawal authorization approved successfully' });
  } catch (error) {
    console.error('Error approving withdrawal authorization:', error);
    if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
      return res.status(409).json({ error: 'This withdrawal authorization has already been processed.' });
    }
    if (error instanceof Error && error.message === 'INSUFFICIENT_FUNDS_AT_APPROVAL') {
      return res.status(409).json({
        error: 'Insufficient balance at time of approval - the account balance changed since this request was reviewed. Please refresh and try again.'
      });
    }
    res.status(500).json({ error: 'Failed to approve withdrawal authorization' });
  }
};

export const rejectWithdrawalAuthorization = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

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
    }    // Update withdrawal authorization status
    await prisma.withdrawalAuthorization.update({
      where: { id },
      data: {
        status: WithdrawalAuthorizationStatus.REJECTED,
        approvedById: userId,
        approvedAt: new Date(),
        rejectedReason: reason || 'No reason provided'
      }
    });

    res.json({ message: 'Withdrawal authorization rejected successfully' });  } catch (error) {
    console.error('Error rejecting withdrawal authorization:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal authorization' });
  }
};

export const createWithdrawalAuthorization = async (req: AuthRequest, res: Response) => {
  try {
    const {
      accountId,
      amount,
      type,
      description,
      reference,
      toAccountId,
      toAccountNumber,
      toCustomerName
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!accountId || !amount || !type) {
      return res.status(400).json({ error: 'Account ID, amount, and type are required' });
    }

    // A negative amount would CREDIT the account on approval (decrementing by a negative).
    const requestAmount = Number(amount);
    if (!isValidAmount(requestAmount)) {
      return res.status(400).json({ error: 'Amount must be a positive value with at most 2 decimal places' });
    }

    if (isReservedReference(reference)) {
      return res.status(400).json({ error: 'This reference prefix is reserved for system transactions' });
    }

    // Validate account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.status.toUpperCase() !== 'ACTIVE') {
      return res.status(400).json({ error: 'Account is not active' });
    }

    if (account.type === 'LOAN' || account.type === 'TREASURY') {
      return res.status(400).json({ error: `Withdrawals cannot be made from a ${account.type.toLowerCase()} account` });
    }

    // Create withdrawal authorization
    const withdrawalType = type === 'withdrawal'
      ? WithdrawalType.WITHDRAWAL
      : type === 'withdrawal-shares'
        ? WithdrawalType.WITHDRAWAL_SHARES
        : WithdrawalType.TRANSFER;

    // Transfers must resolve to a real destination account so approval can credit it
    let resolvedToAccountId: string | undefined;
    if (withdrawalType === WithdrawalType.TRANSFER) {
      if (!toAccountId) {
        return res.status(400).json({ error: 'Destination account is required for transfers' });
      }
      if (toAccountId === accountId) {
        return res.status(400).json({ error: 'Cannot transfer to the same account' });
      }
      const toAccount = await prisma.account.findUnique({ where: { id: toAccountId } });
      if (!toAccount) {
        return res.status(404).json({ error: 'Destination account not found' });
      }
      if (toAccount.status.toUpperCase() !== 'ACTIVE') {
        return res.status(400).json({ error: 'Destination account is not active' });
      }
      resolvedToAccountId = toAccountId;
    }

    const withdrawalAuth = await prisma.withdrawalAuthorization.create({
      data: {
        accountId,
        amount: requestAmount,
        type: withdrawalType,
        status: WithdrawalAuthorizationStatus.PENDING,
        description,
        reference,
        toAccountId: resolvedToAccountId,
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
      type: formatWithdrawalType(withdrawalAuth.type),
      description: withdrawalAuth.description || '',
      reference: withdrawalAuth.reference || '',
      toAccountNumber: withdrawalAuth.toAccountNumber || '',
      toCustomerName: withdrawalAuth.toCustomerName || '',
      requestedAt: withdrawalAuth.requestedAt.toISOString(),
      requestedBy: withdrawalAuth.requestedBy.name,
      status: withdrawalAuth.status.toLowerCase(),
      availableBalance: withdrawalAuth.type === WithdrawalType.WITHDRAWAL_SHARES
        ? Number(withdrawalAuth.account.shareBalance || 0)
        : Number(withdrawalAuth.account.balance)
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating withdrawal authorization:', error);
    res.status(500).json({ error: 'Failed to create withdrawal authorization' });
  }
};

export const reverseWithdrawalAuthorization = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

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

    const isSharesWithdrawal = withdrawalAuth.type === WithdrawalType.WITHDRAWAL_SHARES;
    const reversalDepositType = isSharesWithdrawal ? TransactionType.DEPOSIT_SHARES : TransactionType.DEPOSIT;

    // Start transaction to reverse the withdrawal
    await prisma.$transaction(async (tx) => {
      // Atomically claim this reversal: if two reverse calls race, only one updateMany
      // will match isReversed=false and the loser aborts before double-crediting funds.
      const claimResult = await tx.withdrawalAuthorization.updateMany({
        where: { id, status: 'APPROVED', isReversed: false },
        data: {
          isReversed: true,
          reversedById: userId,
          reversedAt: new Date(),
          reversalReason: reason || 'No reason provided'
        }
      });

      if (claimResult.count === 0) {
        throw new Error('ALREADY_REVERSED');
      }

      // Refund whatever fee was actually charged at approval time, not today's configured
      // rate - the two can differ if an admin changes the withdrawal fee in between.
      let chargeAmount = 0;
      if (withdrawalAuth.type === WithdrawalType.WITHDRAWAL || isSharesWithdrawal) {
        const operationReference = withdrawalAuth.reference || `WTH-${withdrawalAuth.id}`;
        const originalChargeTransaction = await tx.transaction.findFirst({
          where: { accountId: withdrawalAuth.accountId, reference: `CHG-${operationReference}` }
        });
        chargeAmount = originalChargeTransaction ? Number(originalChargeTransaction.amount) : 0;
      }
      const totalCredit = Number(withdrawalAuth.amount) + chargeAmount;

      // Add the withdrawn amount (and fee where applicable) back to the account
      await tx.account.update({
        where: { id: withdrawalAuth.accountId },
        data: {
          ...(isSharesWithdrawal
            ? { shareBalance: { increment: totalCredit } }
            : { balance: { increment: totalCredit } }),
          lastTransactionDate: new Date()
        }
      });

      // Create reversal transaction record. Transfer reversals are tagged REV-TRF- because no
      // cash moves; a plain REV- reversal of a withdrawal is reported as cash returned to the drawer.
      const reversalPrefix = withdrawalAuth.type === WithdrawalType.TRANSFER ? 'REV-TRF-' : 'REV-';
      const mainReversalReference = `${reversalPrefix}${withdrawalAuth.reference || withdrawalAuth.id}-${Date.now()}`;
      const reversalMainTransaction = await tx.transaction.create({
        data: {
          type: reversalDepositType,
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
          metadata: isSharesWithdrawal ? { shareDeposit: true } : undefined,
          createdBy: userId
        }
      });

      // For withdrawals (savings or shares), also reverse the withdrawal charge
      if (chargeAmount > 0) {
        // Create charge reversal transaction record
        const chargeReversalReference = `REV-CHG-${withdrawalAuth.reference || withdrawalAuth.id}-${Date.now()}`;
        const chargeReversalTransaction = await tx.transaction.create({
          data: {
            type: reversalDepositType,
            amount: chargeAmount,
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
            amount: chargeAmount,
            currency: 'GHS',
            reference: chargeReversalReference,
            description: 'Reversal: withdrawal charge',
            transactionId: chargeReversalTransaction.id,
            metadata: isSharesWithdrawal ? { shareDeposit: true } : undefined,
            createdBy: userId
          }
        });

        // Take the refunded fee back out of bank income in the same DB transaction.
        const originalMainTx = await tx.transaction.findFirst({
          where: {
            accountId: withdrawalAuth.accountId,
            reference: withdrawalAuth.reference || `WTH-${withdrawalAuth.id}`
          },
          orderBy: { createdAt: 'asc' }
        });
        await tx.bankIncome.create({
          data: {
            type: 'WITHDRAWAL_CHARGE',
            amount: -chargeAmount,
            description: `Reversal of withdrawal charge for transaction ${originalMainTx?.id || withdrawalAuth.id}`,
            sourceId: originalMainTx?.id || withdrawalAuth.id,
            sourceType: 'reversal'
          }
        });
      }

      // For transfers, pull the amount back out of the destination account - only if it still
      // holds the funds, otherwise the reversal would silently push that account negative.
      if (withdrawalAuth.type === WithdrawalType.TRANSFER && withdrawalAuth.toAccountId) {
        const pullBack = await tx.account.updateMany({
          where: { id: withdrawalAuth.toAccountId, balance: { gte: Number(withdrawalAuth.amount) } },
          data: {
            balance: { decrement: Number(withdrawalAuth.amount) },
            lastTransactionDate: new Date()
          }
        });

        if (pullBack.count === 0) {
          throw new Error('DESTINATION_INSUFFICIENT_FUNDS');
        }

        const debitReversalReference = `REV-${withdrawalAuth.reference || withdrawalAuth.id}-${Date.now()}-CR`;
        const debitReversalTransaction = await tx.transaction.create({
          data: {
            type: TransactionType.WITHDRAWAL,
            amount: withdrawalAuth.amount,
            status: 'COMPLETED',
            description: `Reversal: transfer from account ${withdrawalAuth.account.accountNumber} (${reason || 'No reason provided'})`,
            accountId: withdrawalAuth.toAccountId,
            reference: debitReversalReference
          }
        });

        await tx.ledgerEntry.create({
          data: {
            accountId: withdrawalAuth.toAccountId,
            type: 'DEBIT',
            amount: withdrawalAuth.amount,
            currency: 'GHS',
            reference: debitReversalReference,
            description: `Reversal: transfer received from account ${withdrawalAuth.account.accountNumber}`,
            transactionId: debitReversalTransaction.id,
            createdBy: userId
          }
        });
      }

      return { chargeAmount };
    });

    res.json({ message: 'Withdrawal authorization reversed successfully' });
  } catch (error) {
    console.error('Error reversing withdrawal authorization:', error);
    if (error instanceof Error && error.message === 'ALREADY_REVERSED') {
      return res.status(409).json({ error: 'This withdrawal authorization has already been reversed.' });
    }
    if (error instanceof Error && error.message === 'DESTINATION_INSUFFICIENT_FUNDS') {
      return res.status(409).json({
        error: 'Cannot reverse this transfer: the destination account no longer holds the transferred funds.'
      });
    }
    res.status(500).json({ error: 'Failed to reverse withdrawal authorization' });
  }
};
