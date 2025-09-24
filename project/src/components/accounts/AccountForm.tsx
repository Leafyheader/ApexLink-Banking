import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Account, Customer } from '../../types';

interface AccountFormProps {
  initialData?: Partial<Account>;
  customers: Customer[];
  onSubmit: (data: Partial<Account>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const AccountForm: React.FC<AccountFormProps> = ({
  initialData = {},
  customers,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<Account>>({
    type: 'savings',
    status: 'active',
    balance: 0,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData((prev) => ({ ...prev, [name]: numValue }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }
    
    if (!formData.accountNumber?.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }
    
    if (formData.balance === undefined || formData.balance < 0) {
      newErrors.balance = 'Initial balance must be zero or positive';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Find the selected customer
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Customer"
          name="customerId"
          value={formData.customerId || ''}
          onChange={handleSelectChange('customerId')}
          options={[
            { value: '', label: 'Select a customer', disabled: true },
            ...customers.map(customer => ({
              value: customer.id,
              label: customer.name
            }))
          ]}
          error={errors.customerId}
          fullWidth
        />
        
        <Input
          label="Account Number"
          name="accountNumber"
          value={formData.accountNumber || ''}
          onChange={handleChange}
          error={errors.accountNumber}
          required
          fullWidth
          disabled={!!initialData.id}
          helperText={initialData.id ? "Account number cannot be changed" : ""}
        />
        
        <Select
          label="Account Type"
          name="type"
          value={formData.type || 'savings'}
          onChange={handleSelectChange('type')}
          options={[
            { value: 'savings', label: 'Savings Account' },
            { value: 'current', label: 'Current Account' },
            { value: 'fixed', label: 'Fixed Deposit' }
          ]}
          fullWidth
        />
        
        <Select
          label="Account Status"
          name="status"
          value={formData.status || 'active'}
          onChange={handleSelectChange('status')}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'dormant', label: 'Dormant' },
            { value: 'closed', label: 'Closed' }
          ]}
          fullWidth
        />
      </div>
      
      <Input
        label="Initial Balance"
        name="balance"
        type="number"
        min="0"
        step="0.01"
        value={formData.balance?.toString() || '0'}
        onChange={handleNumberChange}
        error={errors.balance}
        fullWidth
        disabled={!!initialData.id}
        helperText={initialData.id ? "Balance can only be changed through transactions" : ""}
      />
      
      {selectedCustomer && (
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-700">
            Creating account for: <strong>{selectedCustomer.name}</strong>
            <br />
            Email: {selectedCustomer.email}
            <br />
            Phone: {selectedCustomer.phone}
          </p>
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
        >
          {initialData.id ? 'Update Account' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
};

export default AccountForm;