import React, { useEffect, useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import AccountSelect from '../ui/AccountSelect';
import AccountNotificationsPanel from './AccountNotificationsPanel';
import { Account, Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { settingsApi } from '../../lib/api';

interface TransactionFormProps {
  accounts: Account[];
  onSubmit: (data: Partial<Transaction>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  transactionType?: 'deposit' | 'withdrawal' | 'transfer' | 'loan-repayment' | 'deposit-shares' | 'withdrawal-shares';
}

// A LOAN account's legacy `balance` field only ever tracks principal, so Math.abs(balance)
// understates what's actually still owed until the loan is nearly paid off (interest and the
// guarantor-backed share are also part of the real remaining debt). `loanOutstandingBalance`
// is the true totalPayable-minus-totalPaid figure kept in sync on every repayment - prefer it,
// falling back to the legacy balance only for accounts loaded before the backend exposed it.
const getLoanOutstandingDebt = (account: Account): number =>
  account.loanOutstandingBalance ?? Math.abs(account.balance);

const TransactionForm: React.FC<TransactionFormProps> = ({
  accounts,
  onSubmit,
  onCancel,
  isLoading = false,
  transactionType,
}) => {
  const [formData, setFormData] = useState<Partial<Transaction> & { toAccountId?: string }>({
    type: transactionType || 'deposit',
    amount: 0,
    status: 'pending',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [withdrawalFee, setWithdrawalFee] = useState<number | null>(null);

  useEffect(() => {
    settingsApi.get()
      .then((settings) => setWithdrawalFee(settings.withdrawalFee))
      .catch(() => setWithdrawalFee(null));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => {
      // If changing the account, update the accountNumber as well
      if (name === 'accountId') {
        const selectedAccount = Array.isArray(accounts) ? accounts.find(a => a.id === value) : null;
        return { 
          ...prev, 
          [name]: value,
          accountNumber: selectedAccount?.accountNumber || ''
        };
      }
      return { ...prev, [name]: value };
    });
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amount = value === '' ? 0 : parseFloat(value);
    setFormData((prev) => ({ ...prev, amount }));
    
    // Clear error
    if (errors.amount) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.amount;
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }
    
    // Withdrawals (savings or shares) also deduct a processing charge on top of the requested
    // amount - checking against the requested amount alone lets a request for exactly the full
    // balance through here, only for the approver to reject it later once the fee is added in.
    const fee = withdrawalFee ?? 0;

    if (formData.type === 'withdrawal') {
      const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
      if (account && formData.amount && formData.amount + fee > account.balance) {
        newErrors.amount = fee > 0
          ? `Insufficient funds for withdrawal (amount plus GH₵${fee.toFixed(2)} processing charge exceeds available balance)`
          : 'Insufficient funds for withdrawal';
      }
    }

    if (formData.type === 'withdrawal-shares') {
      const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
      if (account) {
        if (typeof account.shareBalance === 'undefined') {
          newErrors.accountId = 'Shares withdrawals can only be made from accounts with shares capability';
        } else if (formData.amount && formData.amount + fee > account.shareBalance) {
          newErrors.amount = fee > 0
            ? `Insufficient share balance for withdrawal (amount plus GH₵${fee.toFixed(2)} processing charge exceeds share balance)`
            : 'Insufficient share balance for withdrawal';
        }
      }
    }

    if (formData.type === 'loan-repayment') {
      const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
      if (account) {
        // Validate that only loan accounts can receive loan repayments
        if (account.type !== 'LOAN') {
          newErrors.accountId = 'Loan repayments can only be made to loan accounts';
        }
        
        // For loan accounts, check if repayment amount doesn't exceed outstanding debt
        if (formData.amount) {
          const outstandingDebt = getLoanOutstandingDebt(account);
          if (formData.amount > outstandingDebt) {
            newErrors.amount = `Repayment amount exceeds outstanding debt of ${formatCurrency(outstandingDebt, 'GHS', 'en-GH', 2)}`;
          }
        }
      }
    }

    if (formData.type === 'deposit-shares') {
      const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
      if (account) {
        // Validate that account has shares capability (shareBalance exists)
        if (typeof account.shareBalance === 'undefined') {
          newErrors.accountId = 'Shares deposits can only be made to accounts with shares capability';
        }
      }
    }

    if (formData.type === 'transfer') {
      if (!formData.toAccountId) {
        newErrors.toAccountId = 'Recipient account is required';
      }
      
      if (formData.toAccountId === formData.accountId) {
        newErrors.toAccountId = 'Cannot transfer to the same account';
      }
      
      const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
      if (account && formData.amount && formData.amount > account.balance) {
        newErrors.amount = 'Insufficient funds for transfer';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      // Prepare transaction data, removing any fields not needed for the transaction type
      const transactionData: Partial<Transaction> = { ...formData };
      
      // For transfer, create special description and reference
      if (formData.type === 'transfer' && formData.toAccountId) {
        const fromAccount = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
        const toAccount = Array.isArray(accounts) ? accounts.find(a => a.id === formData.toAccountId) : null;
        
        if (fromAccount && toAccount) {
          transactionData.description = formData.description || 
            `Transfer from ${fromAccount.accountNumber} to ${toAccount.accountNumber}`;
          
          transactionData.reference = `TRF-${Date.now()}`;
        }
      }

      // For loan repayment, create special description and reference
      if (formData.type === 'loan-repayment') {
        const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
        if (account) {
          transactionData.description = formData.description || 
            `Loan repayment from account ${account.accountNumber}`;
          
          transactionData.reference = `LRP-${Date.now()}`;
        }
      }

      // For deposit-shares, create special description and reference
      if (formData.type === 'deposit-shares') {
        const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
        if (account) {
          transactionData.description = formData.description ||
            `Shares deposit to account ${account.accountNumber}`;

          transactionData.reference = `SHR-${Date.now()}`;
        }
      }

      // For withdrawal-shares, create special description and reference
      if (formData.type === 'withdrawal-shares') {
        const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
        if (account) {
          transactionData.description = formData.description ||
            `Shares withdrawal from account ${account.accountNumber}`;

          transactionData.reference = `WSHR-${Date.now()}`;
        }
      }

      onSubmit(transactionData);
    }
  };

  // Find the selected account
  const selectedAccount = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!transactionType && (
        <Select
          label="Transaction Type"
          name="type"
          value={formData.type || 'deposit'}
          onChange={handleSelectChange('type')}
          options={[
            { value: 'deposit', label: 'Deposit' },
            { value: 'deposit-shares', label: 'Deposit Shares' },
            { value: 'withdrawal', label: 'Withdrawal' },
            { value: 'withdrawal-shares', label: 'Withdrawal Shares' },
            { value: 'transfer', label: 'Transfer' },
            { value: 'loan-repayment', label: 'Loan Repayment' }
          ]}
          fullWidth
        />
      )}

      {/* Show approval notice for withdrawals and transfers */}
      {(formData.type === 'withdrawal' || formData.type === 'withdrawal-shares' || formData.type === 'transfer') && (
        <div className="bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Authorization Required
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {formData.type === 'withdrawal' || formData.type === 'withdrawal-shares'
                  ? 'This withdrawal request will be sent for approval before processing.'
                  : 'This transfer request will be sent for approval before processing.'
                }
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                You can track the approval status in the Withdrawal Authorization section.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Account Selection */}
        {formData.type === 'transfer' ? (
          /* Transfer: Stack account fields vertically for better visibility */
          <div className="space-y-4">
            <AccountSelect
              label="From Account"
              accounts={Array.isArray(accounts) ? accounts : []}
              value={formData.accountId || ''}
              onChange={(accountId) => {
                const selectedAccount = Array.isArray(accounts) ? accounts.find(a => a.id === accountId) : null;
                setFormData(prev => ({ 
                  ...prev, 
                  accountId,
                  accountNumber: selectedAccount?.accountNumber || ''
                }));
                
                // Clear error when field is modified
                if (errors.accountId) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.accountId;
                    return newErrors;
                  });
                }
              }}
              error={errors.accountId}
              placeholder="Search accounts or customers..."
              fullWidth
            />
            
            <AccountSelect
              label="To Account"
              accounts={Array.isArray(accounts) ? accounts : []}
              value={formData.toAccountId || ''}
              onChange={(accountId) => {
                setFormData(prev => ({ ...prev, toAccountId: accountId }));
                
                // Clear error when field is modified
                if (errors.toAccountId) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.toAccountId;
                    return newErrors;
                  });
                }
              }}
              excludeAccountId={formData.accountId}
              error={errors.toAccountId}
              placeholder="Search recipient accounts..."
              fullWidth
            />
            
            {/* Recipient Account Notifications - Show if account has loan/guarantee restrictions */}
            {formData.toAccountId && (
              <AccountNotificationsPanel 
                accountId={formData.toAccountId} 
                transactionType="transfer"
              />
            )}
          </div>
        ) : (
          /* Single account: Full width for better visibility */
          <AccountSelect
            label="Account"
            accounts={Array.isArray(accounts) ? accounts : []}
            value={formData.accountId || ''}
            onChange={(accountId) => {
              const selectedAccount = Array.isArray(accounts) ? accounts.find(a => a.id === accountId) : null;
              setFormData(prev => ({ 
                ...prev, 
                accountId,
                accountNumber: selectedAccount?.accountNumber || ''
              }));
              
              // Clear error when field is modified
              if (errors.accountId) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.accountId;
                  return newErrors;
                });
              }
            }}
            filter={formData.type === 'loan-repayment' ? (account) => account.type === 'LOAN'
                   : (formData.type === 'deposit-shares' || formData.type === 'withdrawal-shares') ? (account) => typeof account.shareBalance !== 'undefined'
                   : undefined}
            error={errors.accountId}
            placeholder={formData.type === 'loan-repayment' ? "Search loan accounts..."
                       : (formData.type === 'deposit-shares' || formData.type === 'withdrawal-shares') ? "Search shares accounts..."
                       : "Search accounts or customers..."}
            fullWidth
          />
        )}

        {/* Amount Field - Now positioned below account selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.amount?.toString() || ''}
            onChange={handleAmountChange}
            error={errors.amount}
            required
            fullWidth
          />
          
          <Input
            label="Reference (Optional)"
            name="reference"
            value={formData.reference || ''}
            onChange={handleChange}
            fullWidth
          />
        </div>
      </div>
      
      <Input
        label="Description"
        name="description"
        value={formData.description || ''}
        onChange={handleChange}
        fullWidth
      />
      
      {selectedAccount && (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Selected Account: <strong>{selectedAccount.accountNumber}</strong> ({selectedAccount.type})
              <br />
              Customer: {selectedAccount.customerName}
              <br />
              {selectedAccount.type === 'LOAN' ? (
                <>Outstanding Debt: <strong>{formatCurrency(getLoanOutstandingDebt(selectedAccount), 'GHS', 'en-GH', 0)}</strong></>
              ) : formData.type === 'deposit-shares' || formData.type === 'withdrawal-shares' ? (
                <>
                  Share Balance: <strong>{formatCurrency(selectedAccount.shareBalance || 0, 'GHS', 'en-GH', 2)}</strong>
                  <br />
                  Available Balance: <strong>{formatCurrency(selectedAccount.balance, 'GHS', 'en-GH', 2)}</strong>
                </>
              ) : (
                <>Available Balance: <strong>{formatCurrency(selectedAccount.balance, 'GHS', 'en-GH', 2)}</strong></>
              )}
            </p>
          </div>
          
          {formData.type === 'loan-repayment' && selectedAccount.type === 'LOAN' && (
            <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 p-4 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-200">
                <strong>💡 Loan Repayment with Guarantor Disbursement:</strong>
                <br />
                • Payments first cover the loan's <strong>interest</strong> and reimburse the <strong>guarantors</strong> who backed it
                <br />
                • Once that portion is fully paid, the rest of every payment reduces the customer's own remaining principal
                <br />
                • Maximum payment: {formatCurrency(getLoanOutstandingDebt(selectedAccount), 'GHS', 'en-GH', 0)}
                <br />
                • Any amount above the debt will be rejected
              </p>
            </div>
          )}

          {formData.type === 'deposit-shares' && typeof selectedAccount.shareBalance !== 'undefined' && (
            <div className="bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 p-4 rounded-md">
              <p className="text-sm text-purple-700 dark:text-purple-200">
                <strong>💎 Shares Deposit:</strong>
                <br />
                • This deposit will be added to the account's share balance
                <br />
                • Current Share Balance: {formatCurrency(selectedAccount.shareBalance || 0, 'GHS', 'en-GH', 2)}
                <br />
                • Shares can earn dividends based on bank performance
                <br />
                • Minimum deposit amount may apply based on account type
                <br />
                <br />
                <em>Note: Share deposits are typically long-term investments in the institution</em>
              </p>
            </div>
          )}

          {formData.type === 'withdrawal-shares' && typeof selectedAccount.shareBalance !== 'undefined' && (
            <div className="bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 p-4 rounded-md">
              <p className="text-sm text-purple-700 dark:text-purple-200">
                <strong>💎 Shares Withdrawal:</strong>
                <br />
                • This withdrawal will be deducted from the account's share balance
                <br />
                • Current Share Balance: {formatCurrency(selectedAccount.shareBalance || 0, 'GHS', 'en-GH', 2)}
                <br />
                • {withdrawalFee !== null ? `A GH₵${withdrawalFee.toFixed(2)} processing charge applies` : 'A processing charge applies'}, also deducted from the share balance
                <br />
                • Maximum withdrawal: {formatCurrency(selectedAccount.shareBalance || 0, 'GHS', 'en-GH', 2)}
              </p>
            </div>
          )}

          {/* Account Notifications - Show loan guarantees and restrictions */}
          <AccountNotificationsPanel 
            accountId={selectedAccount.id} 
            transactionType={formData.type || 'withdrawal'}
          />
        </div>
      )}
      
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          variant={
            formData.type === 'deposit'
              ? 'primary'
              : formData.type === 'deposit-shares'
                ? 'primary'
              : formData.type === 'withdrawal' || formData.type === 'withdrawal-shares'
                ? 'warning'
                : formData.type === 'loan-repayment'
                  ? 'success'
                  : 'secondary'
          }
        >
          {formData.type === 'deposit'
            ? 'Make Deposit'
            : formData.type === 'deposit-shares'
              ? 'Make Shares Deposit'
            : formData.type === 'withdrawal'
              ? 'Request Withdrawal'
              : formData.type === 'withdrawal-shares'
                ? 'Request Shares Withdrawal'
              : formData.type === 'loan-repayment'
                ? 'Process Loan Repayment'
                : 'Request Transfer'}
        </Button>
      </div>
    </form>
  );
};

export default TransactionForm;