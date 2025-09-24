import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserPlus,
  UserCog,
  Trash2,
  Eye,
  X,
  CreditCard,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Customer } from '../types';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  
  // State for customer data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  
  // CSV Import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Date parsing helper function
  const parseDate = (dateString: string): string => {
    if (!dateString || !dateString.trim()) return '';
    
    const trimmed = dateString.trim();
    
    // If it's already in ISO format (YYYY-MM-DD), return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Try to parse MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, or DD-MM-YYYY format
    const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      const [, part1, part2, year] = match;
      const month = parseInt(part1);
      const day = parseInt(part2);
      
      // Validate month and day ranges
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        // Assume MM/DD/YYYY format (US format)
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      } else if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
        // Assume DD/MM/YYYY format (international format)
        return `${year}-${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`;
      }
    }
    
    // Try to parse YYYY/MM/DD or YYYY-MM-DD format
    const yearFirstMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (yearFirstMatch) {
      const [, year, month, day] = yearFirstMatch;
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      }
    }
    
    // Try to create a Date object and see if it's valid
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      console.warn('Could not parse date:', trimmed);
    }
    
    // Return original if we can't parse it
    return trimmed;
  };

  // Phone/Contact number parsing helper function
  const parsePhoneNumber = (phoneString: string): string | undefined => {
    if (!phoneString || !phoneString.trim()) return undefined;
    
    // Handle "null" string values (case-insensitive)
    const trimmed = phoneString.trim();
    if (trimmed.toLowerCase() === 'null') return undefined;
    
    // Handle multiple phone numbers separated by spaces or forward slashes
    // Split by both spaces and forward slashes, then take the first valid number
    const phoneNumbers = trimmed.split(/[\s/]+/).filter(num => num.trim() && num.trim() !== '');
    
    if (phoneNumbers.length === 0) return undefined;
    
    // Return the first non-empty phone number
    const firstPhone = phoneNumbers[0].trim();
    return firstPhone || undefined;
  };

  // Percentage parsing helper function
  const parsePercentage = (percentageString: string): number | undefined => {
    if (!percentageString || !percentageString.trim()) return undefined;
    const trimmed = percentageString.trim();
    
    // Remove % symbol if present and validate it's a number
    const cleaned = trimmed.replace('%', '');
    const num = parseFloat(cleaned);
    
    if (isNaN(num)) {
      return undefined;
    }
    
    // Validate percentage range (0-100)
    if (num < 0 || num > 100) {
      console.warn(`Invalid percentage value: ${num}. Must be between 0 and 100.`);
      return undefined;
    }
    
    // Return as integer for database compatibility
    return Math.round(num);
  };

  // General string field parsing helper function
  const parseStringField = (value: string): string | undefined => {
    if (!value || !value.trim()) return undefined;
    return value.trim();
  };
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers from API with pagination
  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const response = await api.get(`/customers?${params.toString()}`);
      setCustomers(response.data.customers);
      setTotalItems(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle search with debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle view customer
  const handleViewCustomer = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    navigate(`/customers/${customer.id}/edit`);
  };

  // Handle delete customer
  const handleDeleteCustomer = (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  // Handle view customer transactions
  const handleViewTransactions = (customer: Customer) => {
    navigate(`/customers/${customer.id}/transactions`);
  };

  // Confirm delete customer
  const confirmDeleteCustomer = async () => {
    if (!currentCustomer) return;
    
    setIsLoading(true);
    
    try {
      await api.delete(`/customers/${currentCustomer.id}`);
      const updatedCustomers = customers.filter(
        customer => customer.id !== currentCustomer.id
      );
      
      setCustomers(updatedCustomers);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Failed to delete customer:', err);
      setError('Failed to delete customer');
    } finally {
      setIsLoading(false);
    }
  };

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
  };

  // CSV Template download
  const downloadTemplate = () => {
    const template = [
      'name,email,phone,address,dateOfBirth,occupation,firstName,surname,otherName,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,identificationType,identificationNumber,beneficiaryName,beneficiaryContact,beneficiaryRelation,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Relation,beneficiary2Percentage,beneficiary3Name,beneficiary3Contact,beneficiary3Relation,beneficiary3Percentage',
      'John Doe,john.doe@example.com,+1234567890,"123 Main St, City, State",1990-01-15,Software Engineer,John,Doe,Johnny,Male,Single,"Tech Corp Inc","123 Main St, City, State","PO Box 123, City, State",+1234567890,"New York","National ID",ID123456789,"Jane Doe",+1987654321,Spouse,50,"Bob Doe",+1122334455,Brother,30,"Alice Doe",+1333444555,Sister,20',
      'Jane Smith,jane.smith@example.com,+0987654321,"456 Oak Ave, City, State",1985-05-20,Teacher,Jane,Smith,,Female,Married,"Springfield Elementary","456 Oak Ave, City, State","PO Box 456, City, State",+0987654321,"Springfield","Passport",PS987654321,"John Smith",+1555666777,Spouse,100,,,,,,,,'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customer_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Export customers to CSV
  const exportCustomers = () => {
    if (customers.length === 0) {
      alert('No customers to export');
      return;
    }

    const headers = [
      'Name', 'Email', 'Phone', 'Address', 'Date of Birth', 'Occupation', 
      'First Name', 'Surname', 'Other Name', 'Gender', 'Marital Status', 'Workplace',
      'Residential Address', 'Postal Address', 'Contact Number', 'City',
      'Identification Type', 'Identification Number',
      'Beneficiary Name', 'Beneficiary Contact', 'Beneficiary Relation', 'Beneficiary Percentage',
      'Beneficiary 2 Name', 'Beneficiary 2 Contact', 'Beneficiary 2 Relation', 'Beneficiary 2 Percentage',
      'Beneficiary 3 Name', 'Beneficiary 3 Contact', 'Beneficiary 3 Relation', 'Beneficiary 3 Percentage',
      'KYC Status', 'Date Joined'
    ];
    const csvData = [
      headers.join(','),
      ...customers.map(customer => [
        `"${customer.name}"`,
        `"${customer.email}"`,
        `"${customer.phone}"`,
        `"${customer.address || ''}"`,
        `"${customer.dateOfBirth || ''}"`,
        `"${customer.occupation || ''}"`,
        `"${customer.firstName || ''}"`,
        `"${customer.surname || ''}"`,
        `"${customer.otherName || ''}"`,
        `"${customer.gender || ''}"`,
        `"${customer.maritalStatus || ''}"`,
        `"${customer.workplace || ''}"`,
        `"${customer.residentialAddress || ''}"`,
        `"${customer.postalAddress || ''}"`,
        `"${customer.contactNumber || ''}"`,
        `"${customer.city || ''}"`,
        `"${customer.identificationType || ''}"`,
        `"${customer.identificationNumber || ''}"`,
        `"${customer.beneficiaryName || ''}"`,
        `"${customer.beneficiaryContact || ''}"`,
        `"${customer.beneficiaryRelation || ''}"`,
        `"${customer.beneficiaryPercentage || ''}"`,
        `"${customer.beneficiary2Name || ''}"`,
        `"${customer.beneficiary2Contact || ''}"`,
        `"${customer.beneficiary2Relation || ''}"`,
        `"${customer.beneficiary2Percentage || ''}"`,
        `"${customer.beneficiary3Name || ''}"`,
        `"${customer.beneficiary3Contact || ''}"`,
        `"${customer.beneficiary3Relation || ''}"`,
        `"${customer.beneficiary3Percentage || ''}"`,
        `"${customer.kycStatus}"`,
        `"${customer.dateJoined}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setImportResults(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  // Parse CSV file with selective column picking
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Define the columns we need (case-insensitive mapping)
    const neededColumns = {
      // Required fields
      'name': ['name', 'full name', 'fullname', 'customer name', 'customername'],
      'email': ['email', 'email address', 'emailaddress', 'e-mail'],
      
      // Basic info
      'phone': ['phone', 'phone number', 'phonenumber', 'mobile', 'contact', 'telephone'],
      'address': ['address', 'street address', 'streetaddress'],
      'dateOfBirth': ['dateofbirth', 'date of birth', 'dob', 'birth date', 'birthdate'],
      'occupation': ['occupation', 'job', 'profession', 'work'],
      
      // Personal details
      'firstName': ['firstname', 'first name', 'given name', 'givenname'],
      'surname': ['surname', 'last name', 'lastname', 'family name', 'familyname'],
      'otherName': ['othername', 'other name', 'middle name', 'middlename', 'nick name', 'nickname'],
      'gender': ['gender', 'sex'],
      'maritalStatus': ['maritalstatus', 'marital status', 'marriage status', 'marriagestatus'],
      
      // Contact info
      'workplace': ['workplace', 'work place', 'employer', 'company', 'organization'],
      'residentialAddress': ['residentialaddress', 'residential address', 'home address', 'homeaddress'],
      'postalAddress': ['postaladdress', 'postal address', 'mailing address', 'mailingaddress'],
      'contactNumber': ['contactnumber', 'contact number', 'alternate phone', 'alternatephone'],
      'city': ['city', 'town', 'municipality'],
      
      // Identification
      'identificationType': ['identificationtype', 'identification type', 'id type', 'idtype'],
      'identificationNumber': ['identificationnumber', 'identification number', 'id number', 'idnumber'],
      
      // Beneficiaries
      'beneficiaryName': ['beneficiaryname', 'beneficiary name', 'beneficiary 1 name', 'beneficiary1name'],
      'beneficiaryContact': ['beneficiarycontact', 'beneficiary contact', 'beneficiary 1 contact', 'beneficiary1contact'],
      'beneficiaryRelation': ['beneficiaryrelation', 'beneficiary relation', 'beneficiary 1 relation', 'beneficiary1relation'],
      'beneficiaryPercentage': ['beneficiarypercentage', 'beneficiary percentage', 'beneficiary 1 percentage', 'beneficiary1percentage'],
      'beneficiary2Name': ['beneficiary2name', 'beneficiary 2 name', 'beneficiary2 name', 'second beneficiary name'],
      'beneficiary2Contact': ['beneficiary2contact', 'beneficiary 2 contact', 'beneficiary2 contact', 'second beneficiary contact'],
      'beneficiary2Relation': ['beneficiary2relation', 'beneficiary 2 relation', 'beneficiary2 relation', 'second beneficiary relation'],
      'beneficiary2Percentage': ['beneficiary2percentage', 'beneficiary 2 percentage', 'beneficiary2 percentage', 'second beneficiary percentage'],
      'beneficiary3Name': ['beneficiary3name', 'beneficiary 3 name', 'beneficiary3 name', 'third beneficiary name'],
      'beneficiary3Contact': ['beneficiary3contact', 'beneficiary 3 contact', 'beneficiary3 contact', 'third beneficiary contact'],
      'beneficiary3Relation': ['beneficiary3relation', 'beneficiary 3 relation', 'beneficiary3 relation', 'third beneficiary relation'],
      'beneficiary3Percentage': ['beneficiary3percentage', 'beneficiary 3 percentage', 'beneficiary3 percentage', 'third beneficiary percentage']
    };
    
    // Create a mapping of header indices to our needed fields
    const headerMapping: Record<number, string> = {};
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      
      // Find which field this header maps to
      for (const [fieldName, aliases] of Object.entries(neededColumns)) {
        const normalizedAliases = aliases.map(alias => alias.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''));
        if (normalizedAliases.includes(normalizedHeader)) {
          headerMapping[index] = fieldName;
          break;
        }
      }
    });
    
    return lines.slice(1).map(line => {
      // Handle CSV parsing with quoted fields containing commas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add the last value
      
      // Only extract the columns we need
      const obj: Record<string, string> = {};
      Object.entries(headerMapping).forEach(([index, fieldName]) => {
        const value = (values[parseInt(index)] || '').replace(/^"|"$/g, '').trim();
        obj[fieldName] = value;
      });
      
      return obj;
    });
  };

  // Import customers from CSV
  const importCustomers = async () => {
    if (!csvFile) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const text = await csvFile.text();
      const customers = parseCSV(text);
      
      let successCount = 0;
      const errors: string[] = [];
      const emailsSeen = new Set<string>();

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        
        try {
          // Validate required fields
          if (!customer.name) {
            errors.push(`Row ${i + 2}: Name is required`);
            continue;
          }

          // Skip rows where Beneficiary Name is null, empty, or contains "NULL"
          if (!customer.beneficiaryName || 
              !customer.beneficiaryName.trim() || 
              customer.beneficiaryName.trim().toLowerCase() === 'null') {
            errors.push(`Row ${i + 2} (${customer.name}): Skipped - Beneficiary Name is required (cannot be empty or NULL)`);
            continue;
          }

          // Check for duplicate emails within the CSV
          if (customer.email && customer.email.trim()) {
            const emailLower = customer.email.trim().toLowerCase();
            if (emailsSeen.has(emailLower)) {
              errors.push(`Row ${i + 2} (${customer.name}): Duplicate email "${customer.email}" in CSV`);
              continue;
            }
            emailsSeen.add(emailLower);
          }

          // Validate percentage fields if provided
          const beneficiaryPercentage = parsePercentage(customer.beneficiaryPercentage);
          const beneficiary2Percentage = parsePercentage(customer.beneficiary2Percentage);
          const beneficiary3Percentage = parsePercentage(customer.beneficiary3Percentage);
          
          if (customer.beneficiaryPercentage && customer.beneficiaryPercentage.trim() && beneficiaryPercentage === undefined) {
            errors.push(`Row ${i + 2} (${customer.name}): Invalid beneficiary percentage "${customer.beneficiaryPercentage}". Must be a number between 0-100.`);
            continue;
          }
          
          if (customer.beneficiary2Percentage && customer.beneficiary2Percentage.trim() && beneficiary2Percentage === undefined) {
            errors.push(`Row ${i + 2} (${customer.name}): Invalid beneficiary 2 percentage "${customer.beneficiary2Percentage}". Must be a number between 0-100.`);
            continue;
          }
          
          if (customer.beneficiary3Percentage && customer.beneficiary3Percentage.trim() && beneficiary3Percentage === undefined) {
            errors.push(`Row ${i + 2} (${customer.name}): Invalid beneficiary 3 percentage "${customer.beneficiary3Percentage}". Must be a number between 0-100.`);
            continue;
          }

          // Prepare customer data using the selectively parsed fields
          const customerData = {
            name: customer.name || '',
            email: customer.email && customer.email.trim() ? customer.email.trim() : undefined,
            phone: parsePhoneNumber(customer.phone),
            address: parseStringField(customer.address),
            dateOfBirth: parseDate(customer.dateOfBirth) || undefined,
            occupation: parseStringField(customer.occupation),
            firstName: parseStringField(customer.firstName),
            surname: parseStringField(customer.surname),
            otherName: parseStringField(customer.otherName),
            gender: parseStringField(customer.gender),
            maritalStatus: parseStringField(customer.maritalStatus),
            workplace: parseStringField(customer.workplace),
            residentialAddress: parseStringField(customer.residentialAddress),
            postalAddress: parseStringField(customer.postalAddress),
            contactNumber: parsePhoneNumber(customer.contactNumber),
            city: parseStringField(customer.city),
            identificationType: parseStringField(customer.identificationType),
            identificationNumber: parseStringField(customer.identificationNumber),
            beneficiaryName: parseStringField(customer.beneficiaryName),
            beneficiaryContact: parsePhoneNumber(customer.beneficiaryContact),
            beneficiaryRelation: parseStringField(customer.beneficiaryRelation),
            beneficiaryPercentage: beneficiaryPercentage,
            beneficiary2Name: parseStringField(customer.beneficiary2Name),
            beneficiary2Contact: parsePhoneNumber(customer.beneficiary2Contact),
            beneficiary2Relation: parseStringField(customer.beneficiary2Relation),
            beneficiary2Percentage: beneficiary2Percentage,
            beneficiary3Name: parseStringField(customer.beneficiary3Name),
            beneficiary3Contact: parsePhoneNumber(customer.beneficiary3Contact),
            beneficiary3Relation: parseStringField(customer.beneficiary3Relation),
            beneficiary3Percentage: beneficiary3Percentage,
            kycStatus: 'VERIFIED' // Set imported customers as verified
          };

          await api.post('/customers', customerData);
          successCount++;
        } catch (error: unknown) {
          console.error(`Error importing customer ${customer.name}:`, error);
          
          let errorMessage = 'Unknown error';
          let rawErrorDetails = '';
          
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { 
              response?: { 
                data?: Record<string, unknown>; 
                status?: number; 
                statusText?: string; 
              }; 
              message?: string;
              request?: Record<string, unknown>;
            };
            
            // Capture detailed error information
            if (axiosError.response) {
              // Server responded with error status
              const { data, status, statusText } = axiosError.response;
              
              if (data && typeof data === 'object') {
                if ('error' in data && typeof data.error === 'string') {
                  errorMessage = data.error;
                } else if ('message' in data && typeof data.message === 'string') {
                  errorMessage = data.message;
                }
              }
              
              if (errorMessage === 'Unknown error') {
                if (status === 400) {
                  errorMessage = 'Validation error - check data format';
                } else if (status === 500) {
                  errorMessage = 'Internal server error';
                } else {
                  errorMessage = `HTTP ${status}: ${statusText}`;
                }
              }
              
              // Include raw error details
              rawErrorDetails = `[Status: ${status}] `;
              if (data) {
                try {
                  rawErrorDetails += `Raw: ${JSON.stringify(data)}`;
                } catch {
                  rawErrorDetails += `Raw: ${String(data)}`;
                }
              }
            } else if (axiosError.request) {
              // Request was made but no response received
              errorMessage = 'Network error - no response from server';
              rawErrorDetails = 'Request timeout or network issue';
            } else {
              // Error in request setup
              errorMessage = axiosError.message || 'Request setup error';
              rawErrorDetails = `Setup error: ${axiosError.message}`;
            }
          } else if (error instanceof Error) {
            errorMessage = error.message;
            rawErrorDetails = `Stack: ${error.stack || 'No stack trace'}`;
          } else {
            errorMessage = String(error);
            rawErrorDetails = `Type: ${typeof error}, Value: ${String(error)}`;
          }
          
          // Include both user-friendly message and raw details
          const fullErrorMessage = rawErrorDetails 
            ? `${errorMessage} | ${rawErrorDetails}`
            : errorMessage;
          
          errors.push(`Row ${i + 2} (${customer.name}): ${fullErrorMessage}`);
        }
      }

      setImportResults({ success: successCount, errors });
      
      if (successCount > 0) {
        // Refresh customer list
        await fetchCustomers();
      }
    } catch (error) {
      console.error('Failed to import CSV:', error);
      
      let globalErrorMessage = 'Failed to read CSV file. Please check the file format.';
      let rawErrorDetails = '';
      
      if (error instanceof Error) {
        globalErrorMessage = `CSV Processing Error: ${error.message}`;
        rawErrorDetails = `Stack: ${error.stack || 'No stack trace'}`;
      } else {
        rawErrorDetails = `Type: ${typeof error}, Value: ${String(error)}`;
      }
      
      const fullErrorMessage = rawErrorDetails 
        ? `${globalErrorMessage} | ${rawErrorDetails}`
        : globalErrorMessage;
      
      setImportResults({ 
        success: 0, 
        errors: [fullErrorMessage] 
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Clear import state
  const clearImport = () => {
    setCsvFile(null);
    setImportResults(null);
    setIsImportModalOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Loading state
  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading customers...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={handleSearch}
              leftIcon={<Search size={18} />}
              rightIcon={
                searchQuery ? (
                  <button onClick={() => setSearchQuery('')}>
                    <X size={18} />
                  </button>
                ) : undefined
              }
              fullWidth
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<FileText size={18} />}
            onClick={downloadTemplate}
          >
            Template
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download size={18} />}
            onClick={exportCustomers}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            leftIcon={<Upload size={18} />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            leftIcon={<UserPlus size={18} />}
            onClick={() => navigate('/customers/new')}
          >
            Add Customer
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Date Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium text-gray-900">
                  {customer.name}
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(customer.kycStatus)}>
                    {customer.kycStatus.charAt(0).toUpperCase() + customer.kycStatus.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(customer.dateJoined)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye size={16} />}
                      onClick={() => handleViewCustomer(customer)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<CreditCard size={16} />}
                      onClick={() => handleViewTransactions(customer)}
                    >
                      Transactions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<UserCog size={16} />}
                      onClick={() => handleEditCustomer(customer)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      onClick={() => handleDeleteCustomer(customer)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  {searchQuery
                    ? 'No customers found matching your search criteria'
                    : 'No customers found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Summary Information */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} customers
          {searchQuery && ` (search: "${searchQuery}")`}
        </span>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
      </div>

      {/* Pagination - Always show if there are customers */}
      {totalItems > 0 && (
        <div className="flex justify-center items-center gap-4 p-4 bg-white rounded-lg shadow">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded">
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Next
          </button>
          <div className="ml-4 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
            Total: {totalItems} customers
          </div>
        </div>
      )}

      {/* Delete Customer Modal */}
      {currentCustomer && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Customer"
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteCustomer}
                isLoading={isLoading}
              >
                Delete Customer
              </Button>
            </div>
          }
        >
          <p className="text-gray-700">
            Are you sure you want to delete {currentCustomer.name}? This action cannot be undone.
          </p>
          {currentCustomer.accounts && currentCustomer.accounts.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> This customer has {currentCustomer.accounts.length} active {currentCustomer.accounts.length === 1 ? 'account' : 'accounts'}.
                Deleting this customer will require handling these accounts first.
              </p>
            </div>
          )}
        </Modal>
      )}

      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={clearImport}
        title="Import Customers from CSV"
        footer={
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={clearImport}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={importCustomers}
              disabled={!csvFile || isImporting}
              isLoading={isImporting}
            >
              Import Customers
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-gray-700 mb-4">
              Upload a CSV file to import multiple customers at once. Make sure your CSV file follows the correct format.
            </p>
            
            <div className="mb-4">
              <Button
                variant="outline"
                leftIcon={<FileText size={16} />}
                onClick={downloadTemplate}
                size="sm"
              >
                Download CSV Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <Upload size={48} className="mb-2" />
                <span className="text-lg font-medium">Choose CSV file</span>
                <span className="text-sm">or drag and drop here</span>
              </label>
            </div>

            {csvFile && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <FileText size={16} className="text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">{csvFile.name}</span>
                  <button
                    onClick={() => setCsvFile(null)}
                    className="ml-auto text-green-600 hover:text-green-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {importResults && (
            <div className="mt-4">
              <div className={`p-4 rounded-md ${importResults.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h4 className={`font-medium ${importResults.success > 0 ? 'text-green-800' : 'text-red-800'}`}>
                  Import Results
                </h4>
                <p className={`text-sm ${importResults.success > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Successfully imported: {importResults.success} customers
                </p>
                
                {importResults.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-red-700 font-medium">
                      Errors ({importResults.errors.length}):
                    </p>
                    <div className="mt-2 text-sm text-red-600 max-h-48 overflow-y-auto bg-red-50 border border-red-200 rounded p-3">
                      {importResults.errors.map((error, index) => {
                        // Split error message and raw details
                        const [mainError, rawDetails] = error.includes(' | ') 
                          ? error.split(' | ', 2) 
                          : [error, ''];
                        
                        return (
                          <div key={index} className="mb-3 border-b border-red-200 pb-2 last:border-b-0 last:pb-0">
                            <div className="font-medium text-red-800">
                              • {mainError}
                            </div>
                            {rawDetails && (
                              <div className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded font-mono break-all">
                                <strong>Raw Error:</strong> {rawDetails}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p className="font-medium">CSV Format Requirements:</p>
            <ul className="mt-1 space-y-1 text-sm">
              <li>• <strong>Required columns:</strong> name (or "Full Name") and beneficiaryName (primary beneficiary)</li>
              <li>• <strong>Beneficiary Name validation:</strong> Must not be empty, null, or contain "NULL" (case-insensitive)</li>
              <li>• <strong>Optional fields:</strong> All other fields are optional, empty values treated as null</li>
              <li>• <strong>Flexible headers:</strong> Column names are case-insensitive and support variations</li>
              <li>• <strong>Phone/Contact numbers:</strong> Accepted as text (strings), empty spaces treated as null</li>
              <li>• <strong>Percentage fields:</strong> Must be numbers 0-100, can include % symbol (decimals rounded)</li>
              <li>• <strong>Date formats:</strong> Date of Birth supports multiple formats:</li>
              <div className="ml-4 text-xs mt-1 space-y-1">
                <li>- YYYY-MM-DD (e.g., 1990-01-15)</li>
                <li>- MM/DD/YYYY (e.g., 01/15/1990)</li>
                <li>- DD/MM/YYYY (e.g., 15/01/1990)</li>
                <li>- MM-DD-YYYY (e.g., 01-15-1990)</li>
                <li>- DD-MM-YYYY (e.g., 15-01-1990)</li>
              </div>
              <li>• <strong>Example accepted names:</strong></li>
              <div className="ml-4 text-xs mt-1 space-y-1">
                <li>- Name: "name", "full name", "customer name"</li>
                <li>- Phone: "phone", "phone number", "mobile", "contact"</li>
                <li>- Date of Birth: "dateOfBirth", "date of birth", "DOB"</li>
                <li>- Address: "address", "street address"</li>
                <li>- Percentage: "50", "50%", "75", "100%" (0-100 range)</li>
              </div>
              <li>• <strong>Extra columns:</strong> Any unrecognized columns will be ignored</li>
              <li>• First row should contain column headers</li>
              <li>• Use quotes for values containing commas</li>
              <li>• Download template for exact format</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;