import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Search, Plus, Edit3 } from 'lucide-react';
import { Customer } from '../../types';

export interface CustomerSelectProps {
  customers: Customer[];
  value?: string;
  onChange?: (customerId: string) => void;
  onCreateCustomer?: (name: string) => void;
  onUpdateCustomer?: (customerId: string, newName: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  allowEdit?: boolean;
  allowCreate?: boolean;
}

const CustomerSelect = forwardRef<HTMLDivElement, CustomerSelectProps>(
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

    // Get selected customer
    const selectedCustomer = customers.find(c => c.id === value);

    // Filter customers based on search query
    const filteredCustomers = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    );    // Close dropdown when clicking outside
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
    }, [isCreating]);    const handleCustomerSelect = (customer: Customer) => {
      onChange?.(customer.id);
      setIsOpen(false);
      setSearchQuery('');
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
    };    const handleEditCancel = () => {
      setEditingCustomerId(null);
      setEditingName('');
      // Keep dropdown open when canceling edit
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
    };    const handleCreateCancel = () => {
      setIsCreating(false);
      setNewCustomerName('');
      // Optionally close the entire dropdown when canceling customer creation
      // setIsOpen(false);
      // setSearchQuery('');
    };

    const widthClass = fullWidth ? 'w-full' : '';
    const errorClass = error 
      ? 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500' 
      : 'border-gray-400 focus-within:ring-blue-500 focus-within:border-blue-500';

    return (
      <div className={`relative ${widthClass}`} ref={ref}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div ref={containerRef} className="relative">
          {/* Main Input/Button */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              w-full px-3 py-2 text-left bg-white border-2 rounded-md shadow-sm
              ${errorClass}
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-500'}
              focus:outline-none focus:ring-1
            `}
          >
            <div className="flex items-center justify-between">
              <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-500'}>
                {selectedCustomer 
                  ? `${selectedCustomer.name} (${selectedCustomer.email || selectedCustomer.phone || 'No contact'})`
                  : placeholder
                }
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>          {/* Dropdown */}
          {isOpen && !disabled && (
            <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="max-h-40 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (                    <div key={customer.id} className="relative">
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
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleEditSave(customer.id)}
                            disabled={!editingName.trim()}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        // Normal Mode
                        <div
                          className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer group"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="text-xs text-gray-500">
                              {customer.email || customer.phone || 'No contact'}
                            </div>
                          </div>
                          {allowEdit && onUpdateCustomer && (
                            <button
                              onClick={(e) => handleEditStart(customer, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500 text-center">
                    No customers found
                  </div>
                )}
              </div>              {/* Create New Customer */}
              {allowCreate && onCreateCustomer && (searchQuery || isCreating) && (
                <div className="border-t border-gray-200">
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
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleCreateSave}
                        disabled={!newCustomerName.trim()}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCreateCancel}
                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateStart}
                      className="w-full flex items-center p-2 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create new customer "{searchQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

CustomerSelect.displayName = 'CustomerSelect';

export default CustomerSelect;
