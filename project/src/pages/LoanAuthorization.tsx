import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Filter, 
  ArrowUpCircle,
  Eye,
  FileText,
  User
} from 'lucide-react';
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
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { formatCurrency, formatDate } from '../lib/utils';
import api from '../lib/api';

interface LoanAuthorizationType {
  id: string;
  customerId: string;
  customerName: string;
  accountNumber: string;
  amount: number;
  interestRate: number;
  term: number;
  repaymentFrequency: string;
  totalPayable: number;
  monthlyPayment: number;
  requestedAt: string;
  requestedById: string;
  requestedByName: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  status: 'pending' | 'approved' | 'rejected';
  guarantor1?: {
    id: string;
    name: string;
    accountNumber: string;
    amount: number;
    percentage: number;
  };
  guarantor2?: {
    id: string;
    name: string;
    accountNumber: string;
    amount: number;
    percentage: number;
  };
  guarantor3?: {
    id: string;
    name: string;
    accountNumber: string;
    amount: number;
    percentage: number;
  };
}

interface LoanAuthorizationResponse {
  loans: LoanAuthorizationType[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalLoans: number;
  };
  summary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

const LoanAuthorization: React.FC = () => {
  // State for loan data
  const [loans, setLoans] = useState<LoanAuthorizationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentLoan, setCurrentLoan] = useState<LoanAuthorizationType | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Fetch loan authorizations
  const fetchLoanAuthorizations = useCallback(async () => {
    try {
      setIsPageLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await api.get(`/loans/authorizations?${params.toString()}`);
      const data: LoanAuthorizationResponse = response.data;
      
      setLoans(data.loans);
      setTotalPages(data.pagination.totalPages);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching loan authorizations:', error);
    } finally {
      setIsPageLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, statusFilter]);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchLoanAuthorizations();
  }, [fetchLoanAuthorizations]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Handle view loan
  const handleViewLoan = (loan: LoanAuthorizationType) => {
    setCurrentLoan(loan);
    setIsViewModalOpen(true);
  };

  // Handle approve loan
  const handleApproveLoan = (loan: LoanAuthorizationType) => {
    setCurrentLoan(loan);
    setIsApproveModalOpen(true);
  };

  // Handle reject loan
  const handleRejectLoan = (loan: LoanAuthorizationType) => {
    setCurrentLoan(loan);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  // Confirm approve loan
  const confirmApproveLoan = async () => {
    if (!currentLoan) return;
    
    try {
      setIsLoading(true);
      await api.post(`/loans/authorizations/${currentLoan.id}/approve`);
      
      await fetchLoanAuthorizations();
      
      setIsApproveModalOpen(false);
      setCurrentLoan(null);
    } catch (error) {
      console.error('Error approving loan:', error);
      alert('Failed to approve loan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm reject loan
  const confirmRejectLoan = async () => {
    if (!currentLoan) return;
    
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsLoading(true);
      await api.post(`/loans/authorizations/${currentLoan.id}/reject`, {
        reason: rejectReason
      });
      
      await fetchLoanAuthorizations();
      
      setIsRejectModalOpen(false);
      setCurrentLoan(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting loan:', error);
      alert('Failed to reject loan. Please try again.');
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

  // Filter options
  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading loan authorizations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Authorization</h1>
          <p className="text-gray-600">Review and authorize loan applications</p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 max-w-md relative">
          <Input
            placeholder="Search customer name, account number..."
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
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Applications</p>
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
              <ArrowUpCircle className="h-6 w-6 text-orange-600" />
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

      {/* Loans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Loan Amount</TableHead>
              <TableHead>Interest Rate</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Total Payable</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.customerName}</TableCell>
                <TableCell>{loan.accountNumber}</TableCell>
                <TableCell>{formatCurrency(loan.amount, 'GHS', 'en-GH', 2)}</TableCell>
                <TableCell>{loan.interestRate}%</TableCell>
                <TableCell>{loan.term} months</TableCell>
                <TableCell>{formatCurrency(loan.totalPayable, 'GHS', 'en-GH', 2)}</TableCell>
                <TableCell>{formatDate(loan.requestedAt)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(loan.status)}>
                    {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewLoan(loan)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {loan.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApproveLoan(loan)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Approve Loan"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectLoan(loan)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Reject Loan"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {loans.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                  No loan applications found
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

      {/* View Loan Modal */}
      {currentLoan && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Loan Application Details"
          size="2xl"
        >
          <div className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="font-medium text-gray-700">Customer Name:</span>
                  <p className="mt-1">{currentLoan.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Account Number:</span>
                  <p className="mt-1">{currentLoan.accountNumber}</p>
                </div>
              </div>
            </div>

            {/* Loan Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Loan Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="font-medium text-gray-700">Loan Amount:</span>
                  <p className="mt-1 text-lg font-semibold text-blue-600">
                    {formatCurrency(currentLoan.amount, 'GHS', 'en-GH', 2)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Interest Rate:</span>
                  <p className="mt-1">{currentLoan.interestRate}% per annum</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Loan Term:</span>
                  <p className="mt-1">{currentLoan.term} months</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Repayment Frequency:</span>
                  <p className="mt-1">{currentLoan.repaymentFrequency}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Monthly Payment:</span>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(currentLoan.monthlyPayment, 'GHS', 'en-GH', 2)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Payable:</span>
                  <p className="mt-1 text-lg font-semibold text-green-600">
                    {formatCurrency(currentLoan.totalPayable, 'GHS', 'en-GH', 2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Guarantor Information */}
            {(currentLoan.guarantor1 || currentLoan.guarantor2 || currentLoan.guarantor3) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Guarantor Information</h3>
                <div className="space-y-3">
                  {currentLoan.guarantor1 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Guarantor 1</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium">{currentLoan.guarantor1.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Account:</span>
                          <p className="font-medium">{currentLoan.guarantor1.accountNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Guarantee Amount:</span>
                          <p className="font-medium">{formatCurrency(currentLoan.guarantor1.amount, 'GHS', 'en-GH', 2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Percentage:</span>
                          <p className="font-medium">{currentLoan.guarantor1.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {currentLoan.guarantor2 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Guarantor 2</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium">{currentLoan.guarantor2.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Account:</span>
                          <p className="font-medium">{currentLoan.guarantor2.accountNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Guarantee Amount:</span>
                          <p className="font-medium">{formatCurrency(currentLoan.guarantor2.amount, 'GHS', 'en-GH', 2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Percentage:</span>
                          <p className="font-medium">{currentLoan.guarantor2.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {currentLoan.guarantor3 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Guarantor 3</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium">{currentLoan.guarantor3.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Account:</span>
                          <p className="font-medium">{currentLoan.guarantor3.accountNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Guarantee Amount:</span>
                          <p className="font-medium">{formatCurrency(currentLoan.guarantor3.amount, 'GHS', 'en-GH', 2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Percentage:</span>
                          <p className="font-medium">{currentLoan.guarantor3.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Request Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="font-medium text-gray-700">Requested By:</span>
                  <p className="mt-1">{currentLoan.requestedByName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Requested At:</span>
                  <p className="mt-1">{formatDate(currentLoan.requestedAt)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(currentLoan.status)}>
                      {currentLoan.status.charAt(0).toUpperCase() + currentLoan.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                {currentLoan.status === 'approved' && currentLoan.approvedByName && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Approved By:</span>
                      <p className="mt-1">{currentLoan.approvedByName}</p>
                    </div>
                    {currentLoan.approvedAt && (
                      <div>
                        <span className="font-medium text-gray-700">Approved At:</span>
                        <p className="mt-1">{formatDate(currentLoan.approvedAt)}</p>
                      </div>
                    )}
                  </>
                )}
                {currentLoan.status === 'rejected' && currentLoan.rejectedReason && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Rejection Reason:</span>
                    <p className="mt-1 text-red-600">{currentLoan.rejectedReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Loan Modal */}
      {currentLoan && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title="Approve Loan Application"
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
                onClick={confirmApproveLoan}
                isLoading={isLoading}
              >
                Approve Loan
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to approve the following loan application?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Customer:</span>
                  <p>{currentLoan.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Loan Amount:</span>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(currentLoan.amount, 'GHS', 'en-GH', 2)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Interest Rate:</span>
                  <p>{currentLoan.interestRate}%</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Term:</span>
                  <p>{currentLoan.term} months</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Payable:</span>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(currentLoan.totalPayable, 'GHS', 'en-GH', 2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Approving this loan will create a loan account and 
                disburse the funds according to the guarantee structure.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Loan Modal */}
      {currentLoan && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Loan Application"
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
                onClick={confirmRejectLoan}
                isLoading={isLoading}
              >
                Reject Loan
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to reject the following loan application?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Customer:</span>
                  <p>{currentLoan.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Loan Amount:</span>
                  <p className="font-semibold">
                    {formatCurrency(currentLoan.amount, 'GHS', 'en-GH', 2)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="rejectReason" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Please provide a reason for rejecting this loan application..."
                required
              />
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> Rejecting this loan will prevent it from being 
                processed. The customer will need to submit a new application if needed.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LoanAuthorization;
