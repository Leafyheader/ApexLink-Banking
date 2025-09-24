import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Filter } from 'lucide-react';
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
import { formatDate } from '../lib/utils';
import api from '../lib/api';

// Account authorization interface
interface AccountAuthorization {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: 'savings' | 'current' | 'fixed';
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  status: 'approved' | 'pending' | 'rejected';
}

// API Response interface
interface ApiResponse {
  accounts: AccountAuthorization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

const AccountAuthorization: React.FC = () => {
  // State for account data
  const [accounts, setAccounts] = useState<AccountAuthorization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<AccountAuthorization | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  // Fetch account authorizations
  const fetchAccountAuthorizations = useCallback(async () => {
    try {
      setIsPageLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        ...(statusFilter !== 'all' && { status: statusFilter.toUpperCase() })
      });

      const response = await api.get(`/account-authorizations?${params}`);
      const data: ApiResponse = response.data;
      
      setAccounts(data.accounts);
      setTotalPages(data.pagination.totalPages);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching account authorizations:', error);
    } finally {
      setIsPageLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter]);  // Load data on component mount and when filters change
  useEffect(() => {
    fetchAccountAuthorizations();
  }, [fetchAccountAuthorizations]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle approve account
  const handleApproveAccount = (account: AccountAuthorization) => {
    setCurrentAccount(account);
    setIsApproveModalOpen(true);
  };

  // Handle reverse account
  const handleReverseAccount = (account: AccountAuthorization) => {
    setCurrentAccount(account);
    setIsReverseModalOpen(true);
  };

  // Confirm approve account
  const confirmApproveAccount = async () => {
    if (!currentAccount) return;
    
    try {
      setIsLoading(true);
      await api.post(`/account-authorizations/${currentAccount.id}/approve`);
      
      // Refresh the data
      await fetchAccountAuthorizations();
      
      setIsApproveModalOpen(false);
      setCurrentAccount(null);
    } catch (error) {
      console.error('Error approving account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm reverse account
  const confirmReverseAccount = async () => {
    if (!currentAccount) return;
    
    try {
      setIsLoading(true);
      await api.post(`/account-authorizations/${currentAccount.id}/reject`);
      
      // Refresh the data
      await fetchAccountAuthorizations();
      
      setIsReverseModalOpen(false);
      setCurrentAccount(null);
    } catch (error) {
      console.error('Error reversing account approval:', error);
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

  // Get account type display name
  const getAccountTypeDisplay = (type: string) => {
    switch (type) {
      case 'savings':
        return 'Savings';
      case 'current':
        return 'Current';
      case 'fixed':
        return 'Fixed Deposit';
      default:
        return type;
    }
  };

  // Filter options
  const statusFilterOptions = [
    { value: 'all', label: 'All Accounts' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
  ];

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading account authorizations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Authorization</h1>
          <p className="text-gray-600">Review and authorize account openings</p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={handleSearch}
            leftIcon={<Search size={18} />}
            fullWidth
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={statusFilterOptions}
            fullWidth
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Filter className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{summary.pending}</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <XCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
            </div>
            <div className="bg-red-100 p-2 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account No</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium text-gray-900">
                  {account.accountNumber}
                </TableCell>
                <TableCell>{account.accountName}</TableCell>
                <TableCell>
                  <Badge variant="default">
                    {getAccountTypeDisplay(account.accountType)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(account.createdAt)}</TableCell>
                <TableCell>{account.createdBy}</TableCell>
                <TableCell>{account.approvedBy || '-'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(account.status)}>
                    {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {account.status === 'pending' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle size={16} />}
                        onClick={() => handleApproveAccount(account)}
                      >
                        Approve
                      </Button>
                    ) : account.status === 'approved' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<XCircle size={16} />}
                        onClick={() => handleReverseAccount(account)}
                      >
                        Reverse
                      </Button>
                    ) : (
                      <span className="text-gray-400">No action</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No accounts found matching your criteria'
                    : 'No accounts found'}
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

      {/* Approve Account Modal */}
      {currentAccount && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title="Approve Account"
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
                onClick={confirmApproveAccount}
                isLoading={isLoading}
              >
                Approve Account
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to approve the following account?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Account Number:</span>
                  <p>{currentAccount.accountNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Account Name:</span>
                  <p>{currentAccount.accountName}</p>
                </div>
                <div>
                  <span className="font-medium">Account Type:</span>
                  <p>{getAccountTypeDisplay(currentAccount.accountType)}</p>
                </div>
                <div>
                  <span className="font-medium">Created By:</span>
                  <p>{currentAccount.createdBy}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Reverse Account Modal */}
      {currentAccount && (
        <Modal
          isOpen={isReverseModalOpen}
          onClose={() => setIsReverseModalOpen(false)}
          title="Reverse Account Approval"
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
                onClick={confirmReverseAccount}
                isLoading={isLoading}
              >
                Reverse Approval
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to reverse the approval for the following account?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Account Number:</span>
                  <p>{currentAccount.accountNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Account Name:</span>
                  <p>{currentAccount.accountName}</p>
                </div>
                <div>
                  <span className="font-medium">Account Type:</span>
                  <p>{getAccountTypeDisplay(currentAccount.accountType)}</p>
                </div>
                <div>
                  <span className="font-medium">Approved By:</span>
                  <p>{currentAccount.approvedBy || '-'}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> Reversing the approval will change the account status back to "Pending" and require re-authorization.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AccountAuthorization;
