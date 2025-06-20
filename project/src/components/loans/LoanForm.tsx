import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Customer, Loan } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface LoanFormProps {
  initialData?: Partial<Loan>;
  customers: Customer[];
  onSubmit: (data: Partial<Loan>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LoanForm: React.FC<LoanFormProps> = ({
  initialData = {},
  customers,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<Loan>>({
    amount: 0,
    interestRate: 5,
    term: 12,
    repaymentFrequency: 'monthly',
    status: 'active',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);

  // Calculate monthly payment whenever relevant fields change
  React.useEffect(() => {
    if (formData.amount && formData.interestRate && formData.term) {
      // Simple loan calculation (for demo purposes)
      const principal = formData.amount;
      const monthlyRate = (formData.interestRate / 100) / 12;
      const numberOfPayments = formData.term;
      
      // Calculate monthly payment (simplified formula)
      const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
      setMonthlyPayment(payment);
    }
  }, [formData.amount, formData.interestRate, formData.term]);

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
    
    // If customer is changed, update the customerName
    if (name === 'customerId') {
      const selectedCustomer = customers.find(c => c.id === value);
      if (selectedCustomer) {
        setFormData((prev) => ({
          ...prev,
          customerId: value,
          customerName: selectedCustomer.name
        }));
      }
    }
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Loan amount must be greater than zero';
    }
    
    if (!formData.interestRate || formData.interestRate < 0) {
      newErrors.interestRate = 'Interest rate must be zero or positive';
    }
    
    if (!formData.term || formData.term < 1) {
      newErrors.term = 'Loan term must be at least 1 month';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      // Calculate start and end dates
      const startDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (formData.term || 12));
      
      // Prepare loan data with dates
      const loanData: Partial<Loan> = {
        ...formData,
        startDate,
        endDate: endDate.toISOString(),
      };
      
      onSubmit(loanData);
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
          disabled={!!initialData.id}
        />
        
        <Input
          label="Loan Amount"
          name="amount"
          type="number"
          min="1000"
          step="100"
          value={formData.amount?.toString() || ''}
          onChange={handleNumberChange}
          error={errors.amount}
          required
          fullWidth
          disabled={!!initialData.id}
        />
        
        <Input
          label="Interest Rate (%)"
          name="interestRate"
          type="number"
          min="0"
          step="0.1"
          value={formData.interestRate?.toString() || ''}
          onChange={handleNumberChange}
          error={errors.interestRate}
          required
          fullWidth
          disabled={!!initialData.id}
        />
        
        <Input
          label="Term (months)"
          name="term"
          type="number"
          min="1"
          max="360"
          value={formData.term?.toString() || ''}
          onChange={handleNumberChange}
          error={errors.term}
          required
          fullWidth
          disabled={!!initialData.id}
        />
        
        <Select
          label="Repayment Frequency"
          name="repaymentFrequency"
          value={formData.repaymentFrequency || 'monthly'}
          onChange={handleSelectChange('repaymentFrequency')}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'annually', label: 'Annually' }
          ]}
          fullWidth
          disabled={!!initialData.id}
        />
        
        {initialData.id && (
          <Select
            label="Loan Status"
            name="status"
            value={formData.status || 'active'}
            onChange={handleSelectChange('status')}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'paid', label: 'Paid' },
              { value: 'defaulted', label: 'Defaulted' }
            ]}
            fullWidth
          />
        )}
      </div>
      
      {/* Payment summary */}
      {formData.amount && formData.term && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Loan Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
            <div>Principal Amount:</div>
            <div className="font-semibold">{formatCurrency(formData.amount)}</div>
            
            <div>Interest Rate:</div>
            <div className="font-semibold">{formData.interestRate}% per annum</div>
            
            <div>Loan Term:</div>
            <div className="font-semibold">{formData.term} months</div>
            
            <div>Monthly Payment:</div>
            <div className="font-semibold">{formatCurrency(monthlyPayment)}</div>
            
            <div>Total Payment:</div>
            <div className="font-semibold">{formatCurrency(monthlyPayment * (formData.term || 0))}</div>
            
            <div>Total Interest:</div>
            <div className="font-semibold">{formatCurrency((monthlyPayment * (formData.term || 0)) - (formData.amount || 0))}</div>
          </div>
        </div>
      )}
      
      {selectedCustomer && (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-700">
            Creating loan for: <strong>{selectedCustomer.name}</strong>
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
          {initialData.id ? 'Update Loan' : 'Create Loan'}
        </Button>
      </div>
    </form>
  );
};

export default LoanForm;