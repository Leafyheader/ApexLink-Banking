import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Account, Customer } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import api from '../lib/api';
import Select from '../components/ui/Select';
import CustomerSelect from '../components/ui/CustomerSelect';

const Accounts: React.FC = () => {
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextAccountNumber, setNextAccountNumber] = useState('ACC0000001');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const response = await api.get(`/accounts?${params.toString()}`);
      setAccounts(response.data.accounts);
      setTotalItems(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
      generateNextAccountNumber(response.data.accounts);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    fetchAccounts();
    fetchCustomers();
  }, [fetchAccounts]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const generateNextAccountNumber = (existingAccounts: Account[]) => {
    const accountNumbers = existingAccounts
      .map(acc => acc.accountNumber)
      .filter(num => num.startsWith('ACC'))
      .map(num => parseInt(num.replace('ACC', ''), 10))
      .filter(num => !isNaN(num));
    
    const maxNumber = accountNumbers.length > 0 ? Math.max(...accountNumbers) : 0;
    const nextNumber = maxNumber + 1;
    setNextAccountNumber(`ACC${nextNumber.toString().padStart(7, '0')}`);
  };

  const handleCreateAccount = async (accountData: {
    customerId: string;
    type: string;
    balance: number;
    shareBalance?: number;
    sharesAvailableBalance?: number;
    currency?: string;
    minimumBalance?: number;
  }) => {
    try {
      const response = await api.post('/accounts', accountData);
      setAccounts([...accounts, response.data]);
      setIsAddModalOpen(false);
      // Reset form state
      setSelectedCustomerId('');
      // Refresh accounts to get updated data
      fetchAccounts();
    } catch (err) {
      console.error('Error creating account:', err);
      setError('Failed to create account. Please try again.');
    }
  };

  const handleUpdateAccount = async (accountData: Partial<Account>) => {
    if (!currentAccount) return;

    try {
      const response = await api.put(`/accounts/${currentAccount.id}`, accountData);
      setAccounts(accounts.map(acc => acc.id === currentAccount.id ? response.data : acc));
      setIsEditModalOpen(false);
      setCurrentAccount(null);
    } catch (err) {
      console.error('Error updating account:', err);
      setError('Failed to update account. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentAccount) return;

    try {
      await api.delete(`/accounts/${currentAccount.id}`);
      setAccounts(accounts.filter(acc => acc.id !== currentAccount.id));
      setIsDeleteModalOpen(false);
      setCurrentAccount(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account. Please try again.');
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const handleCreateCustomer = async (name: string) => {
    try {
      const response = await api.post('/customers', { name });
      const newCustomer = response.data;
      setCustomers([...customers, newCustomer]);
      setSelectedCustomerId(newCustomer.id);
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer. Please try again.');
    }
  };

  const handleUpdateCustomer = async (customerId: string, newName: string) => {
    try {
      const response = await api.put(`/customers/${customerId}`, { name: newName });
      const updatedCustomer = response.data;
      setCustomers(customers.map(c => c.id === customerId ? updatedCustomer : c));
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Failed to update customer. Please try again.');
    }
  };

  const openEditModal = (account: Account) => {
    setCurrentAccount(account);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (account: Account) => {
    setCurrentAccount(account);
    setIsDeleteModalOpen(true);
  };

  // Update the return values to match the BadgeVariant type
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "primary" | "success" | "warning" | "danger" | undefined => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'frozen':
        return 'danger';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Handle search with reset to first page
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
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
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            New Account
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
            onClick={fetchAccounts}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
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
          </div>
        </div>

        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Available Balance</TableHead>
                <TableHead>Shares Balance</TableHead>
                <TableHead>Shares Available Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.accountNumber}</TableCell>
                <TableCell>
                  {account.customerName || 'Unknown'}
                </TableCell>
                <TableCell>{account.type}</TableCell>
                <TableCell>{formatCurrency(account.balance)}</TableCell>
                <TableCell>{formatCurrency(account.availableBalance || account.balance)}</TableCell>
                <TableCell>{formatCurrency(account.shareBalance || 0)}</TableCell>
                <TableCell>{formatCurrency(account.sharesAvailableBalance || 0)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(account.status)}>
                    {account.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(account.dateOpened)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/accounts/${account.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(account)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(account)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )            )}
          </TableBody>
        </Table>
        </div>

        {accounts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No accounts found</p>
          </div>
        )}

        {/* Summary Information */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} accounts
            {searchQuery && ` (search: "${searchQuery}")`}
          </span>
          <span>
            Page {currentPage} of {totalPages || 1}
          </span>
        </div>

        {/* Pagination - Always show if there are accounts */}
        {totalItems > 0 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <div className="ml-4 text-sm text-gray-600">
                Total: {totalItems} accounts
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          // Reset form state
          setSelectedCustomerId('');
        }}
        title="Create New Account"
        preventClickOutsideClose={true}
        preventEscapeClose={true}
      >
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <CustomerSelect
                label="Select Customer *"
                customers={customers}
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                onCreateCustomer={handleCreateCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                placeholder="Choose or search for a customer..."
                allowEdit={true}
                allowCreate={true}
                fullWidth
              />
            </div>
            
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <Input
                id="accountNumber"
                placeholder="Auto-generated account number"
                defaultValue={nextAccountNumber}
                disabled
                fullWidth
              />
            </div>
            
            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
                Account Type *
              </label>
              <Select
                id="accountType"
                defaultValue="savings"
                options={[
                  { value: 'savings', label: 'Savings Account' },
                  { value: 'current', label: 'Current Account' },
                  { value: 'fixed', label: 'Fixed Deposit' },
                  { value: 'loan', label: 'Loan Account' },
                ]}
                fullWidth
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Balance
                </label>
                <Input
                  id="initialBalance"
                  type="number"
                  placeholder="0.00"
                  defaultValue="0"
                  fullWidth
                />
              </div>
              
              <div>
                <label htmlFor="shareBalance" className="block text-sm font-medium text-gray-700 mb-1">
                  Shares Initial Balance
                </label>
                <Input
                  id="shareBalance"
                  type="number"
                  placeholder="0.00"
                  defaultValue="0"
                  fullWidth
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <Select
                id="currency"
                defaultValue="USD"
                options={[
                  { value: 'USD', label: 'US Dollar (USD)' },
                  { value: 'EUR', label: 'Euro (EUR)' },
                  { value: 'GBP', label: 'British Pound (GBP)' },
                  { value: 'JPY', label: 'Japanese Yen (JPY)' },
                ]}
                fullWidth
              />
            </div>
            
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <Select
                id="branch"
                defaultValue="main"
                options={[
                  { value: 'main', label: 'Main Branch' },
                  { value: 'north', label: 'North Branch' },
                  { value: 'east', label: 'East Branch' },
                  { value: 'west', label: 'West Branch' },
                  { value: 'south', label: 'South Branch' },
                ]}
                fullWidth
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => {
              setIsAddModalOpen(false);
              // Reset form state
              setSelectedCustomerId('');
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Get form values
              const customerId = selectedCustomerId;
              const typeValue = (document.getElementById('accountType') as HTMLSelectElement)?.value;
              const balance = parseFloat((document.getElementById('initialBalance') as HTMLInputElement)?.value || '0');
              const shareBalance = parseFloat((document.getElementById('shareBalance') as HTMLInputElement)?.value || '0');
              const currency = (document.getElementById('currency') as HTMLSelectElement)?.value || 'USD';
              
              // Validate required fields
              if (!customerId) {
                alert('Please select a customer');
                return;
              }
              
              // Map frontend values to backend format
              const typeMapping: { [key: string]: string } = {
                'savings': 'SAVINGS',
                'current': 'CURRENT', 
                'fixed': 'SAVINGS', // Map fixed deposit to savings for now
                'loan': 'LOAN'
              };
              
              const newAccount = {
                customerId,
                type: typeMapping[typeValue] || 'SAVINGS',
                balance,
                shareBalance,
                sharesAvailableBalance: shareBalance,
                currency,
                minimumBalance: 0
              };
              
              handleCreateAccount(newAccount);
              
              // Reset form state  
              setSelectedCustomerId('');
            }}>
              Create Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentAccount(null);
        }}
        title="Edit Account"
      >
        <div className="p-6">
          {currentAccount && (
            <div className="space-y-4">
              <div>
                <label htmlFor="editCustomerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <Input
                  id="editCustomerName"
                  placeholder="Enter customer name"
                  defaultValue={currentAccount.customerName || ''}
                />
              </div>
              
              <div>
                <label htmlFor="editAccountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <Input
                  id="editAccountNumber"
                  placeholder="Account number"
                  defaultValue={currentAccount.accountNumber}
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="editAccountType" className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <Select
                  id="editAccountType"
                  defaultValue={currentAccount.type?.toLowerCase()}
                  options={[
                    { value: 'savings', label: 'Savings Account' },
                    { value: 'current', label: 'Current Account' },
                    { value: 'fixed', label: 'Fixed Deposit' },
                    { value: 'loan', label: 'Loan Account' },
                  ]}
                  fullWidth
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editBalance" className="block text-sm font-medium text-gray-700 mb-1">
                    Balance
                  </label>
                  <Input
                    id="editBalance"
                    type="number"
                    placeholder="0.00"
                    defaultValue={currentAccount.balance.toString()}
                  />
                </div>
                
                <div>
                  <label htmlFor="editShareBalance" className="block text-sm font-medium text-gray-700 mb-1">
                    Shares Balance
                  </label>
                  <Input
                    id="editShareBalance"
                    type="number"
                    placeholder="0.00"
                    defaultValue={(currentAccount.shareBalance || 0).toString()}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  id="editStatus"
                  defaultValue={currentAccount.status?.toLowerCase()}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'dormant', label: 'Dormant' },
                    { value: 'frozen', label: 'Frozen' },
                    { value: 'closed', label: 'Closed' },
                  ]}
                  fullWidth
                />
              </div>
              
              <div>
                <label htmlFor="editCurrency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <Select
                  id="editCurrency"
                  defaultValue={currentAccount.currency}
                  options={[
                    { value: 'USD', label: 'US Dollar (USD)' },
                    { value: 'EUR', label: 'Euro (EUR)' },
                    { value: 'GBP', label: 'British Pound (GBP)' },
                    { value: 'JPY', label: 'Japanese Yen (JPY)' },
                  ]}
                  fullWidth
                />
              </div>
              
              <div>
                <label htmlFor="editBranch" className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <Select
                  id="editBranch"
                  defaultValue={currentAccount.branch || 'main'}
                  options={[
                    { value: 'main', label: 'Main Branch' },
                    { value: 'north', label: 'North Branch' },
                    { value: 'east', label: 'East Branch' },
                    { value: 'west', label: 'West Branch' },
                    { value: 'south', label: 'South Branch' },
                  ]}
                  fullWidth
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setCurrentAccount(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => {
              if (!currentAccount) return;
              
              // Get form values
              const customerName = (document.getElementById('editCustomerName') as HTMLInputElement)?.value || currentAccount.customerName;
              const typeValue = (document.getElementById('editAccountType') as HTMLSelectElement)?.value;
              const balance = parseFloat((document.getElementById('editBalance') as HTMLInputElement)?.value || currentAccount.balance.toString());
              const shareBalance = parseFloat((document.getElementById('editShareBalance') as HTMLInputElement)?.value || (currentAccount.shareBalance || 0).toString());
              const statusValue = (document.getElementById('editStatus') as HTMLSelectElement)?.value;
              const currency = (document.getElementById('editCurrency') as HTMLSelectElement)?.value || currentAccount.currency;
              const branch = (document.getElementById('editBranch') as HTMLSelectElement)?.value || currentAccount.branch;
              
              // Map frontend values to backend format
              const typeMapping: { [key: string]: Account['type'] } = {
                'savings': 'SAVINGS',
                'current': 'CURRENT', 
                'fixed': 'FIXED',
                'loan': 'LOAN'
              };
              
              const statusMapping: { [key: string]: Account['status'] } = {
                'active': 'ACTIVE',
                'dormant': 'DORMANT',
                'frozen': 'FROZEN',
                'closed': 'CLOSED'
              };
              
              const updatedFields: Partial<Account> = {
                customerName,
                type: typeMapping[typeValue] || currentAccount.type,
                balance,
                shareBalance,
                status: statusMapping[statusValue] || currentAccount.status,
                currency,
                branch,
                // Update available balance to match new balance
                availableBalance: balance,
                sharesAvailableBalance: shareBalance,
                ledgerBalance: balance
              };
              
              handleUpdateAccount(updatedFields);
            }}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCurrentAccount(null);
        }}
        title="Delete Account"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this account? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCurrentAccount(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Accounts;