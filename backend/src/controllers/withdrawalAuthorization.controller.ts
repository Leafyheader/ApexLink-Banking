import { Response } from 'express';
import { PrismaClient, WithdrawalType, TransactionType, WithdrawalAuthorizationStatus } from '@prisma/client';
import { AuthRequest } from '../types/auth';
import { JwtPayload } from 'jsonwebtoken';
import { BankIncomeService } from '../services/bankIncome.service';

const prisma = new PrismaClient();

interface AuthenticatedUser extends JwtPayload {
  id: string;
  username: string;
  name: string;
  role: string;
}

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
    });    // Transform data for frontend
    const transactions = withdrawalAuthorizations.map(auth => ({
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
      approvedBy: auth.approvedBy?.name || '',
      status: auth.status.toLowerCase(),
      availableBalance: Number(auth.account.balance),
      rejectedReason: auth.rejectedReason,
      isReversed: auth.isReversed || false,
      reversedBy: auth.reversedBy?.name || '',
      reversedAt: auth.reversedAt?.toISOString() || '',
      reversalReason: auth.reversalReason || ''
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
        account: true
      }
    });

    if (!withdrawalAuth) {
      return res.status(404).json({ error: 'Withdrawal authorization not found' });
    }

    if (withdrawalAuth.status !== 'PENDING') {
      return res.status(400).json({ error: 'Withdrawal authorization is not pending' });
    }

    // Check if account has sufficient balance
    if (Number(withdrawalAuth.account.balance) < Number(withdrawalAuth.amount)) {
      return res.status(400).json({ error: 'Insufficient account balance' });
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {      // Update withdrawal authorization status
      await tx.withdrawalAuthorization.update({
        where: { id },
        data: {
          status: WithdrawalAuthorizationStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date()
        }
      });

      // Update account balance
      await tx.account.update({
        where: { id: withdrawalAuth.accountId },
        data: {
          balance: {
            decrement: withdrawalAuth.amount
          },
          lastTransactionDate: new Date()
        }
      });      // Create transaction record
      const mainTransaction = await tx.transaction.create({
        data: {
          type: withdrawalAuth.type === WithdrawalType.WITHDRAWAL ? TransactionType.WITHDRAWAL : TransactionType.TRANSFER,
          amount: withdrawalAuth.amount,
          status: 'COMPLETED',
          description: withdrawalAuth.description || `${withdrawalAuth.type} approved`,
          accountId: withdrawalAuth.accountId,
          reference: withdrawalAuth.reference
        }
      });

      // For withdrawals, add the 5 cedis withdrawal charge
      if (withdrawalAuth.type === WithdrawalType.WITHDRAWAL) {
        const withdrawalCharge = 5.00;
        
        // Deduct charge from account
        await tx.account.update({
          where: { id: withdrawalAuth.accountId },
          data: {
            balance: {
              decrement: withdrawalCharge
            }
          }
        });        // Create charge transaction record
        await tx.transaction.create({
          data: {
            type: TransactionType.WITHDRAWAL,
            amount: withdrawalCharge,
            status: 'COMPLETED',
            description: 'withdrawal charge',
            accountId: withdrawalAuth.accountId,
            reference: `CHG-${withdrawalAuth.reference || mainTransaction.id}`
          }
        });
      }
    });

    // Record withdrawal charge as bank income (outside transaction to avoid issues)
    if (withdrawalAuth.type === WithdrawalType.WITHDRAWAL) {
      try {        await BankIncomeService.recordWithdrawalCharge(
          id, // use withdrawal auth id as source
          withdrawalAuth.accountId,
          withdrawalAuth.account.customerId,
          5.00
        );
      } catch (error) {
        console.error('Error recording withdrawal charge as income:', error);
        // Don't fail the approval if income recording fails
      }
    }

    res.json({ message: 'Withdrawal authorization approved successfully' });
  } catch (error) {
    console.error('Error approving withdrawal authorization:', error);
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

    // Validate account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }    // Create withdrawal authorization
    const withdrawalAuth = await prisma.withdrawalAuthorization.create({
      data: {
        accountId,
        amount: Number(amount),
        type: type === 'withdrawal' ? WithdrawalType.WITHDRAWAL : WithdrawalType.TRANSFER,
        status: WithdrawalAuthorizationStatus.PENDING,
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

      // Add the withdrawn amount back to the account
      await tx.account.update({
        where: { id: withdrawalAuth.accountId },
        data: {
          balance: {
            increment: withdrawalAuth.amount
          },
          lastTransactionDate: new Date()
        }
      });

      // Create reversal transaction record
      await tx.transaction.create({
        data: {
          type: TransactionType.DEPOSIT,
          amount: withdrawalAuth.amount,
          status: 'COMPLETED',
          description: `Reversal: ${withdrawalAuth.description || withdrawalAuth.type} (${reason || 'No reason provided'})`,
          accountId: withdrawalAuth.accountId,
          reference: `REV-${withdrawalAuth.reference || withdrawalAuth.id}`
        }
      });

      // For withdrawals, also reverse the withdrawal charge
      if (withdrawalAuth.type === WithdrawalType.WITHDRAWAL) {
        const withdrawalCharge = 5.00;
        
        // Add charge back to account
        await tx.account.update({
          where: { id: withdrawalAuth.accountId },
          data: {
            balance: {
              increment: withdrawalCharge
            }
          }
        });        // Create charge reversal transaction record
        await tx.transaction.create({
          data: {
            type: TransactionType.DEPOSIT,
            amount: withdrawalCharge,
            status: 'COMPLETED',
            description: 'Reversal: withdrawal charge',
            accountId: withdrawalAuth.accountId,
            reference: `REV-CHG-${withdrawalAuth.reference || withdrawalAuth.id}`
          }
        });
      }
    });

    // Reverse withdrawal charge from bank income (outside transaction to avoid issues)
    if (withdrawalAuth.type === WithdrawalType.WITHDRAWAL) {
      try {
        await BankIncomeService.reverseWithdrawalCharge(
          id, // use withdrawal auth id as source
          5.00
        );
      } catch (error) {
        console.error('Error reversing withdrawal charge from income:', error);
        // Don't fail the reversal if income reversal fails
      }
    }

    res.json({ message: 'Withdrawal authorization reversed successfully' });
  } catch (error) {
    console.error('Error reversing withdrawal authorization:', error);
    res.status(500).json({ error: 'Failed to reverse withdrawal authorization' });
  }
};
