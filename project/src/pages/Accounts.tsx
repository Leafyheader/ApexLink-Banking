import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Edit, Trash2, Eye, AlertCircle, Upload, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Account, Customer } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import api from '../lib/api';
import Select from '../components/ui/Select';

type FailedImportRow = {
  rowNumber: number;
  customerId: string;
  accountName: string;
  accountNumber: string;
  savingsBalance: string;
  sharesBalance: string;
  error: string;
};

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<number>();

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

const Accounts: React.FC = () => {
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAccountNumber, setNextAccountNumber] = useState('ACC0000001');
  const [isAccountNumberEditable, setIsAccountNumberEditable] = useState(false);
  const [manualAccountNumber, setManualAccountNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showInitialBalances, setShowInitialBalances] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBulkActivating, setIsBulkActivating] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [failedImportRows, setFailedImportRows] = useState<FailedImportRow[]>([]);
  
  // Customer search states
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  
  // Ref for customer dropdown
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce customer search
  const debouncedCustomerSearch = useDebounce(customerSearchQuery, 300);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const response = await api.get(`/accounts?${params.toString()}`);
      setAccounts(response.data.accounts);
      setTotalItems(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    fetchAccounts();
    fetchCustomers();
  }, [fetchAccounts]);

  const fetchCustomers = async () => {
    try {
      // Load all customers for the general customers array (fallback)
      const response = await api.get('/customers?limit=1000');
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  // Search customers with server-side pagination and debouncing
  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFilteredCustomers([]);
      return;
    }

    try {
      setIsLoadingCustomers(true);
      const params = new URLSearchParams({
        search: query.trim(),
        limit: '50' // Load more results for search
      });
      
      const response = await api.get(`/customers?${params.toString()}`);
      setFilteredCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error searching customers:', err);
      setFilteredCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // Effect to trigger customer search when debounced query changes
  useEffect(() => {
    searchCustomers(debouncedCustomerSearch);
  }, [debouncedCustomerSearch, searchCustomers]);

  // Effect to handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };

    if (customerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [customerDropdownOpen]);

  // Sourced from the backend, which checks the true highest account number across the whole
  // table - the accounts loaded here are just the current (paginated/filtered) page, so
  // computing this from local state would frequently suggest an already-taken number.
  const fetchNextAccountNumber = useCallback(async () => {
    try {
      const response = await api.get('/accounts/next-number');
      setNextAccountNumber(response.data.nextAccountNumber);
    } catch (err) {
      console.error('Error fetching next account number:', err);
    }
  }, []);

  useEffect(() => {
    fetchNextAccountNumber();
  }, [fetchNextAccountNumber]);

  useEffect(() => {
    if (!isAccountNumberEditable) {
      setManualAccountNumber(nextAccountNumber);
    }
  }, [nextAccountNumber, isAccountNumberEditable]);

  const normalizeHeader = (header: string): string =>
    header.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Trims/collapses whitespace and lowercases, so "Theresa   Abla" and "theresa abla" match.
  const normalizeName = (name: string): string =>
    name.trim().toLowerCase().replace(/\s+/g, ' ');

  const parseAmount = (value: string): number => {
    const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseDelimitedLine = (line: string, delimiter: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : '';

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const parseImportFile = async (file: File): Promise<{ headers: string[]; rows: string[][] }> => {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xlxs');

    if (isExcel) {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];

      if (!firstSheet) {
        throw new Error('Workbook has no sheets');
      }

      const sheet = workbook.Sheets[firstSheet];
      const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
        header: 1,
        defval: '',
      });

      const normalizedRows = matrix
        .map((row) => row.map((cell) => String(cell ?? '').trim()))
        .filter((row) => row.some((cell) => cell.length > 0));

      if (normalizedRows.length < 2) {
        return { headers: [], rows: [] };
      }

      const headers = normalizedRows[0].map(normalizeHeader);
      const rows = normalizedRows.slice(1);
      return { headers, rows };
    }

    const fileText = await file.text();
    const lines = fileText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return { headers: [], rows: [] };
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = parseDelimitedLine(lines[0], delimiter).map(normalizeHeader);
    const rows = lines.slice(1).map((line) => parseDelimitedLine(line, delimiter));

    return { headers, rows };
  };

  const handleImportBalances = async (file: File) => {
    try {
      setIsImporting(true);
      setError(null);
      setImportSummary(null);
      setFailedImportRows([]);

      const { headers, rows } = await parseImportFile(file);

      if (headers.length === 0 || rows.length === 0) {
        setError('Import file must have headers and at least one data row.');
        return;
      }

      const customerIdIndex = headers.findIndex((h) => ['customerid', 'customernumber', 'custid', 'custno', 'customercode'].includes(h));
      const accountNameIndex = headers.findIndex((h) => ['accountname', 'name', 'customername'].includes(h));
      const accountNumberIndex = headers.findIndex((h) => ['accountnumber', 'acctnumber', 'accountno', 'accno', 'acno'].includes(h));
      const savingsBalanceIndex = headers.findIndex((h) => ['savingsbalance', 'balance', 'savings'].includes(h));
      const sharesBalanceIndex = headers.findIndex((h) => ['sharesbalance', 'sharebalance', 'shares'].includes(h));

      // Customer ID is optional: when it's missing (column absent, or blank on a given row),
      // we fall back to matching Account Name against existing customers by exact name.
      if (accountNameIndex === -1 || accountNumberIndex === -1 || savingsBalanceIndex === -1 || sharesBalanceIndex === -1) {
        setError('Required columns missing. Include account name, account number, savings balance, and shares balance headers. Customer ID is optional — if omitted, accounts are matched to existing customers by name.');
        return;
      }

      // Build a name -> customer(s) lookup for rows without a Customer ID.
      // The customers endpoint excludes hidden customers by default, so duplicate
      // customer records that were already marked hidden (e.g. via "Hide Without
      // Accounts") are naturally excluded from matching here.
      const nameMatchIndex = new Map<string, { id: string; name: string }[]>();
      if (customerIdIndex === -1 || rows.some((row) => !(row[customerIdIndex] || '').trim())) {
        const customerLookupResponse = await api.get('/customers?limit=100000');
        const allCustomers: { id: string; name: string }[] = customerLookupResponse.data.customers || [];
        for (const c of allCustomers) {
          const key = normalizeName(c.name);
          if (!nameMatchIndex.has(key)) nameMatchIndex.set(key, []);
          nameMatchIndex.get(key)!.push(c);
        }
      }

      // Build an accountNumber -> account lookup so rows referencing an account that already
      // exists update its balance instead of failing on a duplicate-account-number error.
      const accountLookupResponse = await api.get('/accounts?limit=100000');
      const allAccounts: { id: string; accountNumber: string; type: string }[] = accountLookupResponse.data.accounts || [];
      const accountIndex = new Map<string, { id: string; accountNumber: string; type: string }>();
      for (const a of allAccounts) {
        accountIndex.set(a.accountNumber.trim().toUpperCase(), a);
      }

      let created = 0;
      let updated = 0;
      let invalid = 0;
      let skippedEmptyName = 0;
      let skippedNotFoundMarker = 0;
      let skippedLoanAccount = 0;
      let failedCreate = 0;
      let matchedByName = 0;
      const rowErrors: string[] = [];
      const failedRows: FailedImportRow[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;

        const columnAValue = String(row[0] || '').trim().toUpperCase();
        if (columnAValue.includes('NOT FOUND')) {
          skippedNotFoundMarker++;
          continue;
        }

        const customerIdRaw = customerIdIndex === -1 ? '' : (row[customerIdIndex] || '').trim();
        const accountNameRaw = (row[accountNameIndex] || '').trim();
        if (!accountNameRaw) {
          skippedEmptyName++;
          continue;
        }

        let resolvedCustomerId = customerIdRaw;

        if (!resolvedCustomerId) {
          const matches = nameMatchIndex.get(normalizeName(accountNameRaw)) || [];
          if (matches.length === 1) {
            resolvedCustomerId = matches[0].id;
            matchedByName++;
          } else {
            invalid++;
            const msg = matches.length === 0
              ? `no customer found named "${accountNameRaw}"`
              : `${matches.length} customers named "${accountNameRaw}" found — add a Customer ID to disambiguate`;
            rowErrors.push(`Row ${rowNumber}: ${msg}`);
            failedRows.push({
              rowNumber,
              customerId: '',
              accountName: accountNameRaw,
              accountNumber: String(row[accountNumberIndex] || '').trim(),
              savingsBalance: String(row[savingsBalanceIndex] || ''),
              sharesBalance: String(row[sharesBalanceIndex] || ''),
              error: msg,
            });
            continue;
          }
        }

        let accountNumberRaw = String(row[accountNumberIndex] || '').trim();
        // Some export formats (e.g. later re-exports of this scheme's data) put the bare
        // sequence number in the Account Number column instead of the real ACC0000001-style
        // identifier - normalize it to that format so it lines up with existing accounts
        // instead of trying to create new ones numbered "1", "2", etc.
        if (/^\d+$/.test(accountNumberRaw)) {
          accountNumberRaw = `ACC${accountNumberRaw.padStart(7, '0')}`;
        }
        if (!accountNumberRaw) {
          invalid++;
          const msg = 'missing account number';
          rowErrors.push(`Row ${rowNumber}: ${msg}`);
          failedRows.push({
            rowNumber,
            customerId: resolvedCustomerId,
            accountName: accountNameRaw,
            accountNumber: accountNumberRaw,
            savingsBalance: String(row[savingsBalanceIndex] || ''),
            sharesBalance: String(row[sharesBalanceIndex] || ''),
            error: msg,
          });
          continue;
        }

        const savingsBalance = parseAmount(row[savingsBalanceIndex] || '0');
        const sharesBalance = parseAmount(row[sharesBalanceIndex] || '0');

        const existingAccount = accountIndex.get(accountNumberRaw.trim().toUpperCase());

        // Loan account balances are driven by the loan repayment engine, not a raw balance
        // figure - never let a bulk import overwrite them.
        if (existingAccount && existingAccount.type === 'LOAN') {
          skippedLoanAccount++;
          const msg = 'account is a loan account - balance updates via import are not allowed';
          rowErrors.push(`Row ${rowNumber}: ${msg}`);
          failedRows.push({
            rowNumber,
            customerId: resolvedCustomerId,
            accountName: accountNameRaw,
            accountNumber: accountNumberRaw,
            savingsBalance: String(row[savingsBalanceIndex] || ''),
            sharesBalance: String(row[sharesBalanceIndex] || ''),
            error: msg,
          });
          continue;
        }

        try {
          if (existingAccount) {
            await api.put(`/accounts/${existingAccount.id}`, {
              balance: savingsBalance,
              shareBalance: sharesBalance,
              sharesAvailableBalance: sharesBalance,
            });
            updated++;
          } else {
            await api.post('/accounts', {
              customerId: resolvedCustomerId,
              type: 'SAVINGS',
              accountNumber: accountNumberRaw,
              balance: savingsBalance,
              shareBalance: sharesBalance,
              sharesAvailableBalance: sharesBalance,
              minimumBalance: 0,
              // Balances from the owners' books, not cash received today
              openingBalanceSource: 'import',
            });
            created++;
          }
        } catch (createErr: unknown) {
          failedCreate++;
          const errorObj = createErr as { response?: { data?: unknown }; message?: string };
          const backendError = errorObj?.response?.data as { message?: string; errors?: Array<{ msg?: string }> } | undefined;
          console.error(`Import ${existingAccount ? 'update' : 'create'} failed at row ${rowNumber}`, {
            rowNumber,
            customerId: resolvedCustomerId,
            accountName: accountNameRaw,
            accountNumber: accountNumberRaw,
            savingsBalance,
            sharesBalance,
            backendError,
          });

          const message = backendError?.message || backendError?.errors?.[0]?.msg || errorObj?.message || 'unknown error';
          rowErrors.push(`Row ${rowNumber}: ${message}`);
          failedRows.push({
            rowNumber,
            customerId: resolvedCustomerId,
            accountName: accountNameRaw,
            accountNumber: accountNumberRaw,
            savingsBalance: String(row[savingsBalanceIndex] || ''),
            sharesBalance: String(row[sharesBalanceIndex] || ''),
            error: message,
          });
        }
      }

      await fetchAccounts();

      const summary = `Import completed. Created: ${created} (${matchedByName} matched by name), Updated: ${updated}, Skipped Loan Accounts: ${skippedLoanAccount}, Skipped NOT FOUND Marker: ${skippedNotFoundMarker}, Skipped Empty Name: ${skippedEmptyName}, Invalid Rows: ${invalid}, Failed: ${failedCreate}.`;
      setImportSummary(summary);
      setFailedImportRows(failedRows);

      if (rowErrors.length > 0) {
        setError(`${summary} ${rowErrors.slice(0, 5).join('; ')}${rowErrors.length > 5 ? '; ...' : ''}`);
      }
    } catch (err) {
      console.error('Error importing balances:', err);
      setError('Failed to import balances. Please verify the file format and try again.');
    } finally {
      setIsImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadFailedRows = async () => {
    if (failedImportRows.length === 0) {
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const rows = failedImportRows.map((row) => ({
        'Row Number': row.rowNumber,
        'Customer ID': row.customerId,
        'Account Name': row.accountName,
        'Account Number': row.accountNumber,
        'Savings Balance': row.savingsBalance,
        'Shares Balance': row.sharesBalance,
        Error: row.error,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'FailedRows');

      const workbookArray = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const blob = new Blob([workbookArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'account-import-failed-rows.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading failed import rows:', err);
      setError('Failed to download failed rows file. Please try again.');
    }
  };

  const onSelectImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await handleImportBalances(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const templateRows = [
        ['Customer ID', 'Account Name', 'Account Number', 'Savings Balance', 'Shares Balance'],
        ['CUST000000001', 'John Doe', 'AC0000001', '1000.00', '250.00'],
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(templateRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Balances');

      const workbookArray = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const blob = new Blob([workbookArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'account-balance-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Failed to download template. Please try again.');
    }
  };

  const handleCreateAccount = async (accountData: {
    customerId: string;
    type: string;
    accountNumber?: string;
    balance: number;
    shareBalance?: number;
    sharesAvailableBalance?: number;
    currency?: string;
    minimumBalance?: number;
  }) => {
    try {
      const response = await api.post('/accounts', accountData);
      setAccounts([...accounts, response.data]);
      setIsAddModalOpen(false);
      // Reset form state
      setSelectedCustomerId('');
      setCustomerSearchQuery('');
      setCustomerDropdownOpen(false);
      // Refresh accounts to get updated data
      fetchAccounts();
      fetchNextAccountNumber();
    } catch (err) {
      console.error('Error creating account:', err);
      setError('Failed to create account. Please try again.');
    }
  };

  const handleUpdateAccount = async (accountData: Partial<Account>) => {
    if (!currentAccount) return;

    try {
      const response = await api.put(`/accounts/${currentAccount.id}`, accountData);
      setAccounts(accounts.map(acc => acc.id === currentAccount.id ? response.data : acc));
      setIsEditModalOpen(false);
      setCurrentAccount(null);
    } catch (err) {
      console.error('Error updating account:', err);
      setError('Failed to update account. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentAccount) return;

    try {
      await api.delete(`/accounts/${currentAccount.id}`);
      setAccounts(accounts.filter(acc => acc.id !== currentAccount.id));
      setIsDeleteModalOpen(false);
      setCurrentAccount(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account. Please try again.');
    }
  };

  const handleBulkActivateAccounts = async () => {
    const confirmActivate = window.confirm('Activate all non-active accounts?');
    if (!confirmActivate) {
      return;
    }

    try {
      setIsBulkActivating(true);
      setError(null);
      const response = await api.post('/accounts/bulk-activate');
      const activatedCount = Number(response.data?.activatedCount || 0);
      setImportSummary(`Bulk activation completed. Activated accounts: ${activatedCount}.`);
      await fetchAccounts();
    } catch (err) {
      console.error('Error bulk activating accounts:', err);
      setError('Failed to bulk activate accounts. Please try again.');
    } finally {
      setIsBulkActivating(false);
    }
  };

  const handleCreateCustomer = async (name: string) => {
    try {
      const response = await api.post('/customers', { name });
      const newCustomer = response.data;
      setCustomers([...customers, newCustomer]);
      setSelectedCustomerId(newCustomer.id);
      setCustomerSearchQuery(newCustomer.name);
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer. Please try again.');
    }
  };

  const openEditModal = (account: Account) => {
    setCurrentAccount(account);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (account: Account) => {
    setCurrentAccount(account);
    setIsDeleteModalOpen(true);
  };

  // Update the return values to match the BadgeVariant type
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "primary" | "success" | "warning" | "danger" | undefined => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'frozen':
        return 'danger';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Handle search with reset to first page
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  if (!hasLoadedOnce && isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Accounts</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-dark-text">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-dark-text">per page</span>
          </div>
          <Button onClick={() => {
            setIsAddModalOpen(true);
            setIsAccountNumberEditable(false);
            setManualAccountNumber(nextAccountNumber);
            fetchNextAccountNumber();
          }} className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            New Account
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void handleBulkActivateAccounts();
            }}
            className="flex items-center gap-2"
            disabled={isBulkActivating}
          >
            {isBulkActivating ? 'Activating...' : 'Bulk Activate All'}
          </Button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xlxs"
            className="hidden"
            onChange={(event) => {
              void onSelectImportFile(event);
            }}
          />
          <Button
            variant="outline"
            onClick={() => importFileInputRef.current?.click()}
            className="flex items-center gap-2"
            disabled={isImporting}
          >
            <Upload className="w-5 h-5" />
            {isImporting ? 'Importing...' : 'Import Balances'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void handleDownloadTemplate();
            }}
            className="flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAccounts}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            Retry
          </Button>
        </div>
      )}

      {importSummary && !error && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 text-green-700 dark:text-green-300">
          <div className="flex items-center justify-between gap-3">
            <span>{importSummary}</span>
            {failedImportRows.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleDownloadFailedRows();
                }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Failed Rows
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-dark-surface shadow rounded-lg dark:border dark:border-dark-border">
        <div className="p-6 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-dark-text">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-dark-text">per page</span>
            </div>
          </div>
        </div>

        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Available Balance</TableHead>
                <TableHead>Shares Balance</TableHead>
                <TableHead>Shares Available Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium text-gray-900 dark:text-dark-text">{account.accountNumber}</TableCell>
                <TableCell className="dark:text-dark-text">
                  {account.customerName || 'Unknown'}
                </TableCell>
                <TableCell className="dark:text-dark-text">{account.type}</TableCell>
                <TableCell className="dark:text-dark-text">{formatCurrency(account.balance, 'GHS', 'en-GH', 2)}</TableCell>
                <TableCell className="dark:text-dark-text">{formatCurrency(account.availableBalance || account.balance, 'GHS', 'en-GH', 2)}</TableCell>
                <TableCell className="dark:text-dark-text">{formatCurrency(account.shareBalance || 0, 'GHS', 'en-GH', 2)}</TableCell>
                <TableCell className="dark:text-dark-text">{formatCurrency(account.sharesAvailableBalance || 0, 'GHS', 'en-GH', 2)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(account.status)}>
                    {account.status}
                  </Badge>
                </TableCell>
                <TableCell className="dark:text-dark-text">{formatDate(account.dateOpened)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/accounts/${account.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(account)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(account)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )            )}
          </TableBody>
        </Table>
        </div>

        {accounts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No accounts found</p>
          </div>
        )}

        {/* Summary Information */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-dark-border flex justify-between items-center text-sm text-gray-600 dark:text-dark-text">
          <span>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} accounts
            {searchQuery && ` (search: "${searchQuery}")`}
          </span>
          <span>
            Page {currentPage} of {totalPages || 1}
          </span>
        </div>

        {/* Pagination - Always show if there are accounts */}
        {totalItems > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-dark-border">
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 dark:text-dark-text">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <div className="ml-4 text-sm text-gray-600 dark:text-dark-text">
                Total: {totalItems} accounts
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          // Reset form state
          setSelectedCustomerId('');
          setCustomerSearchQuery('');
          setCustomerDropdownOpen(false);
          setIsAccountNumberEditable(false);
          setManualAccountNumber(nextAccountNumber);
        }}
        title="Create New Account"
        preventClickOutsideClose={true}
        preventEscapeClose={true}
      >
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="customerSelect" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Select Customer *
              </label>
              <div className="relative">
                <Input
                  id="customerSelect"
                  placeholder="Search for a customer..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  fullWidth
                />
                {customerDropdownOpen && (
                  <div
                    ref={customerDropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {isLoadingCustomers ? (
                      <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                        <span className="ml-2">Searching...</span>
                      </div>
                    ) : (
                      <>
                        {/* Show filtered customers from search */}
                        {customerSearchQuery.trim() && filteredCustomers.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b dark:border-dark-border">
                              Search Results
                            </div>
                            {filteredCustomers.map((customer) => (
                              <div
                                key={customer.id}
                                className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-dark-border last:border-b-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCustomerId(customer.id);
                                  setCustomerSearchQuery(customer.name);
                                  setCustomerDropdownOpen(false);
                                }}
                              >
                                <div className="font-medium text-gray-900 dark:text-dark-text">{customer.name}</div>
                                {customer.email && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</div>
                                )}
                                {customer.phone && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</div>
                                )}
                              </div>
                            ))}
                          </>
                        )}

                        {/* Show recent/all customers when no search query */}
                        {!customerSearchQuery.trim() && customers.slice(0, 20).map((customer) => (
                          <div
                            key={customer.id}
                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-dark-border last:border-b-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedCustomerId(customer.id);
                              setCustomerSearchQuery(customer.name);
                              setCustomerDropdownOpen(false);
                            }}
                          >
                            <div className="font-medium text-gray-900 dark:text-dark-text">{customer.name}</div>
                            {customer.email && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</div>
                            )}
                            {customer.phone && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</div>
                            )}
                          </div>
                        ))}

                        {/* No results message */}
                        {customerSearchQuery.trim() && filteredCustomers.length === 0 && !isLoadingCustomers && (
                          <div className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                            <p>No customers found matching "{customerSearchQuery}"</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCreateCustomer(customerSearchQuery);
                                setCustomerDropdownOpen(false);
                              }}
                            >
                              Create "{customerSearchQuery}" as new customer
                            </Button>
                          </div>
                        )}

                        {/* Show hint when no search query */}
                        {!customerSearchQuery.trim() && customers.length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                            <p>No customers available</p>
                          </div>
                        )}

                        {/* Show "type to search" hint */}
                        {!customerSearchQuery.trim() && customers.length > 20 && (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-t dark:border-dark-border">
                            Showing first 20 customers. Type to search for more...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {selectedCustomerId && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ Customer selected: {customers.find(c => c.id === selectedCustomerId)?.name || filteredCustomers.find(c => c.id === selectedCustomerId)?.name}
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Account Number
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  id="toggleEditableAccountNumber"
                  type="checkbox"
                  checked={isAccountNumberEditable}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsAccountNumberEditable(checked);
                    if (!checked) {
                      setManualAccountNumber(nextAccountNumber);
                    }
                  }}
                  className="h-4 w-4"
                />
                <label htmlFor="toggleEditableAccountNumber" className="text-sm text-gray-700 dark:text-dark-text">
                  Edit account number manually
                </label>
              </div>
              <Input
                id="accountNumber"
                placeholder="Account number"
                value={manualAccountNumber}
                onChange={(e) => setManualAccountNumber(e.target.value.toUpperCase())}
                disabled={!isAccountNumberEditable}
                fullWidth
              />
            </div>

            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Account Type *
              </label>
              <Select
                id="accountType"
                defaultValue="savings"
                options={[
                  { value: 'savings', label: 'Savings Account' },
                  { value: 'current', label: 'Current Account' },
                  { value: 'fixed', label: 'Fixed Deposit' },
                  { value: 'loan', label: 'Loan Account' },
                ]}
                fullWidth
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-dark-text">Initial Balances:</div>
              <div className="flex items-center gap-2">
                <label htmlFor="toggleInitialBalances" className="text-sm text-gray-700 dark:text-dark-text">Show initial balance fields</label>
                <input
                  id="toggleInitialBalances"
                  type="checkbox"
                  checked={showInitialBalances}
                  onChange={(e) => setShowInitialBalances(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {showInitialBalances ? (
                <>
                  <div>
                    <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                      Initial Balance
                    </label>
                    <Input
                      id="initialBalance"
                      type="number"
                      placeholder="0.00"
                      defaultValue="0"
                      fullWidth
                    />
                  </div>

                  <div>
                    <label htmlFor="shareBalance" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                      Shares Initial Balance
                    </label>
                    <Input
                      id="shareBalance"
                      type="number"
                      placeholder="0.00"
                      defaultValue="0"
                      fullWidth
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Initial Balance field is currently hidden</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Shares Initial Balance field is currently hidden</div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => {
              setIsAddModalOpen(false);
              // Reset form state
              setSelectedCustomerId('');
              setIsAccountNumberEditable(false);
              setManualAccountNumber(nextAccountNumber);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Get form values
              const customerId = selectedCustomerId;
              const typeValue = (document.getElementById('accountType') as HTMLSelectElement)?.value;
              const accountNumber = manualAccountNumber.trim();
              // Read initial balances only if fields are shown, otherwise default to 0
              let balance = 0;
              let shareBalance = 0;
              if (showInitialBalances) {
                balance = parseFloat((document.getElementById('initialBalance') as HTMLInputElement)?.value || '0');
                shareBalance = parseFloat((document.getElementById('shareBalance') as HTMLInputElement)?.value || '0');
              }
              
              // Validate required fields
              if (!customerId) {
                alert('Please select a customer');
                return;
              }

              if (!accountNumber) {
                alert('Account number is required.');
                return;
              }
              
              // Map frontend values to backend format
              const typeMapping: { [key: string]: string } = {
                'savings': 'SAVINGS',
                'current': 'CURRENT', 
                'fixed': 'SAVINGS', // Map fixed deposit to savings for now
                'loan': 'LOAN'
              };
              
              const newAccount = {
                customerId,
                type: typeMapping[typeValue] || 'SAVINGS',
                accountNumber,
                balance,
                shareBalance,
                sharesAvailableBalance: shareBalance,
                minimumBalance: 0
              };
              
              handleCreateAccount(newAccount);
              
              // Reset form state  
              setSelectedCustomerId('');
              setIsAccountNumberEditable(false);
              setManualAccountNumber(nextAccountNumber);
            }}>
              Create Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentAccount(null);
          setSelectedCustomerId('');
          setCustomerSearchQuery('');
          setCustomerDropdownOpen(false);
        }}
        title="Edit Account"
      >
        <div className="p-6">
          {currentAccount && (
            <div className="space-y-4">
              <div>
                <label htmlFor="editCustomerName" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Customer Name
                </label>
                <Input
                  id="editCustomerName"
                  placeholder="Enter customer name"
                  defaultValue={currentAccount.customerName || ''}
                />
              </div>
              
              <div>
                <label htmlFor="editAccountNumber" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Account Number
                </label>
                <Input
                  id="editAccountNumber"
                  placeholder="Account number"
                  defaultValue={currentAccount.accountNumber}
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="editAccountType" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Account Type
                </label>
                <Select
                  id="editAccountType"
                  defaultValue={currentAccount.type?.toLowerCase()}
                  options={[
                    { value: 'savings', label: 'Savings Account' },
                    { value: 'current', label: 'Current Account' },
                    { value: 'fixed', label: 'Fixed Deposit' },
                    { value: 'loan', label: 'Loan Account' },
                  ]}
                  fullWidth
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editBalance" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Balance
                  </label>
                  <Input
                    id="editBalance"
                    type="number"
                    placeholder="0.00"
                    defaultValue={currentAccount.balance.toString()}
                  />
                </div>
                
                <div>
                  <label htmlFor="editShareBalance" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Shares Balance
                  </label>
                  <Input
                    id="editShareBalance"
                    type="number"
                    placeholder="0.00"
                    defaultValue={(currentAccount.shareBalance || 0).toString()}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Status
                </label>
                <Select
                  id="editStatus"
                  defaultValue={currentAccount.status?.toLowerCase()}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'dormant', label: 'Dormant' },
                    { value: 'frozen', label: 'Frozen' },
                    { value: 'closed', label: 'Closed' },
                  ]}
                  fullWidth
                />
              </div>
              
              <div>
                <label htmlFor="editCurrency" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Currency
                </label>
                <Select
                  id="editCurrency"
                  defaultValue={currentAccount.currency}
                  options={[
                    { value: 'USD', label: 'US Dollar (USD)' },
                    { value: 'EUR', label: 'Euro (EUR)' },
                    { value: 'GBP', label: 'British Pound (GBP)' },
                    { value: 'JPY', label: 'Japanese Yen (JPY)' },
                  ]}
                  fullWidth
                />
              </div>
              
              <div>
                <label htmlFor="editBranch" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Branch
                </label>
                <Select
                  id="editBranch"
                  defaultValue={currentAccount.branch || 'main'}
                  options={[
                    { value: 'main', label: 'Main Branch' },
                    { value: 'north', label: 'North Branch' },
                    { value: 'east', label: 'East Branch' },
                    { value: 'west', label: 'West Branch' },
                    { value: 'south', label: 'South Branch' },
                  ]}
                  fullWidth
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setCurrentAccount(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => {
              if (!currentAccount) return;
              
              // Get form values
              const customerName = (document.getElementById('editCustomerName') as HTMLInputElement)?.value || currentAccount.customerName;
              const typeValue = (document.getElementById('editAccountType') as HTMLSelectElement)?.value;
              const balance = parseFloat((document.getElementById('editBalance') as HTMLInputElement)?.value || currentAccount.balance.toString());
              const shareBalance = parseFloat((document.getElementById('editShareBalance') as HTMLInputElement)?.value || (currentAccount.shareBalance || 0).toString());
              const statusValue = (document.getElementById('editStatus') as HTMLSelectElement)?.value;
              const currency = (document.getElementById('editCurrency') as HTMLSelectElement)?.value || currentAccount.currency;
              const branch = (document.getElementById('editBranch') as HTMLSelectElement)?.value || currentAccount.branch;
              
              // Map frontend values to backend format
              const typeMapping: { [key: string]: Account['type'] } = {
                'savings': 'SAVINGS',
                'current': 'CURRENT', 
                'fixed': 'FIXED',
                'loan': 'LOAN'
              };
              
              const statusMapping: { [key: string]: Account['status'] } = {
                'active': 'ACTIVE',
                'dormant': 'DORMANT',
                'frozen': 'FROZEN',
                'closed': 'CLOSED'
              };
              
              const updatedFields: Partial<Account> = {
                customerName,
                type: typeMapping[typeValue] || currentAccount.type,
                balance,
                shareBalance,
                status: statusMapping[statusValue] || currentAccount.status,
                currency,
                branch,
                // Update available balance to match new balance
                availableBalance: balance,
                sharesAvailableBalance: shareBalance,
                ledgerBalance: balance
              };
              
              handleUpdateAccount(updatedFields);
            }}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCurrentAccount(null);
        }}
        title="Delete Account"
      >
        <div className="p-6">
          <p className="text-gray-600 dark:text-dark-text mb-4">
            Are you sure you want to delete this account? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCurrentAccount(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Accounts;