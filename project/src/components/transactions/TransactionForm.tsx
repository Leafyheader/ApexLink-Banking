import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import AccountSelect from '../ui/AccountSelect';
import { Account, Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface TransactionFormProps {
  accounts: Account[];
  onSubmit: (data: Partial<Transaction>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  transactionType?: 'deposit' | 'withdrawal' | 'transfer' | 'loan-repayment';
}

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
    
    if (formData.type === 'withdrawal') {
      const account = Array.isArray(accounts) ? accounts.find(a => a.id === formData.accountId) : null;
      if (account && formData.amount && formData.amount > account.balance) {
        newErrors.amount = 'Insufficient funds for withdrawal';
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
          const outstandingDebt = Math.abs(account.balance); // Convert negative balance to positive debt
          if (formData.amount > outstandingDebt) {
            newErrors.amount = `Repayment amount exceeds outstanding debt of ${formatCurrency(outstandingDebt)}`;
          }
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
            { value: 'withdrawal', label: 'Withdrawal' },
            { value: 'transfer', label: 'Transfer' },
            { value: 'loan-repayment', label: 'Loan Repayment' }
          ]}
          fullWidth
        />
      )}

      {/* Show approval notice for withdrawals and transfers */}
      {(formData.type === 'withdrawal' || formData.type === 'transfer') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                Authorization Required
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                {formData.type === 'withdrawal' 
                  ? 'This withdrawal request will be sent for approval before processing.'
                  : 'This transfer request will be sent for approval before processing.'
                }
              </p>
              <p className="text-xs text-amber-600 mt-1">
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
            filter={formData.type === 'loan-repayment' ? (account) => account.type === 'LOAN' : undefined}
            error={errors.accountId}
            placeholder={formData.type === 'loan-repayment' ? "Search loan accounts..." : "Search accounts or customers..."}
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
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-700">
              Selected Account: <strong>{selectedAccount.accountNumber}</strong> ({selectedAccount.type})
              <br />
              Customer: {selectedAccount.customerName}
              <br />
              {selectedAccount.type === 'LOAN' ? (
                <>Outstanding Debt: <strong>{formatCurrency(Math.abs(selectedAccount.balance))}</strong></>
              ) : (
                <>Available Balance: <strong>{formatCurrency(selectedAccount.balance)}</strong></>
              )}
            </p>
          </div>
          
          {formData.type === 'loan-repayment' && selectedAccount.type === 'LOAN' && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-md">
              <p className="text-sm text-green-700">
                <strong>💡 Loan Repayment with Guarantor Disbursement:</strong>
                <br />
                • <strong>50%</strong> of payment reduces your outstanding debt
                <br />
                • <strong>50%</strong> is disbursed equally to guarantors who provided the initial guarantee
                <br />
                • Maximum payment: {formatCurrency(Math.abs(selectedAccount.balance))}
                <br />
                • Any amount above the debt will be rejected
                <br />
                <br />
                <em>Example: $100 payment = $50 debt reduction + $50 distributed to guarantors</em>
              </p>
            </div>
          )}
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
              : formData.type === 'withdrawal' 
                ? 'warning' 
                : formData.type === 'loan-repayment'
                  ? 'success'
                  : 'secondary'
          }
        >
          {formData.type === 'deposit' 
            ? 'Make Deposit' 
            : formData.type === 'withdrawal' 
              ? 'Request Withdrawal' 
              : formData.type === 'loan-repayment'
                ? 'Process Loan Repayment'
                : 'Request Transfer'}
        </Button>
      </div>
    </form>
  );
};

export default TransactionForm;