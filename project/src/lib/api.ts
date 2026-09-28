import axios, { AxiosError } from 'axios';

const getDefaultApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

export const apiBaseUrl = import.meta.env.VITE_API_URL || getDefaultApiBaseUrl();
export const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

export const resolveBackendAssetUrl = (assetPath?: string | null): string | undefined => {
  if (!assetPath) {
    return undefined;
  }

  if (assetPath.startsWith('data:') || /^https?:\/\//.test(assetPath)) {
    return assetPath;
  }

  if (assetPath.startsWith('/')) {
    return `${backendBaseUrl}${assetPath}`;
  }

  return assetPath;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized and 403 Forbidden responses
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest?.headers['X-Retry']) {
      // Clear auth state and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;

export type ApiError = {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || apiError?.error || error.message;
  }
  return 'An unexpected error occurred';
};

// Withdrawal Authorization API functions
export const withdrawalAuthorizationApi = {
  // Get withdrawal authorizations with filtering and pagination
  getWithdrawalAuthorizations: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/withdrawal-authorizations?${searchParams.toString()}`);
    return response.data;
  },

  // Approve withdrawal authorization
  approveWithdrawalAuthorization: async (id: string) => {
    const response = await api.post(`/withdrawal-authorizations/${id}/approve`);
    return response.data;
  },

  // Reject withdrawal authorization
  rejectWithdrawalAuthorization: async (id: string, reason: string) => {
    const response = await api.post(`/withdrawal-authorizations/${id}/reject`, { reason });
    return response.data;
  },
  // Create new withdrawal authorization
  createWithdrawalAuthorization: async (data: {
    accountId: string;
    amount: number;
    type: 'withdrawal' | 'transfer' | 'withdrawal-shares';
    description?: string;
    reference?: string;
    toAccountId?: string;
    toAccountNumber?: string;
    toCustomerName?: string;
  }) => {
    const response = await api.post('/withdrawal-authorizations', data);
    return response.data;
  },

  // Reverse withdrawal authorization
  reverseWithdrawalAuthorization: async (id: string, reason: string) => {
    const response = await api.post(`/withdrawal-authorizations/${id}/reverse`, { reason });
    return response.data;
  }
};

// Reports API functions
export const reportsApi = {
  // Get financial summary report
  getFinancialSummary: async (params: {
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/financial-summary?${searchParams.toString()}`);
    return response.data;
  },

  // Get account analytics report
  getAccountAnalytics: async (params: {
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/account-analytics?${searchParams.toString()}`);
    return response.data;
  },

  // Get loan portfolio report
  getLoanPortfolio: async (params: {
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/loan-portfolio?${searchParams.toString()}`);
    return response.data;
  },

  // Get transaction summary report
  getTransactionSummary: async (params: {
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/transaction-summary?${searchParams.toString()}`);
    return response.data;
  },

  // Get customer metrics report
  getCustomerMetrics: async (params: {
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/reports/customer-metrics?${searchParams.toString()}`);
    return response.data;
  },
};

// Expenses API functions
export const expensesApi = {
  // Get expenses summary
  getSummary: async () => {
    const response = await api.get('/expenses/summary');
    return response.data;
  },

  // Get all expenses with filtering and pagination
  getAll: async (params: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    status?: string;
    department?: string;
    search?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/expenses?${searchParams.toString()}`);
    return response.data;
  },

  // Create new expense
  create: async (expenseData: {
    date: string;
    category: string;
    description: string;
    amount: number;
    vendor: string;
    department: string;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
  }) => {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  },

  // Update expense
  update: async (id: string, expenseData: {
    date?: string;
    category?: string;
    description?: string;
    amount?: number;
    vendor?: string;
    department?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
  }) => {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  // Update expense status
  updateStatus: async (id: string, status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED') => {
    const response = await api.patch(`/expenses/${id}/status`, { status });
    return response.data;
  },

  // Delete expense
  delete: async (id: string) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  // Get specific expense
  getById: async (id: string) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },
};

// Audit API functions
export const auditApi = {
  getEvents: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    outcome?: string;
    action?: string;
    entityType?: string;
    actorRole?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await api.get(`/audit?${searchParams.toString()}`);
    return response.data;
  },

  getEventById: async (id: string) => {
    const response = await api.get(`/audit/${id}`);
    return response.data;
  },
};

export interface SystemSettings {
  withdrawalFee: number;
  defaultLoanInterestRate: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface TreasurySummary {
  accountId: string;
  accountNumber: string;
  balance: number;
  currency: string;
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    description: string | null;
    reference: string | null;
    date: string;
  }[];
}

// Settings API functions
export const settingsApi = {
  // Readable by any authenticated user
  get: async (): Promise<SystemSettings> => {
    const response = await api.get('/settings');
    return response.data;
  },

  // Readable by any authenticated user
  getTreasuryBalance: async (): Promise<{ balance: number; currency: string }> => {
    const response = await api.get('/settings/treasury/balance');
    return response.data;
  },

  // Admin-only
  update: async (data: { withdrawalFee?: number; defaultLoanInterestRate?: number }) => {
    const response = await api.put('/settings', data);
    return response.data;
  },

  // Admin-only
  getTreasury: async (): Promise<TreasurySummary> => {
    const response = await api.get('/settings/treasury');
    return response.data;
  },

  // Admin-only
  fundTreasury: async (amount: number, description?: string) => {
    const response = await api.post('/settings/treasury/fund', { amount, description });
    return response.data;
  },
};
