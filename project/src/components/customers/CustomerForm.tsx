import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Customer } from '../../types';

interface CustomerFormProps {
  initialData?: Partial<Customer>;
  onSubmit: (data: Partial<Customer>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    kycStatus: 'pending',
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

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ 
      ...prev, 
      kycStatus: value as 'verified' | 'pending' | 'rejected' 
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Full Name"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          error={errors.name}
          required
          fullWidth
        />
        
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          error={errors.email}
          required
          fullWidth
        />
        
        <Input
          label="Phone Number"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          error={errors.phone}
          required
          fullWidth
        />
        
        <Select
          label="KYC Status"
          name="kycStatus"
          value={formData.kycStatus || 'pending'}
          onChange={handleStatusChange}
          options={[
            { value: 'verified', label: 'Verified' },
            { value: 'pending', label: 'Pending' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          fullWidth
        />
      </div>
      
      <Input
        label="Address"
        name="address"
        value={formData.address || ''}
        onChange={handleChange}
        error={errors.address}
        required
        fullWidth
      />
      
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
          {initialData.id ? 'Update Customer' : 'Add Customer'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;