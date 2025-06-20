import React, { useState, useEffect, useCallback } from 'react';
import { Search, PlusCircle, Edit, Trash2, Eye, AlertCircle, User, CreditCard, Percent, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Loan, Customer } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import api from '../lib/api';
import CustomerAccountSelect from '../components/ui/CustomerAccountSelect';

const Loans: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalLoans, setTotalLoans] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentLoan, setCurrentLoan] = useState<Loan | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Form state for new/edit loan
  const [formData, setFormData] = useState({
    customerId: '',
    customerAccountId: '',
    amount: 0,
    interestRate: 5,
    term: 12,
    repaymentFrequency: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY',
    guarantor1Id: '',
    guarantor1AccountId: '',
    guarantor1Percentage: 0,
    guarantor2Id: '',
    guarantor2AccountId: '',
    guarantor2Percentage: 0,    guarantor3Id: '',
    guarantor3AccountId: '',
    guarantor3Percentage: 0,
  });

  const fetchLoans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
      });
      
      const response = await api.get(`/loans?${params}`);
      const { loans: loansData, pagination } = response.data;
      
      // Debug: Log the API response
      console.log('Loans API response:', response.data);
      console.log('Loans data:', loansData);
        setLoans(loansData || []);
      setTotalLoans(pagination?.total || 0);
      setTotalPages(pagination?.pages || 0);
    } catch (err: unknown) {
      console.error('Error fetching loans:', err);
      
      // Check if it's an authentication error
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to view loans.');
      } else {
        setError(error.response?.data?.message || 'Failed to load loans. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await api.get('/loans/customers');
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, []);

  // Load all customers for dropdown when modal opens
  const loadAllCustomers = useCallback(async () => {
    if (allCustomers.length === 0) {
      try {
        const response = await api.get('/customers?limit=1000');
        setAllCustomers(response.data.customers || []);
      } catch (err) {
        console.error('Error fetching all customers:', err);
      }
    }
  }, [allCustomers.length]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));    setCurrentPage(1);
  };

  const handleCreateLoan = async () => {try {
      // Validate form
      if (!formData.customerId) {
        alert('Please select a customer');
        return;
      }

      if (!formData.customerAccountId) {
        alert('Please select a customer account');
        return;
      }

      if (formData.amount <= 0) {
        alert('Please enter a valid loan amount');        return;
      }

      // Validate guarantor percentages
      const totalPercentage = formData.guarantor1Percentage + formData.guarantor2Percentage + formData.guarantor3Percentage;
      if (totalPercentage !== 50) {
        alert('Guarantor percentages must total 50%');
        return;
      }

      // Validate guarantor accounts are selected when percentages are set
      if (formData.guarantor1Percentage > 0 && !formData.guarantor1AccountId) {
        alert('Please select an account for Guarantor 1');
        return;
      }
      if (formData.guarantor2Percentage > 0 && !formData.guarantor2AccountId) {
        alert('Please select an account for Guarantor 2');
        return;
      }
      if (formData.guarantor3Percentage > 0 && !formData.guarantor3AccountId) {
        alert('Please select an account for Guarantor 3');        return;
      }

      // Prepare loan data for API with guarantor account IDs
      const loanData = {
        customerId: formData.customerId,
        amount: formData.amount,
        interestRate: formData.interestRate,
        term: formData.term,
        repaymentFrequency: formData.repaymentFrequency,
        guarantor1Id: formData.guarantor1Id || undefined,
        guarantor1AccountId: formData.guarantor1AccountId || undefined,
        guarantor1Percentage: formData.guarantor1Percentage || undefined,
        guarantor2Id: formData.guarantor2Id || undefined,
        guarantor2AccountId: formData.guarantor2AccountId || undefined,
        guarantor2Percentage: formData.guarantor2Percentage || undefined,
        guarantor3Id: formData.guarantor3Id || undefined,
        guarantor3AccountId: formData.guarantor3AccountId || undefined,        guarantor3Percentage: formData.guarantor3Percentage || undefined,
      };

      // Create loan via API
      await api.post('/loans', loanData);
      
      // Refresh loans list
      await fetchLoans();
      
      setIsAddModalOpen(false);      resetForm();
      alert('Loan created successfully! A loan account has been created with the loan amount.');
    } catch (err: unknown) {
      console.error('Error creating loan:', err);
      const errorMessage = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create loan. Please try again.';
      setError(errorMessage);      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerAccountId: '',
      amount: 0,
      interestRate: 5,
      term: 12,
      repaymentFrequency: 'MONTHLY',
      guarantor1Id: '',
      guarantor1AccountId: '',
      guarantor1Percentage: 0,
      guarantor2Id: '',
      guarantor2AccountId: '',
      guarantor2Percentage: 0,
      guarantor3Id: '',
      guarantor3AccountId: '',      guarantor3Percentage: 0,
    });
  };

  const openEditModal = (loan: Loan) => {
    setCurrentLoan(loan);
    setFormData({
      customerId: loan.customerId,
      customerAccountId: loan.accountId || '',
      amount: loan.amount,
      interestRate: loan.interestRate,
      term: loan.term,
      repaymentFrequency: loan.repaymentFrequency,
      guarantor1Id: loan.guarantor1?.id || '',
      guarantor1AccountId: '', // We'd need to get this from the backend
      guarantor1Percentage: loan.guarantor1Percentage || 0,
      guarantor2Id: loan.guarantor2?.id || '',
      guarantor2AccountId: '', // We'd need to get this from the backend
      guarantor2Percentage: loan.guarantor2Percentage || 0,
      guarantor3Id: loan.guarantor3?.id || '',
      guarantor3AccountId: '', // We'd need to get this from the backend
      guarantor3Percentage: loan.guarantor3Percentage || 0,
    });    // Note: Edit modal implementation would go here
    alert('Edit functionality coming soon!');
  };

  const openDetailsModal = (loan: Loan) => {
    // Validate loan object
    if (!loan || !loan.id) {
      console.error('Invalid loan object:', loan);
      setError('Invalid loan data');
      return;
    }

    // Debug: Log the loan object to see what data we have
    console.log('Opening details for loan:', loan);
    
    // Use the loan data from the list directly
    // Since we have a Refresh button to get fresh data for the entire list
    setSelectedLoan(loan);
    setIsDetailsModalOpen(true);
  };

  const openDeleteModal = (loan: Loan) => {
    setCurrentLoan(loan);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteLoan = async () => {
    if (!currentLoan) return;

    try {
      // For now, just remove from local state (no API endpoint yet)
      setLoans(loans.filter(loan => loan.id !== currentLoan.id));
      setIsDeleteModalOpen(false);
      setCurrentLoan(null);
      alert('Loan deleted successfully!');
    } catch (err) {
      console.error('Error deleting loan:', err);      setError('Failed to delete loan. Please try again.');
    }
  };

  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "primary" | "success" | "warning" | "danger" | undefined => {
    if (!status) {
      return 'secondary';
    }
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'paid':
        return 'primary';
      case 'defaulted':
        return 'danger';
      default:        return 'secondary';
    }
  };

  // Calculate total payable amount using new loan logic
  const calculateTotalPayable = () => {
    if (!formData.amount) {
      return 0;
    }

    const principal = formData.amount;
    const interestRate = formData.interestRate / 100;
    
    // Under new logic: Total payable = Principal + (Principal × Interest Rate)
    // The interest is collected as a percentage of each payment, but total interest is fixed
    const totalInterest = principal * interestRate;
      // Total payable = Principal + Total Interest
    return principal + totalInterest;
  };

  const totalPayable = calculateTotalPayable();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentPage(1);
              fetchLoans();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => {
            loadAllCustomers();
            setIsAddModalOpen(true);
          }} className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            New Loan
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLoans}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search loans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Interest Rate</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length > 0 ? (
              loans.map((loan: Loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{loan.customer?.name || loan.customerName}</div>
                      <div className="text-sm text-gray-500">{loan.account?.accountNumber}</div>
                    </div>
                  </TableCell>
                  <TableCell>{loan.account?.accountNumber}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(loan.amount)}</TableCell>
                  <TableCell>{loan.interestRate}%</TableCell>
                  <TableCell>{loan.term} months</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(loan.status)}>
                      {loan.status ? loan.status.charAt(0).toUpperCase() + loan.status.slice(1).toLowerCase() : 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(loan.startDate)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">
                        {loan.approvedBy?.name || 'System'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {loan.approvedAt ? formatDate(loan.approvedAt) : 'Auto-approved'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailsModal(loan)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(loan)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(loan)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-gray-500">
                    {searchQuery ? 'No loans found matching your search.' : 'No loans found.'}
                  </div>
                </TableCell>
              </TableRow>
            )}          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalLoans)} to{' '}
                {Math.min(currentPage * itemsPerPage, totalLoans)} of {totalLoans} loans
              </div>
              <Select
                value={itemsPerPage.toString()} 
                onChange={handleItemsPerPageChange}
                options={[
                  { value: '10', label: '10 per page' },
                  { value: '25', label: '25 per page' },
                  { value: '50', label: '50 per page' },
                  { value: '100', label: '100 per page' }
                ]}
              />
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Create New Loan"
        preventClickOutsideClose={true}
        preventEscapeClose={true}        size="2xl"
      >
        <div className="space-y-8">
          {/* Customer Details Card */}
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">
              <CustomerAccountSelect
                label="Select Customer & Account"
                customers={allCustomers.length > 0 ? allCustomers : customers}
                value={{
                  customerId: formData.customerId,
                  accountId: formData.customerAccountId
                }}
                onChange={(selection) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    customerId: selection.customerId,
                    customerAccountId: selection.accountId || ''
                  }));
                }}
                placeholder="Search customers..."
                showAccountSelection={true}
                accountRequired={true}
                fullWidth
              />
            </CardContent>
          </Card>

          {/* Loan Details */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Loan Amount"
              type="number"
              min="1000"
              step="100"
              value={formData.amount.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              fullWidth
            />
            <Input
              label="Interest Rate (%)"
              type="number"
              min="0"
              step="0.1"
              value={formData.interestRate.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
              fullWidth
            />
            <Input
              label="Term (months)"
              type="number"
              min="1"
              max="360"
              value={formData.term.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, term: parseInt(e.target.value) || 0 }))}              fullWidth
            />
            <Select
              label="Repayment Frequency"
              value={formData.repaymentFrequency}
              onChange={(value) => setFormData(prev => ({ ...prev, repaymentFrequency: value as 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' }))}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'QUARTERLY', label: 'Quarterly' },
                { value: 'ANNUALLY', label: 'Annually' }
              ]}
              fullWidth            />
          </div>

          {/* Total Payable Summary */}
          {formData.amount > 0 && formData.term > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 text-lg">Loan Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-green-700 mb-2">Principal Amount</label>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(formData.amount)}</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-green-700 mb-2">Total Interest</label>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(totalPayable - formData.amount)}</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-green-700 mb-2">Total Payable</label>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPayable)}</p>
                  </div>
                  {formData.term > 0 && (
                    <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                      <label className="block text-sm font-medium text-green-700 mb-2">Monthly Payment</label>
                      <p className="text-lg font-semibold text-green-800">
                        {formatCurrency(totalPayable / formData.term)}
                      </p>
                    </div>                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guarantor Cards */}          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guarantor 1 */}
            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />                  Guarantor 1
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-visible">
                <CustomerAccountSelect
                  label="Guarantor Customer & Account"
                  customers={allCustomers.length > 0 ? allCustomers : customers}
                  value={{
                    customerId: formData.guarantor1Id,
                    accountId: formData.guarantor1AccountId
                  }}
                  onChange={(selection) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      guarantor1Id: selection.customerId,
                      guarantor1AccountId: selection.accountId || ''
                    }));
                  }}
                  excludeCustomerIds={[formData.customerId]}
                  placeholder="Select guarantor customer..."
                  showAccountSelection={true}
                  fullWidth
                />

                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gray-400" />
                  <Select
                    label="Percentage"
                    value={formData.guarantor1Percentage.toString()}
                    onChange={(value) => setFormData(prev => ({ ...prev, guarantor1Percentage: parseInt(value) || 0 }))}
                    options={Array.from({ length: 100 }, (_, i) => ({ value: (i + 1).toString(), label: `${i + 1}%` }))}
                    fullWidth
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guarantor 2 */}
            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />                  Guarantor 2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-visible">
                <CustomerAccountSelect
                  label="Guarantor Customer & Account"
                  customers={allCustomers.length > 0 ? allCustomers : customers}
                  value={{
                    customerId: formData.guarantor2Id,
                    accountId: formData.guarantor2AccountId
                  }}
                  onChange={(selection) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      guarantor2Id: selection.customerId,
                      guarantor2AccountId: selection.accountId || ''
                    }));
                  }}
                  excludeCustomerIds={[formData.customerId, formData.guarantor1Id].filter(Boolean)}
                  placeholder="Select guarantor customer..."
                  showAccountSelection={true}
                  fullWidth
                />

                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gray-400" />
                  <Select
                    label="Percentage"
                    value={formData.guarantor2Percentage.toString()}
                    onChange={(value) => setFormData(prev => ({ ...prev, guarantor2Percentage: parseInt(value) || 0 }))}
                    options={Array.from({ length: 100 }, (_, i) => ({ value: (i + 1).toString(), label: `${i + 1}%` }))}
                    fullWidth
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guarantor 3 */}
            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />                  Guarantor 3
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-visible">
                <CustomerAccountSelect
                  label="Guarantor Customer & Account"
                  customers={allCustomers.length > 0 ? allCustomers : customers}
                  value={{
                    customerId: formData.guarantor3Id,
                    accountId: formData.guarantor3AccountId
                  }}
                  onChange={(selection) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      guarantor3Id: selection.customerId,
                      guarantor3AccountId: selection.accountId || ''
                    }));
                  }}
                  excludeCustomerIds={[formData.customerId, formData.guarantor1Id, formData.guarantor2Id].filter(Boolean)}
                  placeholder="Select guarantor customer..."
                  showAccountSelection={true}
                  fullWidth
                />

                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gray-400" />
                  <Select
                    label="Percentage"
                    value={formData.guarantor3Percentage.toString()}
                    onChange={(value) => setFormData(prev => ({ ...prev, guarantor3Percentage: parseInt(value) || 0 }))}
                    options={Array.from({ length: 100 }, (_, i) => ({ value: (i + 1).toString(), label: `${i + 1}%` }))}
                    fullWidth
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Percentage Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Total Percentage:</span>
              <span className={`text-sm font-bold ${
                formData.guarantor1Percentage + formData.guarantor2Percentage + formData.guarantor3Percentage === 50
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {formData.guarantor1Percentage + formData.guarantor2Percentage + formData.guarantor3Percentage}%
              </span>
            </div>
            {formData.guarantor1Percentage + formData.guarantor2Percentage + formData.guarantor3Percentage !== 50 && (
              <p className="text-xs text-red-600 mt-1">Guarantor percentages must total 50%</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateLoan}>
              Create Loan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Loan Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {          setIsDetailsModalOpen(false);
          setSelectedLoan(null);
        }}
        title="Loan Details"
        size="2xl"
      >
        {selectedLoan && (
          <div className="p-6 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <p className="text-gray-900">{selectedLoan.customer?.name || selectedLoan.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{selectedLoan.customer?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{selectedLoan.customer?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <p className="text-gray-900 font-mono">{selectedLoan.account?.accountNumber || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Loan Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedLoan.amount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate</label>
                    <p className="text-gray-900">{selectedLoan.interestRate}%</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <p className="text-gray-900">{selectedLoan.term} months</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Frequency</label>
                    <p className="text-gray-900">{selectedLoan.repaymentFrequency}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Badge variant={getStatusBadgeVariant(selectedLoan.status)}>
                      {selectedLoan.status ? selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1).toLowerCase() : 'Unknown'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
                    <p className="text-gray-900">{formatCurrency(selectedLoan.monthlyPayment || 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Payable</label>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(selectedLoan.totalPayable || 0)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                    <p className="text-gray-900">{formatCurrency(selectedLoan.amountPaid || 0)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Balance</label>
                    <p className={`text-lg font-semibold ${selectedLoan.status === 'PAID' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedLoan.outstandingBalance || 0)}
                    </p>
                    {selectedLoan.status === 'PAID' && (
                      <p className="text-xs text-green-600 mt-1">✓ Loan fully paid</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <p className="text-gray-900">{formatDate(selectedLoan.startDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <p className="text-gray-900">{formatDate(selectedLoan.endDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Approval Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                    <p className="text-gray-900">
                      {selectedLoan.approvedBy ? `${selectedLoan.approvedBy.name} (${selectedLoan.approvedBy.username})` : 'System'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved At</label>
                    <p className="text-gray-900">
                      {selectedLoan.approvedAt ? formatDate(selectedLoan.approvedAt) : 'Auto-approved'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guarantors Information */}
            {(selectedLoan.guarantor1 || selectedLoan.guarantor2 || selectedLoan.guarantor3) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Guarantors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedLoan.guarantor1 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Guarantor 1</h4>
                        <p className="text-sm text-gray-600">Name: {selectedLoan.guarantor1.name}</p>
                        <p className="text-sm text-gray-600">Phone: {selectedLoan.guarantor1.phone || 'N/A'}</p>
                        <p className="text-sm text-gray-600">Percentage: {selectedLoan.guarantor1Percentage || 0}%</p>
                      </div>
                    )}
                    {selectedLoan.guarantor2 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Guarantor 2</h4>
                        <p className="text-sm text-gray-600">Name: {selectedLoan.guarantor2.name}</p>
                        <p className="text-sm text-gray-600">Phone: {selectedLoan.guarantor2.phone || 'N/A'}</p>
                        <p className="text-sm text-gray-600">Percentage: {selectedLoan.guarantor2Percentage || 0}%</p>
                      </div>
                    )}
                    {selectedLoan.guarantor3 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Guarantor 3</h4>
                        <p className="text-sm text-gray-600">Name: {selectedLoan.guarantor3.name}</p>
                        <p className="text-sm text-gray-600">Phone: {selectedLoan.guarantor3.phone || 'N/A'}</p>
                        <p className="text-sm text-gray-600">Percentage: {selectedLoan.guarantor3Percentage || 0}%</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedLoan(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedLoan(null);
                  openEditModal(selectedLoan);
                }}
              >
                Edit Loan
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Loan Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCurrentLoan(null);
        }}
        title="Delete Loan"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this loan? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCurrentLoan(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteLoan}>
              Delete Loan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Loans;
