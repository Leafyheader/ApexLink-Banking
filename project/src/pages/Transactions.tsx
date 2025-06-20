import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, X, Filter, Download, Eye, Edit, Trash2, ArrowLeftRight, ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import TransactionForm from '../components/transactions/TransactionForm';
import { Transaction, Account } from '../types';
import { formatCurrency, formatDateTime } from '../lib/utils';
import api, { withdrawalAuthorizationApi } from '../lib/api';

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<number>();

  useEffect(() => {
    // Clear the previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set a new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear timer on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccountsLoaded, setAllAccountsLoaded] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [transactionStats, setTransactionStats] = useState<{
    totalTransactions: number;
    transactionsByType: {
      deposits: { count: number; amount: number };
      withdrawals: { count: number; amount: number };
      transfers: { count: number; amount: number };
    };
    transactionsByStatus: {
      completed: number;
      pending: number;
      failed: number;
    };
  } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search input to reduce API calls
  const debouncedSearchQuery = useDebounce(searchInput, 500);

  // Update searchQuery when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
    setCurrentPage(1); // Reset to first page when search changes
  }, [debouncedSearchQuery]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build transaction query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (typeFilter) {
        params.append('type', typeFilter);
      }
      if (dateFilter) {
        // Convert dateFilter to actual date range for API
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        switch (dateFilter) {
          case 'today':
            params.append('dateFrom', today.toISOString().split('T')[0]);
            params.append('dateTo', today.toISOString().split('T')[0]);
            break;
          case 'yesterday':
            params.append('dateFrom', yesterday.toISOString().split('T')[0]);
            params.append('dateTo', yesterday.toISOString().split('T')[0]);
            break;
          case 'last-week':
            params.append('dateFrom', lastWeek.toISOString().split('T')[0]);
            break;
          case 'last-month':
            params.append('dateFrom', lastMonth.toISOString().split('T')[0]);
            break;
        }
      }

      const [transactionsResponse, accountsResponse, statsResponse] = await Promise.all([
        api.get(`/transactions?${params.toString()}`),
        api.get('/accounts?limit=100'), // Load limited accounts for display
        api.get('/transactions/stats')
      ]);

      setTransactions(transactionsResponse.data.transactions || []);
      setTotalTransactions(transactionsResponse.data.pagination?.total || 0);
      setTotalPages(transactionsResponse.data.pagination?.totalPages || 0);
      setAccounts(accountsResponse.data.accounts || []);
      setTransactionStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, typeFilter, dateFilter]);

  // Load all accounts for transaction form dropdowns
  const loadAllAccounts = useCallback(async () => {
    if (allAccountsLoaded) return; // Don't reload if already loaded
    
    try {
      const response = await api.get('/accounts?limit=10000'); // Load all accounts
      setAccounts(response.data.accounts || []);
      setAllAccountsLoaded(true);
    } catch (error) {
      console.error('Error loading all accounts:', error);
      // Don't show error to user, fallback to existing accounts
    }
  }, [allAccountsLoaded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteTransaction = async (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        setIsLoading(true);
        setError(null);
        await api.delete(`/transactions/${transactionId}`);
        setTransactions(transactions.filter(t => t.id !== transactionId));
      } catch (err) {
        console.error('Error deleting transaction:', err);
        setError('Failed to delete transaction. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle search with server-side filtering
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    // Note: searchQuery will be updated by the debounced effect
  };

  // Handle filter changes with server-side filtering
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleDateFilter = (value: string) => {
    setDateFilter(value);
    setCurrentPage(1);
  };

  // Badge variants for transaction status
  const getStatusVariant = (status: string): 'success' | 'danger' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'warning';
    }
  };
  // Badge variants for transaction type
  const getTypeVariant = (type: string, description?: string): 'primary' | 'secondary' | 'warning' | 'success' | 'danger' => {
    // Special handling for withdrawal charges
    if (type === 'withdrawal' && description === 'withdrawal charge') {
      return 'danger';
    }
    
    switch (type) {
      case 'deposit':
        return 'primary';
      case 'withdrawal':
        return 'secondary';
      case 'transfer':
        return 'warning';
      case 'loan-repayment':
        return 'success';
      default:
        return 'primary';
    }
  };
  // Get transaction type icon
  const getTypeIcon = (type: string, description?: string) => {
    // Special handling for withdrawal charges
    if (type === 'withdrawal' && description === 'withdrawal charge') {
      return <ArrowDownCircle size={16} className="text-orange-600" />;
    }
    
    switch (type) {
      case 'deposit':
        return <ArrowUpCircle size={16} className="text-green-600" />;
      case 'withdrawal':
        return <ArrowDownCircle size={16} className="text-red-600" />;
      case 'transfer':
        return <ArrowLeftRight size={16} className="text-blue-600" />;
      case 'loan-repayment':
        return <ArrowUpCircle size={16} className="text-purple-600" />;
      default:
        return <ArrowLeftRight size={16} />;
    }
  };

  // Get amount color and sign for transaction type
  const getAmountDisplay = (type: string) => {
    switch (type) {
      case 'deposit':
        return {
          color: 'text-green-600',
          sign: '+',
        };
      case 'withdrawal':
        return {
          color: 'text-red-600',
          sign: '-',
        };
      case 'transfer':
        return {
          color: 'text-blue-600',
          sign: '-',
        };
      case 'loan-repayment':
        return {
          color: 'text-purple-600',
          sign: '-',
        };
      default:
        return {
          color: 'text-gray-600',
          sign: '',
        };
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  // Handle transaction actions
  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
    loadAllAccounts();
  };
  // Handle new transaction
  const handleAddTransaction = async (data: Partial<Transaction>) => {
    try {
      setIsLoading(true);
      setError(null);      // Check if this is a withdrawal or transfer that needs authorization
      if (data.type === 'withdrawal' || data.type === 'transfer') {
        // For transfers, get the destination account details
        let toAccountNumber, toCustomerName;
        if (data.type === 'transfer') {
          const transferData = data as Partial<Transaction> & { toAccountId?: string };
          if (transferData.toAccountId) {
            const toAccount = accounts.find(a => a.id === transferData.toAccountId);
            if (toAccount) {
              toAccountNumber = toAccount.accountNumber;
              toCustomerName = toAccount.customerName;
            }
          }
        }

        // Create withdrawal authorization request instead of direct transaction
        const authData = {
          accountId: data.accountId!,
          amount: data.amount!,
          type: data.type as 'withdrawal' | 'transfer',
          description: data.description || `${data.type} request`,
          reference: data.reference || `${data.type.toUpperCase()}-${Date.now()}`,
          ...(data.type === 'transfer' && {
            toAccountNumber,
            toCustomerName
          })
        };

        const response = await withdrawalAuthorizationApi.createWithdrawalAuthorization(authData);
        
        setIsAddModalOpen(false);
        
        // Show success message for authorization request
        alert(
          `${data.type === 'withdrawal' ? 'Withdrawal' : 'Transfer'} authorization request submitted successfully! ✅\n\n` +
          `Request ID: ${response.id}\n` +
          `Amount: ${formatCurrency(data.amount || 0)}\n` +
          `Status: Pending Approval\n\n` +
          `The request has been sent for approval and will appear in the Withdrawal Authorization section.`
        );
        
        // Don't reload transaction data since this creates an authorization request, not a transaction
        return;
      }

      // For deposits and loan repayments, process immediately as before
      const response = await api.post('/transactions', data);
      setTransactions([response.data, ...transactions]);
      setIsAddModalOpen(false);
      
      // Show success message with special handling for loan repayments
      if (data.type === 'loan-repayment') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const repaymentDetails = (response.data as any).repaymentDetails;
        if (repaymentDetails) {
          const breakdown = repaymentDetails.breakdown;
          let message = `Loan repayment successful! ✅\n\n`;
          message += `💰 Payment Amount: ${formatCurrency(repaymentDetails.totalRepayment)}\n\n`;
          message += `📊 Payment Breakdown:\n`;
          message += `  • Interest Paid: ${formatCurrency(breakdown.interestPaid)}\n`;
          message += `  • Guarantor Reimbursement: ${formatCurrency(breakdown.guarantorReimbursement)}\n`;
          message += `  • Loan Reduction: ${formatCurrency(breakdown.loanReduction)}\n\n`;
          message += `📈 Loan Status:\n`;
          message += `  • Total Paid: ${formatCurrency(repaymentDetails.loanState.totalPaid)}\n`;
          message += `  • Remaining Balance: ${formatCurrency(repaymentDetails.remainingBalance)}\n`;
          
          if (repaymentDetails.isCompleted) {
            message += `\n🎉 LOAN FULLY PAID! Congratulations!`;
          }

          if (repaymentDetails.disbursements && repaymentDetails.disbursements.length > 0) {
            message += `\n\n👥 Guarantor Disbursements:`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            repaymentDetails.disbursements.forEach((disbursement: any) => {
              message += `\n  • ${disbursement.guarantorName}: ${formatCurrency(disbursement.amount)}`;
            });
          }
          
          alert(message);
        } else {
          // Fallback to old logic
          const accountBalance = response.data.accountBalance;
          if (typeof accountBalance === 'number') {
            const remainingDebt = Math.abs(accountBalance);
            
            if (remainingDebt === 0) {
              alert(`Loan repayment successful! 🎉\n\nThe loan has been fully paid off!`);
            } else {
              alert(`Loan repayment successful! ✅\n\nAmount paid: ${formatCurrency(data.amount || 0)}\nRemaining debt: ${formatCurrency(remainingDebt)}`);
            }
          } else {
            alert('Loan repayment successful!');
          }
        }
      } else {
        alert(`${data.type?.charAt(0).toUpperCase()}${data.type?.slice(1)} transaction completed successfully!`);
      }
      
      // Reload data to get updated stats and balances
      loadData();
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError('Failed to create transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit transaction
  const handleEditSubmit = async (data: Partial<Transaction>) => {
    if (!selectedTransaction) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.put(`/transactions/${selectedTransaction.id}`, data);
      const updatedTransactions = transactions.map(t => 
        t.id === selectedTransaction.id ? response.data : t
      );
      setTransactions(updatedTransactions);
      setIsEditModalOpen(false);
      setSelectedTransaction(null);
      // Reload data to get updated stats
      loadData();
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Failed to update transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry function for error handling
  const retryLoad = () => {
    setError(null);
    loadData();
  };

  // Export transactions
  const handleExport = () => {
    // Simulate export
    alert('Transactions exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={retryLoad}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Manage and track all financial transactions</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<Download size={18} />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            leftIcon={<Plus size={18} />}
            onClick={() => {
              setIsAddModalOpen(true);
              loadAllAccounts();
            }}
          >
            New Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUpCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Deposits</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(transactionStats?.transactionsByType?.deposits?.amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowDownCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Withdrawals</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(transactionStats?.transactionsByType?.withdrawals?.amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowLeftRight className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Transfers</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(transactionStats?.transactionsByType?.transfers?.amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowLeftRight className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">{transactionStats?.totalTransactions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
            {(searchInput || statusFilter || typeFilter || dateFilter) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search transactions..."
              value={searchInput}
              onChange={handleSearch}
              leftIcon={<Search size={18} />}
              rightIcon={
                searchInput ? (
                  <button onClick={() => setSearchInput('')}>
                    <X size={18} />
                  </button>
                ) : undefined
              }
              fullWidth
            />
            
            <Select
              value={statusFilter}
              onChange={handleStatusFilter}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
              ]}
              fullWidth
            />
            
            <Select
              value={typeFilter}
              onChange={handleTypeFilter}
              options={[
                { value: '', label: 'All Types' },
                { value: 'deposit', label: 'Deposits' },
                { value: 'withdrawal', label: 'Withdrawals' },
                { value: 'transfer', label: 'Transfers' },
                { value: 'loan-repayment', label: 'Loan Repayments' },
              ]}
              fullWidth
            />
            
            <Select
              value={dateFilter}
              onChange={handleDateFilter}
              options={[
                { value: '', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'last-week', label: 'Last Week' },
                { value: 'last-month', label: 'Last Month' },
              ]}
              fullWidth
            />
          </div>
          
          {/* Items per page selector */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-gray-600">Show:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const account = Array.isArray(accounts) ? accounts.find(a => a.id === transaction.accountId) : null;
              return (
                <TableRow key={transaction.id}>                  <TableCell>
                    <div className="flex items-center">
                      {getTypeIcon(transaction.type, transaction.description)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description || 'No description'}
                        </div>
                        <div className="text-sm text-gray-500">ID: {transaction.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.accountNumber || account?.accountNumber || 'Unknown Account'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account?.customer?.name || account?.customerName || 'Unknown Customer'}
                      </div>
                    </div>
                  </TableCell>                  <TableCell>
                    <Badge variant={getTypeVariant(transaction.type, transaction.description)}>
                      {transaction.description === 'withdrawal charge' 
                        ? 'Withdrawal Charge' 
                        : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className={getAmountDisplay(transaction.type).color}>
                    <span className="font-medium">
                      {getAmountDisplay(transaction.type).sign}{formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(transaction.status)}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDateTime(transaction.date)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {transaction.reference || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Eye size={16} />}
                        onClick={() => handleViewTransaction(transaction)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit size={16} />}
                        onClick={() => handleEditTransaction(transaction)}
                        disabled={transaction.status === 'completed'}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 size={16} />}
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        disabled={transaction.status === 'completed'}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                  {searchInput || statusFilter || typeFilter || dateFilter
                    ? 'No transactions found matching your filters'
                    : 'No transactions found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-gray-50 rounded-lg border">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalTransactions)} of {totalTransactions} transactions
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {/* Smart pagination: show first, current vicinity, and last pages */}
            {(() => {
              const pages = [];
              const maxVisible = 7; // Maximum number of page buttons to show
              
              if (totalPages <= maxVisible) {
                // Show all pages if total is small
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Show smart pagination with ellipsis
                if (currentPage <= 4) {
                  // Near the beginning
                  for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                  }
                  pages.push(-1); // Ellipsis
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  // Near the end
                  pages.push(1);
                  pages.push(-1); // Ellipsis
                  for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // In the middle
                  pages.push(1);
                  pages.push(-1); // Ellipsis
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                  }
                  pages.push(-2); // Ellipsis
                  pages.push(totalPages);
                }
              }
              
              return pages.map((page, index) => {
                if (page === -1 || page === -2) {
                  return (
                    <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                      ...
                    </span>
                  );
                }
                
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              });
            })()}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            
            {/* Go to page input for large datasets */}
            {totalPages > 10 && (
              <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-300">
                <span className="text-sm text-gray-600">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">of {totalPages}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Show pagination info even with single page for transparency */}
      {totalPages === 1 && totalTransactions > 0 && (
        <div className="flex items-center justify-center mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700">
            Showing all {totalTransactions} transactions on 1 page
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="New Transaction"
        size="lg"
        preventClickOutsideClose={true}
      >
        <TransactionForm
          accounts={accounts}
          onSubmit={handleAddTransaction}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isLoading}
        />
      </Modal>

      {/* View Transaction Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Transaction Details"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.accountNumber || 'N/A'}</p>
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <div className="mt-1">
                  <Badge variant={getTypeVariant(selectedTransaction.type, selectedTransaction.description)}>
                    {selectedTransaction.description === 'withdrawal charge' 
                      ? 'Withdrawal Charge' 
                      : selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className={`mt-1 text-sm font-medium ${getAmountDisplay(selectedTransaction.type).color}`}>
                  {getAmountDisplay(selectedTransaction.type).sign}{formatCurrency(selectedTransaction.amount)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(selectedTransaction.status)}>
                    {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedTransaction.date)}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Reference</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.reference || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.description || 'No description'}</p>
              </div>
            </div>

            {/* Enhanced Loan Repayment Details */}
            {selectedTransaction.type === 'loan-repayment' && selectedTransaction.repaymentDetails && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Repayment Breakdown</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payment Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Payment Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Interest Paid:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(selectedTransaction.repaymentDetails.breakdown.interestPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Guarantor Reimbursement:</span>
                        <span className="text-sm font-medium text-blue-600">
                          {formatCurrency(selectedTransaction.repaymentDetails.breakdown.guarantorReimbursement)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Loan Reduction:</span>
                        <span className="text-sm font-medium text-purple-600">
                          {formatCurrency(selectedTransaction.repaymentDetails.breakdown.loanReduction)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-900">Total Payment:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(selectedTransaction.repaymentDetails.totalRepayment)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Loan Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Loan Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Paid:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(selectedTransaction.repaymentDetails.loanState.totalPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Remaining Balance:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(selectedTransaction.repaymentDetails.remainingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Principal Remaining:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(selectedTransaction.repaymentDetails.loanState.principalRemaining)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge variant={selectedTransaction.repaymentDetails.isCompleted ? 'success' : 'warning'}>
                          {selectedTransaction.repaymentDetails.isCompleted ? 'Completed' : 'Active'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Guarantor Disbursements */}
                  {selectedTransaction.repaymentDetails.disbursements && 
                   selectedTransaction.repaymentDetails.disbursements.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Guarantor Disbursements</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedTransaction.repaymentDetails.disbursements.map((disbursement, index: number) => (
                              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                <div>
                                  <span className="text-sm font-medium">{disbursement.guarantorName}</span>
                                  <span className="text-xs text-gray-500 ml-2">({disbursement.accountNumber})</span>
                                  <span className="text-xs text-gray-500 ml-2">{disbursement.percentage}%</span>
                                </div>
                                <span className="text-sm font-medium text-blue-600">
                                  {formatCurrency(disbursement.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Transaction"
        size="lg"
      >
        {selectedTransaction && (
          <TransactionForm
            accounts={accounts}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedTransaction(null);
            }}
            isLoading={isLoading}
            transactionType={selectedTransaction.type}
          />
        )}
      </Modal>
    </div>
  );
};

export default Transactions;
