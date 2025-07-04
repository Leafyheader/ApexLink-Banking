import React, { useState, useEffect, useRef } from 'react';
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
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers from API with pagination
  useEffect(() => {
    const fetchCustomers = async () => {
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
    };

    fetchCustomers();
  }, [currentPage, itemsPerPage, searchQuery]);

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
      'name,email,phone,address,dateOfBirth,occupation,firstName,surname,gender,maritalStatus,workplace,residentialAddress,postalAddress,contactNumber,city,identificationType,identificationNumber,beneficiaryName,beneficiaryContact,beneficiaryPercentage,beneficiary2Name,beneficiary2Contact,beneficiary2Percentage',
      'John Doe,john.doe@example.com,+1234567890,"123 Main St, City, State",1990-01-15,Software Engineer,John,Doe,Male,Single,"Tech Corp Inc","123 Main St, City, State","PO Box 123, City, State",+1234567890,"New York","National ID",ID123456789,"Jane Doe",+1987654321,50,"Bob Doe",+1122334455,50',
      'Jane Smith,jane.smith@example.com,+0987654321,"456 Oak Ave, City, State",1985-05-20,Teacher,Jane,Smith,Female,Married,"Springfield Elementary","456 Oak Ave, City, State","PO Box 456, City, State",+0987654321,"Springfield","Passport",PS987654321,"John Smith",+1555666777,100,,,'
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
      'First Name', 'Surname', 'Gender', 'Marital Status', 'Workplace',
      'Residential Address', 'Postal Address', 'Contact Number', 'City',
      'Identification Type', 'Identification Number',
      'Beneficiary Name', 'Beneficiary Contact', 'Beneficiary Percentage',
      'Beneficiary 2 Name', 'Beneficiary 2 Contact', 'Beneficiary 2 Percentage',
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
        `"${customer.beneficiaryPercentage || ''}"`,
        `"${customer.beneficiary2Name || ''}"`,
        `"${customer.beneficiary2Contact || ''}"`,
        `"${customer.beneficiary2Percentage || ''}"`,
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

  // Parse CSV file
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
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
      
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header.toLowerCase().replace(/\s+/g, '')] = (values[index] || '').replace(/^"|"$/g, '');
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

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        
        try {
          // Validate required fields
          if (!customer.name || !customer.email) {
            errors.push(`Row ${i + 2}: Name and email are required`);
            continue;
          }

          // Prepare customer data
          const customerData = {
            name: customer.name,
            email: customer.email,
            phone: customer.phone || '',
            address: customer.address || '',
            dateOfBirth: customer.dateofbirth || customer.dateOfBirth || '',
            occupation: customer.occupation || '',
            firstName: customer.firstname || customer.firstName || '',
            surname: customer.surname || '',
            gender: customer.gender || '',
            maritalStatus: customer.maritalstatus || customer.maritalStatus || '',
            workplace: customer.workplace || '',
            residentialAddress: customer.residentialaddress || customer.residentialAddress || '',
            postalAddress: customer.postaladdress || customer.postalAddress || '',
            contactNumber: customer.contactnumber || customer.contactNumber || '',
            city: customer.city || '',
            identificationType: customer.identificationtype || customer.identificationType || '',
            identificationNumber: customer.identificationnumber || customer.identificationNumber || '',
            beneficiaryName: customer.beneficiaryname || customer.beneficiaryName || '',
            beneficiaryContact: customer.beneficiarycontact || customer.beneficiaryContact || '',
            beneficiaryPercentage: customer.beneficiarypercentage || customer.beneficiaryPercentage || '',
            beneficiary2Name: customer.beneficiary2name || customer.beneficiary2Name || '',
            beneficiary2Contact: customer.beneficiary2contact || customer.beneficiary2Contact || '',
            beneficiary2Percentage: customer.beneficiary2percentage || customer.beneficiary2Percentage || ''
          };

          await api.post('/customers', customerData);
          successCount++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Unknown error';
          errors.push(`Row ${i + 2} (${customer.name}): ${errorMessage}`);
        }
      }

      setImportResults({ success: successCount, errors });
      
      if (successCount > 0) {
        // Refresh customer list
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to import CSV:', error);
      setImportResults({ 
        success: 0, 
        errors: ['Failed to read CSV file. Please check the file format.'] 
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
                    <p className="text-sm text-red-700 font-medium">Errors:</p>
                    <ul className="mt-1 text-sm text-red-600 max-h-32 overflow-y-auto">
                      {importResults.errors.map((error, index) => (
                        <li key={index} className="mt-1">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p className="font-medium">CSV Format Requirements:</p>
            <ul className="mt-1 space-y-1 text-sm">
              <li>• <strong>Required columns:</strong> name, email</li>
              <li>• <strong>Basic info:</strong> phone, address, dateOfBirth, occupation</li>
              <li>• <strong>Personal details:</strong> firstName, surname, gender, maritalStatus</li>
              <li>• <strong>Contact info:</strong> workplace, residentialAddress, postalAddress, contactNumber, city</li>
              <li>• <strong>Identification:</strong> identificationType, identificationNumber</li>
              <li>• <strong>Beneficiaries:</strong> beneficiaryName, beneficiaryContact, beneficiaryPercentage, beneficiary2Name, beneficiary2Contact, beneficiary2Percentage</li>
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