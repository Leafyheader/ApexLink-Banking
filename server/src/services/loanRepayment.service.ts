/**
 * Loan Repayment Logic Module (TypeScript Version for Backend)
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
   * Round to 2 decimal places to avoid floating point precision issues
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
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
    // Use more robust comparison with proper rounding to avoid floating point issues
    const totalPaid = this.round(this.state.totalPaid);
    const totalInterestPaid = this.round(this.state.totalInterestPaid);
    const guarantorReimbursed = this.round(this.state.guarantorReimbursed);
    
    // Allow for tiny floating point differences (within 0.01)
    const isPaidSufficient = totalPaid >= (this.TOTAL_REPAYABLE - 0.01);
    const isInterestSufficient = totalInterestPaid >= (this.TOTAL_INTEREST - 0.01);
    const isGuarantorSufficient = guarantorReimbursed >= (this.GUARANTOR_ADVANCE - 0.01);
    
    return isPaidSufficient && isInterestSufficient && isGuarantorSufficient;
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
    const interestPortion = this.round(actualPayment * (this.INTEREST_PERCENTAGE / 100));
    const principalPortion = this.round(actualPayment - interestPortion);
    
    // Calculate interest payment (capped at remaining interest)
    const remainingInterest = this.round(this.TOTAL_INTEREST - this.state.totalInterestPaid);
    const interestPaid = Math.min(interestPortion, remainingInterest);
    
    // If we've paid all interest, redirect that portion to principal
    const extraToPrincipal = this.round(interestPortion - interestPaid);
    const totalPrincipalPortion = this.round(principalPortion + extraToPrincipal);
    
    // From principal portion: 50% to guarantor, 50% to loan reduction
    const guarantorReimbursementAmount = this.round(totalPrincipalPortion * 0.5);
    const loanReductionAmount = this.round(totalPrincipalPortion * 0.5);
    
    // Calculate actual guarantor reimbursement (capped at remaining amount)
    const remainingGuarantorDebt = this.round(this.GUARANTOR_ADVANCE - this.state.guarantorReimbursed);
    const actualGuarantorReimbursement = Math.min(guarantorReimbursementAmount, remainingGuarantorDebt);
    
    // If guarantor is fully reimbursed, redirect that portion to loan reduction
    const extraToLoanReduction = this.round(guarantorReimbursementAmount - actualGuarantorReimbursement);
    const actualLoanReduction = this.round(loanReductionAmount + extraToLoanReduction);
    
    // Update state with proper rounding
    const newState: LoanState = {
      ...this.state,
      totalPaid: this.round(this.state.totalPaid + actualPayment),
      totalInterestPaid: this.round(this.state.totalInterestPaid + interestPaid),
      guarantorReimbursed: this.round(this.state.guarantorReimbursed + actualGuarantorReimbursement),
      principalRemaining: this.round(Math.max(0, this.state.principalRemaining - actualLoanReduction)),
      isCompleted: false // Will be updated below
    };
    
    // Check if loan is completed
    newState.isCompleted = this.isLoanCompletedWithState(newState);
    
    // Update internal state
    this.state = newState;
    
    return {
      paymentAmount: actualPayment,
      interestPaid: this.round(interestPaid),
      guarantorReimbursement: this.round(actualGuarantorReimbursement),
      loanReduction: this.round(actualLoanReduction),
      updatedState: { ...newState },
      remainingBalance: this.getRemainingBalance()
    };
  }
    /**
   * Check if loan would be completed with given state
   */
  private isLoanCompletedWithState(state: LoanState): boolean {
    // Use more robust comparison with proper rounding to avoid floating point issues
    const totalPaid = this.round(state.totalPaid);
    const totalInterestPaid = this.round(state.totalInterestPaid);
    const guarantorReimbursed = this.round(state.guarantorReimbursed);
    
    // Allow for tiny floating point differences (within 0.01)
    const isPaidSufficient = totalPaid >= (this.TOTAL_REPAYABLE - 0.01);
    const isInterestSufficient = totalInterestPaid >= (this.TOTAL_INTEREST - 0.01);
    const isGuarantorSufficient = guarantorReimbursed >= (this.GUARANTOR_ADVANCE - 0.01);
    
    return isPaidSufficient && isInterestSufficient && isGuarantorSufficient;
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
 * Utility functions for easy integration
 */
export function makeRepayment(amount: number, existingLoanState: Partial<LoanState> = {}) {
  try {
    const loan = createLoanRepayment(existingLoanState);
    const result = loan.makeRepayment(amount);
    
    return {
      success: true,
      payment: {
        amount: result.paymentAmount,
        breakdown: {
          interestPaid: result.interestPaid,
          guarantorReimbursement: result.guarantorReimbursement,
          loanReduction: result.loanReduction
        }
      },
      loanState: result.updatedState,
      remainingBalance: result.remainingBalance,
      isCompleted: result.updatedState.isCompleted,
      summary: loan.getSummary()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      payment: null,
      loanState: null,
      remainingBalance: null,
      isCompleted: false,
      summary: null
    };
  }
}

export function getLoanSummary(existingLoanState: Partial<LoanState> = {}) {
  const loan = createLoanRepayment(existingLoanState);
  return {
    success: true,
    summary: loan.getSummary(),
    state: loan.getCurrentState(),
    remainingBalance: loan.getRemainingBalance(),
    isCompleted: loan.isLoanCompleted()
  };
}
