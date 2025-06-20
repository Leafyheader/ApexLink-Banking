import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { 
  PlusIcon, 
  DownloadIcon, 
  FilterIcon,
  DollarSignIcon,
  CalendarIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  EditIcon,
  TrashIcon,
  EyeIcon
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

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string;
  department: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    id: string;
    username: string;
    name: string;
  };
  approvedByUser?: {
    id: string;
    username: string;
    name: string;
  };  approvedDate?: string;
  paidDate?: string;
}

export default function Expenses() {
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

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
  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setError(null);
    try {
      const summaryData = await expensesApi.getSummary();
      setExpenseSummary(summaryData);
    } catch (err) {
      console.error('Error fetching expense summary:', err);
      setError(handleApiError(err));
    }
  }, []);
  // Fetch expenses with current filters
  const fetchExpenses = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 20,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        category: filters.category,
        status: filters.status,
        department: filters.department,
        search: filters.search,
      };

      const data = await expensesApi.getAll(params);
      setExpenses(data.expenses || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    fetchSummary();
    fetchExpenses();
  }, [fetchSummary, fetchExpenses]);

  // Refresh data when filters change
  useEffect(() => {
    fetchExpenses(1);
  }, [fetchExpenses]);
  // Create new expense
  const handleCreateExpense = async () => {
    try {
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
        // Refresh summary and expenses list
      await fetchSummary();
      await fetchExpenses(1);
    } catch (err) {
      console.error('Error creating expense:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>          <h1 className="text-3xl font-bold tracking-tight">Operating Expenses</h1>          <p className="text-muted-foreground">
            Create new operating expenses and view financial summaries.{' '}
            <span className="text-blue-600">
              Visit Expense Approval to review and approve pending expenses.
            </span>
          </p>
        </div>        <div className="flex space-x-2">
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
              </div>              <p className="text-xs text-muted-foreground">
                Approved & paid expenses only
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
            </div>            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setFilters({
                dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0],
                category: '',
                status: '',
                department: '',
                search: ''
              });
            }}>
              Clear Filters
            </Button>
            <Button onClick={() => fetchExpenses(1)}>
              Apply Filters
            </Button>
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
      )}      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>              <CardDescription>
                Record a new operating expense for your organization
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

      {/* Expenses History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense History</CardTitle>
          <CardDescription>
            Complete list of all expenses with current filters applied
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-muted-foreground">Loading expenses...</div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-muted-foreground">No expenses found for the selected criteria</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-left p-2 font-medium">Category</th>
                      <th className="text-left p-2 font-medium">Amount</th>
                      <th className="text-left p-2 font-medium">Vendor</th>
                      <th className="text-left p-2 font-medium">Department</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Created By</th>
                      <th className="text-left p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="max-w-xs truncate" title={expense.description}>
                            {expense.description}
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-sm">{expense.category}</span>
                        </td>
                        <td className="p-2">
                          <span className="font-medium">{formatCurrency(expense.amount)}</span>
                        </td>
                        <td className="p-2">
                          <span className="text-sm">{expense.vendor}</span>
                        </td>
                        <td className="p-2">
                          <span className="text-sm">{expense.department}</span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            expense.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            expense.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                            expense.status === 'PENDING' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {expense.status}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-sm">{expense.createdByUser.name}</span>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.alert(`View expense details:\n\nID: ${expense.id}\nDescription: ${expense.description}\nAmount: ${formatCurrency(expense.amount)}\nVendor: ${expense.vendor}\nNotes: ${expense.notes || 'No notes'}`)}
                            >
                              <EyeIcon className="h-3 w-3" />
                            </Button>
                            {expense.status === 'PENDING' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.alert('Edit functionality would open edit modal')}
                                >
                                  <EditIcon className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this expense?')) {
                                      window.alert('Delete functionality would be implemented here');
                                    }
                                  }}
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} expenses
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchExpenses(pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => fetchExpenses(pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
