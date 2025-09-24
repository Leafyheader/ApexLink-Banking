import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { 
  PlusIcon, 
  TrashIcon, 
  DownloadIcon, 
  FilterIcon,
  DollarSignIcon,
  CalendarIcon,
  TrendingUpIcon,
  AlertCircleIcon
} from 'lucide-react';
import { expensesApi, handleApiError } from '../lib/api';

// Expense categories following banking industry standards
const EXPENSE_CATEGORIES = [
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

const EXPENSE_STATUS = [
  { value: 'PENDING', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' }
];

const PAYMENT_METHODS = [
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Check', label: 'Check' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Wire Transfer', label: 'Wire Transfer' }
];

// Types
interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string; // Decimal from Prisma comes as string
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

interface ExpenseFilters {
  dateFrom: string;
  dateTo: string;
  category?: string;
  status?: string;
  department?: string;
  search?: string;
}

interface ExpenseSummary {
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  paidExpenses: number;
  monthlyBudget: number;
  monthlySpent: number;
  budgetUtilization: number;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const [filters, setFilters] = useState<ExpenseFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    vendor: '',
    department: '',
    paymentMethod: '',
    referenceNumber: '',
    notes: ''
  });

  // Fetch expenses and summary
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expensesData, summaryData] = await Promise.all([
        expensesApi.getAll({
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        }),
        expensesApi.getSummary()
      ]);
      
      setExpenses(expensesData.expenses || []);
      setPagination(expensesData.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
      setExpenseSummary(summaryData);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Create new expense
  const handleCreateExpense = async () => {
    try {
      setLoading(true);
      await expensesApi.create({
        date: newExpense.date,
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        vendor: newExpense.vendor,
        department: newExpense.department,
        paymentMethod: newExpense.paymentMethod || undefined,
        referenceNumber: newExpense.referenceNumber || undefined,
        notes: newExpense.notes || undefined,
      });
      
      // Reset form and close modal
      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        amount: '',
        vendor: '',
        department: '',
        paymentMethod: '',
        referenceNumber: '',
        notes: ''
      });
      setShowAddModal(false);
      
      // Refresh data
      await fetchExpenses();
    } catch (err) {
      console.error('Error creating expense:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Update expense status
  const handleStatusUpdate = async (expenseId: string, newStatus: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED') => {
    try {
      await expensesApi.updateStatus(expenseId, newStatus);
      await fetchExpenses(); // Refresh data
    } catch (err) {
      console.error('Error updating expense status:', err);
      setError(handleApiError(err));
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    
    try {
      await expensesApi.delete(expenseId);
      await fetchExpenses(); // Refresh data
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError(handleApiError(err));
    }
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PAID': return 'primary';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'danger';
      default: return 'default';
    }
  };

  // Get category display name
  const getCategoryLabel = (category: string) => {
    const found = EXPENSE_CATEGORIES.find(cat => cat.value === category);
    return found ? found.label : category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operating Expenses</h1>
          <p className="text-muted-foreground">
            Manage and track operating expenses for financial control and compliance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {expenseSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(expenseSummary.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                All recorded expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertCircleIcon className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(expenseSummary.pendingExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(expenseSummary.monthlyBudget)}
              </div>
              <p className="text-xs text-muted-foreground">
                {expenseSummary.budgetUtilization.toFixed(1)}% utilized
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CalendarIcon className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(expenseSummary.monthlySpent)}
              </div>
              <p className="text-xs text-muted-foreground">
                {expenseSummary.monthlyBudget > 0 
                  ? `${((expenseSummary.monthlySpent / expenseSummary.monthlyBudget) * 100).toFixed(1)}% of budget`
                  : 'No budget set'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                options={[{ value: '', label: 'All Categories' }, ...EXPENSE_CATEGORIES]}
                value={filters.category || ''}
                onChange={(value) => setFilters({ ...filters, category: value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                options={[{ value: '', label: 'All Status' }, ...EXPENSE_STATUS]}
                value={filters.status || ''}
                onChange={(value) => setFilters({ ...filters, status: value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Input
                placeholder="Department"
                value={filters.department || ''}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircleIcon className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">Error loading expenses</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading expenses...</div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No expenses found for the selected criteria</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {getCategoryLabel(expense.category)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {expense.description}
                      </div>
                    </TableCell>
                    <TableCell>{expense.vendor}</TableCell>
                    <TableCell>{expense.department}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(expense.status)}>
                        {expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {expense.status === 'PENDING' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(expense.id, 'APPROVED')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(expense.id, 'REJECTED')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {expense.status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(expense.id, 'PAID')}
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>
                Record a new operating expense for approval and tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    options={EXPENSE_CATEGORIES}
                    value={newExpense.category}
                    onChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor</label>
                  <Input
                    placeholder="Vendor name"
                    value={newExpense.vendor}
                    onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Input
                    placeholder="Department"
                    value={newExpense.department}
                    onChange={(e) => setNewExpense({ ...newExpense, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select
                    options={[{ value: '', label: 'Select method' }, ...PAYMENT_METHODS]}
                    value={newExpense.paymentMethod}
                    onChange={(value) => setNewExpense({ ...newExpense, paymentMethod: value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Expense description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Number</label>
                <Input
                  placeholder="Invoice/Reference number"
                  value={newExpense.referenceNumber}
                  onChange={(e) => setNewExpense({ ...newExpense, referenceNumber: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Additional notes..."
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateExpense}
                  disabled={!newExpense.category || !newExpense.description || !newExpense.amount}
                >
                  Add Expense
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
