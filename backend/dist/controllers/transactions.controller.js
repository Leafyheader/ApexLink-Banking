"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnhancedAccountBalance = exports.checkWithdrawalAvailability = exports.getCustomerGuaranteeInfo = exports.getAccountNotifications = exports.getTransactionStats = exports.updateTransactionStatus = exports.createTransaction = exports.createTransactionWithLedger = exports.getTransactionById = exports.getTransactions = void 0;
const client_1 = require("@prisma/client");
const bankIncome_service_1 = require("../services/bankIncome.service");
const loanRepayment_service_1 = require("../services/loanRepayment.service");
const guarantee_service_1 = require("../services/guarantee.service");
const prisma = new client_1.PrismaClient();
// Get all transactions with filters
const getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, type, accountId, customerId, dateFrom, dateTo } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const offset = (pageNumber - 1) * limitNumber; // Build where clause for filtering
        const where = {};
        const accountWhere = {}; // Build search conditions
        if (search) {
            where.OR = [
                {
                    account: {
                        accountNumber: {
                            contains: search
                        }
                    }
                },
                {
                    account: {
                        customer: {
                            name: {
                                contains: search
                            }
                        }
                    }
                },
                {
                    description: {
                        contains: search
                    }
                },
                {
                    reference: {
                        contains: search
                    }
                }
            ];
        }
        // Build other filter conditions
        if (status && status !== '') {
            where.status = status.toString().toUpperCase();
        }
        if (type && type !== '') {
            where.type = type.toString().toUpperCase();
        }
        if (accountId) {
            where.accountId = accountId;
        }
        if (customerId) {
            accountWhere.customerId = customerId;
        }
        // Add account conditions if any exist and no search OR clause
        if (Object.keys(accountWhere).length > 0 && !where.OR) {
            where.account = accountWhere;
        }
        else if (Object.keys(accountWhere).length > 0 && where.OR) {
            // If we have both search OR clause and account filters, combine them with AND
            const searchCondition = where.OR;
            delete where.OR;
            where.AND = [
                { OR: searchCondition },
                { account: accountWhere }
            ];
        }
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) {
                where.date.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.date.lte = new Date(dateTo);
            }
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
            customerName: transaction.account.customer.name,
            customerId: transaction.account.customer.id,
            amount: Number(transaction.amount),
            type: transaction.type.toLowerCase(),
            status: transaction.status.toLowerCase(),
            date: transaction.date.toISOString(),
            description: transaction.description || `${transaction.type} transaction`,
            reference: transaction.reference,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString()
        }));
        res.json({
            transactions: formattedTransactions,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitNumber),
                pages: Math.ceil(totalCount / limitNumber)
            }
        });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
exports.getTransactions = getTransactions;
// Get a single transaction by ID
const getTransactionById = async (req, res) => {
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
            type: transaction.type.toLowerCase(),
            status: transaction.status.toLowerCase(),
            date: transaction.date.toISOString(),
            description: transaction.description || `${transaction.type} transaction`,
            reference: transaction.reference,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString()
        };
        res.json(formattedTransaction);
    }
    catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
};
exports.getTransactionById = getTransactionById;
// Create a new transaction using the ledger system
const createTransactionWithLedger = async (req, res) => {
    var _a;
    try {
        const { accountId, type, amount, description, reference } = req.body;
        const actorId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'SYSTEM';
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
        if (transactionAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        // Generate unique reference
        const txReference = reference || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        let transaction;
        let withdrawalCharge = 0;
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
            case 'WITHDRAWAL':
                // Use enhanced guarantee service
                const guaranteeService = new guarantee_service_1.GuaranteeService(prisma);
                // Enhanced check for withdrawal availability considering loans and guarantees
                const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(accountId);
                withdrawalCharge = 5.00;
                const totalRequired = transactionAmount + withdrawalCharge;
                if (totalRequired > withdrawalInfo.availableAmount) {
                    const restrictionDetails = withdrawalInfo.restrictions.map((r) => r.description).join('; ');
                    return res.status(400).json({
                        error: `Insufficient funds available for withdrawal.`,
                        details: {
                            accountBalance: withdrawalInfo.accountBalance,
                            availableForWithdrawal: withdrawalInfo.availableAmount,
                            requestedAmount: transactionAmount,
                            requiredIncludingCharge: totalRequired,
                            restrictedByOwnLoans: withdrawalInfo.restrictedByOwnLoans,
                            restrictedByGuarantees: withdrawalInfo.restrictedByGuarantees,
                            restrictions: withdrawalInfo.restrictions
                        },
                        message: `You can only withdraw up to ₵${Math.max(withdrawalInfo.availableAmount - withdrawalCharge, 0).toLocaleString()} after fees from your ₵${withdrawalInfo.accountBalance.toLocaleString()} balance. ${restrictionDetails}`
                    });
                }
                transaction = await prisma.$transaction(async (tx) => {
                    const mainTransaction = await tx.transaction.create({
                        data: {
                            accountId,
                            type: 'WITHDRAWAL',
                            amount: transactionAmount,
                            description: description || 'Withdrawal transaction',
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
                            type: 'DEBIT',
                            amount: transactionAmount,
                            currency: 'GHS',
                            reference: txReference,
                            description: description || 'Withdrawal transaction',
                            transactionId: mainTransaction.id,
                            createdBy: actorId
                        }
                    });
                    const chargeTransaction = await tx.transaction.create({
                        data: {
                            accountId,
                            type: 'WITHDRAWAL',
                            amount: withdrawalCharge,
                            description: 'Withdrawal processing fee',
                            reference: `FEE-${txReference}`,
                            status: 'COMPLETED'
                        }
                    });
                    await tx.ledgerEntry.create({
                        data: {
                            accountId,
                            type: 'DEBIT',
                            amount: withdrawalCharge,
                            currency: 'GHS',
                            reference: `FEE-${txReference}`,
                            description: 'Withdrawal processing fee',
                            transactionId: chargeTransaction.id,
                            createdBy: actorId
                        }
                    });
                    await tx.account.update({
                        where: { id: accountId },
                        data: {
                            balance: {
                                decrement: totalRequired
                            },
                            lastTransactionDate: new Date()
                        }
                    });
                    return mainTransaction;
                });
                try {
                    await bankIncome_service_1.BankIncomeService.recordWithdrawalCharge(transaction.id, accountId, account.customerId, withdrawalCharge);
                }
                catch (incomeError) {
                    console.error('Failed to record bank income:', incomeError);
                }
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
            type: transaction.type.toLowerCase(),
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
    }
    catch (error) {
        console.error('Error creating transaction with ledger:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};
exports.createTransactionWithLedger = createTransactionWithLedger;
// Create a new transaction (original implementation for complex cases)
const createTransaction = async (req, res) => {
    try {
        const { accountId, type, amount, description, reference } = req.body;
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
        } // Validate account is active
        if (account.status.toUpperCase() !== 'ACTIVE') {
            return res.status(400).json({ error: 'Account is not active' });
        } // Convert type to uppercase for database
        const transactionType = type.toUpperCase().replace('-', '_');
        // Validate transaction type
        if (!['DEPOSIT', 'DEPOSIT_SHARES', 'WITHDRAWAL', 'TRANSFER', 'LOAN_REPAYMENT'].includes(transactionType)) {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }
        // Validate amount
        const transactionAmount = Number(amount);
        if (transactionAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        } // Validate transaction type constraints
        if (transactionType === 'LOAN_REPAYMENT') {
            // Loan repayments can only be made to loan accounts
            if (account.type !== 'LOAN') {
                return res.status(400).json({
                    error: 'Loan repayments can only be made to loan accounts'
                });
            }
            // For loan accounts, check if repayment is still needed
            const currentDebt = Math.abs(Number(account.balance)); // Convert negative balance to positive debt amount
            // Get loan info to check guarantor reimbursement status
            const loan = await prisma.loan.findUnique({
                where: { accountId },
                select: {
                    amount: true,
                    // TODO: Add guarantor percentage fields when available
                    // guarantor1Percentage: true,
                    // guarantor2Percentage: true,
                    // guarantor3Percentage: true,
                    // TODO: Add guarantor account ID fields when available
                    // guarantor1AccountId: true,
                    // guarantor2AccountId: true,
                    // guarantor3AccountId: true
                }
            });
            let guarantorStillOwed = 0;
            if (loan) {
                // Calculate total guarantor contribution
                // TODO: Implement guarantor percentage calculation when fields are available
                const totalGuarantorPercentage = 0; // Placeholder
                const totalGuarantorContribution = (Number(loan.amount) * totalGuarantorPercentage) / 100;
                // Check guarantor reimbursement status
                // TODO: Implement guarantor account lookup when fields are available
                const guarantorAccountIds = []; // Placeholder
                if (guarantorAccountIds.length > 0) {
                    const guarantorReimbursements = await prisma.transaction.findMany({
                        where: {
                            AND: [
                                {
                                    OR: [
                                        {
                                            description: {
                                                contains: 'Guarantor reimbursement'
                                            }
                                        },
                                        {
                                            description: {
                                                contains: 'Loan repayment disbursement'
                                            }
                                        }
                                    ]
                                },
                                {
                                    accountId: {
                                        in: guarantorAccountIds
                                    }
                                },
                                {
                                    reference: {
                                        contains: 'GRB-'
                                    }
                                }
                            ]
                        }
                    });
                    const guarantorTotalReimbursed = guarantorReimbursements.reduce((sum, txn) => sum + Number(txn.amount), 0);
                    guarantorStillOwed = Math.max(0, totalGuarantorContribution - guarantorTotalReimbursed);
                }
            }
            // Allow repayment if there's outstanding debt OR guarantors still need reimbursement
            if (currentDebt === 0 && guarantorStillOwed === 0) {
                return res.status(400).json({
                    error: 'Loan is fully paid and all guarantors have been reimbursed'
                });
            }
            // Debug logging for validation
            console.log('DEBUG - Payment Validation:');
            console.log(`  Current Debt: ${currentDebt}`);
            console.log(`  Guarantor Still Owed: ${guarantorStillOwed}`);
            console.log(`  Total Obligations: ${currentDebt + guarantorStillOwed}`);
            console.log(`  Transaction Amount: ${transactionAmount}`);
            console.log(`  Should Reject: ${currentDebt > 0 && transactionAmount > currentDebt + guarantorStillOwed}`);
            // If there's debt, check that payment doesn't exceed it + remaining guarantor obligations
            if (currentDebt > 0 && transactionAmount > currentDebt + guarantorStillOwed) {
                return res.status(400).json({
                    error: `Repayment amount ($${transactionAmount}) exceeds total remaining obligations (debt: $${currentDebt} + guarantor reimbursement: $${guarantorStillOwed})`
                });
            }
        }
        // For withdrawals, check if account has sufficient balance
        if (transactionType === 'WITHDRAWAL') {
            const currentBalance = Number(account.balance);
            const overdraftLimit = Number(account.overdraftLimit || 0);
            const availableBalance = currentBalance + overdraftLimit;
            if (transactionAmount > availableBalance) {
                return res.status(400).json({
                    error: 'Insufficient funds for withdrawal'
                });
            }
        } // Generate unique reference if not provided
        const transactionReference = reference || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`; // Handle loan repayment with guarantor disbursement
        if (transactionType === 'LOAN_REPAYMENT') {
            return await handleLoanRepaymentWithDisbursement(accountId, transactionAmount, description, transactionReference, account, res);
        }
        // Create transaction for non-loan repayments
        const transaction = await prisma.transaction.create({
            data: {
                accountId,
                type: transactionType,
                amount: transactionAmount,
                description: description || `${transactionType} transaction`,
                reference: transactionReference,
                status: 'COMPLETED' // For now, all transactions are immediately completed
            },
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
        }); // Update account balance
        let newBalance = Number(account.balance);
        let newShareBalance = Number(account.shareBalance || 0);
        if (transactionType === 'DEPOSIT') {
            newBalance += transactionAmount;
        }
        else if (transactionType === 'DEPOSIT_SHARES') {
            // For shares deposits, update the shareBalance instead of main balance
            newShareBalance += transactionAmount;
        }
        else if (transactionType === 'WITHDRAWAL') {
            newBalance -= transactionAmount;
        }
        else if (transactionType === 'LOAN_REPAYMENT') {
            // For loan repayments, we need to:
            // 1. Apply 50% of payment to reduce loan debt
            // 2. Distribute remaining 50% back to guarantors based on their percentages
            // First, apply 50% to reduce the loan debt
            const debtReductionAmount = transactionAmount * 0.5;
            newBalance += debtReductionAmount;
            // Get the loan information to find guarantors with their account IDs
            const loan = await prisma.loan.findFirst({
                where: { accountId },
                select: {
                    id: true,
                    // TODO: Add guarantor fields when available
                    // guarantor1Id: true,
                    // guarantor1AccountId: true,
                    // guarantor1Percentage: true,
                    // TODO: Add guarantor relations when available
                    // guarantor1: {
                    //   select: { name: true }
                    // },
                }
            });
            if (loan) {
                // TODO: Implement guarantor disbursement when fields are available
                const guarantorDisbursementAmount = transactionAmount * 0.5;
                // Get active guarantors with their percentages
                const activeGuarantors = [];
                // TODO: Add guarantor processing when fields are available
                // if (loan.guarantor1Id && loan.guarantor1AccountId && loan.guarantor1Percentage) {
                //   activeGuarantors.push({
                //     accountId: loan.guarantor1AccountId,
                //     percentage: loan.guarantor1Percentage,
                //     customerName: loan.guarantor1?.name || 'Unknown'
                //   });
                // }
                // Calculate total percentage of active guarantors
                const totalActivePercentage = activeGuarantors.reduce((sum, g) => sum + g.percentage, 0);
                // Distribute disbursement amount to guarantors based on their relative percentages
                if (activeGuarantors.length > 0 && totalActivePercentage > 0) {
                    for (const guarantor of activeGuarantors) {
                        const guarantorShare = (guarantor.percentage / totalActivePercentage) * guarantorDisbursementAmount;
                        // Update guarantor account balance
                        await prisma.account.update({
                            where: { id: guarantor.accountId },
                            data: {
                                balance: {
                                    increment: guarantorShare
                                },
                                lastTransactionDate: new Date()
                            }
                        });
                        // Create transaction record for guarantor disbursement
                        await prisma.transaction.create({
                            data: {
                                type: 'DEPOSIT',
                                amount: guarantorShare,
                                accountId: guarantor.accountId,
                                description: `Loan repayment disbursement from loan ${account.accountNumber} (${guarantor.percentage}% share)`,
                                reference: `LRD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                                status: 'COMPLETED'
                            }
                        });
                    }
                }
            }
        }
        // Update account balance and last transaction date
        const updateData = {
            balance: newBalance,
            lastTransactionDate: new Date()
        };
        // For shares deposits, also update the shareBalance
        if (transactionType === 'DEPOSIT_SHARES') {
            updateData.shareBalance = newShareBalance;
        }
        await prisma.account.update({
            where: { id: accountId },
            data: updateData
        });
        // For withdrawals, automatically deduct 5 cedis charge and record as bank income
        if (transactionType === 'WITHDRAWAL') {
            const withdrawalCharge = 5.00;
            // Deduct charge from account
            await prisma.account.update({
                where: { id: accountId },
                data: {
                    balance: {
                        decrement: withdrawalCharge
                    }
                }
            }); // Create charge transaction record
            const chargeTransaction = await prisma.transaction.create({
                data: {
                    accountId,
                    type: client_1.TransactionType.WITHDRAWAL,
                    amount: withdrawalCharge,
                    description: 'withdrawal charge',
                    reference: `CHG-${transactionReference}`,
                    status: client_1.TransactionStatus.COMPLETED
                }
            });
            // Record as bank income
            try {
                await bankIncome_service_1.BankIncomeService.recordWithdrawalCharge(transaction.id, accountId, account.customerId, withdrawalCharge);
            }
            catch (error) {
                console.error('Error recording withdrawal charge as income:', error);
                // Don't fail the transaction if income recording fails
            }
            // Update the account balance in our response to reflect the charge
            newBalance -= withdrawalCharge;
        }
        // Format transaction for response
        const formattedTransaction = {
            id: transaction.id,
            accountId: transaction.accountId,
            accountNumber: transaction.account.accountNumber,
            customerName: transaction.account.customer.name,
            customerId: transaction.account.customer.id,
            amount: Number(transaction.amount),
            type: transaction.type.toLowerCase(),
            status: transaction.status.toLowerCase(),
            date: transaction.date.toISOString(),
            description: transaction.description,
            reference: transaction.reference,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
            // Include updated account balance in response for better frontend feedback
            accountBalance: newBalance
        };
        res.status(201).json(formattedTransaction);
    }
    catch (error) {
        console.error('Error creating transaction:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Transaction reference must be unique' });
        }
        else {
            res.status(500).json({ error: 'Failed to create transaction' });
        }
    }
};
exports.createTransaction = createTransaction;
// Update transaction status (for pending transactions)
const updateTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        // Validate status
        const validStatuses = ['COMPLETED', 'PENDING', 'FAILED'];
        if (!validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ error: 'Invalid status' });
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
        // Update transaction status
        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: { status: status.toUpperCase() },
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
        // If status is being set to COMPLETED, update account balance
        if (status.toUpperCase() === 'COMPLETED') {
            const account = existingTransaction.account;
            let newBalance = Number(account.balance);
            const amount = Number(existingTransaction.amount);
            if (existingTransaction.type === 'DEPOSIT') {
                newBalance += amount;
            }
            else if (existingTransaction.type === 'WITHDRAWAL') {
                newBalance -= amount;
            }
            await prisma.account.update({
                where: { id: existingTransaction.accountId },
                data: {
                    balance: newBalance,
                    lastTransactionDate: new Date()
                }
            });
        }
        // Format transaction for response
        const formattedTransaction = {
            id: updatedTransaction.id,
            accountId: updatedTransaction.accountId,
            accountNumber: updatedTransaction.account.accountNumber,
            customerName: updatedTransaction.account.customer.name,
            customerId: updatedTransaction.account.customer.id,
            amount: Number(updatedTransaction.amount),
            type: updatedTransaction.type.toLowerCase(),
            status: updatedTransaction.status.toLowerCase(),
            date: updatedTransaction.date.toISOString(),
            description: updatedTransaction.description,
            reference: updatedTransaction.reference,
            createdAt: updatedTransaction.createdAt.toISOString(),
            updatedAt: updatedTransaction.updatedAt.toISOString()
        };
        res.json(formattedTransaction);
    }
    catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};
exports.updateTransactionStatus = updateTransactionStatus;
// Get transaction statistics
const getTransactionStats = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        // Build date filter
        const dateFilter = {};
        if (dateFrom || dateTo) {
            if (dateFrom)
                dateFilter.gte = new Date(dateFrom);
            if (dateTo)
                dateFilter.lte = new Date(dateTo);
        }
        else {
            // Default to current month if no date range provided
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            dateFilter.gte = startOfMonth;
            dateFilter.lte = endOfMonth;
        }
        // Get transaction statistics
        const [totalTransactions, totalDeposits, totalWithdrawals, totalTransfers, completedTransactions, pendingTransactions, failedTransactions] = await Promise.all([
            prisma.transaction.count({
                where: { date: dateFilter }
            }),
            prisma.transaction.aggregate({
                where: {
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    date: dateFilter
                },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: {
                    type: 'WITHDRAWAL',
                    status: 'COMPLETED',
                    date: dateFilter
                },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: {
                    type: 'TRANSFER',
                    status: 'COMPLETED',
                    date: dateFilter
                },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.count({
                where: {
                    status: 'COMPLETED',
                    date: dateFilter
                }
            }),
            prisma.transaction.count({
                where: {
                    status: 'PENDING',
                    date: dateFilter
                }
            }),
            prisma.transaction.count({
                where: {
                    status: 'FAILED',
                    date: dateFilter
                }
            })
        ]);
        const stats = {
            totalTransactions,
            transactionsByType: {
                deposits: {
                    count: totalDeposits._count,
                    amount: Number(totalDeposits._sum.amount || 0)
                },
                withdrawals: {
                    count: totalWithdrawals._count,
                    amount: Number(totalWithdrawals._sum.amount || 0)
                },
                transfers: {
                    count: totalTransfers._count,
                    amount: Number(totalTransfers._sum.amount || 0)
                }
            },
            transactionsByStatus: {
                completed: completedTransactions,
                pending: pendingTransactions,
                failed: failedTransactions
            }
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({ error: 'Failed to fetch transaction statistics' });
    }
};
exports.getTransactionStats = getTransactionStats;
// Handle loan repayment with proper business logic
async function handleLoanRepaymentWithDisbursement(accountId, repaymentAmount, description, transactionReference, account, res) {
    console.log('🔥 ENTERING new handleLoanRepaymentWithDisbursement');
    console.log(`🔥 AccountId: ${accountId}, Amount: ${repaymentAmount}`);
    try { // Get the loan information including guarantor account details
        const loan = await prisma.loan.findUnique({
            where: { accountId },
            select: {
                id: true,
                customerId: true,
                accountId: true,
                amount: true,
                totalPayable: true,
                amountPaid: true,
                outstandingBalance: true,
                status: true,
                guaranteeRequired: true, // Add this field
                // New tracking fields
                totalPaid: true,
                totalInterestPaid: true,
                guarantorReimbursed: true,
                principalRemaining: true,
                isCompleted: true,
                lastPaymentDate: true,
                lastPaymentAmount: true,
                // TODO: Add guarantor info fields when available
                // guarantor1Id: true,
                // guarantor1AccountId: true,
                // guarantor1Percentage: true,
                // Relations
                customer: true,
                // TODO: Add guarantor account relations when available
                // guarantor1Account: {
                //   include: { customer: true }
                // },
                // TODO: Add remaining guarantor account relations when available
                // guarantor2Account: {
                //   include: { customer: true }
                // },
            }
        });
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found for this account' });
        } // Prepare current loan state for our repayment logic
        const loanAmount = Number(loan.amount);
        const totalInterest = loanAmount * 0.10; // 10% interest
        const totalPayable = loanAmount + totalInterest;
        const currentLoanState = {
            loanAmount: loanAmount,
            totalRepayable: totalPayable,
            guarantorAdvance: Number(loan.guaranteeRequired || 0),
            totalPaid: Number(loan.totalPaid || 0),
            totalInterestPaid: Number(loan.totalInterestPaid || 0),
            guarantorReimbursed: Number(loan.guarantorReimbursed || 0),
            principalRemaining: Number(loan.principalRemaining || loanAmount),
            isCompleted: Boolean(loan.isCompleted || false)
        };
        console.log('Current loan state:', currentLoanState);
        console.log('Loan details:', {
            amount: loan.amount,
            guaranteeRequired: loan.guaranteeRequired,
            totalPayable: totalPayable
        });
        // Apply repayment logic
        const repaymentResult = (0, loanRepayment_service_1.makeRepayment)(repaymentAmount, currentLoanState);
        if (!repaymentResult.success) {
            return res.status(400).json({ error: repaymentResult.error });
        }
        console.log('Repayment calculation result:', repaymentResult);
        // Get active guarantors from the database
        const activeGuarantors = [];
        // Get guarantors for this loan
        const loanGuarantors = await prisma.loanGuarantor.findMany({
            where: {
                loanId: loan.id,
                status: 'ACTIVE'
            },
            include: {
                guarantorAccount: {
                    include: { customer: true }
                }
            }
        });
        // Calculate total guaranteed amount and percentages
        const totalGuaranteed = loanGuarantors.reduce((sum, g) => sum + Number(g.guaranteedAmount), 0);
        for (const guarantor of loanGuarantors) {
            const guaranteedAmount = Number(guarantor.guaranteedAmount);
            const percentage = loanAmount > 0 ? (guaranteedAmount / loanAmount) * 100 : 0;
            activeGuarantors.push({
                accountId: guarantor.guarantorAccountId,
                percentage: percentage,
                account: guarantor.guarantorAccount,
                guaranteedAmount: guaranteedAmount
            });
        }
        console.log(`Found ${activeGuarantors.length} active guarantors with total guarantee: ₵${totalGuaranteed.toLocaleString()}`);
        // Execute all operations in a transaction
        const result = await prisma.$transaction(async (tx) => {
            var _a, _b, _c;
            // 1. Create the main loan repayment transaction
            const loanRepaymentTransaction = await tx.transaction.create({
                data: {
                    accountId,
                    type: 'LOAN_REPAYMENT',
                    amount: repaymentResult.payment.amount,
                    description: description || `Loan repayment - GH₵${repaymentResult.payment.amount} (Interest: GH₵${repaymentResult.payment.breakdown.interestPaid.toFixed(2)}, Guarantor: GH₵${repaymentResult.payment.breakdown.guarantorReimbursement.toFixed(2)}, Loan: GH₵${repaymentResult.payment.breakdown.loanReduction.toFixed(2)})`,
                    reference: transactionReference,
                    status: 'COMPLETED'
                },
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
            // 2. Handle guarantor reimbursements if any
            const disbursementTransactions = [];
            const guarantorReimbursement = repaymentResult.payment.breakdown.guarantorReimbursement;
            if (guarantorReimbursement > 0 && activeGuarantors.length > 0) {
                // Calculate total active guarantor percentage
                const totalActivePercentage = activeGuarantors.reduce((sum, g) => sum + g.percentage, 0);
                // Distribute reimbursement proportionally among guarantors
                for (const guarantor of activeGuarantors) {
                    const guarantorShare = (guarantor.percentage / totalActivePercentage) * guarantorReimbursement;
                    if (guarantorShare > 0) {
                        // Update guarantor account balance
                        await tx.account.update({
                            where: { id: guarantor.accountId },
                            data: {
                                balance: {
                                    increment: guarantorShare
                                },
                                lastTransactionDate: new Date()
                            }
                        });
                        // Create disbursement transaction record
                        const disbursementTransaction = await tx.transaction.create({
                            data: {
                                accountId: guarantor.accountId,
                                type: 'DEPOSIT',
                                amount: guarantorShare,
                                description: `Guarantor reimbursement from loan repayment - ${loan.customerId} (${guarantor.percentage}% share)`, // TODO: Include customer relation for name
                                reference: `GRB-${transactionReference}-${guarantor.accountId.slice(-6)}`,
                                status: 'COMPLETED'
                            }
                        });
                        disbursementTransactions.push(Object.assign(Object.assign({}, disbursementTransaction), { guarantorName: ((_b = (_a = guarantor.account) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown', accountNumber: ((_c = guarantor.account) === null || _c === void 0 ? void 0 : _c.accountNumber) || 'Unknown', percentage: guarantor.percentage }));
                    }
                }
            }
            // 3. Update the loan account balance (the loan reduction amount reduces debt)
            const loanReduction = repaymentResult.payment.breakdown.loanReduction;
            const newLoanBalance = Number(account.balance) + loanReduction;
            await tx.account.update({
                where: { id: accountId },
                data: {
                    balance: newLoanBalance,
                    lastTransactionDate: new Date()
                }
            }); // 4. Update loan record with new tracking data
            const updatedLoanState = repaymentResult.loanState;
            const isLoanCompleted = repaymentResult.isCompleted;
            // Calculate proper outstanding balance
            // If loan is completed, outstanding should be 0
            // Otherwise, it's the remaining balance from our logic
            const newOutstandingBalance = isLoanCompleted ? 0 : repaymentResult.remainingBalance;
            await tx.loan.update({
                where: { id: loan.id },
                data: {
                    totalPaid: updatedLoanState.totalPaid,
                    totalInterestPaid: updatedLoanState.totalInterestPaid,
                    guarantorReimbursed: updatedLoanState.guarantorReimbursed,
                    principalRemaining: updatedLoanState.principalRemaining,
                    isCompleted: updatedLoanState.isCompleted,
                    lastPaymentDate: new Date(),
                    lastPaymentAmount: repaymentResult.payment.amount,
                    // Update legacy fields for compatibility
                    amountPaid: updatedLoanState.totalPaid,
                    outstandingBalance: newOutstandingBalance,
                    status: updatedLoanState.isCompleted ? 'PAID' : 'ACTIVE'
                }
            });
            // 5. Record interest as bank income
            const interestPaid = repaymentResult.payment.breakdown.interestPaid;
            if (interestPaid > 0) {
                await tx.bankIncome.create({
                    data: {
                        type: 'LOAN_INTEREST',
                        amount: interestPaid,
                        description: `Interest income from loan repayment - ${loan.customerId} (${account.accountNumber})`, // TODO: Include customer relation for name
                        sourceId: transactionReference,
                        sourceType: 'LOAN_REPAYMENT',
                        accountId: accountId,
                        customerId: loan.customerId
                    }
                });
            }
            return {
                loanRepaymentTransaction,
                disbursementTransactions,
                newLoanBalance,
                repaymentBreakdown: repaymentResult.payment.breakdown,
                loanState: repaymentResult.loanState,
                remainingBalance: repaymentResult.remainingBalance,
                isCompleted: repaymentResult.isCompleted,
                activeGuarantorsCount: activeGuarantors.length
            };
        }, {
            timeout: 10000 // Increase timeout to 10 seconds
        });
        // Format response
        const formattedTransaction = {
            id: result.loanRepaymentTransaction.id,
            accountId: result.loanRepaymentTransaction.accountId,
            accountNumber: result.loanRepaymentTransaction.account.accountNumber,
            customerName: result.loanRepaymentTransaction.account.customer.name,
            customerId: result.loanRepaymentTransaction.account.customer.id,
            amount: Number(result.loanRepaymentTransaction.amount),
            type: result.loanRepaymentTransaction.type.toLowerCase(),
            status: result.loanRepaymentTransaction.status.toLowerCase(),
            date: result.loanRepaymentTransaction.date.toISOString(),
            description: result.loanRepaymentTransaction.description,
            reference: result.loanRepaymentTransaction.reference,
            createdAt: result.loanRepaymentTransaction.createdAt.toISOString(),
            updatedAt: result.loanRepaymentTransaction.updatedAt.toISOString(),
            accountBalance: result.newLoanBalance,
            // Additional loan repayment details using proper business logic
            repaymentDetails: {
                totalRepayment: repaymentResult.payment.amount,
                breakdown: {
                    interestPaid: result.repaymentBreakdown.interestPaid,
                    guarantorReimbursement: result.repaymentBreakdown.guarantorReimbursement,
                    loanReduction: result.repaymentBreakdown.loanReduction
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
                disbursements: result.disbursementTransactions.map(dt => ({
                    guarantorName: dt.guarantorName,
                    accountNumber: dt.accountNumber,
                    amount: Number(dt.amount),
                    percentage: dt.percentage,
                    reference: dt.reference
                }))
            }
        };
        // 6. Handle guarantor fund reimbursement if loan is completed
        if (result.isCompleted) {
            console.log('🎉 Loan completed! Processing guarantor fund reimbursement...');
            try {
                // Import the guarantor reimbursement service
                const { createGuarantorReimbursementService } = await Promise.resolve().then(() => __importStar(require('../services/guarantorReimbursement.service')));
                const reimbursementService = createGuarantorReimbursementService(prisma);
                // Process the reimbursement
                const reimbursementResult = await reimbursementService.processLoanCompletionReimbursement(loan.id);
                if (reimbursementResult.success) {
                    console.log(`✅ Guarantor funds reimbursed: ${reimbursementResult.message}`);
                    // Add reimbursement details to response
                    formattedTransaction.repaymentDetails.guarantorFundReimbursement = {
                        processed: true,
                        totalCreditedBack: reimbursementResult.totalCreditedBack,
                        guarantorsReimbursed: reimbursementResult.reimbursements.length,
                        details: reimbursementResult.reimbursements.map(r => ({
                            guarantorName: r.guarantorName,
                            accountNumber: r.accountNumber,
                            amount: r.creditedBack,
                            transactionId: r.transactionId
                        }))
                    };
                }
                else {
                    console.warn(`⚠️ Guarantor fund reimbursement failed: ${reimbursementResult.error}`);
                    // Add failure info to response
                    formattedTransaction.repaymentDetails.guarantorFundReimbursement = {
                        processed: false,
                        error: reimbursementResult.error
                    };
                }
            }
            catch (reimbursementError) {
                console.error('Error during guarantor fund reimbursement:', reimbursementError);
                // Add error info to response but don't fail the main transaction
                formattedTransaction.repaymentDetails.guarantorFundReimbursement = {
                    processed: false,
                    error: 'Failed to process guarantor fund reimbursement'
                };
            }
        }
        return res.status(201).json(formattedTransaction);
    }
    catch (error) {
        console.error('Error processing loan repayment with proper logic:', error);
        return res.status(500).json({ error: 'Failed to process loan repayment' });
    }
}
// Get account notifications including loan and guarantee information
const getAccountNotifications = async (req, res) => {
    try {
        const { accountId } = req.params;
        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required' });
        }
        const guaranteeService = new guarantee_service_1.GuaranteeService(prisma);
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
    }
    catch (error) {
        console.error('Error getting account notifications:', error);
        res.status(500).json({ error: 'Failed to get account notifications' });
    }
};
exports.getAccountNotifications = getAccountNotifications;
// Get customer guarantee information across all accounts
const getCustomerGuaranteeInfo = async (req, res) => {
    try {
        const { customerId } = req.params;
        if (!customerId) {
            return res.status(400).json({ error: 'Customer ID is required' });
        }
        const guaranteeService = new guarantee_service_1.GuaranteeService(prisma);
        const guaranteeInfo = await guaranteeService.getCustomerGuaranteeInfo(customerId);
        res.json({
            customerId,
            accountsWithRestrictions: guaranteeInfo.length,
            accounts: guaranteeInfo
        });
    }
    catch (error) {
        console.error('Error getting customer guarantee info:', error);
        res.status(500).json({ error: 'Failed to get customer guarantee information' });
    }
};
exports.getCustomerGuaranteeInfo = getCustomerGuaranteeInfo;
// Get withdrawal availability check
const checkWithdrawalAvailability = async (req, res) => {
    try {
        const { accountId } = req.params;
        const { amount } = req.query;
        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required' });
        }
        const guaranteeService = new guarantee_service_1.GuaranteeService(prisma);
        const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(accountId);
        const requestedAmount = amount ? parseFloat(amount) : 0;
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
    }
    catch (error) {
        console.error('Error checking withdrawal availability:', error);
        res.status(500).json({ error: 'Failed to check withdrawal availability' });
    }
};
exports.checkWithdrawalAvailability = checkWithdrawalAvailability;
// Get enhanced account balance information including original balance before guarantor deductions
const getEnhancedAccountBalance = async (req, res) => {
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
        const guaranteeService = new guarantee_service_1.GuaranteeService(prisma);
        const guaranteeInfo = await guaranteeService.getAccountGuaranteeInfo(accountId);
        const withdrawalInfo = await guaranteeService.calculateAvailableForWithdrawal(accountId);
        res.json({
            accountId,
            accountNumber: account.accountNumber,
            balanceInformation: {
                originalBalance, // Balance before any guarantor deductions
                currentBalance, // Current balance after deductions and reimbursements
                availableBalance: withdrawalInfo.availableAmount, // Available for withdrawal
                guarantorActivity: {
                    totalDeducted, // Total amount deducted for guarantees
                    totalReimbursed, // Total amount reimbursed from completed loans
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
    }
    catch (error) {
        console.error('Error getting enhanced account balance:', error);
        res.status(500).json({ error: 'Failed to get enhanced account balance' });
    }
};
exports.getEnhancedAccountBalance = getEnhancedAccountBalance;
