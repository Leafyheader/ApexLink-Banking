import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  UserCog, 
  Trash2,
  CreditCard,
  Building,
  User,
  AlertCircle,
  Briefcase,
  Heart,
  Baby,
  CheckCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Customer } from '../types';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
    // Component states
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const fetchCustomer = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/customers/${id}`);
      setCustomer(response.data);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError('Failed to load customer details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id, fetchCustomer]);

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
          <Button onClick={fetchCustomer}>Try Again</Button>
          <Button variant="outline" onClick={() => navigate('/customers')}>
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Customer not found</p>
        <Link to="/customers" className="text-blue-600 hover:text-blue-800">
          Back to Customers
        </Link>
      </div>
    );
  }

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'default';
    }
  };  // Handle edit customer
  const handleEditCustomer = () => {
    navigate(`/customers/${customer.id}/edit`);
  };
  // Handle verify customer KYC
  const handleVerifyCustomer = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      await api.patch(`/customers/${customer.id}/kyc`, {
        kycStatus: 'verified'
      });
      
      // Update local customer state
      setCustomer(prev => prev ? { ...prev, kycStatus: 'verified' } : null);
      
      // Show success message
      alert('Customer KYC status has been verified successfully!');
    } catch (err) {
      console.error('Error verifying customer:', err);
      setError('Failed to verify customer. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete customer
  const handleDeleteCustomer = () => {
  setIsDeleteModalOpen(true);
  };

  // Confirm delete customer
  const confirmDeleteCustomer = async () => {
    try {
      setActionLoading(true);
      await api.delete(`/customers/${customer.id}`);
      navigate('/customers');
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Failed to delete customer. Please try again.');
      setActionLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Generate initials for photo placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/customers')}
          >
            Back to Customers
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Details
          </h1>
        </div>        <div className="flex items-center space-x-3">
          <Button
            leftIcon={<UserCog size={18} />}
            onClick={handleEditCustomer}
          >
            Edit Customer
          </Button>
          <Button
            variant="danger"
            leftIcon={<Trash2 size={18} />}
            onClick={handleDeleteCustomer}
          >
            Delete Customer
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Profile */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="text-center pt-6">              {/* Profile Photo/Avatar */}
              <div className="mb-6">
                {customer.photo ? (
                  <div className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-lg overflow-hidden">
                    <img
                      src={
                        customer.photo.startsWith('data:') 
                          ? customer.photo 
                          : customer.photo.startsWith('/uploads/')
                            ? `http://localhost:5000${customer.photo}`
                            : `data:image/jpeg;base64,${customer.photo}`
                      }
                      alt={`${customer.name} profile photo`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center hidden">
                      <span className="text-4xl font-semibold text-blue-700">
                        {getInitials(customer.name)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto bg-blue-100 flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-4xl font-semibold text-blue-700">
                      {getInitials(customer.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Customer Name and Status */}
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {customer.name}
              </h2>
              <div className="mb-6">
                <Badge variant={getStatusVariant(customer.kycStatus)}>
                  {customer.kycStatus.charAt(0).toUpperCase() + customer.kycStatus.slice(1)}
                </Badge>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 text-left">
                <div className="flex items-center text-gray-600">
                  <Mail className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-gray-900 truncate">{customer.email}</p>
                  </div>
                </div>                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-gray-900">{customer.phone}</p>
                  </div>
                </div>

                <div className="flex items-start text-gray-600">
                  <MapPin className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-gray-900">{customer.address}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date Joined</p>
                    <p className="text-gray-900">{formatDate(customer.dateJoined)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Accounts and Additional Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accounts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Accounts
                </CardTitle>
                <Link
                  to="/accounts"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All Accounts
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {customer.accounts.length > 0 ? (
                <div className="space-y-4">
                  {customer.accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{account.accountNumber}</p>
                        <p className="text-sm text-gray-500">
                          {account.type.charAt(0).toUpperCase() + account.type.slice(1)} Account
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-sm text-green-600">{account.status || 'Active'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No accounts found for this customer</p>
                  <Link
                    to="/accounts"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Customer ID</h4>
                  <p className="text-gray-900 font-mono">{customer.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">KYC Status</h4>
                  <Badge variant={getStatusVariant(customer.kycStatus)}>
                    {customer.kycStatus.charAt(0).toUpperCase() + customer.kycStatus.slice(1)}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Date Joined</h4>
                  <p className="text-gray-900">{formatDate(customer.dateJoined)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Accounts</h4>
                  <p className="text-gray-900">{customer.accounts.length}</p>
                </div>
                
                {/* Bio Data Fields */}
                {customer.gender && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Gender</h4>
                    <p className="text-gray-900 capitalize">{customer.gender}</p>
                  </div>
                )}
                
                {customer.dateOfBirth && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <Baby className="h-4 w-4 mr-1" />
                      Date of Birth
                    </h4>
                    <p className="text-gray-900">{formatDate(customer.dateOfBirth)}</p>
                  </div>
                )}
                
                {customer.maritalStatus && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      Marital Status
                    </h4>
                    <p className="text-gray-900 capitalize">{customer.maritalStatus}</p>
                  </div>
                )}
                
                {customer.occupation && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <Briefcase className="h-4 w-4 mr-1" />
                      Occupation
                    </h4>
                    <p className="text-gray-900">{customer.occupation}</p>
                  </div>
                )}
                
                {customer.workplace && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <Building className="h-4 w-4 mr-1" />
                      Workplace
                    </h4>
                    <p className="text-gray-900">{customer.workplace}</p>
                  </div>
                )}
              </div>
            </CardContent></Card>

          {/* Customer Signature */}
          {customer.signature && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Signature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="max-w-md w-full border-2 border-gray-200 rounded-lg p-4 bg-gray-50">                    <img
                      src={
                        customer.signature.startsWith('data:') 
                          ? customer.signature 
                          : customer.signature.startsWith('/uploads/')
                            ? `http://localhost:5000${customer.signature}`
                            : `data:image/png;base64,${customer.signature}`
                      }
                      alt={`${customer.name} signature`}
                      className="w-full h-auto max-h-32 object-contain"
                      onError={(e) => {
                        console.error('Error loading signature image');
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<p class="text-gray-500 text-center">Signature unavailable</p>';
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Link
                  to="/accounts"
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Create Account</span>
                </Link>

                <Link
                  to={`/customers/${customer.id}/transactions`}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Building className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">View Transactions</span>
                </Link>
                
                <button
                  onClick={handleEditCustomer}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <UserCog className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Edit Profile</span>
                </button>

                {/* Verify KYC Button - Only show if customer is not already verified */}
                {customer.kycStatus !== 'verified' && (
                  <button
                    onClick={handleVerifyCustomer}
                    disabled={actionLoading}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-8 w-8 text-emerald-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Verify KYC</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>      {/* Delete Customer Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Customer"
        footer={
          <div className="flex space-x-3">            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>            <Button
              variant="danger"
              onClick={confirmDeleteCustomer}
              isLoading={actionLoading}
            >
              Delete Customer
            </Button>
          </div>
        }
      >
        <p className="text-gray-700">
          Are you sure you want to delete {customer.name}? This action cannot be undone.
        </p>
        {customer.accounts.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700">
              <strong>Warning:</strong> This customer has {customer.accounts.length} active {customer.accounts.length === 1 ? 'account' : 'accounts'}.
              Deleting this customer will require handling these accounts first.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerDetail;
