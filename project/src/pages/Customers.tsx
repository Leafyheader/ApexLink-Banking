import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserPlus,
  UserCog,
  Trash2,
  Eye,
  X,
  CreditCard
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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
import { Customer } from '../types';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  
  // State for customer data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers from API with pagination
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });
        
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }
        
        const response = await api.get(`/customers?${params.toString()}`);
        setCustomers(response.data.customers);
        setTotalItems(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
        setError('Failed to load customers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [currentPage, itemsPerPage, searchQuery]);

  // Handle search with debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle view customer
  const handleViewCustomer = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    navigate(`/customers/${customer.id}/edit`);
  };

  // Handle delete customer
  const handleDeleteCustomer = (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  // Handle view customer transactions
  const handleViewTransactions = (customer: Customer) => {
    navigate(`/customers/${customer.id}/transactions`);
  };

  // Confirm delete customer
  const confirmDeleteCustomer = async () => {
    if (!currentCustomer) return;
    
    setIsLoading(true);
    
    try {
      await api.delete(`/customers/${currentCustomer.id}`);
      const updatedCustomers = customers.filter(
        customer => customer.id !== currentCustomer.id
      );
      
      setCustomers(updatedCustomers);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Failed to delete customer:', err);
      setError('Failed to delete customer');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'default';
    }
  };

  // Loading state
  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading customers...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={handleSearch}
              leftIcon={<Search size={18} />}
              rightIcon={
                searchQuery ? (
                  <button onClick={() => setSearchQuery('')}>
                    <X size={18} />
                  </button>
                ) : undefined
              }
              fullWidth
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
        <Button
          leftIcon={<UserPlus size={18} />}
          onClick={() => navigate('/customers/new')}
        >
          Add Customer
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Date Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium text-gray-900">
                  {customer.name}
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(customer.kycStatus)}>
                    {customer.kycStatus.charAt(0).toUpperCase() + customer.kycStatus.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(customer.dateJoined)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye size={16} />}
                      onClick={() => handleViewCustomer(customer)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<CreditCard size={16} />}
                      onClick={() => handleViewTransactions(customer)}
                    >
                      Transactions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<UserCog size={16} />}
                      onClick={() => handleEditCustomer(customer)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      onClick={() => handleDeleteCustomer(customer)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  {searchQuery
                    ? 'No customers found matching your search criteria'
                    : 'No customers found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Summary Information */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} customers
          {searchQuery && ` (search: "${searchQuery}")`}
        </span>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
      </div>

      {/* Pagination - Always show if there are customers */}
      {totalItems > 0 && (
        <div className="flex justify-center items-center gap-4 p-4 bg-white rounded-lg shadow">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded">
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Next
          </button>
          <div className="ml-4 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
            Total: {totalItems} customers
          </div>
        </div>
      )}

      {/* Delete Customer Modal */}
      {currentCustomer && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Customer"
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteCustomer}
                isLoading={isLoading}
              >
                Delete Customer
              </Button>
            </div>
          }
        >
          <p className="text-gray-700">
            Are you sure you want to delete {currentCustomer.name}? This action cannot be undone.
          </p>
          {currentCustomer.accounts.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> This customer has {currentCustomer.accounts.length} active {currentCustomer.accounts.length === 1 ? 'account' : 'accounts'}.
                Deleting this customer will require handling these accounts first.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Customers;