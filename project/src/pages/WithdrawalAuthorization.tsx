import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Filter, ArrowDownCircle, ArrowLeftRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import { formatDate, formatCurrency } from '../lib/utils';
import { withdrawalAuthorizationApi } from '../lib/api';
import type { WithdrawalAuthorization as WithdrawalAuthorizationType, WithdrawalAuthorizationResponse } from '../types';

const WithdrawalAuthorization: React.FC = () => {
  // State for withdrawal data
  const [withdrawals, setWithdrawals] = useState<WithdrawalAuthorizationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
    // Modal states
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentWithdrawal, setCurrentWithdrawal] = useState<WithdrawalAuthorizationType | null>(null);
    // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query - wait 500ms after user stops typing
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Fetch withdrawal authorizations
  const fetchWithdrawalAuthorizations = useCallback(async () => {
    try {
      setIsPageLoading(true);
      
      const data: WithdrawalAuthorizationResponse = await withdrawalAuthorizationApi.getWithdrawalAuthorizations({
        page: currentPage,
        limit: 10,
        search: debouncedSearchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      });
      
      setWithdrawals(data.transactions);
      setTotalPages(data.pagination.totalPages);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching withdrawal authorizations:', error);
    } finally {
      setIsPageLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, statusFilter, typeFilter]);

  // Reset to first page when debounced search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchWithdrawalAuthorizations();
  }, [fetchWithdrawalAuthorizations]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Page reset will be handled by the debounced search effect
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle type filter change
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };
  // Handle view withdrawal
  const handleViewWithdrawal = (withdrawal: WithdrawalAuthorizationType) => {
    setCurrentWithdrawal(withdrawal);
    setIsViewModalOpen(true);
  };

  // Handle approve withdrawal
  const handleApproveWithdrawal = (withdrawal: WithdrawalAuthorizationType) => {
    setCurrentWithdrawal(withdrawal);
    setIsApproveModalOpen(true);
  };
  // Handle reject withdrawal
  const handleRejectWithdrawal = (withdrawal: WithdrawalAuthorizationType) => {
    setCurrentWithdrawal(withdrawal);
    setIsRejectModalOpen(true);
  };

  // Handle reverse withdrawal
  const handleReverseWithdrawal = (withdrawal: WithdrawalAuthorizationType) => {
    setCurrentWithdrawal(withdrawal);
    setIsReverseModalOpen(true);
  };
  // Confirm approve withdrawal
  const confirmApproveWithdrawal = async () => {
    if (!currentWithdrawal) return;
    
    try {
      setIsLoading(true);
      await withdrawalAuthorizationApi.approveWithdrawalAuthorization(currentWithdrawal.id);
      
      // Refresh the data
      await fetchWithdrawalAuthorizations();
      
      setIsApproveModalOpen(false);
      setCurrentWithdrawal(null);
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    } finally {
      setIsLoading(false);
    }
  };
  // Confirm reject withdrawal
  const confirmRejectWithdrawal = async () => {
    if (!currentWithdrawal) return;
    
    try {
      setIsLoading(true);
      await withdrawalAuthorizationApi.rejectWithdrawalAuthorization(currentWithdrawal.id, 'Rejected by administrator');
      
      // Refresh the data
      await fetchWithdrawalAuthorizations();
      
      setIsRejectModalOpen(false);
      setCurrentWithdrawal(null);
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm reverse withdrawal
  const confirmReverseWithdrawal = async () => {
    if (!currentWithdrawal) return;
    
    try {
      setIsLoading(true);
      await withdrawalAuthorizationApi.reverseWithdrawalAuthorization(currentWithdrawal.id, 'Reversed by administrator');
      
      // Refresh the data
      await fetchWithdrawalAuthorizations();
      
      setIsReverseModalOpen(false);
      setCurrentWithdrawal(null);
    } catch (error) {
      console.error('Error reversing withdrawal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'default';
    }
  };

  // Get transaction type display name
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return 'Withdrawal';
      case 'transfer':
        return 'Transfer';
      default:
        return type;
    }
  };

  // Get transaction type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <ArrowDownCircle size={16} className="text-red-500" />;
      case 'transfer':
        return <ArrowLeftRight size={16} className="text-blue-500" />;
      default:
        return null;
    }
  };

  // Filter options
  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const typeFilterOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'withdrawal', label: 'Withdrawals' },
    { value: 'transfer', label: 'Transfers' },
  ];

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-dark-text">Loading withdrawal authorizations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Withdrawal Authorization</h1>
          <p className="text-gray-600 dark:text-dark-text">Review and authorize withdrawals and transfers</p>
        </div>
      </div>      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 max-w-md relative">
          <Input
            placeholder="Search accounts, customers..."
            value={searchQuery}
            onChange={handleSearch}
            leftIcon={isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            ) : (
              <Search size={18} />
            )}
            fullWidth
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-dark-text">
              Searching...
            </div>
          )}
        </div>
        <div className="w-full md:w-48">
          <Select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={statusFilterOptions}
            fullWidth
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            value={typeFilter}
            onChange={handleTypeFilterChange}
            options={typeFilterOptions}
            fullWidth
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow dark:border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{summary.total}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Filter className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow dark:border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text">Approved</p>
              <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow dark:border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{summary.pending}</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <XCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow dark:border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
            </div>
            <div className="bg-red-100 p-2 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden dark:border dark:border-dark-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance Available</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal.id}>
                <TableCell className="font-medium text-gray-900 dark:text-dark-text">
                  {withdrawal.accountNumber}
                </TableCell>
                <TableCell className="dark:text-dark-text">{withdrawal.customerName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(withdrawal.type)}
                    <span className="dark:text-dark-text">{getTypeDisplay(withdrawal.type)}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-red-600">
                  {formatCurrency(withdrawal.amount)}
                </TableCell>
                <TableCell className="font-medium text-green-600">
                  {formatCurrency(withdrawal.availableBalance)}
                </TableCell>
                <TableCell className="dark:text-dark-text">
                  <div className="max-w-xs truncate" title={withdrawal.description}>
                    {withdrawal.description}
                  </div>
                </TableCell>
                <TableCell className="dark:text-dark-text">{formatDate(withdrawal.requestedAt)}</TableCell>                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={getStatusVariant(withdrawal.status)}>
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </Badge>
                    {withdrawal.isReversed && (
                      <Badge variant="danger">
                        Reversed
                      </Badge>
                    )}
                  </div>
                </TableCell><TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewWithdrawal(withdrawal)}
                    >
                      View
                    </Button>
                    {withdrawal.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveWithdrawal(withdrawal)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRejectWithdrawal(withdrawal)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {withdrawal.status === 'approved' && !withdrawal.isReversed && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReverseWithdrawal(withdrawal)}
                      >
                        Reverse
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {withdrawals.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-gray-500 dark:text-dark-text">
                  No withdrawal requests found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* View Withdrawal Modal */}
      {currentWithdrawal && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Withdrawal Request Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Request ID:</span>
                <p className="dark:text-dark-text">{currentWithdrawal.id}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Type:</span>
                <div className="flex items-center gap-2 mt-1">
                  {getTypeIcon(currentWithdrawal.type)}
                  <span className="dark:text-dark-text">{getTypeDisplay(currentWithdrawal.type)}</span>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Account Number:</span>
                <p className="dark:text-dark-text">{currentWithdrawal.accountNumber}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Customer:</span>
                <p className="dark:text-dark-text">{currentWithdrawal.customerName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Amount:</span>
                <p className="text-red-600 font-semibold">{formatCurrency(currentWithdrawal.amount)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Available Balance:</span>
                <p className="text-green-600 font-semibold">{formatCurrency(currentWithdrawal.availableBalance)}</p>
              </div>
              {currentWithdrawal.type === 'transfer' && (
                <>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-dark-text">To Account:</span>
                    <p className="dark:text-dark-text">{currentWithdrawal.toAccountNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-dark-text">To Customer:</span>
                    <p className="dark:text-dark-text">{currentWithdrawal.toCustomerName || 'N/A'}</p>
                  </div>
                </>
              )}
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Reference:</span>
                <p className="dark:text-dark-text">{currentWithdrawal.reference || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Requested By:</span>
                <p className="dark:text-dark-text">{currentWithdrawal.requestedBy}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Requested At:</span>
                <p className="dark:text-dark-text">{formatDate(currentWithdrawal.requestedAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-dark-text">Status:</span>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(currentWithdrawal.status)}>
                    {currentWithdrawal.status.charAt(0).toUpperCase() + currentWithdrawal.status.slice(1)}
                  </Badge>
                </div>
              </div>            </div>
            <div className="col-span-2">
              <span className="font-medium text-gray-700 dark:text-dark-text">Description:</span>
              <p className="mt-1 dark:text-dark-text">{currentWithdrawal.description}</p>
            </div>
            
            {/* Reversal Information */}
            {currentWithdrawal.isReversed && (
              <div className="col-span-2 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Transaction Reversed</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-300">Reversed By:</span>
                    <p className="dark:text-red-200">{currentWithdrawal.reversedBy}</p>
                  </div>
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-300">Reversed At:</span>
                    <p className="dark:text-red-200">{formatDate(currentWithdrawal.reversedAt || '')}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-red-700 dark:text-red-300">Reversal Reason:</span>
                    <p className="dark:text-red-200">{currentWithdrawal.reversalReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Approve Withdrawal Modal */}
      {currentWithdrawal && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title="Approve Withdrawal Request"
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsApproveModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmApproveWithdrawal}
                isLoading={isLoading}
              >
                Approve Request
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-dark-text">
              Are you sure you want to approve the following {currentWithdrawal.type} request?
            </p>
            <div className="bg-gray-50 dark:bg-dark-border p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Account Number:</span>
                  <p>{currentWithdrawal.accountNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Customer:</span>
                  <p>{currentWithdrawal.customerName}</p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p>{getTypeDisplay(currentWithdrawal.type)}</p>
                </div>
                <div>
                  <span className="font-medium">Amount:</span>
                  <p className="text-red-600 font-semibold">{formatCurrency(currentWithdrawal.amount)}</p>
                </div>
              </div>
            </div>
            {currentWithdrawal.amount > currentWithdrawal.availableBalance && (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> The requested amount exceeds the available balance. 
                  This will result in an overdraft or insufficient funds.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Withdrawal Modal */}
      {currentWithdrawal && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Withdrawal Request"
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmRejectWithdrawal}
                isLoading={isLoading}
              >
                Reject Request
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-dark-text">
              Are you sure you want to reject the following {currentWithdrawal.type} request?
            </p>
            <div className="bg-gray-50 dark:bg-dark-border p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Account Number:</span>
                  <p>{currentWithdrawal.accountNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Customer:</span>
                  <p>{currentWithdrawal.customerName}</p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p>{getTypeDisplay(currentWithdrawal.type)}</p>
                </div>
                <div>
                  <span className="font-medium">Amount:</span>
                  <p className="text-red-600 font-semibold">{formatCurrency(currentWithdrawal.amount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> Rejecting this request will prevent the transaction from being processed.
                The customer will need to create a new request if needed.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Reverse Withdrawal Modal */}
      {currentWithdrawal && (
        <Modal
          isOpen={isReverseModalOpen}
          onClose={() => setIsReverseModalOpen(false)}
          title="Reverse Withdrawal Request"
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsReverseModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmReverseWithdrawal}
                isLoading={isLoading}
              >
                Reverse Transaction
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-dark-text">
              Are you sure you want to reverse the following {currentWithdrawal.type} transaction?
            </p>
            <div className="bg-gray-50 dark:bg-dark-border p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Account Number:</span>
                  <p>{currentWithdrawal.accountNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Customer:</span>
                  <p>{currentWithdrawal.customerName}</p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p>{getTypeDisplay(currentWithdrawal.type)}</p>
                </div>
                <div>
                  <span className="font-medium">Amount:</span>
                  <p className="text-red-600 font-semibold">{formatCurrency(currentWithdrawal.amount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> Reversing this transaction will:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                <li>Add the amount back to the customer's account</li>
                <li>Create a reversal transaction record</li>
                {currentWithdrawal.type === 'withdrawal' && (
                  <li>Refund the 5 GHS service charge</li>
                )}
                <li>Mark this transaction as reversed (cannot be undone)</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WithdrawalAuthorization;
