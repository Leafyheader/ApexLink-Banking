import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Calendar,
  User,
  Building,
  Search,
  AlertCircle,
  Download
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
import { formatDate, formatCurrency } from '../lib/utils';
import { expensesApi, handleApiError } from '../lib/api';

// Expense interface
interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  vendor: string;
  department: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  paymentMethod?: string;
  referenceNumber?: string;
  approvedById?: string;
  approvedByUser?: {
    id: string;
    username: string;
    name: string;
  };
  approvedDate?: string;
  paidDate?: string;
  notes?: string;
  createdById: string;
  createdByUser: {
    id: string;
    username: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const ExpenseApproval: React.FC = () => {
  // State for expense data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  
  // Modal states
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Fetch expenses for approval
  const fetchExpenses = useCallback(async () => {
    try {
      setIsPageLoading(true);
      setError(null);
        const params = {
        page: parseInt(currentPage.toString()),
        limit: 10,
        search: searchQuery,
        ...(statusFilter !== 'all' && { status: statusFilter.toUpperCase() }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(departmentFilter !== 'all' && { department: departmentFilter })
      };

      console.log('Fetching expenses with params:', params);
      const response = await expensesApi.getAll(params);
      console.log('API Response:', response);
        // The API returns { expenses: [], pagination: {} } directly
      const expensesData = response.expenses || [];
      const paginationData = response.pagination || { pages: 1 };
      
      setExpenses(expensesData);      setTotalPages(paginationData.pages || 1);
      
      // Calculate summary from the data we received
      const totalExpenses = expensesData.length;
      const pendingExpenses = expensesData.filter((exp: Expense) => exp.status === 'PENDING').length;
      const approvedExpenses = expensesData.filter((exp: Expense) => exp.status === 'APPROVED').length;
      const rejectedExpenses = expensesData.filter((exp: Expense) => exp.status === 'REJECTED').length;
      const totalAmount = expensesData.reduce((sum: number, exp: Expense) => sum + (parseFloat(exp.amount) || 0), 0);
      const pendingAmount = expensesData
        .filter((exp: Expense) => exp.status === 'PENDING')
        .reduce((sum: number, exp: Expense) => sum + (parseFloat(exp.amount) || 0), 0);
      
      setSummary({
        totalExpenses,
        pendingExpenses,
        approvedExpenses,
        rejectedExpenses,
        totalAmount,
        pendingAmount
      });
      
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setError(handleApiError(error));
      // Set empty state on error
      setExpenses([]);
      setTotalPages(1);
      setSummary({
        totalExpenses: 0,
        pendingExpenses: 0,
        approvedExpenses: 0,
        rejectedExpenses: 0,
        totalAmount: 0,
        pendingAmount: 0
      });
    } finally {
      setIsPageLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, categoryFilter, departmentFilter]);

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleDepartmentFilterChange = (value: string) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
  };

  // Handle approve expense
  const handleApproveExpense = (expense: Expense) => {
    setCurrentExpense(expense);
    setIsApproveModalOpen(true);
  };

  // Handle reject expense
  const handleRejectExpense = (expense: Expense) => {
    setCurrentExpense(expense);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  // Confirm approve expense
  const confirmApproveExpense = async () => {
    if (!currentExpense) return;
    
    try {
      setIsLoading(true);
      await expensesApi.updateStatus(currentExpense.id, 'APPROVED');
      
      // Refresh the data
      await fetchExpenses();
      
      setIsApproveModalOpen(false);
      setCurrentExpense(null);
    } catch (error) {
      console.error('Error approving expense:', error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm reject expense
  const confirmRejectExpense = async () => {
    if (!currentExpense) return;
    
    try {
      setIsLoading(true);
      await expensesApi.updateStatus(currentExpense.id, 'REJECTED');
      
      // Refresh the data
      await fetchExpenses();
      
      setIsRejectModalOpen(false);
      setCurrentExpense(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting expense:', error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'danger';
      case 'PAID':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Filter options
  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' },
  ];

  const categoryFilterOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Office Supplies', label: 'Office Supplies' },
    { value: 'Technology', label: 'Technology & Systems' },
    { value: 'Marketing', label: 'Marketing & Advertising' },
    { value: 'Professional Services', label: 'Professional Services' },
    { value: 'Utilities', label: 'Utilities' },
    { value: 'Travel', label: 'Travel & Entertainment' },
    { value: 'Maintenance', label: 'Maintenance & Repairs' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Personnel', label: 'Personnel & Salaries' },
    { value: 'Other', label: 'Other Operating Expenses' }
  ];

  const departmentFilterOptions = [
    { value: 'all', label: 'All Departments' },
    { value: 'Operations', label: 'Operations' },
    { value: 'IT', label: 'IT Department' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Administration', label: 'Administration' },
  ];

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading expense approvals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Error</h1>
        <p className="text-lg text-gray-600 mb-8">{error}</p>
        <Button onClick={fetchExpenses}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Approval</h1>
          <p className="text-gray-600">Review and approve expense requests</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<Download size={16} />}
            onClick={() => alert('Export functionality coming soon!')}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={handleSearch}
            leftIcon={<Search size={18} />}
            fullWidth
          />
        </div>
        <div className="flex gap-3">
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
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
              options={categoryFilterOptions}
              fullWidth
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={departmentFilter}
              onChange={handleDepartmentFilterChange}
              options={departmentFilterOptions}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-orange-600">{summary.pendingExpenses}</p>
              <p className="text-sm text-gray-500">{formatCurrency(summary.pendingAmount)}</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{summary.approvedExpenses}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{summary.rejectedExpenses}</p>
            </div>
            <div className="bg-red-100 p-2 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{formatDate(expense.date)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    {expense.referenceNumber && (
                      <p className="text-sm text-gray-500">Ref: {expense.referenceNumber}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{expense.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span>{expense.department}</span>
                  </div>
                </TableCell>
                <TableCell>{expense.vendor}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">{formatCurrency(parseFloat(expense.amount))}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{expense.createdByUser.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(expense.status)}>
                    {expense.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {expense.status === 'PENDING' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle size={16} />}
                          onClick={() => handleApproveExpense(expense)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<XCircle size={16} />}
                          onClick={() => handleRejectExpense(expense)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {expense.status === 'APPROVED' && (
                      <Badge variant="success">
                        <CheckCircle size={14} className="mr-1" />
                        Approved
                      </Badge>
                    )}
                    {expense.status === 'REJECTED' && (
                      <Badge variant="danger">
                        <XCircle size={14} className="mr-1" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No expenses found matching your criteria'
                    : 'No expenses found'}
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

      {/* Approve Expense Modal */}
      {currentExpense && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title="Approve Expense"
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
                onClick={confirmApproveExpense}
                isLoading={isLoading}
                leftIcon={<CheckCircle size={16} />}
              >
                Approve Expense
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to approve the following expense?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Description:</span>
                  <p>{currentExpense.description}</p>
                </div>
                <div>
                  <span className="font-medium">Amount:</span>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(parseFloat(currentExpense.amount))}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <p>{currentExpense.category}</p>
                </div>
                <div>
                  <span className="font-medium">Vendor:</span>
                  <p>{currentExpense.vendor}</p>
                </div>
                <div>
                  <span className="font-medium">Department:</span>
                  <p>{currentExpense.department}</p>
                </div>
                <div>
                  <span className="font-medium">Requested By:</span>
                  <p>{currentExpense.createdByUser.name}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Expense Modal */}
      {currentExpense && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Expense"
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
                onClick={confirmRejectExpense}
                isLoading={isLoading}
                leftIcon={<XCircle size={16} />}
              >
                Reject Expense
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to reject the following expense?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Description:</span>
                  <p>{currentExpense.description}</p>
                </div>
                <div>
                  <span className="font-medium">Amount:</span>
                  <p className="text-lg font-semibold">
                    {formatCurrency(parseFloat(currentExpense.amount))}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Requested By:</span>
                  <p>{currentExpense.createdByUser.name}</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> The requester will be notified of this rejection and the reason provided.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ExpenseApproval;
