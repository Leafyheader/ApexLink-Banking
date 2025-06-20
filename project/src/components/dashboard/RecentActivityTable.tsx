import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';
import { Transaction } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/utils';

interface RecentActivityTableProps {
  transactions: Transaction[];
}

const RecentActivityTable: React.FC<RecentActivityTableProps> = ({ transactions }) => {
  // Get status badge variant based on transaction status
  const getStatusVariant = (status: string): 'success' | 'danger' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'warning';
    }
  };

  // Get transaction type badge variant
  const getTypeVariant = (type: string, description?: string): 'primary' | 'secondary' | 'warning' | 'success' | 'danger' => {
    // Special handling for withdrawal charges
    if (type === 'withdrawal' && description === 'withdrawal charge') {
      return 'danger';
    }
    
    switch (type) {
      case 'deposit':
        return 'primary';
      case 'withdrawal':
        return 'secondary';
      case 'transfer':
        return 'warning';
      case 'loan-repayment':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">{transaction.accountNumber}</TableCell>
                <TableCell className="text-gray-600">
                  {transaction.customerName || 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge variant={getTypeVariant(transaction.type, transaction.description)}>
                    {transaction.description === 'withdrawal charge' 
                      ? 'Withdrawal Charge' 
                      : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                  {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(transaction.status)}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(transaction.date)}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {transaction.description}
                </TableCell>
              </TableRow>
            ))}
            
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                  No recent transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecentActivityTable;