import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Search, Plus, Edit3, User } from 'lucide-react';
import { Customer } from '../../types';
import Select from './Select';
import { formatCurrency } from '../../lib/utils';

export interface CustomerAccountSelectProps {
  customers: Customer[];
  value?: {
    customerId: string;
    accountId?: string;
  };
  onChange?: (selection: { customerId: string; accountId?: string }) => void;
  onCreateCustomer?: (name: string) => void;
  onUpdateCustomer?: (customerId: string, newName: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  allowEdit?: boolean;
  allowCreate?: boolean;
  excludeCustomerIds?: string[];
  showAccountSelection?: boolean;
  accountRequired?: boolean;
}

const CustomerAccountSelect = forwardRef<HTMLDivElement, CustomerAccountSelectProps>(
  (
    {
      customers,
      value,
      onChange,
      onCreateCustomer,
      onUpdateCustomer,
      label,
      error,
      placeholder = "Search or select a customer...",
      fullWidth = false,
      disabled = false,
      allowEdit = true,
      allowCreate = true,
      excludeCustomerIds = [],
      showAccountSelection = true,
      accountRequired = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const createInputRef = useRef<HTMLInputElement>(null);

    // Get selected customer and account
    const selectedCustomer = customers.find(c => c.id === value?.customerId);
    const selectedAccount = selectedCustomer?.accounts?.find(a => a.id === value?.accountId);

    // Extracts the numeric value of an account number ignoring the "ACC" prefix
    // and any leading zeros, so "ACC0000045" and "ACC000000045" both resolve to "45".
    const getAccountNumberDigits = (accountNumber: string): string => {
      const digitsOnly = accountNumber.replace(/\D/g, '');
      return digitsOnly.replace(/^0+/, '') || '0';
    };

    const trimmedQuery = searchQuery.trim();
    const isNumericQuery = /^\d+$/.test(trimmedQuery);

    // Finds the account (if any) on a customer that matches the current search query,
    // so typing a plain number like "45" can jump straight to the account, not just the customer.
    const matchAccountForQuery = (customer: Customer) => {
      if (!trimmedQuery || !customer.accounts) return undefined;
      const searchLower = trimmedQuery.toLowerCase();
      return customer.accounts.find((account) =>
        isNumericQuery
          ? getAccountNumberDigits(account.accountNumber).startsWith(trimmedQuery)
          : account.accountNumber.toLowerCase().includes(searchLower)
      );
    };

    // Filter customers based on search query (name, contact info, or account number) and exclusions
    const filteredCustomers = customers
      .filter(customer => !excludeCustomerIds.includes(customer.id))
      .filter(customer => {
        if (!trimmedQuery) return true;
        const searchLower = trimmedQuery.toLowerCase();
        const matchesCustomerInfo =
          customer.name.toLowerCase().includes(searchLower) ||
          (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
          (customer.phone && customer.phone.toLowerCase().includes(searchLower));
        return matchesCustomerInfo || !!matchAccountForQuery(customer);
      });

    // When searching numerically, surface the customer whose account number is an
    // exact match first, so a fully-typed number (e.g. "45") lands on that account
    // at the top instead of a longer account number that merely starts with it.
    if (isNumericQuery) {
      filteredCustomers.sort((a, b) => {
        const aMatch = matchAccountForQuery(a);
        const bMatch = matchAccountForQuery(b);
        const aExact = aMatch ? getAccountNumberDigits(aMatch.accountNumber) === trimmedQuery : false;
        const bExact = bMatch ? getAccountNumberDigits(bMatch.accountNumber) === trimmedQuery : false;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
    }

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
          setEditingCustomerId(null);
          setIsCreating(false);
          setNewCustomerName('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen]);

    // Focus edit input when editing starts
    useEffect(() => {
      if (editingCustomerId && editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, [editingCustomerId]);

    // Focus create input when creating starts
    useEffect(() => {
      if (isCreating && createInputRef.current) {
        createInputRef.current.focus();
      }
    }, [isCreating]);

    const handleCustomerSelect = (customer: Customer) => {
      // Prefer the account that matched the search query (e.g. typed an account number),
      // otherwise auto-select when the customer has exactly one account.
      const matchedAccount = matchAccountForQuery(customer);
      const autoAccountId =
        matchedAccount?.id ??
        (customer.accounts && customer.accounts.length === 1 ? customer.accounts[0].id : undefined);

      const selection = {
        customerId: customer.id,
        accountId: showAccountSelection ? autoAccountId : undefined
      };

      onChange?.(selection);
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleAccountChange = (accountId: string) => {
      if (value?.customerId) {
        onChange?.({ customerId: value.customerId, accountId });
      }
    };

    const handleEditStart = (customer: Customer, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingCustomerId(customer.id);
      setEditingName(customer.name);
    };

    const handleEditSave = (customerId: string) => {
      if (editingName.trim() && onUpdateCustomer) {
        onUpdateCustomer(customerId, editingName.trim());
      }
      setEditingCustomerId(null);
      setEditingName('');
    };

    const handleEditCancel = () => {
      setEditingCustomerId(null);
      setEditingName('');
    };

    const handleCreateStart = () => {
      setIsCreating(true);
      setNewCustomerName(searchQuery);
    };

    const handleCreateSave = () => {
      if (newCustomerName.trim() && onCreateCustomer) {
        onCreateCustomer(newCustomerName.trim());
      }
      setIsCreating(false);
      setNewCustomerName('');
      setSearchQuery('');
    };

    const handleCreateCancel = () => {
      setIsCreating(false);
      setNewCustomerName('');
    };

    const widthClass = fullWidth ? 'w-full' : '';
    const errorClass = error
      ? 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500'
      : 'border-gray-400 focus-within:ring-blue-500 focus-within:border-blue-500 dark:border-gray-600 dark:focus-within:border-blue-400';

    return (
      <div className={`relative ${widthClass}`} ref={ref}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}

        <div ref={containerRef} className="relative space-y-3">
          {/* Customer Selection */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              w-full px-3 py-2 text-left bg-white dark:bg-dark-surface border-2 rounded-md shadow-sm
              ${errorClass}
              ${disabled ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800' : 'cursor-pointer hover:border-gray-500 dark:hover:border-gray-500'}
              focus:outline-none focus:ring-1
            `}
          >
            <div className="flex items-center justify-between">
              <span className={selectedCustomer ? 'text-gray-900 dark:text-dark-text' : 'text-gray-500 dark:text-gray-400'}>
                {selectedCustomer ? selectedCustomer.name : placeholder}
              </span>
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Customer Dropdown */}
          {isOpen && !disabled && (
            <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900/50 max-h-60 overflow-auto">
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200 dark:border-dark-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customers or account number..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="max-h-40 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <div key={customer.id} className="relative">
                      {editingCustomerId === customer.id ? (
                        // Edit Mode
                        <div className="flex items-center p-2 space-x-2">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditSave(customer.id);
                              } else if (e.key === 'Escape') {
                                handleEditCancel();
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                          <button
                            onClick={() => handleEditSave(customer.id)}
                            disabled={!editingName.trim()}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-600 dark:disabled:bg-gray-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        // Normal Mode
                        <div
                          className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
                                {customer.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {(() => {
                                  const matched = matchAccountForQuery(customer);
                                  if (matched) {
                                    return `Matched account: ${matched.accountNumber}`;
                                  }
                                  return customer.accounts && customer.accounts.length > 0
                                    ? customer.accounts.map((account) => account.accountNumber).join(', ')
                                    : 'No accounts';
                                })()}
                              </div>
                            </div>
                          </div>
                          {allowEdit && onUpdateCustomer && (
                            <button
                              onClick={(e) => handleEditStart(customer, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-opacity flex-shrink-0"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No customers found
                  </div>
                )}
              </div>

              {/* Create New Customer */}
              {allowCreate && onCreateCustomer && (searchQuery || isCreating) && (
                <div className="border-t border-gray-200 dark:border-dark-border">
                  {isCreating ? (
                    <div className="flex items-center p-2 space-x-2">
                      <input
                        ref={createInputRef}
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateSave();
                          } else if (e.key === 'Escape') {
                            handleCreateCancel();
                          }
                        }}
                        placeholder="Enter customer name..."
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <button
                        onClick={handleCreateSave}
                        disabled={!newCustomerName.trim()}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-600 dark:disabled:bg-gray-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCreateCancel}
                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateStart}
                      className="w-full flex items-center p-2 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900 dark:hover:text-blue-300"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create new customer "{searchQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Account Selection (only show if customer is selected and has accounts) */}
          {showAccountSelection && selectedCustomer && selectedCustomer.accounts && selectedCustomer.accounts.length > 0 && (
            <div>
              <Select
                label="Select Account"
                value={value?.accountId || ''}
                onChange={handleAccountChange}
                options={selectedCustomer.accounts.map(account => ({
                  value: account.id,
                  label: `${account.accountNumber} (${account.type.toUpperCase()}) - ${formatCurrency(account.balance, 'GHS', 'en-GH', 2)}`
                }))}
                fullWidth
                error={accountRequired && !value?.accountId ? 'Account selection is required' : undefined}
              />
            </div>
          )}

          {/* Account Details Display */}
          {selectedCustomer && selectedAccount && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-dark-border">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Account Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Account Number</label>
                  <p className="text-gray-900 dark:text-dark-text">{selectedAccount.accountNumber}</p>
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Account Type</label>
                  <p className="text-gray-900 dark:text-dark-text capitalize">{selectedAccount.type}</p>
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Account Balance</label>
                  <p className="text-gray-900 dark:text-dark-text font-semibold">{formatCurrency(selectedAccount.balance, 'GHS', 'en-GH', 2)}</p>
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Shares Balance</label>
                  <p className="text-gray-900 dark:text-dark-text font-semibold">{formatCurrency(selectedAccount.shareBalance || 0, 'GHS', 'en-GH', 2)}</p>
                </div>
                {selectedAccount.availableBalance !== undefined && (
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 font-medium">Available Balance</label>
                    <p className="text-gray-900 dark:text-dark-text">{formatCurrency(selectedAccount.availableBalance, 'GHS', 'en-GH', 2)}</p>
                  </div>
                )}
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Status</label>                  <p className={`capitalize font-medium ${
                    selectedAccount.status === 'ACTIVE' ? 'text-green-600 dark:text-green-400' :
                    selectedAccount.status === 'DORMANT' ? 'text-yellow-600 dark:text-yellow-400' :
                    selectedAccount.status === 'FROZEN' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {selectedAccount.status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Customer Details (when no account selected or account selection not shown) */}
          {selectedCustomer && (!showAccountSelection || !selectedAccount) && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-dark-border">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Customer Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Customer Name</label>
                  <p className="text-gray-900 dark:text-dark-text">{selectedCustomer.name}</p>
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Phone</label>
                  <p className="text-gray-900 dark:text-dark-text">{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Email</label>
                  <p className="text-gray-900 dark:text-dark-text">{selectedCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 font-medium">Total Accounts</label>
                  <p className="text-gray-900 dark:text-dark-text">{selectedCustomer.accounts?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

CustomerAccountSelect.displayName = 'CustomerAccountSelect';

export default CustomerAccountSelect;
