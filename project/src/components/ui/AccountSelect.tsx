import { useState, useRef, useEffect, forwardRef } from 'react';
import { Search, CreditCard } from 'lucide-react';
import { Account } from '../../types';

export interface AccountSelectProps {
  accounts: Account[];
  value?: string;
  onChange?: (accountId: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  excludeAccountId?: string; // For transfer scenarios
  filter?: (account: Account) => boolean; // Additional filtering
}

const AccountSelect = forwardRef<HTMLDivElement, AccountSelectProps>(
  (
    {
      accounts,
      value,
      onChange,
      label,
      error,
      placeholder = "Search or select an account...",
      fullWidth = false,
      disabled = false,
      excludeAccountId,
      filter,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);    // Get selected account
    const selectedAccount = accounts.find(a => a.id === value);    // Filter accounts based on search query and other criteria
    const filteredAccounts = accounts.filter(account => {      // Apply basic filters - check for active status (case-insensitive)
      if (account.status.toUpperCase() !== 'ACTIVE') return false;
      if (excludeAccountId && account.id === excludeAccountId) return false;
      if (filter && !filter(account)) return false;

      // Apply search filter
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        account.accountNumber.toLowerCase().includes(searchLower) ||
        (account.customer?.name || account.customerName || '').toLowerCase().includes(searchLower) ||
        account.type.toLowerCase().includes(searchLower)
      );
    });

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
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

    const handleAccountSelect = (account: Account) => {
      onChange?.(account.id);
      setIsOpen(false);
      setSearchQuery('');
    };

    const widthClass = fullWidth ? 'w-full' : '';
    const errorClass = error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    return (
      <div className={`relative ${widthClass}`} ref={ref}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div ref={containerRef} className="relative">
          {/* Selection Button */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              relative w-full bg-white border rounded-md pl-3 pr-10 py-2 text-left cursor-default 
              focus:outline-none focus:ring-1 sm:text-sm transition-colors
              ${errorClass}
              ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'hover:border-gray-400'}
              ${isOpen ? 'ring-1' : ''}
            `}
          >
            <div className="flex items-center">
              <CreditCard className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />              <span className={selectedAccount ? 'text-gray-900' : 'text-gray-500'}>
                {selectedAccount 
                  ? (
                      <>
                        {selectedAccount.customer?.name || selectedAccount.customerName || 'Unknown Customer'}
                        <span className="text-gray-500 ml-1">({selectedAccount.accountNumber})</span>
                      </>
                    )
                  : placeholder
                }
              </span>
              <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Dropdown */}
          {isOpen && !disabled && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search accounts or customers..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Account List */}
              <div className="max-h-40 overflow-y-auto">
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => (
                    <div key={account.id} className="relative">
                      <div
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleAccountSelect(account)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {account.accountNumber}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {account.customer?.name || account.customerName || 'Unknown Customer'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {account.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500 text-center">
                    No accounts found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

AccountSelect.displayName = 'AccountSelect';

export default AccountSelect;
