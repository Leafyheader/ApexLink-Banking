// Define common types used throughout the application

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'teller';
  avatar?: string;
}

// Customer types
export interface Customer {
  id: string;
  customerNumber?: string;  // Human-readable customer ID like CUST000000001
  name: string;
  email: string;
  phone: string;
  address: string;
  kycStatus: 'verified' | 'pending' | 'rejected';
  dateJoined: string;
  accounts: Account[];
  
  // Extended fields for customer form
  firstName?: string;
  surname?: string;
  gender?: string;
  dateOfBirth?: string;
  occupation?: string;
  workplace?: string;
  maritalStatus?: string;
  residentialAddress?: string;
  postalAddress?: string;
  contactNumber?: string;
  city?: string;
  beneficiaryName?: string;
  beneficiaryContact?: string;
  beneficiaryPercentage?: number;
  beneficiary2Name?: string;
  beneficiary2Contact?: string;
  beneficiary2Percentage?: number;
  beneficiary3Name?: string;
  beneficiary3Contact?: string;
  beneficiary3Percentage?: number;
  identificationType?: string;
  identificationNumber?: string;
  photo?: string;
  signature?: string;
}

// Account types
export interface Account {
  id: string;
  accountNumber: string;
  customerId?: string;
  customerName?: string; // Keep for backward compatibility
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  type: 'SAVINGS' | 'CURRENT' | 'FIXED' | 'LOAN';
  balance: number;
  status: 'ACTIVE' | 'DORMANT' | 'CLOSED' | 'FROZEN';
  dateOpened: string;
  currency: string;
  branch?: string;
  availableBalance?: number;
  ledgerBalance?: number;
  minimumBalance?: number;
  lastTransactionDate?: string;
  lastDepositAmount?: number;
  lastDepositDate?: string;
  lastWithdrawalAmount?: number;
  lastWithdrawalDate?: string;
  transactionsThisMonth?: number;
  overdraftLimit?: number;
  accruedInterest?: number;
  shareBalance?: number;
  sharesAvailableBalance?: number;
}

// Transaction types
export interface LoanRepaymentDetails {
  totalRepayment: number;
  breakdown: {
    interestPaid: number;
    guarantorReimbursement: number;
    loanReduction: number;
  };
  loanState: {
    totalPaid: number;
    totalInterestPaid: number;
    guarantorReimbursed: number;
    principalRemaining: number;
    isCompleted: boolean;
  };
  remainingBalance: number;
  isCompleted: boolean;
  guarantorsCount: number;
  disbursements: Array<{
    guarantorName: string;
    accountNumber: string;
    amount: number;
    percentage: number;
    reference: string;
  }>;
}

export interface Transaction {
  id: string;
  accountId: string;
  accountNumber: string;
  customerName?: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'loan-repayment';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
  reference?: string;
  repaymentDetails?: LoanRepaymentDetails;
}

// Loan types
export interface Loan {
  id: string;
  customerId: string;
  customerName?: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  accountId: string;
  account?: {
    id: string;
    accountNumber: string;
    type: string;
    balance: number;
    shareBalance?: number;
  };
  amount: number;
  interestRate: number;
  term: number; // in months
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED' | 'CLOSED';
  repaymentFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  totalPayable: number;
  amountPaid: number;
  outstandingBalance: number;
  monthlyPayment: number;
  nextPaymentDate?: string;
  guarantor1?: LoanGuarantor;
  guarantor2?: LoanGuarantor;
  guarantor3?: LoanGuarantor;
  guarantor1Percentage?: number;
  guarantor2Percentage?: number;
  guarantor3Percentage?: number;
  approvedBy?: {
    id: string;
    name: string;
    username: string;
  };
  approvedById?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanGuarantor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface Guarantor {
  accountId?: string;
  accountName?: string;
  accountNumber?: string;
  accountType?: string;
  balance?: number;
  sharesBalance?: number;
  percentage?: number; // 1-100
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
}

// Report types
export interface Report {
  id: string;
  type: 'customer' | 'transaction' | 'loan';
  dateGenerated: string;
  format: 'pdf' | 'excel';
  url: string;
  parameters: Record<string, string | number | boolean>;
}

// Dashboard types
export interface DashboardSummary {
  totalCustomers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalLoans: number;
  todayTransactions: number;
  changes: {
    customers: number;
    deposits: number;
    withdrawals: number;
    loans: number;
    transactions: number;
  };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[] | string;
    borderColor?: string[] | string;
    borderWidth?: number;
  }>;
}

// Withdrawal Authorization types
export interface WithdrawalAuthorization {
  id: string;
  accountNumber: string;
  customerName: string;
  customerId: string;
  amount: number;
  type: 'withdrawal' | 'transfer';
  description: string;
  reference: string;
  toAccountNumber?: string;
  toCustomerName?: string;
  requestedAt: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'approved' | 'pending' | 'rejected';
  availableBalance: number;
  rejectedReason?: string;
  isReversed?: boolean;
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
}

export interface WithdrawalAuthorizationResponse {
  transactions: WithdrawalAuthorization[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  summary: {
    total: number;
    totalAmount: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}