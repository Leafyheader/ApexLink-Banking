import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Snowflake, 
  Lock, 
  Download, 
  FileText, 
  History,
  DollarSign,
  Calendar,
  Building,
  User,
  CreditCard,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Account } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import api from '../lib/api';

const AccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Component states
  const [account, setAccount] = useState<Account | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const fetchAccount = useCallback(async () => {
    if (!id) return;
      try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/accounts/${id}`);
      setAccount(response.data);
    } catch (err) {
      console.error('Error fetching account:', err);
      setError('Failed to load account details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Error</h1>
        <p className="text-lg text-gray-600 mb-8">{error}</p>
        <div className="flex gap-4">
          <Button onClick={fetchAccount}>Try Again</Button>
          <Button variant="outline" onClick={() => navigate('/accounts')}>
            Back to Accounts
          </Button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Account Not Found</h1>
        <p className="text-gray-600 mb-8">The account you are looking for doesn't exist.</p>
        <Button onClick={() => navigate('/accounts')}>
          Back to Accounts
        </Button>
      </div>
    );
  }
  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'DORMANT':
        return 'secondary';
      case 'CLOSED':
        return 'danger';
      case 'FROZEN':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Get account type badge variant
  const getTypeVariant = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SAVINGS':
        return 'primary';
      case 'CURRENT':
        return 'secondary';
      case 'FIXED':
        return 'warning';
      case 'LOAN':
        return 'danger';
      default:
        return 'primary';
    }
  };// Handle freeze account
  const handleFreezeAccount = async () => {    try {
      setActionLoading(true);
      const response = await api.patch(`/accounts/${account.id}/status`, { status: 'FROZEN' });
      const updatedAccount = response.data;
      setAccount(updatedAccount);
      setIsFreezeModalOpen(false);
    } catch (err) {
      console.error('Error freezing account:', err);
      setError('Failed to freeze account. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };  // Handle close account
  const handleCloseAccount = async () => {
    try {
      setActionLoading(true);
      const response = await api.patch(`/accounts/${account.id}/status`, { status: 'CLOSED' });
      const updatedAccount = response.data;
      setAccount(updatedAccount);
      setIsCloseModalOpen(false);
    } catch (err) {
      console.error('Error closing account:', err);
      setError('Failed to close account. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle export statement
  const handleExportStatement = () => {
    // Simulate PDF generation
    alert('Statement exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/accounts')}
          >
            Back to Accounts
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Details</h1>
            <p className="text-gray-600">{account.accountNumber}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileText size={16} />}
            onClick={handleExportStatement}
          >
            Export Statement
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<History size={16} />}
            onClick={() => alert('Audit trail feature coming soon!')}
          >
            Audit Trail
          </Button>          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit size={16} />}
            onClick={() => setIsEditModalOpen(true)}
            disabled={account.status === 'CLOSED'}
          >
            Edit Account
          </Button>
        </div>
      </div>      {/* Basic Account Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Basic Account Information</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Account Number</h4>
              <p className="text-lg font-semibold text-gray-900">{account.accountNumber}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Account Name</h4>
              <p className="text-lg text-gray-900">{account.customerName}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Account Type</h4>
              <Badge variant={getTypeVariant(account.type)}>
                {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Account Status</h4>
              <Badge variant={getStatusVariant(account.status)}>
                {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Currency</h4>
              <p className="text-lg text-gray-900">{account.currency}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Date Opened</h4>
              <p className="text-lg text-gray-900">{formatDate(account.dateOpened)}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Branch/Region</h4>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <p className="text-lg text-gray-900">{account.branch}</p>
              </div>            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">Financial Details</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Current Balance</h4>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(account.balance)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Available Balance</h4>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(account.availableBalance || 0)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Ledger Balance</h4>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(account.ledgerBalance || 0)}</p>
            </div>
            {account.overdraftLimit && account.overdraftLimit > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Overdraft Limit</h4>
                <p className="text-lg text-gray-900">{formatCurrency(account.overdraftLimit)}</p>
              </div>
            )}
            {account.accruedInterest && account.accruedInterest > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Accrued Interest</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                  <p className="text-lg font-semibold text-yellow-600">{formatCurrency(account.accruedInterest)}</p>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Minimum Balance Requirement</h4>
              <p className="text-lg text-gray-900">{formatCurrency(account.minimumBalance || 0)}</p>
            </div>          </div>
        </CardContent>
      </Card>

      {/* Transaction Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold">Transaction Summary</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Last Transaction Date</h4>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <p className="text-lg text-gray-900">
                  {account.lastTransactionDate ? formatDate(account.lastTransactionDate) : 'No transactions'}
                </p>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Last Deposit</h4>
              <p className="text-lg font-semibold text-green-600">
                {account.lastDepositAmount ? formatCurrency(account.lastDepositAmount) : 'No deposits'}
              </p>
              {account.lastDepositDate && (
                <p className="text-sm text-gray-500">{formatDate(account.lastDepositDate)}</p>
              )}
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Last Withdrawal</h4>
              <p className="text-lg font-semibold text-red-600">
                {account.lastWithdrawalAmount ? formatCurrency(account.lastWithdrawalAmount) : 'No withdrawals'}
              </p>
              {account.lastWithdrawalDate && (
                <p className="text-sm text-gray-500">{formatDate(account.lastWithdrawalDate)}</p>
              )}
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Transactions This Month</h4>
              <p className="text-2xl font-bold text-blue-600">{account.transactionsThisMonth || 0}</p>
            </div>          </div>
        </CardContent>
      </Card>

      {/* Administrative Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold">Administrative Options</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">            <Button
              variant="outline"
              leftIcon={<Edit size={16} />}
              onClick={() => setIsEditModalOpen(true)}
              disabled={account.status === 'CLOSED'}
            >
              Edit Account Details
            </Button>            <Button
              variant="warning"
              leftIcon={<Snowflake size={16} />}
              onClick={() => setIsFreezeModalOpen(true)}
              disabled={account.status === 'CLOSED' || account.status === 'FROZEN'}
            >
              Freeze Account
            </Button>
            <Button
              variant="danger"
              leftIcon={<Lock size={16} />}
              onClick={() => setIsCloseModalOpen(true)}
              disabled={account.status === 'CLOSED'}
            >
              Close Account
            </Button>
            <Button
              variant="outline"
              leftIcon={<Download size={16} />}
              onClick={handleExportStatement}
            >
              Export Statement
            </Button>
            <Button
              variant="outline"
              leftIcon={<History size={16} />}
              onClick={() => alert('Audit trail feature coming soon!')}
            >
              View Audit Trail            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Account Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Account Details"
        footer={
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert('Edit functionality coming soon!');
                setIsEditModalOpen(false);
              }}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <p className="text-gray-700">
          Edit account functionality will be implemented here. This would include updating account name, 
          overdraft limits, minimum balance requirements, and other editable fields.
        </p>
      </Modal>

      {/* Freeze Account Modal */}
      <Modal
        isOpen={isFreezeModalOpen}
        onClose={() => setIsFreezeModalOpen(false)}
        title="Freeze Account"
        footer={
          <div className="flex space-x-3">            <Button
              variant="outline"
              onClick={() => setIsFreezeModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={handleFreezeAccount}
              isLoading={actionLoading}
            >
              Freeze Account
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to freeze this account? The account holder will not be able to perform any transactions.
          </p>
          <div className="bg-yellow-50 p-4 rounded-md">
            <p className="text-sm text-yellow-700">
              <strong>Warning:</strong> This action will prevent all transactions on this account until it is unfrozen.
            </p>
          </div>
        </div>
      </Modal>

      {/* Close Account Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Close Account"
        footer={
          <div className="flex space-x-3">            <Button
              variant="outline"
              onClick={() => setIsCloseModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleCloseAccount}
              isLoading={actionLoading}
            >
              Close Account
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to close this account? This action cannot be undone.
          </p>
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> Closing an account is permanent. All remaining funds should be transferred before closing.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountDetail;
