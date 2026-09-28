import { Request, Response } from 'express';
import { PrismaClient, ExpenseStatus } from '@prisma/client';
import { AuthRequest } from '../types/auth';
import { getOrCreateTreasuryAccount } from '../utils/treasuryAccount';
import { parseRangeStart, parseRangeEnd } from '../utils/cashReporting';

const prisma = new PrismaClient();

// Valid expense status transitions. PAID and REJECTED are terminal.
const VALID_EXPENSE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'PAID'],
  APPROVED: ['PAID', 'REJECTED'],
  PAID: [],
  REJECTED: []
};

// Get all expenses with filtering
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      dateFrom, 
      dateTo, 
      category, 
      status, 
      department, 
      search 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const where: any = {};

    if (dateFrom || dateTo) {
      where.date = {};
      const rangeStart = parseRangeStart(dateFrom);
      const rangeEnd = parseRangeEnd(dateTo);
      if (rangeStart) where.date.gte = rangeStart;
      if (rangeEnd) where.date.lte = rangeEnd;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = {
        contains: department as string,
        mode: 'insensitive'
      };
    }

    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { vendor: { contains: search as string, mode: 'insensitive' } },
        { referenceNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,        include: {
          createdByUser: {
            select: {
              id: true,
              username: true,
              name: true
            }
          },
          approvedByUser: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.expense.count({ where })
    ]);

    res.json({
      expenses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// Get expense summary
export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);    // Get total approved/paid expenses only (pending should not count toward total)
    const totalExpensesResult = await prisma.expense.aggregate({
      where: { 
        status: { 
          in: ['APPROVED', 'PAID'] 
        } 
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Get pending expenses
    const pendingExpensesResult = await prisma.expense.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Get approved expenses
    const approvedExpensesResult = await prisma.expense.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Get paid expenses
    const paidExpensesResult = await prisma.expense.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
      _count: { id: true }
    });    // Get monthly approved/paid expenses only
    const monthlyExpensesResult = await prisma.expense.aggregate({
      where: {
        status: { 
          in: ['APPROVED', 'PAID'] 
        },
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { amount: true }
    });// For now, we'll use a simple budget calculation
    // In a real bank, this would come from a budget management system
    const monthlyBudget = 100000; // $100,000 monthly operating budget
    const monthlySpent = Number(monthlyExpensesResult._sum.amount || 0);
    const budgetUtilization = monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0;    res.json({
      totalExpenses: Number(totalExpensesResult._sum.amount || 0),
      pendingExpenses: Number(pendingExpensesResult._sum.amount || 0),
      approvedExpenses: Number(approvedExpensesResult._sum.amount || 0),
      paidExpenses: Number(paidExpensesResult._sum.amount || 0),
      monthlyBudget,
      monthlySpent,
      budgetUtilization
    });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
};

// Create new expense
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const {
      date,
      category,
      description,
      amount,
      vendor,
      department,
      paymentMethod,
      referenceNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!date || !category || !description || !amount || !vendor) {
      return res.status(400).json({ 
        error: 'Missing required fields: date, category, description, amount, vendor' 
      });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        error: 'Amount must be a positive number' 
      });
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        category,
        description,
        amount: amountNum,
        vendor,
        department: department || 'General',
        status: 'PENDING',
        paymentMethod,
        referenceNumber,
        notes,
        createdById: req.user!.id
      },      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

// Update expense status
export const updateExpenseStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (status !== existingExpense.status) {
      const allowedNextStatuses = VALID_EXPENSE_TRANSITIONS[existingExpense.status] || [];
      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({
          error: `Cannot change expense status from ${existingExpense.status} to ${status}`
        });
      }
    }

    // Update expense with status and approval info
    const updateData: any = {
      status
    };

    if (status === 'APPROVED') {
      updateData.approvedById = req.user!.id;
      updateData.approvedDate = new Date();
    } else if (status === 'PAID') {
      updateData.paidDate = new Date();
      // If not already approved, approve it when marking as paid
      if (existingExpense.status === 'PENDING') {
        updateData.approvedById = req.user!.id;
        updateData.approvedDate = new Date();
      }
    }

    const expense = await prisma.$transaction(async (tx) => {
      // Atomically claim this expense for the transition - only succeeds if its status
      // hasn't changed since we read it above, preventing a double-approve/double-pay race.
      const claim = await tx.expense.updateMany({
        where: { id, status: existingExpense.status },
        data: updateData
      });

      if (claim.count === 0) {
        throw new Error('ALREADY_PROCESSED');
      }

      // Money actually leaves the bank when an expense is marked PAID (not merely APPROVED) -
      // debit the treasury account and record a real Transaction for it.
      if (status === 'PAID') {
        const treasury = await getOrCreateTreasuryAccount(tx, req.user!.id);
        const amount = Number(existingExpense.amount);

        const debit = await tx.account.updateMany({
          where: { id: treasury.id, balance: { gte: amount } },
          data: {
            balance: { decrement: amount },
            lastTransactionDate: new Date()
          }
        });

        if (debit.count === 0) {
          throw new Error('INSUFFICIENT_TREASURY_FUNDS');
        }

        await tx.transaction.create({
          data: {
            accountId: treasury.id,
            type: 'WITHDRAWAL',
            amount,
            description: `Expense payment - ${existingExpense.description} (${existingExpense.vendor})`,
            reference: `EXP-${id.slice(-8)}`,
            status: 'COMPLETED'
          }
        });

        await tx.expense.update({
          where: { id },
          data: { paidFromAccountId: treasury.id }
        });
      }

      return tx.expense.findUniqueOrThrow({
        where: { id },
        include: {
          createdByUser: {
            select: {
              id: true,
              username: true,
              name: true
            }
          },
          approvedByUser: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      });
    });

    res.json(expense);
  } catch (error) {
    console.error('Error updating expense status:', error);
    if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
      return res.status(409).json({ error: 'Expense status has already changed, please refresh and try again' });
    }
    if (error instanceof Error && error.message === 'INSUFFICIENT_TREASURY_FUNDS') {
      return res.status(409).json({ error: 'Insufficient treasury funds to pay this expense' });
    }
    res.status(500).json({ error: 'Failed to update expense status' });
  }
};

// Delete expense
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Only allow deletion of pending expenses or by admin
    if (existingExpense.status !== 'PENDING' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Only pending expenses can be deleted by non-admin users' 
      });
    }

    await prisma.expense.delete({
      where: { id }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// Get expense by ID
export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};
