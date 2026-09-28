import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, Ban, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';

interface AccountNotification {
  type: 'INFO' | 'WARNING' | 'RESTRICTION';
  title: string;
  message: string;
  amount?: number;
}

interface WithdrawalInfo {
  availableAmount: number;
  accountBalance: number;
  totalRestricted: number;
  restrictionBreakdown: {
    ownLoans: number;
    guarantees: number;
  };
  restrictions: Array<{
    type: 'GUARANTEE' | 'OWN_LOAN';
    amount: number;
    description: string;
  }>;
}

interface AccountNotificationsResponse {
  accountId: string;
  notifications: AccountNotification[];
  hasActiveLoans: boolean;
  hasGuaranteeObligations: boolean;
  withdrawalInfo: WithdrawalInfo;
}

interface AccountNotificationsPanelProps {
  accountId: string | null;
  transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'loan-repayment' | 'deposit-shares' | 'withdrawal-shares';
  className?: string;
}

const AccountNotificationsPanel: React.FC<AccountNotificationsPanelProps> = ({
  accountId,
  transactionType,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<AccountNotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Debug logging
  console.log('🔍 AccountNotificationsPanel rendered:', {
    accountId,
    transactionType,
    timestamp: new Date().toISOString()
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) {
      setNotifications(null);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching notifications for accountId:', accountId);
        const response = await api.get(`/transactions/account/${accountId}/notifications`);
        console.log('✅ Notifications response:', response.data);
        setNotifications(response.data);
      } catch (err) {
        console.error('❌ Error fetching account notifications:', err);
        setError('Failed to load account information. Check console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [accountId]);

  // Don't show panel if no account selected or no notifications/restrictions
  if (!accountId) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm text-gray-600 dark:text-gray-300">Loading account information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg ${className}`}>
        <div className="flex items-center">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
          <span className="text-sm text-red-700 dark:text-red-200">{error}</span>
        </div>
      </div>
    );
  }

  // For debugging: always show panel when account is selected
  const hasNotifications = notifications && (
    notifications.notifications.length > 0 || 
    notifications.hasActiveLoans || 
    notifications.hasGuaranteeObligations
  );

  if (!notifications || (!hasNotifications && !loading && !error)) {
    // Show a debug message when no notifications are found
    return (
      <div className={`p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg ${className}`}>
        <div className="flex items-center">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
          <span className="text-sm text-blue-700 dark:text-blue-200">
            ✅ Account notification system active - No restrictions found for this account
          </span>
        </div>
      </div>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'RESTRICTION':
        return <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getNotificationBadgeVariant = (type: string): 'primary' | 'warning' | 'danger' => {
    switch (type) {
      case 'WARNING':
        return 'warning';
      case 'RESTRICTION':
        return 'danger';
      default:
        return 'primary';
    }
  };

  // Show withdrawal-specific information for withdrawal and transfer transactions
  const showWithdrawalInfo = (transactionType === 'withdrawal' || transactionType === 'transfer') && 
                             notifications.withdrawalInfo.totalRestricted > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-900 dark:text-dark-text flex items-center">
          <Info className="w-4 h-4 mr-2" />
          Account Information & Restrictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Withdrawal Information */}
        {showWithdrawalInfo && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {transactionType === 'withdrawal' ? 'Withdrawal Limits' : 'Available Balance'}
              </h4>
              <Badge variant="primary" className="text-xs">
                Available: {formatCurrency(notifications.withdrawalInfo.availableAmount, 'GHS', 'en-GH', 2)}
              </Badge>
            </div>

            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <div className="flex justify-between">
                <span>Account Balance:</span>
                <span className="font-medium">
                  {formatCurrency(notifications.withdrawalInfo.accountBalance, 'GHS', 'en-GH', 2)}
                </span>
              </div>

              {notifications.withdrawalInfo.restrictionBreakdown.ownLoans > 0 && (
                <div className="flex justify-between">
                  <span>Restricted (Own Loans):</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(notifications.withdrawalInfo.restrictionBreakdown.ownLoans, 'GHS', 'en-GH', 2)}
                  </span>
                </div>
              )}

              {notifications.withdrawalInfo.restrictionBreakdown.guarantees > 0 && (
                <div className="flex justify-between">
                  <span>Restricted (Guarantees):</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    -{formatCurrency(notifications.withdrawalInfo.restrictionBreakdown.guarantees, 'GHS', 'en-GH', 2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-blue-300 dark:border-blue-700 pt-1 font-medium">
                <span>Available to {transactionType === 'withdrawal' ? 'Withdraw' : 'Transfer'}:</span>
                <span className="text-green-700 dark:text-green-400">
                  {formatCurrency(notifications.withdrawalInfo.availableAmount, 'GHS', 'en-GH', 2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account Status Summary */}
        {(notifications.hasActiveLoans || notifications.hasGuaranteeObligations) && (
          <div className="flex flex-wrap gap-2">
            {notifications.hasActiveLoans && (
              <Badge variant="warning" className="text-xs">
                📋 Has Active Loans
              </Badge>
            )}
            {notifications.hasGuaranteeObligations && (
              <Badge variant="primary" className="text-xs">
                🤝 Guaranteeing Other Loans
              </Badge>
            )}
          </div>
        )}

        {/* Notifications List */}
        {notifications.notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.notifications.map((notification, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  notification.type === 'RESTRICTION'
                    ? 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
                    : notification.type === 'WARNING'
                    ? 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-700'
                    : 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                        {notification.title}
                      </p>
                      <Badge variant={getNotificationBadgeVariant(notification.type)} className="text-xs">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                      {notification.message}
                    </p>
                    {notification.amount && (
                      <p className="text-xs font-medium text-gray-900 dark:text-dark-text mt-1">
                        Amount: {formatCurrency(notification.amount, 'GHS', 'en-GH', 2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Specific Restrictions Details */}
        {notifications.withdrawalInfo.restrictions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Restriction Details:</h4>
            <div className="space-y-1">
              {notifications.withdrawalInfo.restrictions.map((restriction, index) => (
                <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                  <span className="flex-1">{restriction.description}</span>
                  <span className="font-medium text-red-600 dark:text-red-400 ml-2">
                    {formatCurrency(restriction.amount, 'GHS', 'en-GH', 2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Helpful Tips */}
        {notifications.hasActiveLoans && (transactionType === 'withdrawal' || transactionType === 'transfer') && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                💡 <strong>Tip:</strong> With active loans, you must maintain a balance greater than your loan amount to make withdrawals.
              </p>
            </div>
          </div>
        )}

        {notifications.hasGuaranteeObligations && (
          <div className="mt-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                🤝 <strong>Note:</strong> This account is guaranteeing other loans. Some funds may be restricted to maintain guarantee obligations.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountNotificationsPanel;