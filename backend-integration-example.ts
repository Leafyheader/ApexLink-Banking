/**
 * Example Integration with Existing Backend Transaction Controller (TypeScript)
 * This shows how to integrate the loan repayment logic into your current system
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/auth';

// Import the loan repayment logic (you'd need to convert to TypeScript or use require)
const { makeRepayment, getLoanSummary } = require('../../loan-repayment-integration.js');

const prisma = new PrismaClient();

// Add this to your existing transaction controller
export const processLoanRepayment = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, amount, description, reference } = req.body;
    
    // 1. Get the current loan account
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { 
        customer: true,
        loan: true  // Assuming you have a loan relation
      }
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account.accountType !== 'LOAN') {
      return res.status(400).json({ error: 'Account is not a loan account' });
    }
    
    // 2. Get current loan state from database
    const currentLoanState = {
      totalPaid: account.loan?.totalPaid || 0,
      totalInterestPaid: account.loan?.totalInterestPaid || 0,
      guarantorReimbursed: account.loan?.guarantorReimbursed || 0,
      principalRemaining: account.loan?.principalRemaining || 1000,
      isCompleted: account.loan?.isCompleted || false
    };
    
    // 3. Process repayment using the loan logic
    const repaymentResult = makeRepayment(amount, currentLoanState);
    
    if (!repaymentResult.success) {
      return res.status(400).json({ error: repaymentResult.error });
    }
    
    // 4. Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          accountId: accountId,
          amount: repaymentResult.payment.amount,
          type: 'LOAN_REPAYMENT',
          status: 'COMPLETED',
          description: description || `Loan repayment - ₵${repaymentResult.payment.amount}`,
          reference: reference || `LR-${Date.now()}`,
          date: new Date(),
          
          // Store repayment breakdown in metadata or separate fields
          metadata: {
            breakdown: repaymentResult.payment.breakdown,
            loanSummary: repaymentResult.summary
          }
        }
      });
      
      // Update loan state
      await tx.loan.update({
        where: { accountId: accountId },
        data: {
          totalPaid: repaymentResult.loanState.totalPaid,
          totalInterestPaid: repaymentResult.loanState.totalInterestPaid,
          guarantorReimbursed: repaymentResult.loanState.guarantorReimbursed,
          principalRemaining: repaymentResult.loanState.principalRemaining,
          isCompleted: repaymentResult.loanState.isCompleted,
          lastPaymentDate: new Date(),
          lastPaymentAmount: repaymentResult.payment.amount
        }
      });
      
      // Update account balance (negative for loan accounts)
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: -repaymentResult.remainingBalance // Negative because it's a debt
        }
      });
      
      // Record bank income from interest
      if (repaymentResult.payment.breakdown.interestPaid > 0) {
        await tx.bankIncome.create({
          data: {
            amount: repaymentResult.payment.breakdown.interestPaid,
            source: 'LOAN_INTEREST',
            description: `Interest income from loan repayment - Account ${account.accountNumber}`,
            transactionId: transaction.id,
            date: new Date()
          }
        });
      }
      
      // If there's a guarantor, update their reimbursement tracking
      if (repaymentResult.payment.breakdown.guarantorReimbursement > 0) {
        // You might have a guarantor table or track this differently
        await tx.guarantorReimbursement.create({
          data: {
            loanAccountId: accountId,
            amount: repaymentResult.payment.breakdown.guarantorReimbursement,
            transactionId: transaction.id,
            date: new Date()
          }
        });
      }
      
      return transaction;
    });
    
    // 5. Return success response with detailed breakdown
    res.json({
      success: true,
      transaction: result,
      repayment: {
        amount: repaymentResult.payment.amount,
        breakdown: repaymentResult.payment.breakdown,
        remainingBalance: repaymentResult.remainingBalance,
        isCompleted: repaymentResult.isCompleted
      },
      loanSummary: repaymentResult.summary
    });
    
  } catch (error) {
    console.error('Error processing loan repayment:', error);
    res.status(500).json({ error: 'Failed to process loan repayment' });
  }
};

// Add this endpoint to get loan summary
export const getLoanSummaryEndpoint = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { loan: true }
    });
    
    if (!account || account.accountType !== 'LOAN') {
      return res.status(404).json({ error: 'Loan account not found' });
    }
    
    const currentLoanState = {
      totalPaid: account.loan?.totalPaid || 0,
      totalInterestPaid: account.loan?.totalInterestPaid || 0,
      guarantorReimbursed: account.loan?.guarantorReimbursed || 0,
      principalRemaining: account.loan?.principalRemaining || 1000,
      isCompleted: account.loan?.isCompleted || false
    };
    
    const summary = getLoanSummary(currentLoanState);
    
    res.json({
      success: true,
      ...summary
    });
    
  } catch (error) {
    console.error('Error getting loan summary:', error);
    res.status(500).json({ error: 'Failed to get loan summary' });
  }
};

// Example route additions for your routes file:
/*
// In your routes/transactions.ts
import { processLoanRepayment, getLoanSummaryEndpoint } from '../controllers/transactions.controller';

router.post('/loan-repayment', authMiddleware, processLoanRepayment);
router.get('/loan-summary/:accountId', authMiddleware, getLoanSummaryEndpoint);
*/
