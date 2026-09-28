import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, User, Phone, Users, FileText, Trash2, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Customer } from '../types';
import api, { resolveBackendAssetUrl } from '../lib/api';

const EditCustomer: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  // Form data with modified types to allow string input for number fields
  type CustomerFormData = Omit<Partial<Customer>, 'beneficiaryPercentage' | 'beneficiary2Percentage' | 'beneficiary3Percentage'> & {
    otherName?: string;
    beneficiaryRelation?: string;
    beneficiary2Relation?: string;
    beneficiary3Relation?: string;
    beneficiaryPercentage?: number | string;
    beneficiary2Percentage?: number | string;
    beneficiary3Percentage?: number | string;
    photoFile?: File;
    signatureFile?: File;
  };

  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    surname: '',
    otherName: '',
    gender: undefined,
    dateOfBirth: '',
    occupation: '',
    workplace: '',
    maritalStatus: undefined,
    residentialAddress: '',
    postalAddress: '',
    email: '',
    contactNumber: '',
    city: '',
    beneficiaryName: '',
    beneficiaryContact: '',
    beneficiaryRelation: '',
    beneficiaryPercentage: 0,
    beneficiary2Name: '',
    beneficiary2Contact: '',
    beneficiary2Relation: '',
    beneficiary2Percentage: 0,
    beneficiary3Name: '',
    beneficiary3Contact: '',
    beneficiary3Relation: '',
    beneficiary3Percentage: 0,
    identificationType: undefined,
    identificationNumber: '',
    photo: '',
    signature: '',
    kycStatus: 'pending',
  });

  // Load customer data on component mount
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) {
        setErrors({ submit: 'No customer ID provided' });
        setIsLoadingCustomer(false);
        return;
      }

      try {
        setIsLoadingCustomer(true);
        const response = await api.get(`/customers/${id}`);
        const customer = response.data;

        const fullName = (customer.name || '').trim();
        const nameParts = fullName.length > 0 ? fullName.split(/\s+/) : [];

        const derivedFirstName = nameParts.length > 0 ? nameParts[0] : '';
        const derivedSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const derivedOtherName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

        const firstName = (customer.firstName || '').trim() || derivedFirstName;
        const surname = (customer.surname || '').trim() || derivedSurname;
        const otherName = (customer.otherName || '').trim() || derivedOtherName;

        const normalizeOptionValue = (value?: string): string | undefined => {
          if (!value) return undefined;
          return value.toLowerCase().replace(/\s+/g, '_');
        };

        const normalizeKycStatus = (value?: string): 'verified' | 'pending' | 'rejected' => {
          const normalized = normalizeOptionValue(value);
          if (normalized === 'verified' || normalized === 'pending' || normalized === 'rejected') {
            return normalized;
          }
          return 'pending';
        };

        // Convert date to proper format for date input
        const dateOfBirth = customer.dateOfBirth 
          ? new Date(customer.dateOfBirth).toISOString().split('T')[0] 
          : '';

        setFormData({
          firstName,
          surname,
          otherName,
          gender: normalizeOptionValue(customer.gender),
          dateOfBirth,
          occupation: customer.occupation || '',
          workplace: customer.workplace || '',
          maritalStatus: normalizeOptionValue(customer.maritalStatus),
          residentialAddress: customer.residentialAddress || customer.address || '',
          postalAddress: customer.postalAddress || '',
          email: customer.email || '',
          contactNumber: customer.contactNumber || customer.phone || '',
          city: customer.city || '',
          beneficiaryName: customer.beneficiaryName || '',
          beneficiaryContact: customer.beneficiaryContact || '',
          beneficiaryRelation: customer.beneficiaryRelation || '',
          beneficiaryPercentage: customer.beneficiaryPercentage || 0,
          beneficiary2Name: customer.beneficiary2Name || '',
          beneficiary2Contact: customer.beneficiary2Contact || '',
          beneficiary2Relation: customer.beneficiary2Relation || '',
          beneficiary2Percentage: customer.beneficiary2Percentage || 0,
          beneficiary3Name: customer.beneficiary3Name || '',
          beneficiary3Contact: customer.beneficiary3Contact || '',
          beneficiary3Relation: customer.beneficiary3Relation || '',
          beneficiary3Percentage: customer.beneficiary3Percentage || 0,
          identificationType: normalizeOptionValue(customer.identificationType),
          identificationNumber: customer.identificationNumber || '',
          photo: customer.photo || '',
          signature: customer.signature || '',
          kycStatus: normalizeKycStatus(customer.kycStatus),
        });        // Set photo and signature previews if they exist
        if (customer.photo) {
          if (customer.photo.startsWith('/uploads/')) {
            // It's a file URL, create the full URL
            setPhotoPreview(resolveBackendAssetUrl(customer.photo) || null);
          } else if (customer.photo.startsWith('data:')) {
            // It's base64 data
            setPhotoPreview(customer.photo);
          }
        }
        if (customer.signature) {
          if (customer.signature.startsWith('/uploads/')) {
            // It's a file URL, create the full URL
            setSignaturePreview(resolveBackendAssetUrl(customer.signature) || null);
          } else if (customer.signature.startsWith('data:')) {
            // It's base64 data
            setSignaturePreview(customer.signature);
          }
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        setErrors({ submit: 'Failed to load customer data. Please try again.' });
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    fetchCustomer();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Handle number fields properly
    if (type === 'number') {
      // Allow empty values to remain empty (don't convert to 0 immediately)
      const numValue = value === '' ? '' : Number(value);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleSelectChange = (name: string) => (value: string) => {
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

  const handlePhotoUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: 'Photo file size must be less than 2MB' }));
        return;
      }
        const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setPhotoPreview(base64Data);
        // Store the actual file for upload
        setFormData((prev) => ({ ...prev, photoFile: file }));
      };
      reader.readAsDataURL(file);
      
      // Clear any previous errors
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }
  };

  const handleSignatureUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Check file size (limit to 1MB)
      if (file.size > 1 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, signature: 'Signature file size must be less than 1MB' }));
        return;
      }
        const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setSignaturePreview(base64Data);
        // Store the actual file for upload
        setFormData((prev) => ({ ...prev, signatureFile: file }));
      };
      reader.readAsDataURL(file);
      
      // Clear any previous errors
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.signature;
        return newErrors;
      });
    }
  };
  const removePhoto = () => {
    setPhotoPreview(null);
    setFormData((prev) => ({ 
      ...prev, 
      photo: '',
      photoFile: undefined 
    }));
    // Clear any errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.photo;
      return newErrors;
    });
  };

  const removeSignature = () => {
    setSignaturePreview(null);
    setFormData((prev) => ({ 
      ...prev, 
      signature: '',
      signatureFile: undefined 
    }));
    // Clear any errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.signature;
      return newErrors;
    });
  };

  const {
    getRootProps: getPhotoRootProps,
    getInputProps: getPhotoInputProps,
    isDragActive: isPhotoDragActive,
  } = useDropzone({
    onDrop: handlePhotoUpload,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false,
  });

  const {
    getRootProps: getSignatureRootProps,
    getInputProps: getSignatureInputProps,
    isDragActive: isSignatureDragActive,
  } = useDropzone({
    onDrop: handleSignatureUpload,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false,
  });

  const getTotalPercentage = (): number => {
    // Ensure we treat undefined, null, or empty string values as 0
    const beneficiary1 = Number(formData.beneficiaryPercentage) || 0;
    const beneficiary2 = Number(formData.beneficiary2Percentage) || 0;
    const beneficiary3 = Number(formData.beneficiary3Percentage) || 0;
    
    return beneficiary1 + beneficiary2 + beneficiary3;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Bio data validation
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.surname?.trim()) {
      newErrors.surname = 'Surname is required';
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    
    if (!formData.maritalStatus) {
      newErrors.maritalStatus = 'Marital status is required';
    }
    
    // Contact details are optional - only validate format when a value is provided
    if (formData.email?.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.contactNumber?.trim() && !/^[+]?[0-9][\d]{0,15}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = 'Phone number must start with a digit (0-9) and contain only digits (max 16 total)';
    }

    // Beneficiaries are optional - only require a beneficiary's own fields once any of
    // them has been filled in, and only cap the combined percentage at 100%.
    const totalPercentage = getTotalPercentage();
    if (totalPercentage > 100) {
      newErrors.beneficiaryPercentage = `Total beneficiary percentage cannot exceed 100% (currently ${totalPercentage}%)`;
    }

    const primaryPercentage = Number(formData.beneficiaryPercentage) || 0;
    if (formData.beneficiaryName?.trim() || formData.beneficiaryContact?.trim() || primaryPercentage > 0) {
      if (!formData.beneficiaryName?.trim()) {
        newErrors.beneficiaryName = 'Primary beneficiary name is required';
      }
      if (!formData.beneficiaryContact?.trim()) {
        newErrors.beneficiaryContact = 'Primary beneficiary contact is required';
      }
      if (primaryPercentage <= 0) {
        newErrors.beneficiaryPercentage = 'Primary beneficiary percentage must be greater than 0';
      }
    }

    // Validate second beneficiary if any field is filled
    const beneficiary2Percentage = Number(formData.beneficiary2Percentage) || 0;
    if (formData.beneficiary2Name?.trim() || formData.beneficiary2Contact?.trim() || beneficiary2Percentage > 0) {
      if (!formData.beneficiary2Name?.trim()) {
        newErrors.beneficiary2Name = 'Second beneficiary name is required';
      }
      if (!formData.beneficiary2Contact?.trim()) {
        newErrors.beneficiary2Contact = 'Second beneficiary contact is required';
      }
      if (beneficiary2Percentage <= 0) {
        newErrors.beneficiary2Percentage = 'Second beneficiary percentage must be greater than 0';
      }
    }
    
    // Validate third beneficiary if any field is filled
    const beneficiary3Percentage = Number(formData.beneficiary3Percentage) || 0;
    if (formData.beneficiary3Name?.trim() || formData.beneficiary3Contact?.trim() || beneficiary3Percentage > 0) {
      if (!formData.beneficiary3Name?.trim()) {
        newErrors.beneficiary3Name = 'Third beneficiary name is required';
      }
      if (!formData.beneficiary3Contact?.trim()) {
        newErrors.beneficiary3Contact = 'Third beneficiary contact is required';
      }
      if (beneficiary3Percentage <= 0) {
        newErrors.beneficiary3Percentage = 'Third beneficiary percentage must be greater than 0';
      }
    }
    
    // Identification is optional - no validation required

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFiles = async (): Promise<{ photo?: string; signature?: string }> => {
    const formDataForUpload = new FormData();
    
    if (formData.photoFile) {
      formDataForUpload.append('photo', formData.photoFile);
    }
    
    if (formData.signatureFile) {
      formDataForUpload.append('signature', formData.signatureFile);
    }
    
    // Only upload if there are files
    if (formData.photoFile || formData.signatureFile) {
      try {
        const response = await api.post('/upload', formDataForUpload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        return response.data.files || {};
      } catch (error) {
        console.error('File upload error:', error);
        throw new Error('Failed to upload files');
      }
    }
    
    return {};
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      setIsLoading(true);
      
      try {
        // Upload files first
        let uploadedFiles: { photo?: string; signature?: string } = {};
        try {
          uploadedFiles = await uploadFiles();
        } catch (error) {
          console.error('File upload error:', error);
          setErrors({ submit: 'Failed to upload files. Please try again.' });
          setIsLoading(false);
          return;
        }

        // Combine first name and surname for the name field
        const fullNameParts = [formData.firstName, formData.otherName, formData.surname]
          .map((part) => (part || '').trim())
          .filter((part) => part.length > 0);

        const customerData: Omit<Customer, 'id' | 'accounts'> = {
          name: fullNameParts.join(' '),
          firstName: formData.firstName || '',
          surname: formData.surname || '',
          otherName: formData.otherName || '',
          email: formData.email?.trim() || undefined,
          phone: formData.contactNumber?.trim() || undefined,
          address: formData.residentialAddress || '',
          kycStatus: (formData.kycStatus || 'pending') as 'verified' | 'pending' | 'rejected',
          dateJoined: new Date().toISOString(), // This will be ignored on update
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          occupation: formData.occupation || '',
          workplace: formData.workplace || '',
          maritalStatus: formData.maritalStatus,
          residentialAddress: formData.residentialAddress || '',
          postalAddress: formData.postalAddress || '',
          contactNumber: formData.contactNumber || '',
          city: formData.city || '',
          identificationType: formData.identificationType,
          identificationNumber: formData.identificationNumber || '',
          beneficiaryName: formData.beneficiaryName || '',
          beneficiaryContact: formData.beneficiaryContact || '',
          beneficiaryRelation: formData.beneficiaryRelation || '',
          beneficiaryPercentage: Number(formData.beneficiaryPercentage) || 0,
          beneficiary2Name: formData.beneficiary2Name || '',
          beneficiary2Contact: formData.beneficiary2Contact || '',
          beneficiary2Relation: formData.beneficiary2Relation || '',
          beneficiary2Percentage: Number(formData.beneficiary2Percentage) || 0,
          beneficiary3Name: formData.beneficiary3Name || '',
          beneficiary3Contact: formData.beneficiary3Contact || '',
          beneficiary3Relation: formData.beneficiary3Relation || '',
          beneficiary3Percentage: Number(formData.beneficiary3Percentage) || 0,
          photo: uploadedFiles.photo || formData.photo || '',
          signature: uploadedFiles.signature || formData.signature || '',
        };
        
        const response = await api.put(`/customers/${id}`, customerData);
        const updatedCustomer = response.data;
        console.log('Customer updated:', updatedCustomer);
        
        // Display success message (you can enhance this by adding a toast library like react-toastify)
        alert(`Customer ${updatedCustomer.name} has been successfully updated!`);
        
        // Navigate back to customers page
        navigate('/customers');
      } catch (error) {
        console.error('Error updating customer:', error);
        setErrors({ submit: 'Failed to update customer. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const maritalStatusOptions = [
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'single', label: 'Single' },
    { value: 'widow', label: 'Widow' },
    { value: 'widower', label: 'Widower' },
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const identificationOptions = [
    { value: 'national_id', label: 'National ID' },
    { value: 'voters_id', label: 'Voters ID' },
    { value: 'national_health', label: 'National Health ID' },
  ];

  // Loading state while fetching customer data
  if (isLoadingCustomer) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Edit Customer</h1>
            <p className="text-gray-600 dark:text-gray-300">Update customer information</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
          <span className="text-red-700 dark:text-red-200">{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bio Data Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User size={20} />
                <span>Bio Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleChange}
                  error={errors.firstName}
                  required
                  fullWidth
                />
                <Input
                  label="Surname"
                  name="surname"
                  value={formData.surname || ''}
                  onChange={handleChange}
                  error={errors.surname}
                  required
                  fullWidth
                />
              </div>
              
              <Input
                label="Other Name"
                name="otherName"
                value={formData.otherName || ''}
                onChange={handleChange}
                fullWidth
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Gender"
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleSelectChange('gender')}
                  options={genderOptions}
                  error={errors.gender}
                  required
                  fullWidth
                />
                <Input
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={handleChange}
                  error={errors.dateOfBirth}
                  required
                  fullWidth
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Occupation"
                  name="occupation"
                  value={formData.occupation || ''}
                  onChange={handleChange}
                  fullWidth
                />
                <Input
                  label="Workplace"
                  name="workplace"
                  value={formData.workplace || ''}
                  onChange={handleChange}
                  fullWidth
                />
              </div>
              
              <Select
                label="Marital Status"
                name="maritalStatus"
                value={formData.maritalStatus || ''}
                onChange={handleSelectChange('maritalStatus')}
                options={maritalStatusOptions}
                error={errors.maritalStatus}
                required
                fullWidth
              />
            </CardContent>
          </Card>

          {/* Contact Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone size={20} />
                <span>Contact Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Residential Address"
                name="residentialAddress"
                value={formData.residentialAddress || ''}
                onChange={handleChange}
                error={errors.residentialAddress}
                fullWidth
              />
              
              <Input
                label="Postal Address"
                name="postalAddress"
                value={formData.postalAddress || ''}
                onChange={handleChange}
                fullWidth
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  error={errors.email}
                  fullWidth
                />
                <Input
                  label="Contact Number"
                  name="contactNumber"
                  value={formData.contactNumber || ''}
                  onChange={handleChange}
                  error={errors.contactNumber}
                  fullWidth
                />
              </div>

              <Input
                label="Town/City"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                error={errors.city}
                fullWidth
              />
            </CardContent>
          </Card>

          {/* Beneficiary (Next of Kin) Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users size={20} />
                  <span>Beneficiaries (Next of Kin)</span>
                </div>
                <div className="text-sm font-normal">
                  <span className={`px-2 py-1 rounded ${
                    getTotalPercentage() === 100
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : getTotalPercentage() > 100
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    Total: {getTotalPercentage()}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Beneficiary */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-dark-border pb-2">Primary Beneficiary</h4>
                <Input
                  label="Beneficiary Name"
                  name="beneficiaryName"
                  value={formData.beneficiaryName || ''}
                  onChange={handleChange}
                  error={errors.beneficiaryName}
                  fullWidth
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Beneficiary Contact"
                    name="beneficiaryContact"
                    value={formData.beneficiaryContact || ''}
                    onChange={handleChange}
                    error={errors.beneficiaryContact}
                    fullWidth
                  />
                  <Input
                    label="Relation"
                    name="beneficiaryRelation"
                    value={formData.beneficiaryRelation || ''}
                    onChange={handleChange}
                    placeholder="e.g. Spouse, Child, Parent, etc."
                    fullWidth
                  />
                  <Input
                    label="Percentage (%)"
                    name="beneficiaryPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.beneficiaryPercentage || ''}
                    onChange={handleChange}
                    error={errors.beneficiaryPercentage}
                    fullWidth
                  />
                </div>
              </div>

              {/* Secondary Beneficiary */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-dark-border pb-2">Secondary Beneficiary (Optional)</h4>
                <Input
                  label="Beneficiary Name"
                  name="beneficiary2Name"
                  value={formData.beneficiary2Name || ''}
                  onChange={handleChange}
                  fullWidth
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Beneficiary Contact"
                    name="beneficiary2Contact"
                    value={formData.beneficiary2Contact || ''}
                    onChange={handleChange}
                    fullWidth
                  />
                  <Input
                    label="Relation"
                    name="beneficiary2Relation"
                    value={formData.beneficiary2Relation || ''}
                    onChange={handleChange}
                    placeholder="e.g. Spouse, Child, Parent, etc."
                    fullWidth
                  />
                  <Input
                    label="Percentage (%)"
                    name="beneficiary2Percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.beneficiary2Percentage || ''}
                    onChange={handleChange}
                    fullWidth
                  />
                </div>
              </div>

              {/* Tertiary Beneficiary */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-dark-border pb-2">Tertiary Beneficiary (Optional)</h4>
                <Input
                  label="Beneficiary Name"
                  name="beneficiary3Name"
                  value={formData.beneficiary3Name || ''}
                  onChange={handleChange}
                  fullWidth
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Beneficiary Contact"
                    name="beneficiary3Contact"
                    value={formData.beneficiary3Contact || ''}
                    onChange={handleChange}
                    fullWidth
                  />
                  <Input
                    label="Relation"
                    name="beneficiary3Relation"
                    value={formData.beneficiary3Relation || ''}
                    onChange={handleChange}
                    placeholder="e.g. Spouse, Child, Parent, etc."
                    fullWidth
                  />
                  <Input
                    label="Percentage (%)"
                    name="beneficiary3Percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.beneficiary3Percentage || ''}
                    onChange={handleChange}
                    fullWidth
                  />
                </div>
              </div>

              {/* Percentage validation message - only nag once the customer has actually started entering beneficiaries */}
              {getTotalPercentage() > 0 && getTotalPercentage() !== 100 && (
                <div className={`text-sm p-3 rounded ${
                  getTotalPercentage() > 100
                    ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700'
                }`}>
                  {getTotalPercentage() > 100
                    ? 'Total percentage cannot exceed 100%'
                    : `Please ensure total percentage equals 100% (currently ${getTotalPercentage()}%)`
                  }
                </div>
              )}
            </CardContent>
          </Card>

          {/* Identification Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText size={20} />
                <span>Identification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Identification Type"
                name="identificationType"
                value={formData.identificationType || ''}
                onChange={handleSelectChange('identificationType')}
                options={identificationOptions}
                error={errors.identificationType}
                fullWidth
              />

              <Input
                label="Identification Number"
                name="identificationNumber"
                value={formData.identificationNumber || ''}
                onChange={handleChange}
                error={errors.identificationNumber}
                fullWidth
              />

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Photo Upload
                </label>
                <div
                  {...getPhotoRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isPhotoDragActive
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900'
                      : errors.photo
                        ? 'border-red-400 bg-red-50 dark:bg-red-900'
                        : 'border-gray-400 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-500'
                  }`}
                >
                  <input {...getPhotoInputProps()} />
                  {photoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={photoPreview}
                        alt="Photo preview"
                        className="mx-auto h-32 w-32 object-cover rounded-lg"
                      />
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{formData.photo}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto();
                          }}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                      <div className="text-sm">
                        <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 2MB</div>
                    </div>
                  )}
                </div>
                {errors.photo && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.photo}</div>
                )}
              </div>

              {/* Signature Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Signature Upload
                </label>
                <div
                  {...getSignatureRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isSignatureDragActive
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900'
                      : errors.signature
                        ? 'border-red-400 bg-red-50 dark:bg-red-900'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <input {...getSignatureInputProps()} />
                  {signaturePreview ? (
                    <div className="space-y-4">
                      <img
                        src={signaturePreview}
                        alt="Signature preview"
                        className="mx-auto h-20 w-32 object-contain rounded-lg bg-white border dark:border-gray-600"
                      />
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{formData.signature}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSignature();
                          }}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                      <div className="text-sm">
                        <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 1MB</div>
                    </div>
                  )}
                </div>
                {errors.signature && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.signature}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-dark-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/customers')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
          >
            Update Customer
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditCustomer;
