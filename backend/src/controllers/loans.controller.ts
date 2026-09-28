import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { GuaranteeService } from '../services/guarantee.service';
import { isValidAmount, toPesewas } from '../utils/cashReporting';

// Define the authenticated request interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
  };
}

const prisma = new PrismaClient();
const guaranteeService = new GuaranteeService(prisma);

// Validation schemas
const createLoanSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  interestRate: z.number().min(0),
  term: z.number().int().positive(),
  repaymentFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']),
  customerAccountId: z.string().uuid().optional(), // account holding the borrower's own 50% backing
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

// Helper function to calculate loan details using flat rate interest.
// The rate is a flat percentage of principal, independent of term length - a ₵2000 loan at 10%
// is always ₵200 interest (total payable ₵2200) whether the term is 6, 10, 12, or 24 months.
// It is NOT an annual rate to be prorated by term/12 - only the monthly payment spreads the
// fixed total payable evenly across the term.
function calculateLoanDetails(amount: number, interestRate: number, termInMonths: number) {
  const principal = amount;
  const rate = interestRate / 100;

  // All figures in whole pesewas - a customer can't pay a fraction of a pesewa, and an
  // unrounded totalPayable would leave the loan short of "fully paid" by a sliver forever.
  if (rate === 0) {
    const monthlyPayment = toPesewas(principal / termInMonths);
    return {
      monthlyPayment,
      totalPayable: principal,
      outstandingBalance: principal
    };
  }

  // Total interest is a flat percentage of principal, regardless of term.
  const totalInterest = toPesewas(principal * rate);

  // Total payable = Principal + Total Interest
  const totalPayable = toPesewas(principal + totalInterest);

  // Monthly payment = Total Payable / Number of Months
  const monthlyPayment = toPesewas(totalPayable / termInMonths);

  return {
    monthlyPayment,
    totalPayable,
    outstandingBalance: totalPayable
  };
}

// Releases every hold a loan placed: guarantor reservations and the borrower's own backing.
async function releaseLoanHolds(tx: Prisma.TransactionClient, loanId: string) {
  await tx.accountRestriction.updateMany({
    where: {
      isActive: true,
      OR: [{ loanGuarantor: { loanId } }, { loanId }]
    },
    data: { isActive: false, releasedAt: new Date() }
  });
}

// Why an account can't back or guarantee a loan, or null if it can.
function accountProblem(
  account: { customerId: string; status: string; authorizationStatus: string; type: string },
  expectedCustomerId: string,
  label: string
): string | null {
  if (account.customerId !== expectedCustomerId) return `${label} does not belong to the selected customer`;
  if (account.type === 'LOAN' || account.type === 'TREASURY') return `${label} must be a savings/current account`;
  if (account.status !== 'ACTIVE') return `${label} is not active`;
  if (account.authorizationStatus !== 'APPROVED') return `${label} has not been approved`;
  return null;
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
          guarantors: {
            include: {
              guarantor: {
                select: {
                  id: true,
                  name: true,
                  phone: true
                }
              },
              guarantorAccount: {
                select: {
                  id: true,
                  accountNumber: true,
                  type: true,
                  balance: true
                }
              }
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

        // loan.outstandingBalance is kept in sync with the real totalPayable-minus-totalPaid
        // figure on every repayment (see the loan-repayment waterfall in
        // transactions.controller.ts) - it's already correct for active loans too, not just
        // completed ones. The account's own `balance` field only tracks principal and
        // understates real remaining debt until near payoff, so it must never be substituted in.
        return {
          ...loan,
          amountPaid: actualAmountPaid,
          outstandingBalance: Number(loan.outstandingBalance || 0)
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

    // loan.outstandingBalance is kept in sync with the real totalPayable-minus-totalPaid figure
    // on every repayment - correct for active loans too, not just completed ones. The account's
    // own `balance` only tracks principal and understates real remaining debt until near payoff,
    // so it must never be substituted in (this was showing a smaller "Outstanding Balance" on
    // this page than the true figure the Transactions page now correctly shows).
    const actualOutstandingBalance = Number(loan.outstandingBalance || 0);

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
    const validatedData = createLoanSchema.parse(req.body);
    const { customerId, amount, interestRate, term, repaymentFrequency, customerAccountId } = validatedData;

    if (!isValidAmount(amount)) {
      return res.status(400).json({ error: 'Loan amount must be positive with at most 2 decimal places' });
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Every loan is 50% backed by guarantors and 50% by the borrower's own account. The own
    // backing is held on the account chosen in the loan form until the loan is fully repaid.
    const backingAccount = customerAccountId
      ? await prisma.account.findUnique({ where: { id: customerAccountId } })
      : await prisma.account.findFirst({
          // Older clients don't send the account - fall back to the most recent one
          where: { customerId, status: 'ACTIVE', authorizationStatus: 'APPROVED', type: { notIn: ['LOAN', 'TREASURY'] } },
          orderBy: { createdAt: 'desc' }
        });

    if (!backingAccount) {
      return res.status(400).json({
        error: 'Customer has no active accounts. Cannot create loan without an account.'
      });
    }
    const backingProblem = accountProblem(backingAccount, customerId, 'The selected customer account');
    if (backingProblem) {
      return res.status(400).json({ error: backingProblem });
    }

    // Guarantor slots. The borrower may fill one slot themselves (self-guarantee).
    const slots = [
      { n: 1, id: validatedData.guarantor1Id, accountId: validatedData.guarantor1AccountId, pct: validatedData.guarantor1Percentage || 0 },
      { n: 2, id: validatedData.guarantor2Id, accountId: validatedData.guarantor2AccountId, pct: validatedData.guarantor2Percentage || 0 },
      { n: 3, id: validatedData.guarantor3Id, accountId: validatedData.guarantor3AccountId, pct: validatedData.guarantor3Percentage || 0 }
    ].filter(slot => slot.pct > 0);

    const totalPercentage = slots.reduce((sum, slot) => sum + slot.pct, 0);
    if (totalPercentage !== 50) {
      return res.status(400).json({ error: 'Guarantor percentages must sum to 50%' });
    }

    // A percentage without a guarantor/account would count toward the 50% while backing nothing.
    const incomplete = slots.find(slot => !slot.id || !slot.accountId);
    if (incomplete) {
      return res.status(400).json({ error: `Guarantor ${incomplete.n} has a percentage but no guarantor or account selected` });
    }

    const guarantorIds = slots.map(slot => slot.id);
    if (new Set(guarantorIds).size !== guarantorIds.length) {
      return res.status(400).json({ error: 'The same person cannot fill more than one guarantor slot on a loan' });
    }

    const guarantorAccountRecords = await prisma.account.findMany({
      where: { id: { in: slots.map(slot => slot.accountId!) } }
    });
    for (const slot of slots) {
      const account = guarantorAccountRecords.find(a => a.id === slot.accountId);
      if (!account) {
        return res.status(404).json({ error: `Guarantor ${slot.n} account not found` });
      }
      const problem = accountProblem(account, slot.id!, `Guarantor ${slot.n} account`);
      if (problem) {
        return res.status(400).json({ error: problem });
      }
    }

    // Split exactly half the loan across the guarantors in whole pesewas; the last slot absorbs
    // the rounding so the guarantee is always exactly 50% and the own backing the other 50%.
    const guaranteeRequired = toPesewas(amount / 2);
    const ownBacking = toPesewas(amount - guaranteeRequired);
    let allocated = 0;
    const guarantorAccounts = slots.map((slot, index) => {
      const deductionAmount = index === slots.length - 1
        ? toPesewas(guaranteeRequired - allocated)
        : toPesewas(amount * slot.pct / 100);
      allocated = toPesewas(allocated + deductionAmount);
      return {
        guarantorId: slot.id!,
        accountId: slot.accountId!,
        percentage: slot.pct,
        deductionAmount,
        isSelf: slot.id === customerId,
        n: slot.n
      };
    });

    // Everything this loan will hold or take from each account, checked against what that
    // account has AVAILABLE (balance minus holds for other pending guarantees and loan backing).
    // An account used twice - e.g. a self-guarantee from the backing account - must cover both.
    const requiredByAccount = new Map<string, number>();
    const addRequired = (accountId: string, value: number) =>
      requiredByAccount.set(accountId, toPesewas((requiredByAccount.get(accountId) || 0) + value));
    addRequired(backingAccount.id, ownBacking);
    for (const g of guarantorAccounts) addRequired(g.accountId, g.deductionAmount);

    for (const [accountId, required] of requiredByAccount) {
      const { availableAmount, accountBalance } = await guaranteeService.calculateAvailableForWithdrawal(accountId);
      if (availableAmount < required) {
        const isBacking = accountId === backingAccount.id;
        const users = guarantorAccounts.filter(g => g.accountId === accountId);
        const who = [
          ...(isBacking ? [`the borrower's own 50% backing (₵${ownBacking.toFixed(2)})`] : []),
          ...users.map(g => `${g.isSelf ? 'the borrower\'s self-guarantee' : `guarantor ${g.n}`} (₵${g.deductionAmount.toFixed(2)})`)
        ].join(' + ');
        return res.status(400).json({
          error: `Insufficient available funds on account ${guarantorAccountRecords.find(a => a.id === accountId)?.accountNumber || backingAccount.accountNumber}. ` +
            `Required: ₵${required.toFixed(2)} for ${who}. Available: ₵${availableAmount.toFixed(2)} (balance ₵${accountBalance.toFixed(2)}, less amounts already held for other loans/guarantees).` +
            (isBacking && users.length === 0 ? ` Maximum loan on this account: ₵${toPesewas(availableAmount * 2).toFixed(2)} (2× available balance).` : '')
        });
      }
    }

    // Calculate loan details
    const { monthlyPayment, totalPayable, outstandingBalance } = calculateLoanDetails(amount, interestRate, term);

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + term);

    // Generate unique account number for the loan
    const accountNumber = await generateLoanAccountNumber();
    const createdBy = req.user?.id;

    // Create loan account and loan in a transaction (NO money moves yet - pending approval)
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
          customerContribution: ownBacking,
          guaranteeRequired,
          principalRemaining: amount,
          authorizationStatus: 'PENDING', // Loan requires authorization before activation
          status: 'ACTIVE', // Will remain ACTIVE but not disbursed until approved
          createdBy
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

      // Hold the borrower's own 50% backing until the loan is fully repaid (released on
      // rejection, cancellation or completion).
      await tx.accountRestriction.create({
        data: {
          accountId: backingAccount.id,
          restrictionType: 'LOAN_OWN_BACKING',
          restrictedAmount: ownBacking,
          reason: `Own backing for loan ${loan.id}`,
          loanId: loan.id,
          isActive: true,
          createdBy
        }
      });

      for (const guarantorAccount of guarantorAccounts) {
        const createdGuarantor = await tx.loanGuarantor.create({
          data: {
            loanId: loan.id,
            guarantorId: guarantorAccount.guarantorId,
            guarantorAccountId: guarantorAccount.accountId,
            guaranteedAmount: guarantorAccount.deductionAmount,
            status: 'ACTIVE'
          }
        });

        // Reserve the committed amount so the guarantor can't withdraw it out from under
        // the loan while it awaits approval. Released on approval (funds are deducted for
        // real at that point, see approveLoan), rejection, or cancellation.
        await tx.accountRestriction.create({
          data: {
            accountId: guarantorAccount.accountId,
            restrictionType: 'LOAN_GUARANTEE',
            restrictedAmount: guarantorAccount.deductionAmount,
            reason: `${guarantorAccount.isSelf ? 'Self-guarantee' : 'Guaranteeing'} pending loan ${loan.id}`,
            loanGuarantorId: createdGuarantor.id,
            isActive: true,
            createdBy
          }
        });
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

    // Once a loan has been disbursed (approved) or has received any payment, its financial
    // terms are load-bearing for the in-progress repayment waterfall: totalPayable feeds the
    // interest/guarantor split cap, and principalRemaining/totalPaid/guarantorReimbursed were
    // all computed against the CURRENT totalPayable. Silently recalculating totalPayable from
    // new amount/rate/term values here would desync that tracking from every payment already
    // applied. Only a still-pending, never-paid loan may have its terms edited; status changes
    // (e.g. marking DEFAULTED) are unaffected by this guard.
    const isChangingTerms = validatedData.amount !== undefined
      || validatedData.interestRate !== undefined
      || validatedData.term !== undefined
      || validatedData.repaymentFrequency !== undefined;

    if (isChangingTerms && (existingLoan.authorizationStatus !== 'PENDING' || existingLoan.status !== 'ACTIVE' || existingLoan.amountPaid.toNumber() > 0)) {
      return res.status(400).json({
        error: 'Only a pending loan can have its interest rate, term, or repayment frequency changed.'
      });
    }

    // The guarantor amounts and the borrower's 50% backing hold were fixed from the amount at
    // creation. Changing the amount would leave them out of step - cancel and re-create instead.
    if (validatedData.amount !== undefined && validatedData.amount !== existingLoan.amount.toNumber()) {
      return res.status(400).json({
        error: 'The loan amount cannot be changed because guarantor amounts are based on it. Cancel this loan and create a new one.'
      });
    }

    // Status: only switching an approved loan between ACTIVE and DEFAULTED is a manual action.
    // PAID happens through repayments and CLOSED through cancellation - setting either by hand
    // would drop an unpaid loan out of the loan book.
    if (validatedData.status !== undefined && validatedData.status !== existingLoan.status) {
      const allowed = existingLoan.authorizationStatus === 'APPROVED'
        && ((existingLoan.status === 'ACTIVE' && validatedData.status === 'DEFAULTED')
          || (existingLoan.status === 'DEFAULTED' && validatedData.status === 'ACTIVE'));
      if (!allowed) {
        return res.status(400).json({
          error: `Cannot change loan status from ${existingLoan.status} to ${validatedData.status}. Loans become PAID through repayments and CLOSED through cancellation.`
        });
      }
    }

    // Recalculate loan details if interestRate or term is being updated
    const { amount: _ignoredAmount, ...rest } = validatedData;
    let updateData: any = { ...rest };

    if (validatedData.interestRate !== undefined || validatedData.term !== undefined) {
      const amount = existingLoan.amount.toNumber();
      const interestRate = validatedData.interestRate ?? existingLoan.interestRate.toNumber();
      const term = validatedData.term ?? existingLoan.term;
      
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

    // Once a loan is approved, disbursement has already moved money: the loan account was
    // debited and every guarantor's account was deducted. Cancelling from here would release
    // guarantors and close the account without ever reimbursing them - that money would be
    // gone with nothing to show for it. A disbursed loan can only be closed via a proper
    // write-off/reimbursement process, not this cancellation endpoint.
    if (existingLoan.authorizationStatus === 'APPROVED') {
      return res.status(400).json({
        error: 'Cannot cancel a loan that has already been disbursed. Guarantor funds have already been deducted - use the loan write-off process instead.'
      });
    }

    // Use transaction to safely update loan status and release any guarantees
    await prisma.$transaction(async (tx) => {
      // Atomically claim the still-pending loan. Also taking it out of PENDING matters: a
      // cancelled loan left PENDING would still sit in the approval queue, and approving it
      // would disburse money on a loan that was cancelled.
      const claim = await tx.loan.updateMany({
        where: { id, authorizationStatus: 'PENDING' },
        data: {
          authorizationStatus: 'REJECTED',
          rejectionReason: 'Cancelled',
          status: 'CLOSED',
          outstandingBalance: 0,
          isCompleted: true,
          updatedAt: new Date()
        }
      });

      if (claim.count === 0) {
        throw new Error('ALREADY_PROCESSED');
      }

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

      // Release any pending guarantee reservations and the borrower's own backing hold - the
      // loan never disbursed, so nobody's funds were actually touched.
      await releaseLoanHolds(tx, id);

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
    if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
      return res.status(409).json({ error: 'Only a pending loan can be cancelled - this one has already been approved, rejected or cancelled.' });
    }
    console.error('Error deleting loan:', error);
    res.status(500).json({ error: 'Failed to cancel loan' });
  }
};

// Get loan statistics
export const getLoanStats = async (req: Request, res: Response) => {
  try {
    // Only approved loans were actually paid out - pending, rejected and cancelled ones weren't.
    const [disbursedResult, totalRepaymentResult] = await Promise.all([
      prisma.loan.aggregate({
        where: { authorizationStatus: 'APPROVED' },
        _sum: { amount: true, totalInterestPaid: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'LOAN_REPAYMENT', status: 'COMPLETED' },
        _sum: { amount: true }
      })
    ]);
    const totalDisbursed = Number(disbursedResult._sum.amount || 0);
    const totalRepayment = Number(totalRepaymentResult._sum.amount || 0);

    // Interest actually received, as split out of each repayment by the repayment engine.
    // (Repayments minus disbursements stays at 0 until the whole book is repaid, since
    // repayments on running loans are still below their principal.)
    const totalInterestEarned = Number(disbursedResult._sum.totalInterestPaid || 0);

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
            contains: search
          }
        },
        {
          phone: {
            contains: search
          }
        },
        {
          email: {
            contains: search
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

    // `createdBy` on Loan is a raw user ID with no Prisma relation (unlike approvedBy), so
    // resolve the names in one batched lookup rather than leaving "Requested By" hardcoded.
    const creatorIds = [...new Set(loans.map(loan => loan.createdBy).filter((id): id is string => !!id))];
    const creators = creatorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : [];
    const creatorNameById = new Map(creators.map(user => [user.id, user.name]));

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
        requestedByName: loan.createdBy ? (creatorNameById.get(loan.createdBy) || 'Unknown User') : 'System',
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
          percentage: (guarantor1.guaranteedAmount.toNumber() / loan.amount.toNumber()) * 100
        } : undefined,
        guarantor2: guarantor2 ? {
          id: guarantor2.guarantor.id,
          name: guarantor2.guarantor.name,
          accountNumber: guarantor2.guarantorAccount.accountNumber,
          amount: guarantor2.guaranteedAmount.toNumber(),
          percentage: (guarantor2.guaranteedAmount.toNumber() / loan.amount.toNumber()) * 100
        } : undefined,
        guarantor3: guarantor3 ? {
          id: guarantor3.guarantor.id,
          name: guarantor3.guarantor.name,
          accountNumber: guarantor3.guarantorAccount.accountNumber,
          amount: guarantor3.guaranteedAmount.toNumber(),
          percentage: (guarantor3.guaranteedAmount.toNumber() / loan.amount.toNumber()) * 100
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
      // 0. Atomically claim this loan for approval - only succeeds if it's still PENDING.
      // Prevents two concurrent approve calls (or an approve/reject race) from both disbursing.
      const claim = await tx.loan.updateMany({
        where: { id, authorizationStatus: 'PENDING', status: 'ACTIVE' },
        data: {
          authorizationStatus: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
          status: 'ACTIVE'
        }
      });

      if (claim.count === 0) {
        throw new Error('ALREADY_PROCESSED');
      }

      // 1. Update loan account balance to reflect the loan amount (negative balance)
      // The account is always created with a zero balance (see createLoan), so decrementing
      // by the loan amount here is equivalent to the previous hard-set to -amount but stays
      // correct even if this code path is ever reused for a non-zero starting balance.
      await tx.account.update({
        where: { id: loan.accountId },
        data: {
          balance: { decrement: loan.amount.toNumber() }, // Negative balance = amount owed
          authorizationStatus: 'APPROVED',
          lastTransactionDate: new Date()
        }
      });

      // 2. Create loan disbursement transaction record.
      // Typed as WITHDRAWAL because the disbursement moves the loan account's balance
      // down (further into debt) - labeling it DEPOSIT would contradict that balance change.
      await tx.transaction.create({
        data: {
          type: 'WITHDRAWAL',
          amount: loan.amount,
          accountId: loan.accountId,
          description: `Loan disbursement - ${loan.amount.toNumber()} at ${loan.interestRate.toNumber()}% interest for ${loan.term} months`,
          reference: `LOAN-${loan.id.slice(-8)}`
        }
      });

      // 3. Process guarantor account deductions
      for (const guarantor of loan.guarantors) {
        // Re-check the guarantor's funds at approval time (not just at loan-creation time) -
        // they may have spent them down while this loan sat pending. The deduction must leave
        // every OTHER hold on the account covered (other pending guarantees, and loan backing -
        // including this loan's own-backing hold when the borrower guarantees themselves), so
        // only this guarantee's own reservation is left out of the sum.
        const otherHolds = await tx.accountRestriction.aggregate({
          where: {
            accountId: guarantor.guarantorAccountId,
            isActive: true,
            // (explicit null case: a plain NOT would skip holds with no loanGuarantorId)
            OR: [{ loanGuarantorId: null }, { loanGuarantorId: { not: guarantor.id } }]
          },
          _sum: { restrictedAmount: true }
        });
        const requiredBalance = toPesewas(guarantor.guaranteedAmount.toNumber() + Number(otherHolds._sum.restrictedAmount || 0));

        const guarantorDebit = await tx.account.updateMany({
          where: {
            id: guarantor.guarantorAccountId,
            status: 'ACTIVE',
            balance: { gte: requiredBalance }
          },
          data: {
            balance: {
              decrement: guarantor.guaranteedAmount.toNumber()
            },
            lastTransactionDate: new Date()
          }
        });

        if (guarantorDebit.count === 0) {
          throw new Error('GUARANTOR_INSUFFICIENT_FUNDS');
        }

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

        // The funds are now actually deducted, so the pending-approval reservation is no
        // longer needed - release it.
        await tx.accountRestriction.updateMany({
          where: { loanGuarantorId: guarantor.id, isActive: true },
          data: { isActive: false, releasedAt: new Date() }
        });
      }

      // 4. Fetch the now-approved loan with relations for the response
      const updated = await tx.loan.findUniqueOrThrow({
        where: { id },
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
    if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
      return res.status(409).json({ error: 'Loan has already been approved or rejected' });
    }
    if (error instanceof Error && error.message === 'GUARANTOR_INSUFFICIENT_FUNDS') {
      return res.status(409).json({ error: 'A guarantor no longer has sufficient available funds (or their account is no longer active) to back this loan' });
    }
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

    // Atomically claim this loan for rejection - only succeeds if it's still PENDING,
    // preventing a race with a concurrent approve/reject call. Also releases any pending
    // guarantee reservations, since the guarantee will never be used now.
    const claim = await prisma.$transaction(async (tx) => {
      const result = await tx.loan.updateMany({
        where: { id, authorizationStatus: 'PENDING' },
        data: {
          authorizationStatus: 'REJECTED',
          rejectionReason: reason,
          approvedById: userId,
          approvedAt: new Date()
        }
      });

      if (result.count > 0) {
        await releaseLoanHolds(tx, id);
      }

      return result;
    });

    if (claim.count === 0) {
      return res.status(409).json({ error: 'Loan has already been approved or rejected' });
    }

    const updatedLoan = await prisma.loan.findUniqueOrThrow({
      where: { id },
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
