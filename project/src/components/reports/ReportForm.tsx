import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Customer, Account } from '../../types';

interface ReportFormProps {
  customers: Customer[];
  accounts: Account[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ReportForm: React.FC<ReportFormProps> = ({
  customers,
  accounts,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    type: 'transaction',
    format: 'pdf',
    dateFrom: '',
    dateTo: '',
    customerId: '',
    accountId: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // If customer changes, reset the account
    if (name === 'customerId' && prev.customerId !== value) {
      setFormData((prev) => ({ ...prev, [name]: value, accountId: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Filter accounts by selected customer
  const filteredAccounts = formData.customerId
    ? accounts.filter(account => account.customerId === formData.customerId)
    : accounts;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Report Type"
          name="type"
          value={formData.type}
          onChange={handleSelectChange('type')}
          options={[
            { value: 'transaction', label: 'Transaction Report' },
            { value: 'customer', label: 'Customer Statement' },
            { value: 'loan', label: 'Loan Report' },
          ]}
          fullWidth
        />
        
        <Select
          label="Export Format"
          name="format"
          value={formData.format}
          onChange={handleSelectChange('format')}
          options={[
            { value: 'pdf', label: 'PDF Document' },
            { value: 'excel', label: 'Excel Spreadsheet' },
          ]}
          fullWidth
        />
        
        <Input
          label="Date From"
          name="dateFrom"
          type="date"
          value={formData.dateFrom}
          onChange={handleChange}
          fullWidth
        />
        
        <Input
          label="Date To"
          name="dateTo"
          type="date"
          value={formData.dateTo}
          onChange={handleChange}
          fullWidth
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Customer"
          name="customerId"
          value={formData.customerId}
          onChange={handleSelectChange('customerId')}
          options={[
            { value: '', label: 'All Customers' },
            ...customers.map(customer => ({
              value: customer.id,
              label: customer.name
            }))
          ]}
          fullWidth
        />
        
        <Select
          label="Account"
          name="accountId"
          value={formData.accountId}
          onChange={handleSelectChange('accountId')}
          options={[
            { value: '', label: formData.customerId ? 'All Accounts for Customer' : 'All Accounts' },
            ...filteredAccounts.map(account => ({
              value: account.id,
              label: `${account.accountNumber} (${account.type})`
            }))
          ]}
          disabled={filteredAccounts.length === 0}
          fullWidth
        />
      </div>
      
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
          Generate Report
        </Button>
      </div>
    </form>
  );
};

export default ReportForm;