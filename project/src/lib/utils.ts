// Utility functions for the application

// Format currency values
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

// Format date strings
export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

// Create a truncated text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

// Generate a random ID (for demo purposes)
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Status badge color mapper
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    // Customer KYC status
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    
    // Account status
    active: 'bg-green-100 text-green-800',
    dormant: 'bg-gray-100 text-gray-800',
    closed: 'bg-red-100 text-red-800',
    
    // Transaction status
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    
    // Loan status
    paid: 'bg-green-100 text-green-800',
    defaulted: 'bg-red-100 text-red-800',
    overdue: 'bg-orange-100 text-orange-800',
  };
  
  return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

// Simple pagination logic
export function paginate<T>(items: T[], currentPage: number, itemsPerPage: number): T[] {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return items.slice(startIndex, startIndex + itemsPerPage);
}

// Filter items based on search query
export function filterItems<T>(items: T[], searchQuery: string, keys: (keyof T)[]): T[] {
  if (!searchQuery) return items;
  
  const query = searchQuery.toLowerCase();
  return items.filter(item => 
    keys.some(key => {
      const value = item[key];
      return value && String(value).toLowerCase().includes(query);
    })
  );
}