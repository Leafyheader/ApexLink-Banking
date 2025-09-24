import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import api from '../lib/api';

interface CreateUserForm {
  name: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: string;
}

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'TELLER'
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation state
  const [fieldErrors, setFieldErrors] = useState<Partial<CreateUserForm>>({});

  // Role options
  const roleOptions = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'TELLER', label: 'Teller' }
  ];

  // Handle input changes
  const handleInputChange = (field: keyof CreateUserForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear general error
    if (error) setError(null);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<CreateUserForm> = {};
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Role validation
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const userData = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role
      };
      
      await api.post('/auth/register', userData);
      
      setSuccess(`User "${formData.name}" created successfully!`);
      
      // Reset form
      setFormData({
        name: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'TELLER'
      });
      
      // Redirect after success
      setTimeout(() => {
        navigate('/users');
      }, 2000);
        } catch (err: unknown) {
      console.error('Failed to create user:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to create user';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/users')}
        >
          Back to Users
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New User</h1>
          <p className="text-muted-foreground">
            Add a new user to the banking system
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">User Created Successfully</p>
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">Error Creating User</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>User Information</span>
          </CardTitle>
          <CardDescription>
            Fill in the details to create a new user account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name *
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={fieldErrors.name ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username *
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={fieldErrors.username ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {fieldErrors.username && (
                <p className="text-sm text-red-600">{fieldErrors.username}</p>
              )}
              <p className="text-xs text-gray-500">
                Username must be at least 3 characters long
              </p>
            </div>

            {/* Role Field */}
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role *
              </label>              <Select
                options={roleOptions}
                value={formData.role}
                onChange={(value) => handleInputChange('role', value)}
                disabled={isLoading}
              />
              {fieldErrors.role && (
                <p className="text-sm text-red-600">{fieldErrors.role}</p>
              )}
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Administrator:</strong> Full system access</p>
                <p><strong>Manager:</strong> Manage users and approve transactions</p>
                <p><strong>Teller:</strong> Process customer transactions</p>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={fieldErrors.password ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-sm text-red-600">{fieldErrors.password}</p>
              )}
              <p className="text-xs text-gray-500">
                Password must be at least 6 characters long
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password *
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={fieldErrors.confirmPassword ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6">
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                leftIcon={<UserPlus size={16} />}
                className="flex-1"
              >
                {isLoading ? 'Creating User...' : 'Create User'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/users')}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUser;
