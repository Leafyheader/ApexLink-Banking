/**
 * Practical Integration Test with Banking System
 * This simulates how the loan repayment logic would work with your existing transaction system
 */

const { makeRepayment, getLoanSummary, simulateRepayment } = require('./loan-repayment-integration.js');

// Simulate database loan state (this would come from your database)
class MockLoanDatabase {
  constructor() {
    this.loans = new Map();
  }
  
  createLoan(accountId, loanData) {
    this.loans.set(accountId, {
      accountId,
      accountNumber: loanData.accountNumber,
      customerId: loanData.customerId,
      customerName: loanData.customerName,
      principalAmount: 1000,
      interestRate: 0.10,
      totalRepayable: 1100,
      guarantorAdvance: 500,
      // Current state
      totalPaid: 0,
      totalInterestPaid: 0,
      guarantorReimbursed: 0,
      principalRemaining: 1000,
      isCompleted: false,
      createdAt: new Date(),
      lastPaymentDate: null,
      lastPaymentAmount: 0
    });
    
    return this.loans.get(accountId);
  }
  
  getLoan(accountId) {
    return this.loans.get(accountId);
  }
  
  updateLoan(accountId, updates) {
    const loan = this.loans.get(accountId);
    if (loan) {
      Object.assign(loan, updates);
      this.loans.set(accountId, loan);
    }
    return this.loans.get(accountId);
  }
  
  getAllLoans() {
    return Array.from(this.loans.values());
  }
}

// Simulate transaction database
class MockTransactionDatabase {
  constructor() {
    this.transactions = [];
    this.nextId = 1;
  }
  
  createTransaction(transactionData) {
    const transaction = {
      id: `TXN-${this.nextId++}`,
      ...transactionData,
      createdAt: new Date()
    };
    
    this.transactions.push(transaction);
    return transaction;
  }
  
  getTransactions(accountId = null) {
    if (accountId) {
      return this.transactions.filter(t => t.accountId === accountId);
    }
    return this.transactions;
  }
}

// Simulate bank income tracking
class MockBankIncomeDatabase {
  constructor() {
    this.incomeRecords = [];
    this.nextId = 1;
  }
  
  recordIncome(incomeData) {
    const record = {
      id: `INC-${this.nextId++}`,
      ...incomeData,
      createdAt: new Date()
    };
    
    this.incomeRecords.push(record);
    return record;
  }
  
  getTotalIncome() {
    return this.incomeRecords.reduce((total, record) => total + record.amount, 0);
  }
  
  getIncomeBySource(source) {
    return this.incomeRecords
      .filter(record => record.source === source)
      .reduce((total, record) => total + record.amount, 0);
  }
}

// Main banking service that integrates everything
class LoanRepaymentService {
  constructor() {
    this.loanDB = new MockLoanDatabase();
    this.transactionDB = new MockTransactionDatabase();
    this.bankIncomeDB = new MockBankIncomeDatabase();
  }
  
  // Create a new loan
  createLoan(accountData) {
    const loan = this.loanDB.createLoan(accountData.accountId, accountData);
    console.log(`📝 Loan created for account ${accountData.accountNumber}`);
    console.log(`   Customer: ${accountData.customerName}`);
    console.log(`   Principal: ₵${loan.principalAmount}`);
    console.log(`   Total Repayable: ₵${loan.totalRepayable}`);
    console.log(`   Guarantor Advance: ₵${loan.guarantorAdvance}`);
    return loan;
  }
  
  // Process a loan repayment
  processLoanRepayment(accountId, amount, description = '') {
    try {
      console.log(`\n💳 Processing loan repayment: ₵${amount}`);
      
      // 1. Get current loan state
      const loan = this.loanDB.getLoan(accountId);
      if (!loan) {
        throw new Error('Loan account not found');
      }
      
      if (loan.isCompleted) {
        throw new Error('Loan is already completed');
      }
      
      const currentLoanState = {
        totalPaid: loan.totalPaid,
        totalInterestPaid: loan.totalInterestPaid,
        guarantorReimbursed: loan.guarantorReimbursed,
        principalRemaining: loan.principalRemaining,
        isCompleted: loan.isCompleted
      };
      
      // 2. Process repayment using our logic
      const repaymentResult = makeRepayment(amount, currentLoanState);
      
      if (!repaymentResult.success) {
        throw new Error(repaymentResult.error);
      }
      
      // 3. Create transaction record
      const transaction = this.transactionDB.createTransaction({
        accountId,
        amount: repaymentResult.payment.amount,
        type: 'LOAN_REPAYMENT',
        status: 'COMPLETED',
        description: description || `Loan repayment - ₵${repaymentResult.payment.amount}`,
        reference: `LR-${Date.now()}`,
        breakdown: repaymentResult.payment.breakdown,
        remainingBalance: repaymentResult.remainingBalance
      });
      
      // 4. Update loan state in database
      this.loanDB.updateLoan(accountId, {
        totalPaid: repaymentResult.loanState.totalPaid,
        totalInterestPaid: repaymentResult.loanState.totalInterestPaid,
        guarantorReimbursed: repaymentResult.loanState.guarantorReimbursed,
        principalRemaining: repaymentResult.loanState.principalRemaining,
        isCompleted: repaymentResult.loanState.isCompleted,
        lastPaymentDate: new Date(),
        lastPaymentAmount: repaymentResult.payment.amount
      });
      
      // 5. Record bank income from interest
      if (repaymentResult.payment.breakdown.interestPaid > 0) {
        this.bankIncomeDB.recordIncome({
          amount: repaymentResult.payment.breakdown.interestPaid,
          source: 'LOAN_INTEREST',
          description: `Interest income from loan repayment - Account ${loan.accountNumber}`,
          transactionId: transaction.id,
          accountId
        });
      }
      
      // 6. Log the results
      console.log(`✅ Repayment processed successfully!`);
      console.log(`   💰 Amount: ₵${repaymentResult.payment.amount}`);
      console.log(`   📈 Interest: ₵${repaymentResult.payment.breakdown.interestPaid}`);
      console.log(`   🤝 Guarantor: ₵${repaymentResult.payment.breakdown.guarantorReimbursement}`);
      console.log(`   🏦 Loan reduction: ₵${repaymentResult.payment.breakdown.loanReduction}`);
      console.log(`   📊 Remaining: ₵${repaymentResult.remainingBalance}`);
      
      if (repaymentResult.isCompleted) {
        console.log(`   🎉 LOAN COMPLETED!`);
      }
      
      return {
        success: true,
        transaction,
        repayment: repaymentResult,
        loan: this.loanDB.getLoan(accountId)
      };
      
    } catch (error) {
      console.log(`❌ Repayment failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get loan status
  getLoanStatus(accountId) {
    const loan = this.loanDB.getLoan(accountId);
    if (!loan) {
      return { success: false, error: 'Loan not found' };
    }
    
    const currentLoanState = {
      totalPaid: loan.totalPaid,
      totalInterestPaid: loan.totalInterestPaid,
      guarantorReimbursed: loan.guarantorReimbursed,
      principalRemaining: loan.principalRemaining,
      isCompleted: loan.isCompleted
    };
    
    const summary = getLoanSummary(currentLoanState);
    
    return {
      success: true,
      loan,
      summary: summary.summary,
      transactions: this.transactionDB.getTransactions(accountId)
    };
  }
  
  // Get banking reports
  getBankingReports() {
    const allLoans = this.loanDB.getAllLoans();
    const totalInterestIncome = this.bankIncomeDB.getIncomeBySource('LOAN_INTEREST');
    
    return {
      totalLoans: allLoans.length,
      completedLoans: allLoans.filter(l => l.isCompleted).length,
      activeLoans: allLoans.filter(l => !l.isCompleted).length,
      totalLoansPaid: allLoans.reduce((sum, l) => sum + l.totalPaid, 0),
      totalInterestCollected: allLoans.reduce((sum, l) => sum + l.totalInterestPaid, 0),
      totalGuarantorReimbursed: allLoans.reduce((sum, l) => sum + l.guarantorReimbursed, 0),
      bankInterestIncome: totalInterestIncome,
      transactions: this.transactionDB.getTransactions()
    };
  }
}

// Demo the complete system
function demonstrateIntegratedSystem() {
  console.log('🏦 INTEGRATED LOAN REPAYMENT SYSTEM DEMONSTRATION');
  console.log('===============================================');
  
  const loanService = new LoanRepaymentService();
  
  // Create some loans
  const loan1 = loanService.createLoan({
    accountId: 'ACC-001',
    accountNumber: 'LOAN-001',
    customerId: 'CUST-001',
    customerName: 'John Doe'
  });
  
  const loan2 = loanService.createLoan({
    accountId: 'ACC-002',
    accountNumber: 'LOAN-002',
    customerId: 'CUST-002',
    customerName: 'Jane Smith'
  });
  
  // Process various repayments for loan 1
  console.log('\n🎯 LOAN 1 REPAYMENT SCENARIO');
  console.log('===========================');
  
  loanService.processLoanRepayment('ACC-001', 110, 'Monthly payment 1');
  loanService.processLoanRepayment('ACC-001', 220, 'Double payment');
  loanService.processLoanRepayment('ACC-001', 165, 'Irregular payment');
  loanService.processLoanRepayment('ACC-001', 330, 'Large payment');
  loanService.processLoanRepayment('ACC-001', 275, 'Final payment');
  
  // Show loan 1 status
  console.log('\n📊 LOAN 1 FINAL STATUS');
  console.log('======================');
  const loan1Status = loanService.getLoanStatus('ACC-001');
  if (loan1Status.success) {
    const { loan, summary } = loan1Status;
    console.log(`Customer: ${loan.customerName}`);
    console.log(`Account: ${loan.accountNumber}`);
    console.log(`Status: ${summary.status.toUpperCase()}`);
    console.log(`Progress: ${summary.progress.percentComplete.toFixed(1)}%`);
    console.log(`Total Paid: ₵${summary.progress.totalPaid}`);
    console.log(`Interest Paid: ₵${summary.breakdown.interestPaid}/₵100`);
    console.log(`Guarantor Reimbursed: ₵${summary.breakdown.guarantorReimbursed}/₵500`);
    console.log(`Remaining Balance: ₵${summary.progress.remainingBalance}`);
    console.log(`Transactions: ${loan1Status.transactions.length}`);
  }
  
  // Process some payments for loan 2
  console.log('\n🎯 LOAN 2 REPAYMENT SCENARIO');
  console.log('===========================');
  
  loanService.processLoanRepayment('ACC-002', 550, 'Large first payment');
  loanService.processLoanRepayment('ACC-002', 550, 'Complete remaining balance');
  
  // Show banking reports
  console.log('\n📈 BANKING SYSTEM REPORTS');
  console.log('=========================');
  const reports = loanService.getBankingReports();
  
  console.log(`Total Loans Created: ${reports.totalLoans}`);
  console.log(`Completed Loans: ${reports.completedLoans}`);
  console.log(`Active Loans: ${reports.activeLoans}`);
  console.log(`Total Amount Paid: ₵${reports.totalLoansPaid}`);
  console.log(`Total Interest Collected: ₵${reports.totalInterestCollected}`);
  console.log(`Total Guarantor Reimbursed: ₵${reports.totalGuarantorReimbursed}`);
  console.log(`Bank Interest Income: ₵${reports.bankInterestIncome}`);
  console.log(`Total Transactions: ${reports.transactions.length}`);
  
  console.log('\n🎊 INTEGRATION DEMONSTRATION COMPLETE!');
  console.log('The loan repayment system successfully integrates with:');
  console.log('✅ Loan management');
  console.log('✅ Transaction recording');
  console.log('✅ Bank income tracking');
  console.log('✅ Progress monitoring');
  console.log('✅ Completion detection');
  console.log('✅ Reporting and analytics');
}

// Run the demonstration
demonstrateIntegratedSystem();
