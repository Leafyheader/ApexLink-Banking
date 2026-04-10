# Loan Guarantee System Documentation

## Overview

The Loan Guarantee System implements a secure, risk-managed approach to lending that allows customers to borrow up to twice their account balance with guarantor backing. This system ensures loan security while providing expanded access to credit.

## Core Rules

### 1. Maximum Loan Amount
- **Rule**: Customers can borrow up to **2x their account balance**
- **Example**: Customer with $500 can borrow maximum of $1,000
- **Purpose**: Limits exposure and ensures customers have skin in the game

### 2. Customer Contribution
- **Rule**: Customer contributes their **full account balance** to the loan
- **Example**: For $1,000 loan, customer with $500 contributes their full $500
- **Purpose**: Demonstrates commitment and reduces risk

### 3. Guarantor Requirement
- **Rule**: Guarantors must cover the **remaining 50%** of the loan amount
- **Example**: For $1,000 loan, guarantors must cover $500
- **Limit**: Up to **3 guarantors** can share the guarantee burden

### 4. Account Restrictions
- **Rule**: Guaranteed amounts are **withheld** from guarantor accounts
- **Example**: Guarantor with $750 who guarantees $500 can only withdraw $250
- **Protection**: Prevents guarantors from withdrawing guaranteed funds

### 5. Dynamic Restrictions
- **Rule**: Restrictions **reduce proportionally** as loan is repaid
- **Example**: After 50% repayment, guarantor restrictions reduce by 50%
- **Benefit**: Guarantors regain access to funds as risk decreases

## System Components

### 1. Database Schema

#### Enhanced Loan Model
```typescript
model Loan {
  // ... existing fields
  customerContribution Decimal   // Amount from customer's account
  guaranteeRequired    Decimal   // Amount needing guarantor backing
  guarantors          LoanGuarantor[]
}

model LoanGuarantor {
  id                String    @id @default(uuid())
  loanId            String
  loan              Loan      @relation(fields: [loanId], references: [id])
  guarantorId       String
  guarantor         Customer  @relation(fields: [guarantorId], references: [id])
  guarantorAccountId String
  guarantorAccount  Account   @relation(fields: [guarantorAccountId], references: [id])
  guaranteedAmount  Decimal
  status           GuarantorStatus @default(ACTIVE)
  restrictions     AccountRestriction[]
}

model AccountRestriction {
  id                String         @id @default(uuid())
  accountId         String
  account           Account        @relation(fields: [accountId], references: [id])
  restrictionType   RestrictionType
  restrictedAmount  Decimal        // Amount that cannot be withdrawn
  reason           String
  loanGuarantorId  String?
  loanGuarantor    LoanGuarantor? @relation(fields: [loanGuarantorId], references: [id])
  isActive         Boolean        @default(true)
}
```

### 2. Service Layer

#### SimpleLoanService
- `checkLoanEligibility()`: Validates loan application against rules
- `createLoan()`: Creates loan with guarantor relationships
- `getAvailableBalanceForWithdrawal()`: Calculates withdrawable amount
- `processLoanRepayment()`: Handles payments and adjusts restrictions

### 3. API Endpoints

```
POST /api/loans/check-eligibility
- Validates loan eligibility with guarantor requirements

GET /api/loans/account/:accountId/available-balance
- Returns available balance considering loan guarantees

GET /api/loans/guarantor/:customerId
- Returns loans where customer is a guarantor

POST /api/loans
- Creates loan with guarantor backing
```

## Usage Examples

### Example 1: Simple Loan Eligibility Check

**Customer**: Alice Johnson  
**Account Balance**: $500  
**Requested Loan**: $1,000  

**Analysis**:
- Maximum allowed: $1,000 (2x $500) ✅
- Customer contribution: $500
- Guarantee needed: $500
- **Result**: Eligible if guarantor can cover $500

### Example 2: Guarantor Capacity Check

**Guarantor**: Bob Smith  
**Account Balance**: $750  
**Requested Guarantee**: $500  

**Analysis**:
- Current balance: $750
- After guarantee: $250 available for withdrawal
- **Result**: Eligible - can guarantee $500

### Example 3: Multiple Guarantors

**Customer**: Charlie Brown  
**Account Balance**: $400  
**Requested Loan**: $800  

**Guarantors**:
- Guarantor 1: $300 account, guarantees $200
- Guarantor 2: $400 account, guarantees $200
- **Total guarantee**: $400 ✅

### Example 4: Loan Repayment Impact

**Initial Loan**: $1,000  
**Guarantor Restriction**: $500  
**After 50% Repayment**:
- Remaining loan: $500
- New guarantor restriction: $250
- Additional available funds: $250

## Implementation Flow

### 1. Loan Application Process
1. Customer submits loan application
2. System validates maximum loan amount (2x balance)
3. System checks guarantor eligibility
4. If approved, creates loan and restrictions
5. Funds are disbursed to customer

### 2. Withdrawal Process Enhancement
1. Customer requests withdrawal
2. System calculates available balance
3. Checks against loan guarantee restrictions
4. Allows withdrawal only if within limits

### 3. Loan Repayment Process
1. Customer makes payment
2. System updates loan balance
3. Proportionally reduces guarantor restrictions
4. Updates available balances

## Security Features

### 1. Risk Mitigation
- **Customer Investment**: Must use own funds (50% of loan)
- **Guarantor Backing**: Secured by actual account balances
- **Restricted Access**: Guarantors cannot withdraw guaranteed amounts
- **Multiple Guarantors**: Risk can be distributed

### 2. Fraud Prevention
- **Balance Verification**: Real-time balance checks
- **Guarantee Limits**: Cannot guarantee more than account balance
- **Transaction Tracking**: All restrictions are logged and auditable

### 3. Automatic Adjustments
- **Dynamic Restrictions**: Adjust with loan balance
- **Status Tracking**: Monitor guarantor commitment status
- **Release Mechanism**: Automatic restriction removal on loan completion

## Business Benefits

### 1. Expanded Access to Credit
- Customers can access 2x their savings
- Promotes financial inclusion
- Supports business and personal growth

### 2. Risk Management
- Guaranteed by real assets (account balances)
- Shared risk model with guarantors
- Built-in customer commitment (50% own funds)

### 3. Community Banking
- Encourages mutual support among customers
- Builds trust and relationships
- Creates accountability network

## Technical Integration

### 1. Existing System Integration
- Works with current account structure
- Extends existing loan functionality
- Maintains backward compatibility

### 2. Real-time Balance Management
- Immediate restriction application
- Dynamic balance calculations
- Automatic adjustment on payments

### 3. Audit Trail
- Complete transaction history
- Guarantee tracking
- Restriction lifecycle logging

## Testing Scenarios

### 1. Positive Test Cases
- Customer with sufficient balance applies for maximum loan
- Guarantor with adequate funds provides backing
- Successful loan creation and fund disbursement
- Loan repayment reduces restrictions appropriately

### 2. Negative Test Cases
- Customer attempts loan exceeding 2x balance limit
- Guarantor with insufficient funds
- Multiple guarantors with combined insufficient backing
- Withdrawal attempts exceeding available balance

### 3. Edge Cases
- Guarantor becomes guarantor for multiple loans
- Loan with 3 guarantors sharing equal amounts
- Partial loan repayments and proportional restriction adjustments
- Complete loan repayment and restriction removal

## Configuration Options

### 1. Loan Parameters
- Maximum loan multiplier (default: 2x)
- Maximum number of guarantors (default: 3)
- Minimum customer contribution percentage (default: 50%)

### 2. Restriction Management
- Restriction calculation method (proportional/fixed)
- Minimum restriction amount
- Restriction release conditions

## Monitoring and Reporting

### 1. Loan Portfolio Health
- Total guaranteed amounts by customer
- Risk distribution across guarantors
- Loan performance metrics

### 2. System Performance
- Restriction calculation efficiency
- Balance update accuracy
- Transaction processing speed

### 3. Business Intelligence
- Popular loan amounts and patterns
- Guarantor network analysis
- Risk assessment metrics

## Implementation Status

✅ **Completed**:
- Database schema design
- Core service layer implementation
- API endpoint definitions
- Basic loan eligibility logic

🔄 **In Progress**:
- Frontend integration
- Complete testing suite
- Production deployment

📋 **Planned**:
- Advanced reporting dashboard
- Mobile app integration
- Automated risk assessment tools

---

This loan guarantee system provides a balanced approach to lending that expands access to credit while maintaining strong risk management through community-backed guarantees and smart account restrictions.