/**
 * Loan Repayment Logic Module (JavaScript Version)
 * 
 * Implements the specific repayment rules:
 * - Loan Amount: ₵1,000
 * - Flat Interest: 10% (₵100), total repayable: ₵1,100
 * - Guarantor Advance: ₵500 paid upfront
 * - Flexible repayments with specific splitting logic
 */

class LoanRepaymentLogic {
  constructor(existingState = {}) {
    // Constants based on requirements
    this.LOAN_AMOUNT = 1000;
    this.INTEREST_RATE = 0.10; // 10%
    this.TOTAL_INTEREST = this.LOAN_AMOUNT * this.INTEREST_RATE; // ₵100
    this.TOTAL_REPAYABLE = this.LOAN_AMOUNT + this.TOTAL_INTEREST; // ₵1,100
    this.GUARANTOR_ADVANCE = 500;
    this.INTEREST_PERCENTAGE = 9.09; // 9.09% of each payment goes to interest
    this.PRINCIPAL_PERCENTAGE = 90.91; // 90.91% of each payment goes to principal
    
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
  getCurrentState() {
    return { ...this.state };
  }
  
  /**
   * Calculate remaining balance that borrower needs to pay
   */
  getRemainingBalance() {
    return Math.max(0, this.TOTAL_REPAYABLE - this.state.totalPaid);
  }
    /**
   * Check if loan is fully completed
   */
  isLoanCompleted() {
    return this.round(this.state.totalPaid) >= this.TOTAL_REPAYABLE &&
           this.round(this.state.totalInterestPaid) >= this.TOTAL_INTEREST &&
           this.round(this.state.guarantorReimbursed) >= this.GUARANTOR_ADVANCE;
  }
    /**
   * Round to 2 decimal places to avoid floating point precision issues
   */
  round(value) {
    return Math.round(value * 100) / 100;
  }
  
  /**
   * Make a repayment and apply the splitting logic
   */
  makeRepayment(amount) {
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
    const newState = {
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
  isLoanCompletedWithState(state) {
    return this.round(state.totalPaid) >= this.TOTAL_REPAYABLE &&
           this.round(state.totalInterestPaid) >= this.TOTAL_INTEREST &&
           this.round(state.guarantorReimbursed) >= this.GUARANTOR_ADVANCE;
  }
  
  /**
   * Get a summary of the loan status
   */
  getSummary() {
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
  simulateRepayment(amount) {
    const tempLogic = new LoanRepaymentLogic(this.state);
    return tempLogic.makeRepayment(amount);
  }
  
  /**
   * Reset loan to initial state
   */
  reset() {
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
function createLoanRepayment(existingState) {
  return new LoanRepaymentLogic(existingState);
}

/**
 * Utility function to validate a loan state
 */
function validateLoanState(state) {
  const errors = [];
  
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

module.exports = {
  LoanRepaymentLogic,
  createLoanRepayment,
  validateLoanState
};
