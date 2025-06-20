import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Filter, Download, Eye, ArrowLeftRight, ArrowUpCircle, ArrowDownCircle, AlertCircle, Printer } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Pagination from '../components/ui/Pagination';
import { Transaction, Customer } from '../types';
import { formatCurrency, formatDateTime } from '../lib/utils';
import api from '../lib/api';

const CustomerTransactions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Load customer details and their transactions
      const [customerResponse, transactionsResponse] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/transactions?customerId=${id}`)
      ]);
      
      setCustomer(customerResponse.data);
      setTransactions(transactionsResponse.data.transactions || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load customer transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and search transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = 
      (transaction.accountNumber && transaction.accountNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.description && transaction.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.reference && transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = !statusFilter || transaction.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = !typeFilter || transaction.type.toLowerCase() === typeFilter.toLowerCase();
    
    let matchesDate = true;
    if (dateFilter) {
      const transactionDate = new Date(transaction.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      switch (dateFilter) {
        case 'today':
          matchesDate = transactionDate.toDateString() === today.toDateString();
          break;
        case 'yesterday':
          matchesDate = transactionDate.toDateString() === yesterday.toDateString();
          break;
        case 'last-7-days':
          matchesDate = transactionDate >= lastWeek;
          break;
        case 'last-30-days':
          matchesDate = transactionDate >= lastMonth;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Handle filter changes
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

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <ArrowDownCircle size={16} className="text-green-500" />;
      case 'withdrawal':
        return <ArrowUpCircle size={16} className="text-red-500" />;
      case 'transfer':
        return <ArrowLeftRight size={16} className="text-blue-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };
  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Type', 'Account Number', 'Description', 'Amount', 'Status', 'Reference'].join(','),
      ...filteredTransactions.map(transaction => [
        formatDateTime(transaction.date),
        transaction.type,
        transaction.accountNumber,
        transaction.description,
        transaction.amount,
        transaction.status,
        transaction.reference
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customer?.name || 'customer'}-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bank Statement - ${customer?.name}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
            }
            
            .statement-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            
            .bank-name {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 5px;
            }
            
            .statement-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            
            .customer-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding: 15px;
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
            }
            
            .customer-details, .statement-period {
              width: 48%;
            }
            
            .info-label {
              font-weight: bold;
              margin-bottom: 5px;
            }
              .transactions-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            
            .transactions-table th,
            .transactions-table td {
              border: 1px solid #dee2e6;
              padding: 8px;
              text-align: left;
            }
            
            .transactions-table th {
              background-color: #f8f9fa;
              font-weight: bold;
              text-align: center;
            }
            
            .transactions-table th:nth-child(4),
            .transactions-table th:nth-child(5),
            .transactions-table th:nth-child(6) {
              text-align: right;
              width: 12%;
            }
            
            .transactions-table th:nth-child(1) {
              width: 15%;
            }
            
            .transactions-table th:nth-child(2) {
              width: 35%;
            }
            
            .transactions-table th:nth-child(3) {
              width: 14%;
              text-align: center;
            }
            
            .amount-credit {
              color: #28a745;
              font-weight: bold;
            }
            
            .amount-debit {
              color: #dc3545;
              font-weight: bold;
            }
            
            .amount-transfer {
              color: #007bff;
              font-weight: bold;
            }
            
            .summary-box {
              margin-top: 20px;
              padding: 15px;
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            
            .summary-total {
              border-top: 2px solid #000;
              padding-top: 10px;
              font-weight: bold;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #dee2e6;
              font-size: 10px;
              color: #6c757d;
            }
            
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="statement-header">
          <div class="bank-name">Christ The King Support Scheme</div>
          <div class="statement-title">Account Statement</div>
          <div>Statement Date: ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="customer-info">
          <div class="customer-details">
            <div class="info-label">Customer Information</div>
            <div><strong>Name:</strong> ${customer?.name || 'N/A'}</div>
            <div><strong>Email:</strong> ${customer?.email || 'N/A'}</div>
            <div><strong>Phone:</strong> ${customer?.phone || 'N/A'}</div>
            <div><strong>Customer ID:</strong> ${customer?.id || 'N/A'}</div>
          </div>
          <div class="statement-period">
            <div class="info-label">Statement Period</div>
            <div><strong>From:</strong> ${filteredTransactions.length > 0 ? new Date(Math.min(...filteredTransactions.map(t => new Date(t.date).getTime()))).toLocaleDateString() : 'N/A'}</div>
            <div><strong>To:</strong> ${filteredTransactions.length > 0 ? new Date(Math.max(...filteredTransactions.map(t => new Date(t.date).getTime()))).toLocaleDateString() : 'N/A'}</div>
            <div><strong>Total Transactions:</strong> ${filteredTransactions.length}</div>
          </div>
        </div>
          <table class="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Credit</th>
              <th>Debit</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              let runningBalance = 0;
              return filteredTransactions
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(transaction => {
                  const isCredit = transaction.type.toLowerCase() === 'deposit';
                  const isDebit = transaction.type.toLowerCase() === 'withdrawal';
                  const amount = transaction.amount;
                  
                  if (isCredit) {
                    runningBalance += amount;
                  } else if (isDebit) {
                    runningBalance -= amount;
                  }
                  
                  return `
                    <tr>
                      <td>${new Date(transaction.date).toLocaleDateString()}</td>
                      <td>${transaction.description}</td>
                      <td style="text-transform: capitalize;">${transaction.type}</td>
                      <td class="amount-credit" style="text-align: right;">
                        ${isCredit ? '$' + amount.toFixed(2) : ''}
                      </td>
                      <td class="amount-debit" style="text-align: right;">
                        ${isDebit ? '$' + amount.toFixed(2) : ''}
                      </td>
                      <td style="text-align: right; font-weight: bold;">
                        $${runningBalance.toFixed(2)}
                      </td>
                    </tr>
                  `;
                }).join('');
            })()}
          </tbody>
        </table>
        
        <div class="summary-box">
          <div class="info-label">Transaction Summary</div>
          <div class="summary-row">
            <span>Total Deposits:</span>
            <span class="amount-credit">+$${filteredTransactions
              .filter(t => t.type.toLowerCase() === 'deposit')
              .reduce((sum, t) => sum + t.amount, 0)
              .toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Total Withdrawals:</span>
            <span class="amount-debit">-$${filteredTransactions
              .filter(t => t.type.toLowerCase() === 'withdrawal')
              .reduce((sum, t) => sum + t.amount, 0)
              .toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Total Transfers:</span>
            <span class="amount-transfer">$${filteredTransactions
              .filter(t => t.type.toLowerCase() === 'transfer')
              .reduce((sum, t) => sum + t.amount, 0)
              .toFixed(2)}</span>
          </div>
          <div class="summary-row summary-total">
            <span>Net Change:</span>
            <span>$${(
              filteredTransactions.filter(t => t.type.toLowerCase() === 'deposit').reduce((sum, t) => sum + t.amount, 0) -
              filteredTransactions.filter(t => t.type.toLowerCase() === 'withdrawal').reduce((sum, t) => sum + t.amount, 0)
            ).toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <div><strong>ApexLink Banking</strong></div>
          <div>This statement was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          <div>For inquiries, please contact customer service or visit our website.</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading && !customer) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={loadData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/customers')}
          >
            Back to Customers
          </Button>
          <div>            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
              {customer?.name}'s Transactions
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              View all transactions for {customer?.email}
            </p>
          </div>        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            leftIcon={<Printer size={18} />}
            onClick={printStatement}
            disabled={filteredTransactions.length === 0}
          >
            Print Statement
          </Button>
          <Button
            leftIcon={<Download size={18} />}
            onClick={exportTransactions}
            disabled={filteredTransactions.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transactions.filter(t => t.status.toLowerCase() === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {transactions.filter(t => t.status.toLowerCase() === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {transactions.filter(t => t.status.toLowerCase() === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>      {/* Filters */}
      <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow dark:shadow-gray-800/25">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            placeholder="Search transactions..."
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
          />          <Select
            value={statusFilter}
            onChange={handleStatusFilter}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
            ]}
            fullWidth
          />          <Select
            value={typeFilter}
            onChange={handleTypeFilter}
            options={[
              { value: '', label: 'All Types' },
              { value: 'deposit', label: 'Deposit' },
              { value: 'withdrawal', label: 'Withdrawal' },
              { value: 'transfer', label: 'Transfer' },
            ]}
            fullWidth
          />          <Select
            value={dateFilter}
            onChange={handleDateFilter}
            options={[
              { value: '', label: 'All Dates' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last-7-days', label: 'Last 7 Days' },
              { value: 'last-30-days', label: 'Last 30 Days' },
            ]}
            fullWidth
          />
          <Button
            variant="outline"
            leftIcon={<Filter size={18} />}
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
              setTypeFilter('');
              setDateFilter('');
              setCurrentPage(1);
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {formatDateTime(transaction.date)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(transaction.type)}
                    <span className="capitalize">{transaction.type}</span>
                  </div>
                </TableCell>
                <TableCell>{transaction.accountNumber}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell className={`font-semibold ${
                  transaction.type.toLowerCase() === 'deposit' ? 'text-green-600' : 
                  transaction.type.toLowerCase() === 'withdrawal' ? 'text-red-600' : 
                  'text-blue-600'
                }`}>
                  {transaction.type.toLowerCase() === 'deposit' ? '+' : 
                   transaction.type.toLowerCase() === 'withdrawal' ? '-' : ''}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(transaction.status)}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Eye size={16} />}
                    onClick={() => handleViewTransaction(transaction)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {paginatedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                  {searchQuery || statusFilter || typeFilter || dateFilter
                    ? 'No transactions found matching your criteria'
                    : customer?.name 
                      ? `No transactions found for ${customer.name}`
                      : 'No transactions found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID
                </label>
                <p className="text-sm text-gray-900">{selectedTransaction.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <p className="text-sm text-gray-900">{selectedTransaction.reference}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <p className="text-sm text-gray-900">{formatDateTime(selectedTransaction.date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex items-center space-x-2">
                  {getTypeIcon(selectedTransaction.type)}
                  <span className="text-sm text-gray-900 capitalize">{selectedTransaction.type}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <p className="text-sm text-gray-900">{selectedTransaction.accountNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <p className={`text-sm font-semibold ${
                  selectedTransaction.type.toLowerCase() === 'deposit' ? 'text-green-600' : 
                  selectedTransaction.type.toLowerCase() === 'withdrawal' ? 'text-red-600' : 
                  'text-blue-600'
                }`}>
                  {selectedTransaction.type.toLowerCase() === 'deposit' ? '+' : 
                   selectedTransaction.type.toLowerCase() === 'withdrawal' ? '-' : ''}
                  {formatCurrency(selectedTransaction.amount)}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Badge variant={getStatusVariant(selectedTransaction.status)}>
                {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
              </Badge>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerTransactions;
