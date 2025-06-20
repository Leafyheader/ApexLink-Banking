import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { DownloadIcon, PrinterIcon, FilterIcon, TrendingUpIcon, TrendingDownIcon, BarChart3Icon, FileTextIcon, DollarSignIcon, UsersIcon, CreditCardIcon } from 'lucide-react';
import { reportsApi, handleApiError } from '../lib/api';

// Simple date formatting function
const formatDate = (date: Date, format: string) => {
  if (format === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  if (format === 'MMM dd, yyyy') {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
  }
  return date.toISOString();
};

// Types for reports
interface ReportFilter {
  dateFrom: string;
  dateTo: string;
  accountType?: string;
  customerSegment?: string;
  status?: string;
  branchId?: string;
}

interface FinancialSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  netCashFlow: number;
  activeAccounts: number;
  newAccounts: number;
  totalLoans: number;
  loanRepayments: number;
  overdueLoans: number;
  bankIncome: number;
  operatingExpenses: number;
  netProfit: number;
}

interface AccountAnalytics {
  accountType: string;
  count: number;
  totalBalance: number;
  averageBalance: number;
  growthRate: number;
}

interface LoanPortfolio {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  outstandingAmount: number;
  portfolioAtRisk: number;
}

interface TransactionSummary {
  date: string;
  deposits: number;
  withdrawals: number;
  transfers: number;
  loanRepayments: number;
  fees: number;
  totalVolume: number;
}

interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  customerRetentionRate: number;
  averageAccountsPerCustomer: number;
  topCustomersByBalance: Array<{
    name: string;
    totalBalance: number;
    accountCount: number;
  }>;
}

export default function Reports() {
  const [filters, setFilters] = useState<ReportFilter>({    dateFrom: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    dateTo: formatDate(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedReport, setSelectedReport] = useState<string>('financial-summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real data from API
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [accountAnalytics, setAccountAnalytics] = useState<AccountAnalytics[]>([]);
  const [loanPortfolio, setLoanPortfolio] = useState<LoanPortfolio | null>(null);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateParams = {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      };      // Fetch data based on selected report
      switch (selectedReport) {
        case 'financial-summary': {
          const financialData = await reportsApi.getFinancialSummary(dateParams);
          setFinancialSummary(financialData);
          break;
        }
        case 'account-analytics': {
          const accountData = await reportsApi.getAccountAnalytics(dateParams);
          setAccountAnalytics(accountData);
          break;
        }
        case 'loan-portfolio': {
          const loanData = await reportsApi.getLoanPortfolio(dateParams);
          setLoanPortfolio(loanData);
          break;
        }
        case 'transaction-summary': {
          const transactionData = await reportsApi.getTransactionSummary(dateParams);
          setTransactionSummary(transactionData);
          break;
        }
        case 'customer-metrics': {
          const customerData = await reportsApi.getCustomerMetrics(dateParams);
          setCustomerMetrics(customerData);
          break;
        }
        default: {
          // Load financial summary by default
          const defaultData = await reportsApi.getFinancialSummary(dateParams);
          setFinancialSummary(defaultData);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  }, [selectedReport, filters]);

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // TODO: Implement export functionality
    console.log(`Exporting ${selectedReport} as ${format}`);
  };

  const printReport = () => {
    window.print();
  };  useEffect(() => {
    generateReport();
  }, [selectedReport, filters, generateReport]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const reports = [
    { id: 'financial-summary', name: 'Financial Summary', icon: DollarSignIcon },
    { id: 'account-analytics', name: 'Account Analytics', icon: BarChart3Icon },
    { id: 'loan-portfolio', name: 'Loan Portfolio', icon: CreditCardIcon },
    { id: 'transaction-summary', name: 'Transaction Summary', icon: FileTextIcon },
    { id: 'customer-metrics', name: 'Customer Metrics', icon: UsersIcon },
    { id: 'regulatory-reports', name: 'Regulatory Reports', icon: FileTextIcon },
  ];
  const renderFinancialSummary = () => {
    if (!financialSummary) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No financial data available for the selected period.</p>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary.totalDeposits)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <TrendingDownIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.totalWithdrawals)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(financialSummary.netCashFlow)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Income</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(financialSummary.bankIncome)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loan Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Loans Outstanding:</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalLoans)}</span>
            </div>
            <div className="flex justify-between">
              <span>Loan Repayments (Period):</span>
              <span className="font-semibold text-green-600">{formatCurrency(financialSummary.loanRepayments)}</span>
            </div>
            <div className="flex justify-between">
              <span>Overdue Loans:</span>
              <span className="font-semibold text-red-600">{formatCurrency(financialSummary.overdueLoans)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Income:</span>
              <span className="font-semibold text-green-600">{formatCurrency(financialSummary.bankIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Operating Expenses:</span>
              <span className="font-semibold text-red-600">{formatCurrency(financialSummary.operatingExpenses)}</span>
            </div>            <div className="flex justify-between text-lg">
              <span className="font-semibold">Net Profit:</span>
              <span className="font-bold text-green-600">{formatCurrency(financialSummary.netProfit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    );
  };
  const renderAccountAnalytics = () => {
    if (!accountAnalytics || accountAnalytics.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No account analytics data available for the selected period.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Distribution & Performance</CardTitle>
            <CardDescription>Analysis by account type with growth metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Balance</TableHead>
                  <TableHead className="text-right">Average Balance</TableHead>
                  <TableHead className="text-right">Growth Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountAnalytics.map((account) => (
                  <TableRow key={account.accountType}>
                    <TableCell className="font-medium">{account.accountType}</TableCell>
                    <TableCell className="text-right">{account.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(account.totalBalance)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(account.averageBalance)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={account.growthRate > 10 ? "default" : "secondary"}>
                        {formatPercentage(account.growthRate)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };
  const renderLoanPortfolio = () => {
    if (!loanPortfolio) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No loan portfolio data available for the selected period.</p>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanPortfolio.totalLoans}</div>
            <p className="text-xs text-muted-foreground">Active: {loanPortfolio.activeLoans}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(loanPortfolio.totalDisbursed)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(loanPortfolio.outstandingAmount)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Portfolio at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPercentage(loanPortfolio.portfolioAtRisk)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loan Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Active Loans:</span>
                <Badge className="bg-green-100 text-green-800">{loanPortfolio.activeLoans}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Completed Loans:</span>
                <Badge className="bg-blue-100 text-blue-800">{loanPortfolio.completedLoans}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Defaulted Loans:</span>
                <Badge className="bg-red-100 text-red-800">{loanPortfolio.defaultedLoans}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repayment Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Repaid:</span>
              <span className="font-semibold text-green-600">{formatCurrency(loanPortfolio.totalRepaid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Repayment Rate:</span>
              <span className="font-semibold">{formatPercentage((loanPortfolio.totalRepaid / loanPortfolio.totalDisbursed) * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span>Default Rate:</span>
              <span className="font-semibold text-red-600">{formatPercentage((loanPortfolio.defaultedLoans / loanPortfolio.totalLoans) * 100)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    );
  };
  const renderTransactionSummary = () => {
    if (!transactionSummary || transactionSummary.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No transaction summary data available for the selected period.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Transaction Summary</CardTitle>
            <CardDescription>Transaction volumes and types over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Deposits</TableHead>
                  <TableHead className="text-right">Withdrawals</TableHead>
                  <TableHead className="text-right">Transfers</TableHead>
                  <TableHead className="text-right">Loan Repayments</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Total Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionSummary.map((summary, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{formatDate(new Date(summary.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(summary.deposits)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(summary.withdrawals)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(summary.transfers)}</TableCell>
                    <TableCell className="text-right text-purple-600">{formatCurrency(summary.loanRepayments)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(summary.fees)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(summary.totalVolume)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };
  const renderCustomerMetrics = () => {
    if (!customerMetrics) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No customer metrics data available for the selected period.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerMetrics.totalCustomers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Active: {customerMetrics.activeCustomers}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{customerMetrics.newCustomers}</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatPercentage(customerMetrics.customerRetentionRate)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Accounts/Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{customerMetrics.averageAccountsPerCustomer}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Balance</CardTitle>
            <CardDescription>Highest value customers by total account balance</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead className="text-right">Total Balance</TableHead>
                  <TableHead className="text-right">Account Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerMetrics.topCustomersByBalance.map((customer, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(customer.totalBalance)}</TableCell>
                    <TableCell className="text-right">{customer.accountCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRegulatoryReports = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Regulatory & Compliance Reports</CardTitle>
          <CardDescription>Standard regulatory reports for banking compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileTextIcon className="h-6 w-6 mb-2" />
              <span>Basel III Capital Adequacy</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileTextIcon className="h-6 w-6 mb-2" />
              <span>Liquidity Coverage Ratio</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileTextIcon className="h-6 w-6 mb-2" />
              <span>Anti-Money Laundering</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileTextIcon className="h-6 w-6 mb-2" />
              <span>Credit Risk Assessment</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileTextIcon className="h-6 w-6 mb-2" />
              <span>Operational Risk Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileTextIcon className="h-6 w-6 mb-2" />
              <span>Stress Testing Results</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'financial-summary':
        return renderFinancialSummary();
      case 'account-analytics':
        return renderAccountAnalytics();
      case 'loan-portfolio':
        return renderLoanPortfolio();
      case 'transaction-summary':
        return renderTransactionSummary();
      case 'customer-metrics':
        return renderCustomerMetrics();
      case 'regulatory-reports':
        return renderRegulatoryReports();
      default:
        return renderFinancialSummary();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive banking reports and business intelligence
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={printReport}>
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReport('excel')}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Report Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.map((report) => {
              const Icon = report.icon;
              return (                <Button
                  key={report.id}
                  variant={selectedReport === report.id ? "primary" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {report.name}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Report Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FilterIcon className="h-5 w-5 mr-2" />
                Report Filters
              </CardTitle>
            </CardHeader>            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label htmlFor="dateFrom" className="text-sm font-medium">From Date</label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="dateTo" className="text-sm font-medium">To Date</label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="accountType" className="text-sm font-medium">Account Type</label>
                  <Select
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'savings', label: 'Savings' },
                      { value: 'current', label: 'Current' },
                      { value: 'fixed-deposit', label: 'Fixed Deposit' },
                      { value: 'loan', label: 'Loan' },
                    ]}
                    value={filters.accountType || 'all'}
                    onChange={(value: string) => setFilters({ ...filters, accountType: value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium">Status</label>
                  <Select
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                    value={filters.status || 'all'}
                    onChange={(value: string) => setFilters({ ...filters, status: value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={generateReport} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </CardContent>
          </Card>          {/* Report Content */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="text-red-600">⚠️</div>
                  <div>
                    <p className="text-red-800 font-medium">Error loading report data</p>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {!error && renderReportContent()}
        </div>
      </div>
    </div>
  );
}
