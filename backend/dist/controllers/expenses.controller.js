"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenseById = exports.deleteExpense = exports.updateExpenseStatus = exports.createExpense = exports.getExpenseSummary = exports.getExpenses = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get all expenses with filtering
const getExpenses = async (req, res) => {
    try {
        const { page = 1, limit = 50, dateFrom, dateTo, category, status, department, search } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where conditions
        const where = {};
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom)
                where.date.gte = new Date(dateFrom);
            if (dateTo)
                where.date.lte = new Date(dateTo);
        }
        if (category) {
            where.category = category;
        }
        if (status) {
            where.status = status;
        }
        if (department) {
            where.department = {
                contains: department,
                mode: 'insensitive'
            };
        }
        if (search) {
            where.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { vendor: { contains: search, mode: 'insensitive' } },
                { referenceNumber: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where, include: {
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
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};
exports.getExpenses = getExpenses;
// Get expense summary
const getExpenseSummary = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Get total approved/paid expenses only (pending should not count toward total)
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
        }); // Get monthly approved/paid expenses only
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
        }); // For now, we'll use a simple budget calculation
        // In a real bank, this would come from a budget management system
        const monthlyBudget = 100000; // $100,000 monthly operating budget
        const monthlySpent = Number(monthlyExpensesResult._sum.amount || 0);
        const budgetUtilization = monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0;
        res.json({
            totalExpenses: Number(totalExpensesResult._sum.amount || 0),
            pendingExpenses: Number(pendingExpensesResult._sum.amount || 0),
            approvedExpenses: Number(approvedExpensesResult._sum.amount || 0),
            paidExpenses: Number(paidExpensesResult._sum.amount || 0),
            monthlyBudget,
            monthlySpent,
            budgetUtilization
        });
    }
    catch (error) {
        console.error('Error fetching expense summary:', error);
        res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
};
exports.getExpenseSummary = getExpenseSummary;
// Create new expense
const createExpense = async (req, res) => {
    try {
        const { date, category, description, amount, vendor, department, paymentMethod, referenceNumber, notes } = req.body;
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
                createdById: req.user.id
            }, include: {
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
    }
    catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Failed to create expense' });
    }
};
exports.createExpense = createExpense;
// Update expense status
const updateExpenseStatus = async (req, res) => {
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
        // Update expense with status and approval info
        const updateData = {
            status
        };
        if (status === 'APPROVED') {
            updateData.approvedById = req.user.id;
            updateData.approvedDate = new Date();
        }
        else if (status === 'PAID') {
            updateData.paidDate = new Date();
            // If not already approved, approve it when marking as paid
            if (existingExpense.status === 'PENDING') {
                updateData.approvedById = req.user.id;
                updateData.approvedDate = new Date();
            }
        }
        const expense = await prisma.expense.update({
            where: { id },
            data: updateData,
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
        res.json(expense);
    }
    catch (error) {
        console.error('Error updating expense status:', error);
        res.status(500).json({ error: 'Failed to update expense status' });
    }
};
exports.updateExpenseStatus = updateExpenseStatus;
// Delete expense
const deleteExpense = async (req, res) => {
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
        if (existingExpense.status !== 'PENDING' && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                error: 'Only pending expenses can be deleted by non-admin users'
            });
        }
        await prisma.expense.delete({
            where: { id }
        });
        res.json({ message: 'Expense deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};
exports.deleteExpense = deleteExpense;
// Get expense by ID
const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await prisma.expense.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ error: 'Failed to fetch expense' });
    }
};
exports.getExpenseById = getExpenseById;
