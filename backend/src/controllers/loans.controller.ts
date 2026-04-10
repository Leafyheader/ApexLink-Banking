import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Define the authenticated request interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
  };
}

const prisma = new PrismaClient();

// Validation schemas
const createLoanSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  interestRate: z.number().min(0),
  term: z.number().int().positive(),
  repaymentFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']),
  guarantor1Id: z.string().uuid().optional(),
  guarantor1AccountId: z.string().uuid().optional(),
  guarantor1Percentage: z.number().int().min(0).max(100).optional(),
  guarantor2Id: z.string().uuid().optional(),
  guarantor2AccountId: z.string().uuid().optional(),
  guarantor2Percentage: z.number().int().min(0).max(100).optional(),
  guarantor3Id: z.string().uuid().optional(),
  guarantor3AccountId: z.string().uuid().optional(),
  guarantor3Percentage: z.number().int().min(0).max(100).optional(),
});

const getLoanSchema = z.object({
  id: z.string().uuid(),
});

const updateLoanSchema = z.object({
  amount: z.number().positive().optional(),
  interestRate: z.number().min(0).optional(),
  term: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'PAID', 'DEFAULTED', 'CLOSED']).optional(),
  repaymentFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional(),
});

// Helper function to calculate loan details using flat rate interest
function calculateLoanDetails(amount: number, interestRate: number, termInMonths: number) {
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
async function generateLoanAccountNumber(): Promise<string> {
  let accountNumber: string;
  let exists = true;
  
  while (exists) {
    // Generate account number starting with 'L' for loan
    accountNumber = 'L' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    
    const existingAccount = await prisma.account.findUnique({
      where: { accountNumber }
    });
    
    exists = !!existingAccount;
  }
  
  return accountNumber!;
}

// Get all loans
export const getLoans = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', search = '', status } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const whereClause: any = {};
    
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
          },
          // TODO: Add guarantor relations when LoanGuarantor model is available
          // guarantor1: {
          //   select: {
          //     id: true,
          //     name: true,
          //     phone: true
          //   }
          // },
          // guarantor1Account: {
          //   select: {
          //     id: true,
          //     accountNumber: true,
          //     type: true,
          //     balance: true
          //   }
          // },
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
    const loansWithAmountPaid = await Promise.all(
      loans.map(async (loan) => {
        const repaymentSum = await prisma.transaction.aggregate({
          where: {
            accountId: loan.accountId,
            type: 'LOAN_REPAYMENT',
            status: 'COMPLETED'
          },
          _sum: {
            amount: true
          }
        });        const actualAmountPaid = Number(repaymentSum._sum.amount || 0);
        const originalDebt = Number(loan.totalPayable);
        // TODO: Get balance from account using accountId when account relation is available
        const currentBalance = 0; // Placeholder - need to implement account balance lookup
        
        // For PAID/completed loans, use the stored outstandingBalance instead of calculating from account balance
        const actualOutstandingBalance = loan.status === 'PAID' || loan.isCompleted 
          ? Number(loan.outstandingBalance || 0)
          : Math.abs(currentBalance);

        return {
          ...loan,
          amountPaid: actualAmountPaid,
          outstandingBalance: actualOutstandingBalance
        };
      })
    );    
    res.json({
      loans: loansWithAmountPaid,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
};

// Get single loan
export const getLoan = async (req: Request, res: Response) => {
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

    // Fetch guarantor details using LoanGuarantor model
    console.log(`Fetching guarantor details for loan ${id}`);
    const guarantors = await prisma.loanGuarantor.findMany({
      where: { loanId: id },
      include: {
        guarantor: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true
          }
        },
        guarantorAccount: {
          select: {
            id: true,
            accountNumber: true,
            type: true,
            balance: true,
            shareBalance: true
          }
        }
      }
    });
    console.log(`Found ${guarantors.length} guarantors for loan ${id}`);
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
    });    const actualAmountPaid = Number(repaymentSum._sum.amount || 0);
    const currentBalance = Number(loan.account?.balance || 0);
    
    // For PAID/completed loans, use the stored outstandingBalance instead of calculating from account balance
    const actualOutstandingBalance = loan.status === 'PAID' || loan.isCompleted 
      ? Number(loan.outstandingBalance || 0)
      : Math.abs(currentBalance);

    // Format guarantor details for response
    const guarantorDetails = guarantors.map(guarantor => ({
      id: guarantor.guarantor.id,
      name: guarantor.guarantor.name,
      phone: guarantor.guarantor.phone,
      email: guarantor.guarantor.email,
      address: guarantor.guarantor.address,
      account: {
        id: guarantor.guarantorAccount.id,
        accountNumber: guarantor.guarantorAccount.accountNumber,
        type: guarantor.guarantorAccount.type,
        balance: Number(guarantor.guarantorAccount.balance),
        shareBalance: Number(guarantor.guarantorAccount.shareBalance || 0)
      },
      guaranteedAmount: Number(guarantor.guaranteedAmount),
      status: guarantor.status,
      createdAt: guarantor.createdAt
    }));

    const loanWithAmountPaid = {
      ...loan,
      amountPaid: actualAmountPaid,
      outstandingBalance: actualOutstandingBalance,
      guarantorDetails
    };
    
    res.json({ loan: loanWithAmountPaid });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
};

// Create new loan
export const createLoan = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createLoanSchema.parse(req.body);    const {
      customerId,
      amount,
      interestRate,
      term,
      repaymentFrequency,
      guarantor1Id,
      guarantor1AccountId,
      guarantor1Percentage,
      guarantor2Id,
      guarantor2AccountId,
      guarantor2Percentage,
      guarantor3Id,
      guarantor3AccountId,
      guarantor3Percentage
    } = validatedData;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // NEW VALIDATION: Check loan amount against account balance limit (2x account balance)
    // Note: In the current implementation, customerAccountId is not passed from frontend
    // We'll need to get the customer's primary/active account for this validation
    const customerAccounts = await prisma.account.findMany({
      where: {
        customerId: customerId,
        status: 'ACTIVE',
        authorizationStatus: 'APPROVED',
        type: { not: 'LOAN' } // Exclude loan accounts
      },
      orderBy: {
        createdAt: 'desc' // Get the most recent account
      }
    });

    if (customerAccounts.length === 0) {
      return res.status(400).json({
        error: 'Customer has no active accounts. Cannot create loan without an account.'
      });
    }

    // Use the first (most recent) account for balance validation
    const primaryAccount = customerAccounts[0];
    const accountBalance = Number(primaryAccount.balance);
    const maxLoanAmount = accountBalance * 2; // Customer can borrow up to 2x their account balance

    if (amount > maxLoanAmount) {
      return res.status(400).json({
        error: `Loan amount exceeds limit. Maximum allowed: ₵${maxLoanAmount.toLocaleString()} (2x account balance of ₵${accountBalance.toLocaleString()})`,
        details: {
          requestedAmount: amount,
          maxAllowedAmount: maxLoanAmount,
          accountBalance: accountBalance,
          accountNumber: primaryAccount.accountNumber
        }
      });
    }

    console.log(`✅ Loan validation passed: ₵${amount.toLocaleString()} requested, max allowed ₵${maxLoanAmount.toLocaleString()}`);

    // Validate guarantor percentages sum to 50 if any guarantors are provided
    const totalPercentage = (guarantor1Percentage || 0) + (guarantor2Percentage || 0) + (guarantor3Percentage || 0);
    if ((guarantor1Id || guarantor2Id || guarantor3Id) && totalPercentage !== 50) {
      return res.status(400).json({ error: 'Guarantor percentages must sum to 50%' });
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
    }    // Validate guarantor accounts exist and have sufficient funds
    const guarantorAccounts: Array<{accountId: string, percentage: number, deductionAmount: number}> = [];
    
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
    const createdBy = req.user?.id;
    
    // Create loan account and loan in a transaction (NO financial transactions yet - pending approval)
    const result = await prisma.$transaction(async (tx) => {
      // Create loan account with ZERO balance (will be updated on approval)
      const loanAccount = await tx.account.create({
        data: {
          accountNumber,
          type: 'LOAN',
          balance: 0, // Zero balance until approved
          customerId,
          authorizationStatus: 'PENDING', // Loans require authorization
          createdBy
        }
      });
        // Create loan record with PENDING status
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
          monthlyPayment,
          customerContribution: 0,
          guaranteeRequired: 1,
          principalRemaining: amount,
          authorizationStatus: 'PENDING', // Loan requires authorization before activation
          status: 'ACTIVE', // Will remain ACTIVE but not disbursed until approved
          createdBy
          // approvedById and approvedAt will be set when loan is approved
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
          }
        }
      });

      // Create LoanGuarantor records (NO financial deductions yet - pending approval)
      for (const guarantorAccount of guarantorAccounts) {
        // Get the guarantor customer ID from the account
        const guarantorAccount_info = await tx.account.findUnique({
          where: { id: guarantorAccount.accountId },
          select: { customerId: true }
        });

        if (guarantorAccount_info) {
          // Create LoanGuarantor record (guarantor commits will be processed on approval)
          console.log(`Creating LoanGuarantor record for loan ${loan.id} with guarantor ${guarantorAccount_info.customerId}`);
          await tx.loanGuarantor.create({
            data: {
              loanId: loan.id,
              guarantorId: guarantorAccount_info.customerId,
              guarantorAccountId: guarantorAccount.accountId,
              guaranteedAmount: guarantorAccount.deductionAmount,
              status: 'ACTIVE'
            }
          });
        }
      }
      
      return loan;
    });
    
    res.status(201).json({ 
      message: 'Loan created successfully',
      loan: result 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
};

// Update loan
export const updateLoan = async (req: Request, res: Response) => {
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
    let updateData: any = { ...validatedData };
    
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
        }
        // TODO: Add guarantor relations when LoanGuarantor model is available
        // guarantor1: {
        //   select: {
        //     id: true,
        //     name: true,
        //     phone: true
        //   }
        // },
      }
    });
    
    res.json({ 
      message: 'Loan updated successfully',
      loan: updatedLoan 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
};

// Delete loan (soft delete - mark as cancelled)
export const deleteLoan = async (req: Request, res: Response) => {
  try {
    const { id } = getLoanSchema.parse(req.params);

    // Check if loan exists
    const existingLoan = await prisma.loan.findUnique({
      where: { id },
      include: {
        account: true,
        guarantors: true
      }
    });

    if (!existingLoan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check if loan can be deleted (only allow deletion of loans that haven't been disbursed or have no payments)
    if (existingLoan.amountPaid.toNumber() > 0) {
      return res.status(400).json({
        error: 'Cannot delete loan that has received payments. Please contact an administrator.'
      });
    }

    // Use transaction to safely update loan status and release any guarantees
    await prisma.$transaction(async (tx) => {
      // Mark loan as cancelled (soft delete)
      await tx.loan.update({
        where: { id },
        data: {
          status: 'CLOSED',
          outstandingBalance: 0,
          isCompleted: true,
          updatedAt: new Date()
        }
      });

      // Update guarantor statuses to released
      await tx.loanGuarantor.updateMany({
        where: {
          loanId: id
        },
        data: {
          status: 'RELEASED',
          updatedAt: new Date()
        }
      });

      // Note: We keep the loan account but mark it as closed
      // The account remains for audit purposes but is no longer active
      await tx.account.update({
        where: { id: existingLoan.accountId },
        data: {
          status: 'CLOSED',
          updatedAt: new Date()
        }
      });
    });

    res.json({
      message: 'Loan cancelled successfully',
      note: 'The loan has been marked as cancelled. The associated account remains for audit purposes.'
    });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ error: 'Failed to cancel loan' });
  }
};

// Get loan statistics
export const getLoanStats = async (req: Request, res: Response) => {
  try {
    // Calculate total loans disbursed (sum of all loan amounts, excluding CLOSED loans)
    const totalDisbursedResult = await prisma.loan.aggregate({
      where: {
        status: {
          not: 'CLOSED'
        }
      },
      _sum: {
        amount: true
      }
    });
    const totalDisbursed = Number(totalDisbursedResult._sum.amount || 0);

    // Calculate total loan repayments (sum of all LOAN_REPAYMENT transactions)
    const totalRepaymentResult = await prisma.transaction.aggregate({
      where: {
        type: 'LOAN_REPAYMENT'
        // Removed status filter to include all loan repayment transactions
      },
      _sum: {
        amount: true
      }
    });
    const totalRepayment = Number(totalRepaymentResult._sum.amount || 0);

    // Calculate total interest earned (total repayments - total disbursed)
    const totalInterestEarned = Math.max(0, totalRepayment - totalDisbursed);

    res.json({
      stats: {
        totalDisbursed,
        totalRepayment,
        totalInterestEarned
      }
    });
  } catch (error) {
    console.error('Error fetching loan stats:', error);
    res.status(500).json({ error: 'Failed to fetch loan statistics' });
  }
};

// Get customers for loan creation (only customers with active approved accounts)
export const getCustomersForLoan = async (req: Request, res: Response) => {
  try {
    const { search = '', page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {
      // Only include customers who have at least one active and approved account
      accounts: {
        some: {
          status: 'ACTIVE',
          authorizationStatus: 'APPROVED'
        }
      }
    };

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
  } catch (error) {
    console.error('Error fetching customers for loan:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// ==================== NEW LOAN GUARANTEE SYSTEM ====================

import { SimpleLoanService } from '../services/simple-loan.service';
const loanService = new SimpleLoanService(prisma);

// Check loan eligibility with guarantee requirements
export const checkLoanEligibility = async (req: Request, res: Response) => {
  try {
    const { customerId, accountId, amount, guarantor1Amount, guarantor1AccountId, 
            guarantor2Amount, guarantor2AccountId, guarantor3Amount, guarantor3AccountId } = req.body;

    // Validate required fields
    if (!customerId || !accountId || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerId, accountId, amount' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'Loan amount must be greater than 0' 
      });
    }

    // Build loan request with guarantors
    const loanRequest: any = {
      customerId,
      accountId,
      amount,
      interestRate: 12, // Default rate, can be customized
      term: 12 // Default term, can be customized
    };

    // Add guarantors if provided
    if (guarantor1Amount && guarantor1AccountId) {
      const guarantor1 = await prisma.customer.findFirst({
        where: { accounts: { some: { id: guarantor1AccountId } } }
      });
      if (guarantor1) {
        loanRequest.guarantor1Id = guarantor1.id;
        loanRequest.guarantor1AccountId = guarantor1AccountId;
        loanRequest.guarantor1Amount = guarantor1Amount;
      }
    }

    if (guarantor2Amount && guarantor2AccountId) {
      const guarantor2 = await prisma.customer.findFirst({
        where: { accounts: { some: { id: guarantor2AccountId } } }
      });
      if (guarantor2) {
        loanRequest.guarantor2Id = guarantor2.id;
        loanRequest.guarantor2AccountId = guarantor2AccountId;
        loanRequest.guarantor2Amount = guarantor2Amount;
      }
    }

    if (guarantor3Amount && guarantor3AccountId) {
      const guarantor3 = await prisma.customer.findFirst({
        where: { accounts: { some: { id: guarantor3AccountId } } }
      });
      if (guarantor3) {
        loanRequest.guarantor3Id = guarantor3.id;
        loanRequest.guarantor3AccountId = guarantor3AccountId;
        loanRequest.guarantor3Amount = guarantor3Amount;
      }
    }

    const eligibility = await loanService.checkLoanEligibility(loanRequest);
    
    res.json({
      success: true,
      eligibility
    });
  } catch (error) {
    console.error('Error checking loan eligibility:', error);
    res.status(500).json({ 
      error: 'Failed to check loan eligibility',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get available balance for withdrawal (considering loan guarantees)
export const getAvailableBalanceForWithdrawal = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const availableBalance = await loanService.getAvailableBalanceForWithdrawal(accountId);
    const actualBalance = account.balance.toNumber();
    const restrictedAmount = actualBalance - availableBalance;
    
    res.json({
      success: true,
      accountBalance: actualBalance,
      availableForWithdrawal: availableBalance,
      restrictedAmount: restrictedAmount,
      message: restrictedAmount > 0 
        ? `${restrictedAmount} is restricted due to loan guarantees`
        : 'Full balance available for withdrawal'
    });
  } catch (error) {
    console.error('Error getting available balance:', error);
    res.status(500).json({ 
      error: 'Failed to get available balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get loans where customer is a guarantor
export const getCustomerGuarantorLoans = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const loans = await loanService.getGuarantorLoans(customerId);
    
    // Calculate guarantee details for each loan
    const guaranteeDetails = loans.map(loan => {
      let guaranteedAmount = 0;
      let guaranteePercentage = 0;
      
      if (loan.guarantor1Id === customerId && loan.guarantor1Percentage) {
        guaranteePercentage = loan.guarantor1Percentage;
        guaranteedAmount = (loan.principalRemaining.toNumber() * loan.guarantor1Percentage) / 100;
      } else if (loan.guarantor2Id === customerId && loan.guarantor2Percentage) {
        guaranteePercentage = loan.guarantor2Percentage;
        guaranteedAmount = (loan.principalRemaining.toNumber() * loan.guarantor2Percentage) / 100;
      } else if (loan.guarantor3Id === customerId && loan.guarantor3Percentage) {
        guaranteePercentage = loan.guarantor3Percentage;
        guaranteedAmount = (loan.principalRemaining.toNumber() * loan.guarantor3Percentage) / 100;
      }

      return {
        ...loan,
        guaranteeDetails: {
          guaranteedAmount,
          guaranteePercentage,
          originalLoanAmount: loan.amount.toNumber(),
          remainingLoanBalance: loan.principalRemaining.toNumber()
        }
      };
    });
    
    res.json({
      success: true,
      guarantorLoans: guaranteeDetails
    });
  } catch (error) {
    console.error('Error getting guarantor loans:', error);
    res.status(500).json({ 
      error: 'Failed to get guarantor loans',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get loan authorizations (pending, approved, rejected)
export const getLoanAuthorizations = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || 'pending';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};

    // Filter by authorization status
    if (status !== 'all') {
      where.authorizationStatus = status.toUpperCase();
    }

    // Search by customer name or account number
    if (search) {
      where.OR = [
        {
          customer: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          account: {
            accountNumber: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    // Get total count for all authorization statuses
    const [totalLoans, approvedCount, pendingCount, rejectedCount] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.count({ where: { authorizationStatus: 'APPROVED' } }),
      prisma.loan.count({ where: { authorizationStatus: 'PENDING' } }),
      prisma.loan.count({ where: { authorizationStatus: 'REJECTED' } })
    ]);

    // Get loans with related data
    const loans = await prisma.loan.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        },
        account: {
          select: {
            accountNumber: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true
          }
        },
        guarantors: {
          include: {
            guarantor: {
              select: {
                id: true,
                name: true
              }
            },
            guarantorAccount: {
              select: {
                accountNumber: true,
                balance: true
              }
            }
          }
        }
      }
    });

    const summaryData = {
      total: approvedCount + pendingCount + rejectedCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount
    };

    // Format the loan data
    const formattedLoans = loans.map(loan => {
      // Get guarantor information from the guarantors array
      const guarantor1 = loan.guarantors[0];
      const guarantor2 = loan.guarantors[1];
      const guarantor3 = loan.guarantors[2];

      return {
        id: loan.id,
        customerId: loan.customerId,
        customerName: loan.customer.name,
        accountNumber: loan.account.accountNumber,
        amount: loan.amount.toNumber(),
        interestRate: loan.interestRate.toNumber(),
        term: loan.term,
        repaymentFrequency: loan.repaymentFrequency,
        totalPayable: loan.totalPayable.toNumber(),
        monthlyPayment: loan.monthlyPayment.toNumber(),
        requestedAt: loan.createdAt,
        requestedById: loan.createdBy || '',
        requestedByName: 'System', // TODO: Get from createdBy user relation when available
        approvedById: loan.approvedById,
        approvedByName: loan.approvedBy?.name,
        approvedAt: loan.approvedAt,
        rejectedReason: loan.rejectionReason,
        status: loan.authorizationStatus.toLowerCase(),
        guarantor1: guarantor1 ? {
          id: guarantor1.guarantor.id,
          name: guarantor1.guarantor.name,
          accountNumber: guarantor1.guarantorAccount.accountNumber,
          amount: guarantor1.guaranteedAmount.toNumber(),
          percentage: 0 // TODO: Calculate percentage from guaranteedAmount
        } : undefined,
        guarantor2: guarantor2 ? {
          id: guarantor2.guarantor.id,
          name: guarantor2.guarantor.name,
          accountNumber: guarantor2.guarantorAccount.accountNumber,
          amount: guarantor2.guaranteedAmount.toNumber(),
          percentage: 0
        } : undefined,
        guarantor3: guarantor3 ? {
          id: guarantor3.guarantor.id,
          name: guarantor3.guarantor.name,
          accountNumber: guarantor3.guarantorAccount.accountNumber,
          amount: guarantor3.guaranteedAmount.toNumber(),
          percentage: 0
        } : undefined
      };
    });

    res.json({
      loans: formattedLoans,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLoans / limit),
        totalLoans
      },
      summary: summaryData
    });
  } catch (error) {
    console.error('Error getting loan authorizations:', error);
    res.status(500).json({ 
      error: 'Failed to get loan authorizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Approve a loan (performs all financial transactions)
export const approveLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find the loan with guarantor information
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        account: true,
        guarantors: {
          include: {
            guarantor: true,
            guarantorAccount: true
          }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check if already approved or rejected
    if (loan.authorizationStatus === 'APPROVED') {
      return res.status(400).json({ error: 'Loan has already been approved' });
    }

    if (loan.authorizationStatus === 'REJECTED') {
      return res.status(400).json({ error: 'Loan has already been rejected' });
    }

    // Perform all financial transactions in a single transaction
    const updatedLoan = await prisma.$transaction(async (tx) => {
      // 1. Update loan account balance to reflect the loan amount (negative balance)
      await tx.account.update({
        where: { id: loan.accountId },
        data: {
          balance: -loan.amount.toNumber(), // Negative balance = amount owed
          authorizationStatus: 'APPROVED',
          lastTransactionDate: new Date()
        }
      });

      // 2. Create loan disbursement transaction record
      await tx.transaction.create({
        data: {
          type: 'DEPOSIT',
          amount: loan.amount,
          accountId: loan.accountId,
          description: `Loan disbursement - ${loan.amount.toNumber()} at ${loan.interestRate.toNumber()}% interest for ${loan.term} months`,
          reference: `LOAN-${loan.id.slice(-8)}`
        }
      });

      // 3. Process guarantor account deductions
      for (const guarantor of loan.guarantors) {
        // Deduct guaranteed amount from guarantor's account
        await tx.account.update({
          where: { id: guarantor.guarantorAccountId },
          data: {
            balance: {
              decrement: guarantor.guaranteedAmount.toNumber()
            },
            lastTransactionDate: new Date()
          }
        });

        // Create transaction record for guarantor deduction
        const percentage = (guarantor.guaranteedAmount.toNumber() / loan.amount.toNumber() * 100).toFixed(2);
        await tx.transaction.create({
          data: {
            type: 'WITHDRAWAL',
            amount: guarantor.guaranteedAmount,
            accountId: guarantor.guarantorAccountId,
            description: `Guarantor contribution for loan ${loan.id.slice(-8)} (${percentage}%)`,
            reference: `GRT-${loan.id.slice(-8)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
          }
        });
      }

      // 4. Update loan status to approved
      const updated = await tx.loan.update({
        where: { id },
        data: {
          authorizationStatus: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
          status: 'ACTIVE'
        },
        include: {
          customer: true,
          account: true,
          approvedBy: true
        }
      });

      return updated;
    });

    res.json({
      success: true,
      message: 'Loan approved successfully and funds disbursed',
      loan: {
        id: updatedLoan.id,
        customerName: updatedLoan.customer.name,
        amount: updatedLoan.amount.toNumber(),
        status: updatedLoan.authorizationStatus,
        approvedBy: updatedLoan.approvedBy?.name,
        approvedAt: updatedLoan.approvedAt
      }
    });
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ 
      error: 'Failed to approve loan',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Reject a loan
export const rejectLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Find the loan
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        account: true
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check if already approved or rejected
    if (loan.authorizationStatus === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot reject an approved loan' });
    }

    if (loan.authorizationStatus === 'REJECTED') {
      return res.status(400).json({ error: 'Loan has already been rejected' });
    }

    // Update loan status to rejected
    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        authorizationStatus: 'REJECTED',
        rejectionReason: reason,
        approvedById: userId,
        approvedAt: new Date()
      },
      include: {
        customer: true,
        account: true,
        approvedBy: true
      }
    });

    res.json({
      success: true,
      message: 'Loan rejected successfully',
      loan: {
        id: updatedLoan.id,
        customerName: updatedLoan.customer.name,
        amount: updatedLoan.amount.toNumber(),
        status: updatedLoan.authorizationStatus,
        rejectedBy: updatedLoan.approvedBy?.name,
        rejectedAt: updatedLoan.approvedAt,
        rejectionReason: updatedLoan.rejectionReason
      }
    });
  } catch (error) {
    console.error('Error rejecting loan:', error);
    res.status(500).json({ 
      error: 'Failed to reject loan',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
