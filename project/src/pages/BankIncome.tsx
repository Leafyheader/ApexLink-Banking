import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, CreditCard, PiggyBank, Calendar, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Pagination from '../components/ui/Pagination';
import { formatCurrency, formatDate } from '../lib/utils';
import api from '../lib/api';

interface BankIncomeRecord {
  id: string;
  type: string;
  amount: number;
  description: string;
  sourceId: string;
  sourceType: string;
  accountNumber: string;
  customerName: string;
  date: string;
  createdAt: string;
}

interface BankIncomeStats {
  totalIncome: number;
  totalCount: number;
  breakdown: {
    [key: string]: {
      amount: number;
      count: number;
    };
  };
}

interface BankIncomeData {
  period: string;
  dateRange: {
    from: string;
    to: string;
  };
  stats: BankIncomeStats;
  recentRecords: BankIncomeRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    recordsPerPage: number;
  };
}

const BankIncome: React.FC = () => {
  const [incomeData, setIncomeData] = useState<BankIncomeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isCalculatingInterest, setIsCalculatingInterest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const periodOptions = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'year', label: 'Last Year' }
  ];  const fetchIncomeData = useCallback(async (period = selectedPeriod, page = currentPage, limit = itemsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/bank-income/breakdown?period=${period}&page=${page}&limit=${limit}`);
      setIncomeData(response.data);
    } catch (err) {
      console.error('Error fetching bank income data:', err);
      setError('Failed to fetch bank income data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, currentPage, itemsPerPage]);

  const calculateDailyInterest = async () => {
    try {
      setIsCalculatingInterest(true);
      const response = await api.post('/bank-income/calculate-daily-interest');
      
      // Show success message
      alert(`Interest calculated successfully! Created ${response.data.recordsCreated} records for total income of ${formatCurrency(response.data.totalInterestIncome)}`);
      
      // Refresh the data
      await fetchIncomeData();
    } catch (err) {
      console.error('Error calculating daily interest:', err);
      alert('Failed to calculate daily interest. Please try again.');
    } finally {
      setIsCalculatingInterest(false);
    }  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchIncomeData(selectedPeriod, page, itemsPerPage);
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    fetchIncomeData(selectedPeriod, 1, newItemsPerPage);
  };

  useEffect(() => {
    fetchIncomeData(selectedPeriod, currentPage, itemsPerPage);
  }, [selectedPeriod, currentPage, itemsPerPage, fetchIncomeData]);
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setCurrentPage(1); // Reset to first page when changing period
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'withdrawal_charge':
        return <CreditCard size={16} className="text-blue-500" />;
      case 'loan_interest':
        return <TrendingUp size={16} className="text-green-500" />;
      case 'transfer_fee':
        return <DollarSign size={16} className="text-purple-500" />;
      default:
        return <PiggyBank size={16} className="text-gray-500" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'withdrawal_charge':
        return 'primary';
      case 'loan_interest':
        return 'success';
      case 'transfer_fee':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'withdrawal_charge':
        return 'Withdrawal Charge';
      case 'loan_interest':
        return 'Loan Interest';
      case 'transfer_fee':
        return 'Transfer Fee';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (isLoading && !incomeData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Income</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track revenue from withdrawal charges, loan interest, and other fees
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48">
            <Select
              value={selectedPeriod}
              onChange={handlePeriodChange}
              options={periodOptions}
              fullWidth
            />
          </div>
          <Button
            variant="outline"
            onClick={() => fetchIncomeData(selectedPeriod, currentPage, itemsPerPage)}
            disabled={isLoading}
            leftIcon={<RefreshCw size={16} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={calculateDailyInterest}
            disabled={isCalculatingInterest}
            isLoading={isCalculatingInterest}
            leftIcon={<TrendingUp size={16} />}
          >
            Calculate Interest
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {incomeData && (
        <>
          {/* Period Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Calendar size={16} />
              <span className="font-medium">
                {periodOptions.find(p => p.value === incomeData.period)?.label} 
                ({formatDate(incomeData.dateRange.from)} - {formatDate(incomeData.dateRange.to)})
              </span>
            </div>
          </div>

          {/* Income Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Income</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(incomeData.stats.totalIncome)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <PiggyBank className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Withdrawal Charges</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(incomeData.stats.breakdown.withdrawal_charge?.amount || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {incomeData.stats.breakdown.withdrawal_charge?.count || 0} transactions
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Loan Interest</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(incomeData.stats.breakdown.loan_interest?.amount || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {incomeData.stats.breakdown.loan_interest?.count || 0} interest charges
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {incomeData.stats.totalCount}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Income Records */}
          <Card>            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Income Records</CardTitle>
                {incomeData.pagination && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {incomeData.pagination.totalRecords} total records
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeData.recentRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(record.type)}
                            <Badge variant={getTypeBadgeVariant(record.type)}>
                              {getTypeDisplayName(record.type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(record.amount)}
                        </TableCell>
                        <TableCell className="dark:text-dark-text">
                          {record.customerName}
                        </TableCell>
                        <TableCell className="dark:text-dark-text">
                          {record.accountNumber}
                        </TableCell>
                        <TableCell className="dark:text-dark-text">
                          <div className="max-w-xs truncate" title={record.description}>
                            {record.description}
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-dark-text">
                          {formatDate(record.date)}
                        </TableCell>
                      </TableRow>
                    ))}                    {incomeData.recentRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-gray-500 dark:text-dark-text">
                          No income records found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {incomeData.pagination && incomeData.pagination.totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {Math.min((incomeData.pagination.currentPage - 1) * incomeData.pagination.recordsPerPage + 1, incomeData.pagination.totalRecords)} to{' '}
                      {Math.min(incomeData.pagination.currentPage * incomeData.pagination.recordsPerPage, incomeData.pagination.totalRecords)} of {incomeData.pagination.totalRecords} records
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
                    currentPage={incomeData.pagination.currentPage}
                    totalPages={incomeData.pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default BankIncome;
