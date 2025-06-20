import { Account, Customer, Transaction } from '../types';

// Sample account data
const accounts: Account[] = [
  {
    id: '1',
    accountNumber: '1234567890',
    customerName: 'John Doe',
    type: 'savings',
    status: 'active',
    currency: 'USD',
    balance: 12500.75,
    availableBalance: 12450.25,
    ledgerBalance: 12500.75,
    minimumBalance: 1000,
    dateOpened: '2023-05-15T00:00:00Z',
    branch: 'Main Branch - New York',
    lastTransactionDate: '2025-05-28T14:23:45Z',
    lastDepositAmount: 2500,
    lastDepositDate: '2025-05-28T14:23:45Z',
    lastWithdrawalAmount: 150,
    lastWithdrawalDate: '2025-05-25T09:15:30Z',
    transactionsThisMonth: 8,
    overdraftLimit: 1000,
    accruedInterest: 75.25,
    customerId: 'c1'
  },  {
    id: '2',
    accountNumber: '2345678901',
    customerName: 'Jane Smith',
    type: 'current',
    status: 'active',
    currency: 'USD',
    balance: 5230.50,
    availableBalance: 5230.50,
    ledgerBalance: 5230.50,
    minimumBalance: 500,
    dateOpened: '2024-01-10T00:00:00Z',
    branch: 'Downtown Branch - Chicago',
    lastTransactionDate: '2025-05-30T10:45:22Z',
    lastDepositAmount: 1200,
    lastDepositDate: '2025-05-30T10:45:22Z',
    lastWithdrawalAmount: 350,
    lastWithdrawalDate: '2025-05-29T16:20:10Z',
    transactionsThisMonth: 12,
    customerId: 'c2'
  },
  {
    id: '3',
    accountNumber: '3456789012',
    customerName: 'Robert Johnson',
    type: 'fixed',
    status: 'dormant',
    currency: 'USD',
    balance: 25000,
    availableBalance: 0,
    ledgerBalance: 25000,
    minimumBalance: 25000,
    dateOpened: '2023-11-05T00:00:00Z',
    branch: 'West End - San Francisco',
    lastTransactionDate: '2024-01-05T08:30:15Z',
    transactionsThisMonth: 0,
    accruedInterest: 312.50,
    customerId: 'c3'
  },
  {
    id: '4',
    accountNumber: '4567890123',
    customerName: 'Sarah Williams',
    type: 'loan',
    status: 'active',
    currency: 'USD',
    balance: -15000,
    availableBalance: 5000,
    ledgerBalance: -15000,
    dateOpened: '2024-03-20T00:00:00Z',
    branch: 'South Branch - Miami',
    lastTransactionDate: '2025-05-15T13:10:45Z',
    lastWithdrawalAmount: 2000,
    lastWithdrawalDate: '2025-05-15T13:10:45Z',
    transactionsThisMonth: 1,
    customerId: 'c4'
  },
  {
    id: '5',
    accountNumber: '5678901234',
    customerName: 'Michael Brown',
    type: 'savings',
    status: 'frozen',
    currency: 'USD',
    balance: 8750.25,
    availableBalance: 0,
    ledgerBalance: 8750.25,
    minimumBalance: 1000,
    dateOpened: '2022-08-12T00:00:00Z',
    branch: 'East Branch - Boston',
    lastTransactionDate: '2025-04-30T09:45:20Z',
    lastDepositAmount: 750,
    lastDepositDate: '2025-04-30T09:45:20Z',
    transactionsThisMonth: 0,
    customerId: 'c5'
  }
];

// Sample customer data
const customers: Customer[] = [
  {
    id: 'c1',
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1-555-0123',
    address: '123 Main St, New York, NY 10001',
    kycStatus: 'verified',
    dateJoined: '2023-05-15T00:00:00Z',
    accounts: []
  },
  {
    id: 'c2',
    name: 'Jane Smith',
    email: 'jane.smith@email.com',
    phone: '+1-555-0124',
    address: '456 Oak Ave, Chicago, IL 60601',
    kycStatus: 'verified',
    dateJoined: '2024-01-10T00:00:00Z',
    accounts: []
  },
  {
    id: 'c3',
    name: 'Robert Johnson',
    email: 'robert.johnson@email.com',
    phone: '+1-555-0125',
    address: '789 Pine St, San Francisco, CA 94102',
    kycStatus: 'verified',
    dateJoined: '2023-11-05T00:00:00Z',
    accounts: []
  },
  {
    id: 'c4',
    name: 'Sarah Williams',
    email: 'sarah.williams@email.com',
    phone: '+1-555-0126',
    address: '321 Beach Blvd, Miami, FL 33101',
    kycStatus: 'verified',
    dateJoined: '2024-03-20T00:00:00Z',
    accounts: []
  },
  {
    id: 'c5',
    name: 'Michael Brown',
    email: 'michael.brown@email.com',
    phone: '+1-555-0127',
    address: '654 Harbor St, Boston, MA 02101',
    kycStatus: 'pending',
    dateJoined: '2022-08-12T00:00:00Z',
    accounts: []
  }
];

// Sample transaction data
const transactions: Transaction[] = [
  {
    id: 't1',
    accountId: '1',
    accountNumber: '1234567890',
    amount: 2500,
    type: 'deposit',
    status: 'completed',
    date: '2025-05-28T14:23:45Z',
    description: 'Salary deposit',
    reference: 'SAL-2025-05-001'
  },
  {
    id: 't2',
    accountId: '1',
    accountNumber: '1234567890',
    amount: -150,
    type: 'withdrawal',
    status: 'completed',
    date: '2025-05-25T09:15:30Z',
    description: 'ATM withdrawal',
    reference: 'ATM-2025-05-002'
  },
  {
    id: 't3',
    accountId: '2',
    accountNumber: '2345678901',
    amount: 1200,
    type: 'deposit',
    status: 'completed',
    date: '2025-05-30T10:45:22Z',
    description: 'Business income',
    reference: 'BIZ-2025-05-003'
  }
];

// Mock API for simulating backend calls
const mockAPI = {
  // Account operations
  getAccounts: async (): Promise<Account[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...accounts]), 800);
    });
  },

  getAccount: async (id: string): Promise<Account> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const account = accounts.find(acc => acc.id === id);
        if (account) {
          resolve({...account});
        } else {
          reject(new Error('Account not found'));
        }
      }, 600);
    });
  },

  updateAccount: async (id: string, data: Partial<Account>): Promise<Account> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = accounts.findIndex(acc => acc.id === id);
        if (index !== -1) {
          const updatedAccount = {...accounts[index], ...data};
          accounts[index] = updatedAccount;
          resolve({...updatedAccount});
        } else {
          reject(new Error('Account not found'));
        }
      }, 800);
    });
  },

  createAccount: async (data: Omit<Account, 'id'>): Promise<Account> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newId = (accounts.length + 1).toString();
        const newAccount = { id: newId, ...data };
        accounts.push(newAccount);
        resolve({...newAccount});
      }, 1000);
    });
  },

  deleteAccount: async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = accounts.findIndex(acc => acc.id === id);
        if (index !== -1) {
          accounts[index].status = 'closed';
          resolve();
        } else {
          reject(new Error('Account not found'));
        }
      }, 800);
    });
  },

  // Customer operations
  getCustomers: async (): Promise<Customer[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const customersWithAccounts = customers.map(customer => ({
          ...customer,
          accounts: accounts.filter(acc => acc.customerId === customer.id)
        }));
        resolve(customersWithAccounts);
      }, 800);
    });
  },
  getCustomer: async (id: string): Promise<Customer> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log('mockAPI.getCustomer called with ID:', id);
        console.log('Available customers:', customers.map(c => ({ id: c.id, name: c.name })));
        const customer = customers.find(cust => cust.id === id);
        if (customer) {
          console.log('Found customer:', customer.name);
          const customerAccounts = accounts.filter(acc => acc.customerId === id);
          resolve({...customer, accounts: customerAccounts});
        } else {
          console.log('Customer not found for ID:', id);
          reject(new Error('Customer not found'));
        }
      }, 600);
    });
  },

  updateCustomer: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = customers.findIndex(cust => cust.id === id);
        if (index !== -1) {
          const updatedCustomer = {...customers[index], ...data};
          customers[index] = updatedCustomer;
          const customerAccounts = accounts.filter(acc => acc.customerId === id);
          resolve({...updatedCustomer, accounts: customerAccounts});
        } else {
          reject(new Error('Customer not found'));
        }
      }, 800);
    });
  },
  createCustomer: async (data: Omit<Customer, 'id' | 'accounts'>): Promise<Customer> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newId = `c${customers.length + 1}`;
        const newCustomer = { id: newId, ...data, accounts: [] };
        customers.push(newCustomer);
        resolve({...newCustomer});
      }, 1000);
    });
  },

  deleteCustomer: async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = customers.findIndex(cust => cust.id === id);
        if (index !== -1) {
          // Remove customer
          customers.splice(index, 1);
          // Optionally close associated accounts
          accounts.forEach(account => {
            if (account.customerId === id) {
              account.status = 'closed';
            }
          });
          resolve();
        } else {
          reject(new Error('Customer not found'));
        }
      }, 800);
    });
  },

  // Transaction operations
  getTransactions: async (accountId?: string): Promise<Transaction[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const filteredTransactions = accountId 
          ? transactions.filter(txn => txn.accountId === accountId)
          : [...transactions];
        resolve(filteredTransactions);
      }, 800);
    });
  },

  getTransaction: async (id: string): Promise<Transaction> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const transaction = transactions.find(txn => txn.id === id);
        if (transaction) {
          resolve({...transaction});
        } else {
          reject(new Error('Transaction not found'));
        }
      }, 600);
    });
  },

  createTransaction: async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newId = `t${transactions.length + 1}`;
        const newTransaction = { id: newId, ...data };
        transactions.push(newTransaction);
        
        // Update account balance
        const accountIndex = accounts.findIndex(acc => acc.id === data.accountId);
        if (accountIndex !== -1) {
          accounts[accountIndex].balance += data.amount;
          if (accounts[accountIndex].availableBalance !== undefined) {
            accounts[accountIndex].availableBalance! += data.amount;
          }
        }
        
        resolve({...newTransaction});
      }, 1000);
    });
  },

  // Dashboard data
  getDashboardSummary: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const summary = {
          totalCustomers: customers.length,
          totalDeposits: accounts.reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0),
          totalLoans: accounts.reduce((sum, acc) => sum + (acc.balance < 0 ? Math.abs(acc.balance) : 0), 0),
          todayTransactions: transactions.filter(txn => {
            const today = new Date().toISOString().split('T')[0];
            return txn.date.startsWith(today);
          }).length
        };
        resolve(summary);
      }, 600);
    });
  }
};

// Export the data arrays and API for direct access
export { accounts, customers, transactions, mockAPI };
