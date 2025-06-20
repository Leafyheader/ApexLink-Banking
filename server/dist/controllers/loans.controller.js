"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomersForLoan = exports.deleteLoan = exports.updateLoan = exports.createLoan = exports.getLoan = exports.getLoans = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Validation schemas
const createLoanSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    interestRate: zod_1.z.number().min(0),
    term: zod_1.z.number().int().positive(),
    repaymentFrequency: zod_1.z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']),
    guarantor1Id: zod_1.z.string().uuid().optional(),
    guarantor1AccountId: zod_1.z.string().uuid().optional(),
    guarantor1Percentage: zod_1.z.number().int().min(0).max(100).optional(),
    guarantor2Id: zod_1.z.string().uuid().optional(),
    guarantor2AccountId: zod_1.z.string().uuid().optional(),
    guarantor2Percentage: zod_1.z.number().int().min(0).max(100).optional(),
    guarantor3Id: zod_1.z.string().uuid().optional(),
    guarantor3AccountId: zod_1.z.string().uuid().optional(),
    guarantor3Percentage: zod_1.z.number().int().min(0).max(100).optional(),
});
const getLoanSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const updateLoanSchema = zod_1.z.object({
    amount: zod_1.z.number().positive().optional(),
    interestRate: zod_1.z.number().min(0).optional(),
    term: zod_1.z.number().int().positive().optional(),
    status: zod_1.z.enum(['ACTIVE', 'PAID', 'DEFAULTED', 'CLOSED']).optional(),
    repaymentFrequency: zod_1.z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional(),
});
// Helper function to calculate loan details using flat rate interest
function calculateLoanDetails(amount, interestRate, termInMonths) {
    const principal = amount;
    const annualInterestRate = interestRate / 100;
    const termInYears = termInMonths / 12;
    if (annualInterestRate === 0) {
        const monthlyPayment = principal / termInMonths;
        return {
            monthlyPayment,
            totalPayable: principal,
            outstandingBalance: principal
        };
    }
    // Calculate total interest using flat rate: Principal × Rate × Time
    const totalInterest = principal * annualInterestRate * termInYears;
    // Total payable = Principal + Total Interest
    const totalPayable = principal + totalInterest;
    // Monthly payment = Total Payable / Number of Months
    const monthlyPayment = totalPayable / termInMonths;
    return {
        monthlyPayment,
        totalPayable,
        outstandingBalance: totalPayable
    };
}
// Helper function to generate unique account number
async function generateLoanAccountNumber() {
    let accountNumber;
    let exists = true;
    while (exists) {
        // Generate account number starting with 'L' for loan
        accountNumber = 'L' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        const existingAccount = await prisma.account.findUnique({
            where: { accountNumber }
        });
        exists = !!existingAccount;
    }
    return accountNumber;
}
// Get all loans
const getLoans = async (req, res) => {
    try {
        const { page = '1', limit = '10', search = '', status } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const whereClause = {};
        // Add status filter if provided
        if (status && typeof status === 'string') {
            whereClause.status = status;
        }
        // Add search filter
        if (search && typeof search === 'string') {
            whereClause.OR = [
                {
                    customer: {
                        name: {
                            contains: search
                        }
                    }
                },
                {
                    account: {
                        accountNumber: {
                            contains: search
                        }
                    }
                }
            ];
        }
        const [loans, total] = await Promise.all([
            prisma.loan.findMany({
                where: whereClause,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true
                        }
                    },
                    account: {
                        select: {
                            id: true,
                            accountNumber: true,
                            type: true,
                            balance: true,
                            shareBalance: true
                        }
                    }, guarantor1: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    guarantor1Account: {
                        select: {
                            id: true,
                            accountNumber: true,
                            type: true,
                            balance: true
                        }
                    },
                    guarantor2: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    guarantor2Account: {
                        select: {
                            id: true,
                            accountNumber: true,
                            type: true,
                            balance: true
                        }
                    },
                    guarantor3: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    guarantor3Account: {
                        select: {
                            id: true,
                            accountNumber: true,
                            type: true,
                            balance: true
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
                },
                skip,
                take: limitNum
            }),
            prisma.loan.count({ where: whereClause })
        ]);
        // Calculate actual amount paid for each loan from LOAN_REPAYMENT transactions
        const loansWithAmountPaid = await Promise.all(loans.map(async (loan) => {
            var _a;
            const repaymentSum = await prisma.transaction.aggregate({
                where: {
                    accountId: loan.accountId,
                    type: 'LOAN_REPAYMENT',
                    status: 'COMPLETED'
                },
                _sum: {
                    amount: true
                }
            });
            const actualAmountPaid = Number(repaymentSum._sum.amount || 0);
            const originalDebt = Number(loan.totalPayable);
            const currentBalance = Number(((_a = loan.account) === null || _a === void 0 ? void 0 : _a.balance) || 0);
            // For PAID/completed loans, use the stored outstandingBalance instead of calculating from account balance
            const actualOutstandingBalance = loan.status === 'PAID' || loan.isCompleted
                ? Number(loan.outstandingBalance || 0)
                : Math.abs(currentBalance);
            return Object.assign(Object.assign({}, loan), { amountPaid: actualAmountPaid, outstandingBalance: actualOutstandingBalance });
        }));
        res.json({
            loans: loansWithAmountPaid,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ error: 'Failed to fetch loans' });
    }
};
exports.getLoans = getLoans;
// Get single loan
const getLoan = async (req, res) => {
    var _a;
    try {
        const { id } = getLoanSchema.parse(req.params);
        const loan = await prisma.loan.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        address: true
                    }
                },
                account: {
                    select: {
                        id: true,
                        accountNumber: true,
                        type: true,
                        balance: true,
                        shareBalance: true
                    }
                }, guarantor1: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true
                    }
                },
                guarantor1Account: {
                    select: {
                        id: true,
                        accountNumber: true,
                        type: true,
                        balance: true
                    }
                },
                guarantor2: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true
                    }
                },
                guarantor2Account: {
                    select: {
                        id: true,
                        accountNumber: true,
                        type: true,
                        balance: true
                    }
                },
                guarantor3: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true
                    }
                },
                guarantor3Account: {
                    select: {
                        id: true,
                        accountNumber: true,
                        type: true,
                        balance: true
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
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        // Calculate actual amount paid from LOAN_REPAYMENT transactions
        const repaymentSum = await prisma.transaction.aggregate({
            where: {
                accountId: loan.accountId,
                type: 'LOAN_REPAYMENT',
                status: 'COMPLETED'
            },
            _sum: {
                amount: true
            }
        });
        const actualAmountPaid = Number(repaymentSum._sum.amount || 0);
        const currentBalance = Number(((_a = loan.account) === null || _a === void 0 ? void 0 : _a.balance) || 0);
        // For PAID/completed loans, use the stored outstandingBalance instead of calculating from account balance
        const actualOutstandingBalance = loan.status === 'PAID' || loan.isCompleted
            ? Number(loan.outstandingBalance || 0)
            : Math.abs(currentBalance);
        const loanWithAmountPaid = Object.assign(Object.assign({}, loan), { amountPaid: actualAmountPaid, outstandingBalance: actualOutstandingBalance });
        res.json({ loan: loanWithAmountPaid });
    }
    catch (error) {
        console.error('Error fetching loan:', error);
        res.status(500).json({ error: 'Failed to fetch loan' });
    }
};
exports.getLoan = getLoan;
// Create new loan
const createLoan = async (req, res) => {
    var _a;
    try {
        const validatedData = createLoanSchema.parse(req.body);
        const { customerId, amount, interestRate, term, repaymentFrequency, guarantor1Id, guarantor1AccountId, guarantor1Percentage, guarantor2Id, guarantor2AccountId, guarantor2Percentage, guarantor3Id, guarantor3AccountId, guarantor3Percentage } = validatedData;
        // Validate guarantor percentages sum to 50 if any guarantors are provided
        const totalPercentage = (guarantor1Percentage || 0) + (guarantor2Percentage || 0) + (guarantor3Percentage || 0);
        if ((guarantor1Id || guarantor2Id || guarantor3Id) && totalPercentage !== 50) {
            return res.status(400).json({ error: 'Guarantor percentages must sum to 50%' });
        }
        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        // Validate guarantors exist if provided
        if (guarantor1Id) {
            const guarantor1 = await prisma.customer.findUnique({ where: { id: guarantor1Id } });
            if (!guarantor1) {
                return res.status(404).json({ error: 'Guarantor 1 not found' });
            }
        }
        if (guarantor2Id) {
            const guarantor2 = await prisma.customer.findUnique({ where: { id: guarantor2Id } });
            if (!guarantor2) {
                return res.status(404).json({ error: 'Guarantor 2 not found' });
            }
        }
        if (guarantor3Id) {
            const guarantor3 = await prisma.customer.findUnique({ where: { id: guarantor3Id } });
            if (!guarantor3) {
                return res.status(404).json({ error: 'Guarantor 3 not found' });
            }
        } // Validate guarantor accounts exist and have sufficient funds
        const guarantorAccounts = [];
        if (guarantor1Id && guarantor1AccountId && guarantor1Percentage && guarantor1Percentage > 0) {
            const account = await prisma.account.findUnique({
                where: { id: guarantor1AccountId },
                include: { customer: true }
            });
            if (!account) {
                return res.status(404).json({ error: 'Guarantor 1 account not found' });
            }
            if (account.customerId !== guarantor1Id) {
                return res.status(400).json({ error: 'Guarantor 1 account does not belong to the selected guarantor' });
            }
            if (account.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Guarantor 1 account is not active' });
            }
            const deductionAmount = (amount * guarantor1Percentage) / 100;
            if (Number(account.balance) < deductionAmount) {
                return res.status(400).json({
                    error: `Guarantor 1 has insufficient funds. Required: ${deductionAmount}, Available: ${account.balance}`
                });
            }
            guarantorAccounts.push({
                accountId: guarantor1AccountId,
                percentage: guarantor1Percentage,
                deductionAmount
            });
        }
        if (guarantor2Id && guarantor2AccountId && guarantor2Percentage && guarantor2Percentage > 0) {
            const account = await prisma.account.findUnique({
                where: { id: guarantor2AccountId },
                include: { customer: true }
            });
            if (!account) {
                return res.status(404).json({ error: 'Guarantor 2 account not found' });
            }
            if (account.customerId !== guarantor2Id) {
                return res.status(400).json({ error: 'Guarantor 2 account does not belong to the selected guarantor' });
            }
            if (account.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Guarantor 2 account is not active' });
            }
            const deductionAmount = (amount * guarantor2Percentage) / 100;
            if (Number(account.balance) < deductionAmount) {
                return res.status(400).json({
                    error: `Guarantor 2 has insufficient funds. Required: ${deductionAmount}, Available: ${account.balance}`
                });
            }
            guarantorAccounts.push({
                accountId: guarantor2AccountId,
                percentage: guarantor2Percentage,
                deductionAmount
            });
        }
        if (guarantor3Id && guarantor3AccountId && guarantor3Percentage && guarantor3Percentage > 0) {
            const account = await prisma.account.findUnique({
                where: { id: guarantor3AccountId },
                include: { customer: true }
            });
            if (!account) {
                return res.status(404).json({ error: 'Guarantor 3 account not found' });
            }
            if (account.customerId !== guarantor3Id) {
                return res.status(400).json({ error: 'Guarantor 3 account does not belong to the selected guarantor' });
            }
            if (account.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Guarantor 3 account is not active' });
            }
            const deductionAmount = (amount * guarantor3Percentage) / 100;
            if (Number(account.balance) < deductionAmount) {
                return res.status(400).json({
                    error: `Guarantor 3 has insufficient funds. Required: ${deductionAmount}, Available: ${account.balance}`
                });
            }
            guarantorAccounts.push({
                accountId: guarantor3AccountId,
                percentage: guarantor3Percentage,
                deductionAmount
            });
        }
        // Calculate loan details
        const { monthlyPayment, totalPayable, outstandingBalance } = calculateLoanDetails(amount, interestRate, term);
        // Calculate end date
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + term);
        // Generate unique account number for the loan
        const accountNumber = await generateLoanAccountNumber();
        // Get the authenticated user ID
        const createdBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Create loan account and loan in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create loan account with negative balance
            const loanAccount = await tx.account.create({
                data: {
                    accountNumber,
                    type: 'LOAN',
                    balance: -amount, // Negative balance representing the loan amount owed
                    customerId,
                    authorizationStatus: 'APPROVED', // Loans are auto-approved
                    createdBy
                }
            });
            // Create loan record
            const loan = await tx.loan.create({
                data: {
                    customerId,
                    accountId: loanAccount.id,
                    amount,
                    interestRate,
                    term,
                    repaymentFrequency,
                    startDate,
                    endDate,
                    totalPayable,
                    outstandingBalance,
                    monthlyPayment, guarantor1Id: guarantor1Id || null,
                    guarantor1AccountId: guarantor1AccountId || null,
                    guarantor1Percentage: guarantor1Percentage || null,
                    guarantor2Id: guarantor2Id || null,
                    guarantor2AccountId: guarantor2AccountId || null,
                    guarantor2Percentage: guarantor2Percentage || null,
                    guarantor3Id: guarantor3Id || null,
                    guarantor3AccountId: guarantor3AccountId || null,
                    guarantor3Percentage: guarantor3Percentage || null,
                    createdBy,
                    approvedById: createdBy, // Auto-approve loans with the creator as approver
                    approvedAt: new Date()
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true
                        }
                    },
                    account: {
                        select: {
                            id: true,
                            accountNumber: true,
                            type: true,
                            balance: true
                        }
                    },
                    guarantor1: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    guarantor2: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    guarantor3: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    }
                }
            });
            // Create initial transaction record for loan disbursement
            await tx.transaction.create({
                data: {
                    type: 'DEPOSIT', // This represents the loan disbursement
                    amount,
                    accountId: loanAccount.id,
                    description: `Loan disbursement - ${amount} at ${interestRate}% interest for ${term} months`,
                    reference: `LOAN-${loan.id.slice(-8)}`
                }
            });
            // Process guarantor account deductions
            for (const guarantorAccount of guarantorAccounts) {
                // Deduct amount from guarantor account
                await tx.account.update({
                    where: { id: guarantorAccount.accountId },
                    data: {
                        balance: {
                            decrement: guarantorAccount.deductionAmount
                        },
                        lastTransactionDate: new Date()
                    }
                });
                // Create transaction record for guarantor deduction
                await tx.transaction.create({
                    data: {
                        type: 'WITHDRAWAL',
                        amount: guarantorAccount.deductionAmount,
                        accountId: guarantorAccount.accountId,
                        description: `Guarantor contribution for loan ${loan.id.slice(-8)} (${guarantorAccount.percentage}%)`,
                        reference: `GRT-${loan.id.slice(-8)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                    }
                });
            }
            return loan;
        });
        res.status(201).json({
            message: 'Loan created successfully',
            loan: result
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        console.error('Error creating loan:', error);
        res.status(500).json({ error: 'Failed to create loan' });
    }
};
exports.createLoan = createLoan;
// Update loan
const updateLoan = async (req, res) => {
    try {
        const { id } = getLoanSchema.parse(req.params);
        const validatedData = updateLoanSchema.parse(req.body);
        // Check if loan exists
        const existingLoan = await prisma.loan.findUnique({
            where: { id }
        });
        if (!existingLoan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        // Recalculate loan details if amount, interestRate, or term is being updated
        let updateData = Object.assign({}, validatedData);
        if (validatedData.amount || validatedData.interestRate || validatedData.term) {
            const amount = validatedData.amount || existingLoan.amount.toNumber();
            const interestRate = validatedData.interestRate || existingLoan.interestRate.toNumber();
            const term = validatedData.term || existingLoan.term;
            const { monthlyPayment, totalPayable, outstandingBalance } = calculateLoanDetails(amount, interestRate, term);
            updateData.monthlyPayment = monthlyPayment;
            updateData.totalPayable = totalPayable;
            updateData.outstandingBalance = outstandingBalance;
            // Update end date if term is changed
            if (validatedData.term) {
                const endDate = new Date(existingLoan.startDate);
                endDate.setMonth(endDate.getMonth() + term);
                updateData.endDate = endDate;
            }
        }
        const updatedLoan = await prisma.loan.update({
            where: { id },
            data: updateData,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true
                    }
                },
                account: {
                    select: {
                        id: true,
                        accountNumber: true,
                        type: true,
                        balance: true
                    }
                },
                guarantor1: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                guarantor2: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                guarantor3: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
            }
        });
        res.json({
            message: 'Loan updated successfully',
            loan: updatedLoan
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        console.error('Error updating loan:', error);
        res.status(500).json({ error: 'Failed to update loan' });
    }
};
exports.updateLoan = updateLoan;
// Delete loan
const deleteLoan = async (req, res) => {
    try {
        const { id } = getLoanSchema.parse(req.params);
        // Check if loan exists and get associated account
        const existingLoan = await prisma.loan.findUnique({
            where: { id },
            include: { account: true }
        });
        if (!existingLoan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        // Delete loan and associated account in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete loan
            await tx.loan.delete({
                where: { id }
            });
            // Delete associated loan account
            await tx.account.delete({
                where: { id: existingLoan.accountId }
            });
        });
        res.json({ message: 'Loan deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting loan:', error);
        res.status(500).json({ error: 'Failed to delete loan' });
    }
};
exports.deleteLoan = deleteLoan;
// Get customers for loan selection (with search)
const getCustomersForLoan = async (req, res) => {
    try {
        const { search = '', page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const whereClause = {};
        if (search && typeof search === 'string') {
            whereClause.OR = [
                {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    phone: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    email: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ];
        }
        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where: whereClause,
                include: {
                    accounts: {
                        where: {
                            status: 'ACTIVE',
                            authorizationStatus: 'APPROVED'
                        },
                        select: {
                            id: true,
                            accountNumber: true,
                            type: true,
                            balance: true,
                            shareBalance: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                },
                skip,
                take: limitNum
            }),
            prisma.customer.count({ where: whereClause })
        ]);
        res.json({
            customers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching customers for loan:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};
exports.getCustomersForLoan = getCustomersForLoan;
