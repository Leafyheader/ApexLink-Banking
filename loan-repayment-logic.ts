/**
 * Loan Repayment Logic Module
 * 
 * Implements the specific repayment rules:
 * - Loan Amount: ₵1,000
 * - Flat Interest: 10% (₵100), total repayable: ₵1,100
 * - Guarantor Advance: ₵500 paid upfront
 * - Flexible repayments with specific splitting logic
 */

export interface LoanState {
  loanAmount: number;           // Original principal (₵1,000)
  totalRepayable: number;       // Total amount to be repaid (₵1,100)
  guarantorAdvance: number;     // Amount paid by guarantor (₵500)
  totalPaid: number;           // Total amount paid so far
  totalInterestPaid: number;   // Total interest paid (cap: ₵100)
  guarantorReimbursed: number; // Amount reimbursed to guarantor (cap: ₵500)
  principalRemaining: number;  // Remaining principal balance
  isCompleted: boolean;        // Whether loan is fully paid
}

export interface RepaymentBreakdown {
  paymentAmount: number;
  interestPaid: number;
  guarantorReimbursement: number;
  loanReduction: number;
  updatedState: LoanState;
  remainingBalance: number;
}

export class LoanRepaymentLogic {
  private state: LoanState;
  
  // Constants based on requirements
  private readonly LOAN_AMOUNT = 1000;
  private readonly INTEREST_RATE = 0.10; // 10%
  private readonly TOTAL_INTEREST = this.LOAN_AMOUNT * this.INTEREST_RATE; // ₵100
  private readonly TOTAL_REPAYABLE = this.LOAN_AMOUNT + this.TOTAL_INTEREST; // ₵1,100
  private readonly GUARANTOR_ADVANCE = 500;
  private readonly INTEREST_PERCENTAGE = 9.09; // 9.09% of each payment goes to interest
  private readonly PRINCIPAL_PERCENTAGE = 90.91; // 90.91% of each payment goes to principal
  
  constructor(existingState?: Partial<LoanState>) {
    this.state = {
      loanAmount: this.LOAN_AMOUNT,
      totalRepayable: this.TOTAL_REPAYABLE,
      guarantorAdvance: this.GUARANTOR_ADVANCE,
      totalPaid: 0,
      totalInterestPaid: 0,
      guarantorReimbursed: 0,
      principalRemaining: this.LOAN_AMOUNT,
      isCompleted: false,
      ...existingState
    };
  }
  
  /**
   * Get current loan state
   */
  getCurrentState(): LoanState {
    return { ...this.state };
  }
  
  /**
   * Calculate remaining balance that borrower needs to pay
   */
  getRemainingBalance(): number {
    return Math.max(0, this.TOTAL_REPAYABLE - this.state.totalPaid);
  }
  
  /**
   * Check if loan is fully completed
   */
  isLoanCompleted(): boolean {
    return this.state.totalPaid >= this.TOTAL_REPAYABLE &&
           this.state.totalInterestPaid >= this.TOTAL_INTEREST &&
           this.state.guarantorReimbursed >= this.GUARANTOR_ADVANCE;
  }
  
  /**
   * Make a repayment and apply the splitting logic
   */
  makeRepayment(amount: number): RepaymentBreakdown {
    if (amount <= 0) {
      throw new Error('Repayment amount must be positive');
    }
    
    if (this.isLoanCompleted()) {
      throw new Error('Loan is already fully paid');
    }
    
    // Don't allow overpayment
    const remainingBalance = this.getRemainingBalance();
    const actualPayment = Math.min(amount, remainingBalance);
    
    // Split payment into interest and principal portions
    const interestPortion = actualPayment * (this.INTEREST_PERCENTAGE / 100);
    const principalPortion = actualPayment * (this.PRINCIPAL_PERCENTAGE / 100);
    
    // Calculate interest payment (capped at remaining interest)
    const remainingInterest = this.TOTAL_INTEREST - this.state.totalInterestPaid;
    const interestPaid = Math.min(interestPortion, remainingInterest);
    
    // If we've paid all interest, redirect that portion to principal
    const extraToPrincipal = interestPortion - interestPaid;
    const totalPrincipalPortion = principalPortion + extraToPrincipal;
    
    // From principal portion: 50% to guarantor, 50% to loan reduction
    const guarantorReimbursementAmount = totalPrincipalPortion * 0.5;
    const loanReductionAmount = totalPrincipalPortion * 0.5;
    
    // Calculate actual guarantor reimbursement (capped at remaining amount)
    const remainingGuarantorDebt = this.GUARANTOR_ADVANCE - this.state.guarantorReimbursed;
    const actualGuarantorReimbursement = Math.min(guarantorReimbursementAmount, remainingGuarantorDebt);
    
    // If guarantor is fully reimbursed, redirect that portion to loan reduction
    const extraToLoanReduction = guarantorReimbursementAmount - actualGuarantorReimbursement;
    const actualLoanReduction = loanReductionAmount + extraToLoanReduction;
    
    // Update state
    const newState: LoanState = {
      ...this.state,
      totalPaid: this.state.totalPaid + actualPayment,
      totalInterestPaid: this.state.totalInterestPaid + interestPaid,
      guarantorReimbursed: this.state.guarantorReimbursed + actualGuarantorReimbursement,
      principalRemaining: Math.max(0, this.state.principalRemaining - actualLoanReduction),
      isCompleted: false // Will be updated below
    };
    
    // Check if loan is completed
    newState.isCompleted = this.isLoanCompletedWithState(newState);
    
    // Update internal state
    this.state = newState;
    
    return {
      paymentAmount: actualPayment,
      interestPaid,
      guarantorReimbursement: actualGuarantorReimbursement,
      loanReduction: actualLoanReduction,
      updatedState: { ...newState },
      remainingBalance: this.getRemainingBalance()
    };
  }
  
  /**
   * Check if loan would be completed with given state
   */
  private isLoanCompletedWithState(state: LoanState): boolean {
    return state.totalPaid >= this.TOTAL_REPAYABLE &&
           state.totalInterestPaid >= this.TOTAL_INTEREST &&
           state.guarantorReimbursed >= this.GUARANTOR_ADVANCE;
  }
  
  /**
   * Get a summary of the loan status
   */
  getSummary(): {
    loanAmount: number;
    totalRepayable: number;
    guarantorAdvance: number;
    progress: {
      totalPaid: number;
      remainingBalance: number;
      percentComplete: number;
    };
    breakdown: {
      interestPaid: number;
      remainingInterest: number;
      guarantorReimbursed: number;
      remainingGuarantorDebt: number;
      principalPaid: number;
      principalRemaining: number;
    };
    status: 'active' | 'completed';
  } {
    const remainingBalance = this.getRemainingBalance();
    const percentComplete = (this.state.totalPaid / this.TOTAL_REPAYABLE) * 100;
    
    return {
      loanAmount: this.LOAN_AMOUNT,
      totalRepayable: this.TOTAL_REPAYABLE,
      guarantorAdvance: this.GUARANTOR_ADVANCE,
      progress: {
        totalPaid: this.state.totalPaid,
        remainingBalance,
        percentComplete: Math.min(100, percentComplete)
      },
      breakdown: {
        interestPaid: this.state.totalInterestPaid,
        remainingInterest: Math.max(0, this.TOTAL_INTEREST - this.state.totalInterestPaid),
        guarantorReimbursed: this.state.guarantorReimbursed,
        remainingGuarantorDebt: Math.max(0, this.GUARANTOR_ADVANCE - this.state.guarantorReimbursed),
        principalPaid: this.LOAN_AMOUNT - this.state.principalRemaining,
        principalRemaining: this.state.principalRemaining
      },
      status: this.isLoanCompleted() ? 'completed' : 'active'
    };
  }
  
  /**
   * Simulate a repayment without actually applying it
   */
  simulateRepayment(amount: number): RepaymentBreakdown {
    const tempLogic = new LoanRepaymentLogic(this.state);
    return tempLogic.makeRepayment(amount);
  }
  
  /**
   * Reset loan to initial state
   */
  reset(): void {
    this.state = {
      loanAmount: this.LOAN_AMOUNT,
      totalRepayable: this.TOTAL_REPAYABLE,
      guarantorAdvance: this.GUARANTOR_ADVANCE,
      totalPaid: 0,
      totalInterestPaid: 0,
      guarantorReimbursed: 0,
      principalRemaining: this.LOAN_AMOUNT,
      isCompleted: false
    };
  }
}

/**
 * Utility function to create a new loan repayment instance
 */
export function createLoanRepayment(existingState?: Partial<LoanState>): LoanRepaymentLogic {
  return new LoanRepaymentLogic(existingState);
}

/**
 * Utility function to validate a loan state
 */
export function validateLoanState(state: LoanState): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (state.totalPaid < 0) errors.push('Total paid cannot be negative');
  if (state.totalInterestPaid < 0) errors.push('Total interest paid cannot be negative');
  if (state.guarantorReimbursed < 0) errors.push('Guarantor reimbursed cannot be negative');
  if (state.principalRemaining < 0) errors.push('Principal remaining cannot be negative');
  
  if (state.totalInterestPaid > 100) errors.push('Total interest paid cannot exceed ₵100');
  if (state.guarantorReimbursed > 500) errors.push('Guarantor reimbursed cannot exceed ₵500');
  if (state.totalPaid > 1100) errors.push('Total paid cannot exceed ₵1,100');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
