"use strict";
/**
 * Loan Repayment Logic Module (TypeScript Version for Backend)
 *
 * Implements the bank's actual repayment waterfall for a guaranteed loan:
 * - Guarantors cover half the principal upfront (already deducted from their accounts at
 *   loan approval); the customer's own account backs the other half.
 * - Repayments first satisfy a combined "phase 1" bucket = total interest + the guarantor
 *   advance, split proportionally between the two according to their fixed totals. Only
 *   once phase 1 is fully paid off does money start reducing the customer's own
 *   (unguaranteed) principal share in "phase 2".
 *
 * All figures (loan amount, total repayable, guarantor advance) are derived from the
 * `existingState` passed in by the caller so the math is correct for the actual loan
 * being repaid, not a fixed reference scenario.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanRepaymentLogic = void 0;
exports.createLoanRepayment = createLoanRepayment;
exports.makeRepayment = makeRepayment;
exports.allocateGuarantorReimbursement = allocateGuarantorReimbursement;
exports.getLoanSummary = getLoanSummary;
class LoanRepaymentLogic {
    constructor(existingState) {
        var _a, _b, _c;
        // Rounded to whole pesewas: loans created under an older formula stored totals like
        // 2166.6666..., which would otherwise leave a fraction of a pesewa to "pay" at the end.
        this.loanAmount = this.round((_a = existingState === null || existingState === void 0 ? void 0 : existingState.loanAmount) !== null && _a !== void 0 ? _a : 1000);
        this.totalRepayable = this.round((_b = existingState === null || existingState === void 0 ? void 0 : existingState.totalRepayable) !== null && _b !== void 0 ? _b : this.loanAmount * 1.10);
        this.totalInterest = this.round(this.totalRepayable - this.loanAmount);
        this.guarantorAdvance = this.round((_c = existingState === null || existingState === void 0 ? void 0 : existingState.guarantorAdvance) !== null && _c !== void 0 ? _c : 500);
        this.phase1Cap = this.round(this.totalInterest + this.guarantorAdvance);
        this.interestShareOfPhase1 = this.phase1Cap > 0 ? this.totalInterest / this.phase1Cap : 0;
        this.state = Object.assign({ loanAmount: this.loanAmount, totalRepayable: this.totalRepayable, guarantorAdvance: this.guarantorAdvance, totalPaid: 0, totalInterestPaid: 0, guarantorReimbursed: 0, principalRemaining: this.loanAmount, isCompleted: false }, existingState);
    }
    /**
     * Round to 2 decimal places to avoid floating point precision issues
     */
    round(value) {
        return Math.round(value * 100) / 100;
    }
    /**
     * Get current loan state
     */
    getCurrentState() {
        return Object.assign({}, this.state);
    }
    /**
     * Calculate remaining balance that borrower needs to pay
     */
    getRemainingBalance() {
        return Math.max(0, this.totalRepayable - this.state.totalPaid);
    }
    /**
   * Check if loan is fully completed
   */
    isLoanCompleted() {
        return this.isLoanCompletedWithState(this.state);
    }
    /**
     * Make a repayment and apply the waterfall splitting logic:
     * 1. Phase 1 - interest and guarantor reimbursement, combined bucket, split proportionally
     *    to their fixed totals, until the combined phase1Cap is exhausted.
     * 2. Phase 2 - once phase 1 is fully satisfied, all further payment reduces the
     *    customer's own (unguaranteed) principal share.
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
        const remainingInterest = Math.max(0, this.round(this.totalInterest - this.state.totalInterestPaid));
        const remainingGuarantee = Math.max(0, this.round(this.guarantorAdvance - this.state.guarantorReimbursed));
        const remainingPhase1 = this.round(remainingInterest + remainingGuarantee);
        // Split the payment between phase 1 (interest + guarantor) and phase 2 (customer's own principal)
        const amountToPhase1 = Math.min(actualPayment, remainingPhase1);
        let amountToPhase2 = this.round(actualPayment - amountToPhase1);
        // Within phase 1, split proportionally to the loan's fixed interest:guarantor ratio
        let interestPortion = 0;
        let guarantorPortion = 0;
        if (amountToPhase1 > 0 && this.phase1Cap > 0) {
            interestPortion = this.round(amountToPhase1 * this.interestShareOfPhase1);
            guarantorPortion = this.round(amountToPhase1 - interestPortion);
        }
        let interestPaidNow = Math.min(interestPortion, remainingInterest);
        let guarantorPaidNow = Math.min(guarantorPortion, remainingGuarantee);
        // If one sub-bucket is capped (e.g. interest just finished paying off), redirect the
        // leftover to whichever bucket still has room, then finally to phase 2.
        let overflow = this.round((interestPortion - interestPaidNow) + (guarantorPortion - guarantorPaidNow));
        if (overflow > 0) {
            const roomInGuarantor = this.round(remainingGuarantee - guarantorPaidNow);
            const addToGuarantor = Math.min(overflow, roomInGuarantor);
            guarantorPaidNow = this.round(guarantorPaidNow + addToGuarantor);
            overflow = this.round(overflow - addToGuarantor);
            const roomInInterest = this.round(remainingInterest - interestPaidNow);
            const addToInterest = Math.min(overflow, roomInInterest);
            interestPaidNow = this.round(interestPaidNow + addToInterest);
            overflow = this.round(overflow - addToInterest);
            amountToPhase2 = this.round(amountToPhase2 + overflow);
        }
        const loanReduction = amountToPhase2;
        // Both the guarantor reimbursement and the loan-reduction portions retire real principal -
        // the guarantor's share was already advanced to fund the loan, so reimbursing them is the
        // borrower paying down that part of their debt, same as the customer's own share.
        const principalPortion = this.round(guarantorPaidNow + loanReduction);
        // Update state with proper rounding
        const newState = Object.assign(Object.assign({}, this.state), { totalPaid: this.round(this.state.totalPaid + actualPayment), totalInterestPaid: this.round(this.state.totalInterestPaid + interestPaidNow), guarantorReimbursed: this.round(this.state.guarantorReimbursed + guarantorPaidNow), principalRemaining: this.round(Math.max(0, this.state.principalRemaining - principalPortion)), isCompleted: false // Will be updated below
         });
        // Check if loan is completed
        newState.isCompleted = this.isLoanCompletedWithState(newState);
        // Update internal state
        this.state = newState;
        return {
            paymentAmount: actualPayment,
            interestPaid: interestPaidNow,
            guarantorReimbursement: guarantorPaidNow,
            loanReduction,
            updatedState: Object.assign({}, newState),
            remainingBalance: this.getRemainingBalance()
        };
    }
    /**
   * Check if loan would be completed with given state
   */
    isLoanCompletedWithState(state) {
        // Use more robust comparison with proper rounding to avoid floating point issues
        const totalPaid = this.round(state.totalPaid);
        const totalInterestPaid = this.round(state.totalInterestPaid);
        const guarantorReimbursed = this.round(state.guarantorReimbursed);
        // Compare in whole pesewas. A 0.01 tolerance here marked loans "completed" while still a
        // pesewa short, leaving the loan account stuck at -0.01 with no way to pay it off.
        const cents = (value) => Math.round(value * 100);
        const isPaidSufficient = cents(totalPaid) >= cents(this.totalRepayable);
        const isInterestSufficient = cents(totalInterestPaid) >= cents(this.totalInterest);
        const isGuarantorSufficient = cents(guarantorReimbursed) >= cents(this.guarantorAdvance);
        return isPaidSufficient && isInterestSufficient && isGuarantorSufficient;
    }
    /**
     * Get a summary of the loan status
     */
    getSummary() {
        const remainingBalance = this.getRemainingBalance();
        const percentComplete = this.totalRepayable > 0 ? (this.state.totalPaid / this.totalRepayable) * 100 : 0;
        return {
            loanAmount: this.loanAmount,
            totalRepayable: this.totalRepayable,
            guarantorAdvance: this.guarantorAdvance,
            progress: {
                totalPaid: this.state.totalPaid,
                remainingBalance,
                percentComplete: Math.min(100, percentComplete)
            },
            breakdown: {
                interestPaid: this.state.totalInterestPaid,
                remainingInterest: Math.max(0, this.totalInterest - this.state.totalInterestPaid),
                guarantorReimbursed: this.state.guarantorReimbursed,
                remainingGuarantorDebt: Math.max(0, this.guarantorAdvance - this.state.guarantorReimbursed),
                principalPaid: this.loanAmount - this.state.principalRemaining,
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
            loanAmount: this.loanAmount,
            totalRepayable: this.totalRepayable,
            guarantorAdvance: this.guarantorAdvance,
            totalPaid: 0,
            totalInterestPaid: 0,
            guarantorReimbursed: 0,
            principalRemaining: this.loanAmount,
            isCompleted: false
        };
    }
}
exports.LoanRepaymentLogic = LoanRepaymentLogic;
/**
 * Utility function to create a new loan repayment instance
 */
function createLoanRepayment(existingState) {
    return new LoanRepaymentLogic(existingState);
}
/**
 * Utility functions for easy integration
 */
function makeRepayment(amount, existingLoanState = {}) {
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
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            payment: null,
            loanState: null,
            remainingBalance: null,
            isCompleted: false,
            summary: null
        };
    }
}
/**
 * Split one repayment's guarantor reimbursement between guarantors in whole pesewas.
 *
 * Rounding each payment's proportional split independently lets pesewas drift, so a guarantor
 * could end up a pesewa over or under what they put up. Instead, each guarantor's CUMULATIVE
 * entitlement after this payment is computed (largest-remainder rounding, so entitlements always
 * sum exactly to the total reimbursed so far) and they are paid the difference from what they
 * have actually received. When the loan completes, every guarantor has received exactly their
 * guaranteed amount, and every call's shares sum exactly to `reimbursementNow`.
 */
function allocateGuarantorReimbursement(guarantors, totalReimbursedAfter, reimbursementNow) {
    const toCents = (v) => Math.round(v * 100);
    const totalGuaranteed = guarantors.reduce((sum, g) => sum + toCents(g.guaranteedAmount), 0);
    const nowCents = toCents(reimbursementNow);
    if (guarantors.length === 0 || totalGuaranteed <= 0 || nowCents <= 0) {
        return guarantors.map(() => 0);
    }
    // Cumulative entitlements after this payment, largest-remainder rounded.
    const afterCents = Math.min(toCents(totalReimbursedAfter), totalGuaranteed);
    const exact = guarantors.map(g => afterCents * toCents(g.guaranteedAmount) / totalGuaranteed);
    const targets = exact.map(Math.floor);
    let leftover = afterCents - targets.reduce((a, b) => a + b, 0);
    exact
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((a, b) => b.remainder - a.remainder)
        .forEach(({ index }) => {
        if (leftover > 0) {
            targets[index] += 1;
            leftover -= 1;
        }
    });
    // Pay each the gap to their entitlement; never a negative credit.
    const pays = targets.map((target, i) => Math.max(0, target - toCents(guarantors[i].reimbursedSoFar)));
    // Make this call's shares sum exactly to the money actually being reimbursed now - absorbs
    // any clamping above and legacy loans whose per-guarantor history wasn't tracked.
    let diff = nowCents - pays.reduce((a, b) => a + b, 0);
    while (diff !== 0) {
        if (diff > 0) {
            // Give the pesewa to whoever is furthest below their guaranteed amount
            const i = pays
                .map((p, k) => ({ k, room: toCents(guarantors[k].guaranteedAmount) - toCents(guarantors[k].reimbursedSoFar) - p }))
                .sort((a, b) => b.room - a.room)[0].k;
            pays[i] += 1;
            diff -= 1;
        }
        else {
            const i = pays.map((p, k) => ({ k, p })).sort((a, b) => b.p - a.p)[0].k;
            pays[i] -= 1;
            diff += 1;
        }
    }
    return pays.map(cents => cents / 100);
}
function getLoanSummary(existingLoanState = {}) {
    const loan = createLoanRepayment(existingLoanState);
    return {
        success: true,
        summary: loan.getSummary(),
        state: loan.getCurrentState(),
        remainingBalance: loan.getRemainingBalance(),
        isCompleted: loan.isLoanCompleted()
    };
}
