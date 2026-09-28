import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../types/auth';

const prisma = new PrismaClient();

// Get all account authorizations with filtering
export const getAccountAuthorizations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', status } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter conditions
    const where: any = {};
    
    if (search) {
      where.OR = [
        { accountNumber: { contains: search as string } },
        { customer: { name: { contains: search as string } } }
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
    ]);    // Get user info for createdBy fields (since it's not a relation)
    const userIds = [...new Set(accounts.map(account => account.createdBy).filter(Boolean))] as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true }
    });
    const userMap = new Map(users.map(user => [user.id, user]));

    // Format the response data to match the frontend interface
    const formattedAccounts = accounts.map((account: any) => ({
      id: account.id,
      accountNumber: account.accountNumber,
      accountName: account.customer.name,
      accountType: account.type.toLowerCase(),
      createdAt: account.createdAt.toISOString(),
      createdBy: account.createdBy ? userMap.get(account.createdBy)?.name || 'Unknown User' : 'System',
      approvedBy: account.approvedBy?.name,
      status: account.authorizationStatus.toLowerCase()
    }));
    
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
  } catch (error) {
    console.error('Error fetching account authorizations:', error);
    res.status(500).json({ message: 'Failed to fetch account authorizations' });
  }
};

// Approve account
export const approveAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
      const { id } = req.params;
    const userId = req.user?.id;
    
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

    // Atomically claim this account for approval - only succeeds if still PENDING,
    // preventing a race with a concurrent approve/reject call from clobbering each other.
    const claim = await prisma.account.updateMany({
      where: { id, authorizationStatus: 'PENDING' },
      data: {
        authorizationStatus: 'APPROVED',
        status: 'ACTIVE',
        approvedById: userId,
        updatedAt: new Date()
      }
    });

    if (claim.count === 0) {
      res.status(409).json({ message: 'Account is not pending approval' });
      return;
    }

    const account = await prisma.account.findUniqueOrThrow({
      where: { id },
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
  } catch (error) {
    console.error('Error approving account:', error);
    res.status(500).json({ message: 'Failed to approve account' });
  }
};

// Approve every pending account in the system
export const bulkApproveAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const result = await prisma.account.updateMany({
      where: { authorizationStatus: 'PENDING' },
      data: {
        authorizationStatus: 'APPROVED',
        status: 'ACTIVE',
        approvedById: userId,
        updatedAt: new Date()
      }
    });

    res.json({ approvedCount: result.count });
  } catch (error) {
    console.error('Error bulk approving accounts:', error);
    res.status(500).json({ message: 'Failed to bulk approve accounts' });
  }
};

// Reject or reverse account approval
export const rejectOrReverseAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    const { id } = req.params;
    const { reason } = req.body || {};
    
    // Check if account exists
    const existingAccount = await prisma.account.findUnique({ where: { id } });
    if (!existingAccount) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }
    
    // Update account status to PENDING (reversal)
    const account = await prisma.account.update({
      where: { id },
      data: {
        authorizationStatus: 'PENDING',
        status: 'ACTIVE', // Keep account active but pending authorization
        approvedById: null,  // Remove approver
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
  } catch (error) {
    console.error('Error rejecting/reversing account:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    res.status(500).json({ message: 'Failed to reject/reverse account', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
