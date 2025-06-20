import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../types/auth';
import { generateAccountNumber } from '../utils/idGenerator';

const prisma = new PrismaClient();

// Get all accounts with optional filtering
export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', status, type, customerId } = req.query;
    
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
      customerName: account.customer?.name || 'Unknown Customer'
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
      const { customerId, type, balance, currency, minimumBalance, overdraftLimit, shareBalance, sharesAvailableBalance } = req.body;
    
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
      // Generate account number using the new ID generator
    const accountNumber = await generateAccountNumber();// Create the account with pending authorization
    const createData: any = {
      accountNumber,
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

    const account = await prisma.account.create({
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
export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    const { id } = req.params;
    const { status, minimumBalance, overdraftLimit, shareBalance, sharesAvailableBalance } = req.body;
    
    // Check if account exists
    const existingAccount = await prisma.account.findUnique({ where: { id } });
    if (!existingAccount) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }
      // Update the account
    const updateData: any = {
      status,
      minimumBalance,
      overdraftLimit,
      updatedAt: new Date()
    };
    
    if (shareBalance !== undefined) {
      updateData.shareBalance = shareBalance;
    }
    
    if (sharesAvailableBalance !== undefined) {
      updateData.sharesAvailableBalance = sharesAvailableBalance;
    }

    const account = await prisma.account.update({
      where: { id },
      data: updateData,
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
    
    // Format account to include customerName for backward compatibility
    const formattedAccount = {
      ...account,
      customerName: account.customer?.name || 'Unknown Customer'
    };
    
    res.json(formattedAccount);
  } catch (error) {
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
    
    // Delete the account
    await prisma.account.delete({ where: { id } });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
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
