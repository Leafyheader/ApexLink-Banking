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

// Shared Print Styles Component
const PrintStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      @media print {
        @page {
          size: A4;
          margin: 20mm;
        }        /* Hide all elements by default when printing */
        body.print-ready * {
          visibility: hidden !important;
        }
        
        /* Show only print clone and its children */
        body.print-ready #print-clone,
        body.print-ready #print-clone * {
          visibility: visible !important;
        }
        
        /* Hide everything except the print clone */
        body.print-ready > *:not(#print-clone) {
          display: none !important;
        }
          /* Hide common UI elements */
        header, nav, aside, .navigation, .sidebar, .menu, 
        .filters, .controls, .buttons, .tabs, .breadcrumb,
        .flex.items-center.justify-between, .grid.grid-cols-1.lg\\:grid-cols-4,
        h1, p, .space-x-2, .lg\\:col-span-1, .lg\\:col-span-3,
        .text-3xl, .text-muted-foreground, button {
          display: none !important;
        }
        
        /* Hide report content that's not the print layout */
        .space-y-6 > *:not(.print-layout) {
          display: none !important;
        }        
        /* Style for the print clone */
        #print-clone {
          display: block !important;
          position: static !important;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: white;
          width: 100%;
          height: auto;
          overflow: visible;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          visibility: visible;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        
        .print-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .print-subtitle {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .print-date-range {
          font-size: 12px;
          font-style: italic;
        }
        
        .print-section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .print-section-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #333;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        
        .print-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .print-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .print-grid-4 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .print-metric {
          border: 1px solid #ddd;
          padding: 15px;
          text-align: center;
          background: #f9f9f9;
        }
        
        .print-metric-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        
        .print-metric-value {
          font-size: 18px;
          font-weight: bold;
          color: #000;
        }
        
        .print-metric-positive {
          color: #22c55e;
        }
        
        .print-metric-negative {
          color: #ef4444;
        }
        
        .print-metric-neutral {
          color: #3b82f6;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        .print-table th {
          background: #f5f5f5;
          font-weight: bold;
          font-size: 11px;
        }
        
        .print-table td {
          font-size: 11px;
        }
        
        .print-table .text-right {
          text-align: right;
        }
        
        .print-footer {
          position: fixed;
          bottom: 10mm;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
      }
      
      @media screen {
        .print-layout {
          display: none !important;
        }
      }
      
      /* Ensure no scrollbars in any print elements */
      @media print {
        .print-layout,
        .print-layout * {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
          width: auto !important;
          max-width: 100% !important;
        }
        
        /* Remove any fixed positioning that might cause issues */
        .print-layout .print-section,
        .print-layout .print-grid,
        .print-layout .print-grid-3,
        .print-layout .print-grid-4,
        .print-layout .print-table {
          position: static !important;
          overflow: visible !important;
        }
      }
    `
  }} />
);

// Print Layout Component for Financial Summary
const FinancialSummaryPrintLayout: React.FC<{
  financialSummary: FinancialSummary;
  filters: ReportFilter;
  formatCurrency: (amount: number) => string;
}> = ({ financialSummary, filters, formatCurrency }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return (
    <div className="print-layout" id="financial-summary-print" style={{ 
      display: 'none',
      overflow: 'visible',
      height: 'auto',
      width: '100%',
      margin: 0,
      padding: 0
    }}>
      <PrintStyles />

      {/* Print Header */}
      <div className="print-header">
        <div className="print-title">ApexLink Banking System</div>
        <div className="print-subtitle">Financial Summary Report</div>
        <div className="print-date-range">
          Period: {formatDate(new Date(filters.dateFrom), 'MMM dd, yyyy')} - {formatDate(new Date(filters.dateTo), 'MMM dd, yyyy')}
        </div>
        <div style={{ fontSize: '10px', marginTop: '10px' }}>
          Generated on: {currentDate}
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="print-section">
        <div className="print-section-title">Key Financial Metrics</div>
        <div className="print-grid">
          <div className="print-metric">
            <div className="print-metric-label">Total Deposits</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(financialSummary.totalDeposits)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Total Withdrawals</div>
            <div className="print-metric-value print-metric-negative">
              {formatCurrency(financialSummary.totalWithdrawals)}
            </div>
          </div>
        </div>
        <div className="print-grid">
          <div className="print-metric">
            <div className="print-metric-label">Net Cash Flow</div>
            <div className="print-metric-value print-metric-neutral">
              {formatCurrency(financialSummary.netCashFlow)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Bank Income</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(financialSummary.bankIncome)}
            </div>
          </div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="print-section">
        <div className="print-section-title">Account Summary</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="text-right">Count/Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active Accounts</td>
              <td className="text-right">{financialSummary.activeAccounts.toLocaleString()}</td>
              <td>Currently active customer accounts</td>
            </tr>
            <tr>
              <td>New Accounts</td>
              <td className="text-right">{financialSummary.newAccounts.toLocaleString()}</td>
              <td>Accounts opened during the period</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Loan Portfolio Summary */}
      <div className="print-section">
        <div className="print-section-title">Loan Portfolio Summary</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Loan Metric</th>
              <th className="text-right">Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Loans Outstanding</td>
              <td className="text-right">{formatCurrency(financialSummary.totalLoans)}</td>
              <td>Total value of all active loans</td>
            </tr>
            <tr>
              <td>Loan Repayments (Period)</td>
              <td className="text-right">{formatCurrency(financialSummary.loanRepayments)}</td>
              <td>Repayments received during period</td>
            </tr>
            <tr>
              <td>Overdue Loans</td>
              <td className="text-right">{formatCurrency(financialSummary.overdueLoans)}</td>
              <td>Loans past due date</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Profitability Analysis */}
      <div className="print-section">
        <div className="print-section-title">Profitability Analysis</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="text-right">Amount</th>
              <th>% of Income</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Income</td>
              <td className="text-right">{formatCurrency(financialSummary.bankIncome)}</td>
              <td className="text-right">100.0%</td>
            </tr>
            <tr>
              <td>Operating Expenses</td>
              <td className="text-right">{formatCurrency(financialSummary.operatingExpenses)}</td>
              <td className="text-right">
                {((financialSummary.operatingExpenses / financialSummary.bankIncome) * 100).toFixed(1)}%
              </td>
            </tr>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
              <td>Net Profit</td>
              <td className="text-right">{formatCurrency(financialSummary.netProfit)}</td>
              <td className="text-right">
                {((financialSummary.netProfit / financialSummary.bankIncome) * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Key Ratios */}
      <div className="print-section">
        <div className="print-section-title">Key Performance Ratios</div>
        <div className="print-grid-3">
          <div className="print-metric">
            <div className="print-metric-label">Profit Margin</div>
            <div className="print-metric-value">
              {((financialSummary.netProfit / financialSummary.bankIncome) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Expense Ratio</div>
            <div className="print-metric-value">
              {((financialSummary.operatingExpenses / financialSummary.bankIncome) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Loan Recovery Rate</div>
            <div className="print-metric-value">
              {financialSummary.totalLoans > 0 
                ? ((financialSummary.loanRepayments / financialSummary.totalLoans) * 100).toFixed(1)
                : '0.0'
              }%
            </div>
          </div>
        </div>
      </div>

      {/* Report Notes */}
      <div className="print-section">
        <div className="print-section-title">Report Notes</div>
        <ul style={{ fontSize: '11px', lineHeight: '1.5', paddingLeft: '20px' }}>
          <li>All amounts are displayed in USD unless otherwise specified</li>
          <li>This report covers the period from {formatDate(new Date(filters.dateFrom), 'MMM dd, yyyy')} to {formatDate(new Date(filters.dateTo), 'MMM dd, yyyy')}</li>
          <li>Active accounts include all customer accounts with non-zero balances or recent activity</li>
          <li>Overdue loans are calculated based on payment due dates and current date</li>
          <li>Operating expenses include only approved and paid expenses</li>
          <li>Net profit is calculated as total income minus operating expenses</li>
        </ul>
      </div>      {/* Print Footer */}
      <div className="print-footer">
        <div>ApexLink Banking System - Financial Summary Report</div>
        <div>Confidential - For Internal Use Only</div>
      </div>
    </div>
  );
};

// Print Layout Component for Account Analytics
const AccountAnalyticsPrintLayout: React.FC<{
  accountAnalytics: AccountAnalytics[];
  filters: ReportFilter;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
}> = ({ accountAnalytics, filters, formatCurrency, formatPercentage }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalAccounts = accountAnalytics.reduce((sum, acc) => sum + acc.count, 0);
  const totalBalance = accountAnalytics.reduce((sum, acc) => sum + acc.totalBalance, 0);
  const avgBalance = totalBalance / totalAccounts;

  return (
    <div className="print-layout" id="account-analytics-print" style={{ 
      display: 'none',
      overflow: 'visible',
      height: 'auto',
      width: '100%',
      margin: 0,
      padding: 0
    }}>
      <PrintStyles />

      {/* Print Header */}
      <div className="print-header">
        <div className="print-title">ApexLink Banking System</div>
        <div className="print-subtitle">Account Analytics Report</div>
        <div className="print-date-range">
          Period: {formatDate(new Date(filters.dateFrom), 'MMM dd, yyyy')} - {formatDate(new Date(filters.dateTo), 'MMM dd, yyyy')}
        </div>
        <div style={{ fontSize: '10px', marginTop: '10px' }}>
          Generated on: {currentDate}
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="print-section">
        <div className="print-section-title">Account Portfolio Overview</div>
        <div className="print-grid-3">
          <div className="print-metric">
            <div className="print-metric-label">Total Accounts</div>
            <div className="print-metric-value print-metric-neutral">
              {totalAccounts.toLocaleString()}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Total Portfolio Value</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(totalBalance)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Average Account Balance</div>
            <div className="print-metric-value print-metric-neutral">
              {formatCurrency(avgBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Account Type Analysis */}
      <div className="print-section">
        <div className="print-section-title">Account Type Analysis</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Account Type</th>
              <th className="text-right">Count</th>
              <th className="text-right">Total Balance</th>
              <th className="text-right">Average Balance</th>
              <th className="text-right">Growth Rate</th>
              <th className="text-right">% of Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {accountAnalytics.map((account) => (
              <tr key={account.accountType}>
                <td style={{ fontWeight: 'bold' }}>{account.accountType}</td>
                <td className="text-right">{account.count.toLocaleString()}</td>
                <td className="text-right">{formatCurrency(account.totalBalance)}</td>
                <td className="text-right">{formatCurrency(account.averageBalance)}</td>
                <td className="text-right">{formatPercentage(account.growthRate)}</td>
                <td className="text-right">{((account.totalBalance / totalBalance) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Metrics */}
      <div className="print-section">
        <div className="print-section-title">Performance Metrics by Account Type</div>
        <div className="print-grid-4">
          {accountAnalytics.map((account) => (
            <div key={account.accountType} className="print-metric">
              <div className="print-metric-label">{account.accountType} Growth</div>
              <div className={`print-metric-value ${account.growthRate > 10 ? 'print-metric-positive' : account.growthRate > 0 ? 'print-metric-neutral' : 'print-metric-negative'}`}>
                {formatPercentage(account.growthRate)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="print-section">
        <div className="print-section-title">Key Insights</div>
        <ul style={{ fontSize: '11px', lineHeight: '1.5', paddingLeft: '20px' }}>
          <li>Total accounts across all types: {totalAccounts.toLocaleString()}</li>
          <li>Highest performing account type: {accountAnalytics.reduce((max, acc) => acc.growthRate > max.growthRate ? acc : max, accountAnalytics[0])?.accountType || 'N/A'}</li>
          <li>Largest account segment by balance: {accountAnalytics.reduce((max, acc) => acc.totalBalance > max.totalBalance ? acc : max, accountAnalytics[0])?.accountType || 'N/A'}</li>
          <li>Growth rates are calculated based on the selected reporting period</li>
          <li>Average balance calculations include all active accounts in each category</li>
        </ul>
      </div>

      {/* Print Footer */}
      <div className="print-footer">
        <div>ApexLink Banking System - Account Analytics Report</div>
        <div>Confidential - For Internal Use Only</div>
      </div>
    </div>
  );
};

// Print Layout Component for Loan Portfolio
const LoanPortfolioPrintLayout: React.FC<{
  loanPortfolio: LoanPortfolio;
  filters: ReportFilter;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
}> = ({ loanPortfolio, filters, formatCurrency, formatPercentage }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="print-layout" id="loan-portfolio-print" style={{ 
      display: 'none',
      overflow: 'visible',
      height: 'auto',
      width: '100%',
      margin: 0,
      padding: 0
    }}>
      <PrintStyles />

      {/* Print Header */}
      <div className="print-header">
        <div className="print-title">ApexLink Banking System</div>
        <div className="print-subtitle">Loan Portfolio Report</div>
        <div className="print-date-range">
          Period: {formatDate(new Date(filters.dateFrom), 'MMM dd, yyyy')} - {formatDate(new Date(filters.dateTo), 'MMM dd, yyyy')}
        </div>
        <div style={{ fontSize: '10px', marginTop: '10px' }}>
          Generated on: {currentDate}
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="print-section">
        <div className="print-section-title">Loan Portfolio Summary</div>
        <div className="print-grid-4">
          <div className="print-metric">
            <div className="print-metric-label">Total Loans</div>
            <div className="print-metric-value print-metric-neutral">
              {loanPortfolio.totalLoans.toLocaleString()}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Active Loans</div>
            <div className="print-metric-value print-metric-positive">
              {loanPortfolio.activeLoans.toLocaleString()}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Completed Loans</div>
            <div className="print-metric-value print-metric-neutral">
              {loanPortfolio.completedLoans.toLocaleString()}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Defaulted Loans</div>
            <div className="print-metric-value print-metric-negative">
              {loanPortfolio.defaultedLoans.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="print-section">
        <div className="print-section-title">Financial Overview</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="text-right">Amount</th>
              <th className="text-right">% of Portfolio</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Total Disbursed</td>
              <td className="text-right">{formatCurrency(loanPortfolio.totalDisbursed)}</td>
              <td className="text-right">100.0%</td>
              <td>Total amount disbursed to borrowers</td>
            </tr>
            <tr>
              <td>Total Repaid</td>
              <td className="text-right">{formatCurrency(loanPortfolio.totalRepaid)}</td>
              <td className="text-right">{((loanPortfolio.totalRepaid / loanPortfolio.totalDisbursed) * 100).toFixed(1)}%</td>
              <td>Amount repaid by borrowers</td>
            </tr>
            <tr>
              <td>Outstanding Amount</td>
              <td className="text-right">{formatCurrency(loanPortfolio.outstandingAmount)}</td>
              <td className="text-right">{((loanPortfolio.outstandingAmount / loanPortfolio.totalDisbursed) * 100).toFixed(1)}%</td>
              <td>Amount still owed by borrowers</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Risk Analysis */}
      <div className="print-section">
        <div className="print-section-title">Risk Analysis</div>
        <div className="print-grid-3">
          <div className="print-metric">
            <div className="print-metric-label">Portfolio at Risk</div>
            <div className="print-metric-value print-metric-negative">
              {formatPercentage(loanPortfolio.portfolioAtRisk)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Default Rate</div>
            <div className="print-metric-value print-metric-negative">
              {formatPercentage((loanPortfolio.defaultedLoans / loanPortfolio.totalLoans) * 100)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Recovery Rate</div>
            <div className="print-metric-value print-metric-positive">
              {formatPercentage((loanPortfolio.totalRepaid / loanPortfolio.totalDisbursed) * 100)}
            </div>
          </div>
        </div>
      </div>

      {/* Loan Status Distribution */}
      <div className="print-section">
        <div className="print-section-title">Loan Status Distribution</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Status</th>
              <th className="text-right">Count</th>
              <th className="text-right">% of Total</th>
              <th>Status Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#22c55e' }}>Active</td>
              <td className="text-right">{loanPortfolio.activeLoans.toLocaleString()}</td>
              <td className="text-right">{((loanPortfolio.activeLoans / loanPortfolio.totalLoans) * 100).toFixed(1)}%</td>
              <td>Loans currently being repaid</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>Completed</td>
              <td className="text-right">{loanPortfolio.completedLoans.toLocaleString()}</td>
              <td className="text-right">{((loanPortfolio.completedLoans / loanPortfolio.totalLoans) * 100).toFixed(1)}%</td>
              <td>Loans fully repaid</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#ef4444' }}>Defaulted</td>
              <td className="text-right">{loanPortfolio.defaultedLoans.toLocaleString()}</td>
              <td className="text-right">{((loanPortfolio.defaultedLoans / loanPortfolio.totalLoans) * 100).toFixed(1)}%</td>
              <td>Loans in default status</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Key Performance Indicators */}
      <div className="print-section">
        <div className="print-section-title">Key Performance Indicators</div>
        <ul style={{ fontSize: '11px', lineHeight: '1.5', paddingLeft: '20px' }}>
          <li>Total loan portfolio value: {formatCurrency(loanPortfolio.totalDisbursed)}</li>
          <li>Average loan size: {formatCurrency(loanPortfolio.totalDisbursed / loanPortfolio.totalLoans)}</li>
          <li>Collection efficiency: {((loanPortfolio.totalRepaid / loanPortfolio.totalDisbursed) * 100).toFixed(1)}%</li>
          <li>Risk concentration: Portfolio at Risk of {formatPercentage(loanPortfolio.portfolioAtRisk)}</li>
          <li>Active loan ratio: {((loanPortfolio.activeLoans / loanPortfolio.totalLoans) * 100).toFixed(1)}% of total loans</li>
          <li>Outstanding balance represents {((loanPortfolio.outstandingAmount / loanPortfolio.totalDisbursed) * 100).toFixed(1)}% of total disbursements</li>
        </ul>
      </div>

      {/* Print Footer */}
      <div className="print-footer">
        <div>ApexLink Banking System - Loan Portfolio Report</div>
        <div>Confidential - For Internal Use Only</div>
      </div>
    </div>
  );
};

// Print Layout Component for Transaction Summary
const TransactionSummaryPrintLayout: React.FC<{
  transactionSummary: TransactionSummary[];
  filters: ReportFilter;
  formatCurrency: (amount: number) => string;
}> = ({ transactionSummary, filters, formatCurrency }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totals = transactionSummary.reduce(
    (acc, day) => ({
      deposits: acc.deposits + day.deposits,
      withdrawals: acc.withdrawals + day.withdrawals,
      transfers: acc.transfers + day.transfers,
      loanRepayments: acc.loanRepayments + day.loanRepayments,
      fees: acc.fees + day.fees,
      totalVolume: acc.totalVolume + day.totalVolume,
    }),
    { deposits: 0, withdrawals: 0, transfers: 0, loanRepayments: 0, fees: 0, totalVolume: 0 }
  );

  const avgDaily = {
    deposits: totals.deposits / transactionSummary.length,
    withdrawals: totals.withdrawals / transactionSummary.length,
    transfers: totals.transfers / transactionSummary.length,
    loanRepayments: totals.loanRepayments / transactionSummary.length,
    fees: totals.fees / transactionSummary.length,
    totalVolume: totals.totalVolume / transactionSummary.length,
  };

  return (
    <div className="print-layout" id="transaction-summary-print" style={{ 
      display: 'none',
      overflow: 'visible',
      height: 'auto',
      width: '100%',
      margin: 0,
      padding: 0
    }}>
      <PrintStyles />

      {/* Print Header */}
      <div className="print-header">
        <div className="print-title">ApexLink Banking System</div>
        <div className="print-subtitle">Transaction Summary Report</div>
        <div className="print-date-range">
          Period: {formatDate(new Date(filters.dateFrom), 'MMM dd, yyyy')} - {formatDate(new Date(filters.dateTo), 'MMM dd, yyyy')}
        </div>
        <div style={{ fontSize: '10px', marginTop: '10px' }}>
          Generated on: {currentDate} | {transactionSummary.length} reporting days
        </div>
      </div>

      {/* Transaction Totals */}
      <div className="print-section">
        <div className="print-section-title">Transaction Volume Summary</div>
        <div className="print-grid-3">
          <div className="print-metric">
            <div className="print-metric-label">Total Deposits</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(totals.deposits)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Total Withdrawals</div>
            <div className="print-metric-value print-metric-negative">
              {formatCurrency(totals.withdrawals)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Net Cash Flow</div>
            <div className="print-metric-value print-metric-neutral">
              {formatCurrency(totals.deposits - totals.withdrawals)}
            </div>
          </div>
        </div>
        <div className="print-grid-3">
          <div className="print-metric">
            <div className="print-metric-label">Total Transfers</div>
            <div className="print-metric-value print-metric-neutral">
              {formatCurrency(totals.transfers)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Loan Repayments</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(totals.loanRepayments)}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Total Fees</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(totals.fees)}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Averages */}
      <div className="print-section">
        <div className="print-section-title">Daily Average Analysis</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Transaction Type</th>
              <th className="text-right">Total Amount</th>
              <th className="text-right">Daily Average</th>
              <th className="text-right">% of Total Volume</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Deposits</td>
              <td className="text-right">{formatCurrency(totals.deposits)}</td>
              <td className="text-right">{formatCurrency(avgDaily.deposits)}</td>
              <td className="text-right">{((totals.deposits / totals.totalVolume) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Withdrawals</td>
              <td className="text-right">{formatCurrency(totals.withdrawals)}</td>
              <td className="text-right">{formatCurrency(avgDaily.withdrawals)}</td>
              <td className="text-right">{((totals.withdrawals / totals.totalVolume) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Transfers</td>
              <td className="text-right">{formatCurrency(totals.transfers)}</td>
              <td className="text-right">{formatCurrency(avgDaily.transfers)}</td>
              <td className="text-right">{((totals.transfers / totals.totalVolume) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Loan Repayments</td>
              <td className="text-right">{formatCurrency(totals.loanRepayments)}</td>
              <td className="text-right">{formatCurrency(avgDaily.loanRepayments)}</td>
              <td className="text-right">{((totals.loanRepayments / totals.totalVolume) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Fees</td>
              <td className="text-right">{formatCurrency(totals.fees)}</td>
              <td className="text-right">{formatCurrency(avgDaily.fees)}</td>
              <td className="text-right">{((totals.fees / totals.totalVolume) * 100).toFixed(1)}%</td>
            </tr>
            <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
              <td>Total Volume</td>
              <td className="text-right">{formatCurrency(totals.totalVolume)}</td>
              <td className="text-right">{formatCurrency(avgDaily.totalVolume)}</td>
              <td className="text-right">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Daily Transaction Detail */}
      <div className="print-section">
        <div className="print-section-title">Daily Transaction Detail</div>
        <table className="print-table" style={{ fontSize: '10px' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th className="text-right">Deposits</th>
              <th className="text-right">Withdrawals</th>
              <th className="text-right">Transfers</th>
              <th className="text-right">Loan Repay.</th>
              <th className="text-right">Fees</th>
              <th className="text-right">Total Volume</th>
            </tr>
          </thead>
          <tbody>
            {transactionSummary.map((summary, index) => (
              <tr key={index}>
                <td style={{ fontWeight: 'bold' }}>{formatDate(new Date(summary.date), 'MMM dd, yyyy')}</td>
                <td className="text-right">{formatCurrency(summary.deposits)}</td>
                <td className="text-right">{formatCurrency(summary.withdrawals)}</td>
                <td className="text-right">{formatCurrency(summary.transfers)}</td>
                <td className="text-right">{formatCurrency(summary.loanRepayments)}</td>
                <td className="text-right">{formatCurrency(summary.fees)}</td>
                <td className="text-right" style={{ fontWeight: 'bold' }}>{formatCurrency(summary.totalVolume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Insights */}
      <div className="print-section">
        <div className="print-section-title">Transaction Insights</div>
        <ul style={{ fontSize: '11px', lineHeight: '1.5', paddingLeft: '20px' }}>
          <li>Total transaction volume for the period: {formatCurrency(totals.totalVolume)}</li>
          <li>Average daily transaction volume: {formatCurrency(avgDaily.totalVolume)}</li>
          <li>Net cash flow (deposits - withdrawals): {formatCurrency(totals.deposits - totals.withdrawals)}</li>
          <li>Deposit to withdrawal ratio: {(totals.deposits / totals.withdrawals).toFixed(2)}:1</li>
          <li>Fee income represents {((totals.fees / totals.totalVolume) * 100).toFixed(2)}% of total transaction volume</li>
          <li>Loan repayments contributed {((totals.loanRepayments / totals.totalVolume) * 100).toFixed(1)}% to total volume</li>
        </ul>
      </div>

      {/* Print Footer */}
      <div className="print-footer">
        <div>ApexLink Banking System - Transaction Summary Report</div>
        <div>Confidential - For Internal Use Only</div>
      </div>
    </div>
  );
};

// Print Layout Component for Customer Metrics
const CustomerMetricsPrintLayout: React.FC<{
  customerMetrics: CustomerMetrics;
  filters: ReportFilter;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
}> = ({ customerMetrics, filters, formatCurrency, formatPercentage }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="print-layout" id="customer-metrics-print" style={{ 
      display: 'none',
      overflow: 'visible',
      height: 'auto',
      width: '100%',
      margin: 0,
      padding: 0
    }}>
      <PrintStyles />

      {/* Print Header */}
      <div className="print-header">
        <div className="print-title">ApexLink Banking System</div>
        <div className="print-subtitle">Customer Metrics Report</div>
        <div className="print-date-range">
          Period: {formatDate(new Date(filters.dateFrom), 'MMM dd, yyyy')} - {formatDate(new Date(filters.dateTo), 'MMM dd, yyyy')}
        </div>
        <div style={{ fontSize: '10px', marginTop: '10px' }}>
          Generated on: {currentDate}
        </div>
      </div>

      {/* Customer Overview */}
      <div className="print-section">
        <div className="print-section-title">Customer Base Overview</div>
        <div className="print-grid-4">
          <div className="print-metric">
            <div className="print-metric-label">Total Customers</div>
            <div className="print-metric-value print-metric-neutral">
              {customerMetrics.totalCustomers.toLocaleString()}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Active Customers</div>
            <div className="print-metric-value print-metric-positive">
              {customerMetrics.activeCustomers.toLocaleString()}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">New Customers</div>
            <div className="print-metric-value print-metric-positive">
              {customerMetrics.newCustomers.toLocaleString()}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Retention Rate</div>
            <div className="print-metric-value print-metric-positive">
              {formatPercentage(customerMetrics.customerRetentionRate)}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Engagement */}
      <div className="print-section">
        <div className="print-section-title">Customer Engagement Metrics</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="text-right">Value</th>
              <th className="text-right">Percentage</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active Customer Rate</td>
              <td className="text-right">{customerMetrics.activeCustomers.toLocaleString()}</td>
              <td className="text-right">{((customerMetrics.activeCustomers / customerMetrics.totalCustomers) * 100).toFixed(1)}%</td>
              <td>Customers with recent activity</td>
            </tr>
            <tr>
              <td>Customer Growth</td>
              <td className="text-right">{customerMetrics.newCustomers.toLocaleString()}</td>
              <td className="text-right">{((customerMetrics.newCustomers / customerMetrics.totalCustomers) * 100).toFixed(1)}%</td>
              <td>New customers this period</td>
            </tr>
            <tr>
              <td>Average Accounts per Customer</td>
              <td className="text-right">{customerMetrics.averageAccountsPerCustomer.toFixed(2)}</td>
              <td className="text-right">-</td>
              <td>Cross-selling effectiveness</td>
            </tr>
            <tr>
              <td>Customer Retention Rate</td>
              <td className="text-right">-</td>
              <td className="text-right">{formatPercentage(customerMetrics.customerRetentionRate)}</td>
              <td>Customer loyalty indicator</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Top Customers */}
      <div className="print-section">
        <div className="print-section-title">Top Customers by Account Balance</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Customer Name</th>
              <th className="text-right">Total Balance</th>
              <th className="text-right">Account Count</th>
              <th className="text-right">Avg per Account</th>
            </tr>
          </thead>
          <tbody>
            {customerMetrics.topCustomersByBalance.map((customer, index) => (
              <tr key={index}>
                <td style={{ fontWeight: 'bold' }}>#{index + 1}</td>
                <td>{customer.name}</td>
                <td className="text-right" style={{ fontWeight: 'bold' }}>{formatCurrency(customer.totalBalance)}</td>
                <td className="text-right">{customer.accountCount}</td>
                <td className="text-right">{formatCurrency(customer.totalBalance / customer.accountCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Analysis */}
      <div className="print-section">
        <div className="print-section-title">Customer Segmentation Analysis</div>
        <div className="print-grid-3">
          <div className="print-metric">
            <div className="print-metric-label">High Value Customers</div>
            <div className="print-metric-value print-metric-positive">
              {customerMetrics.topCustomersByBalance.length}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Total HVC Balance</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(customerMetrics.topCustomersByBalance.reduce((sum, c) => sum + c.totalBalance, 0))}
            </div>
          </div>
          <div className="print-metric">
            <div className="print-metric-label">Avg HVC Balance</div>
            <div className="print-metric-value print-metric-positive">
              {formatCurrency(customerMetrics.topCustomersByBalance.reduce((sum, c) => sum + c.totalBalance, 0) / customerMetrics.topCustomersByBalance.length)}
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="print-section">
        <div className="print-section-title">Customer KPIs & Insights</div>
        <ul style={{ fontSize: '11px', lineHeight: '1.5', paddingLeft: '20px' }}>
          <li>Customer base composition: {customerMetrics.totalCustomers.toLocaleString()} total customers with {((customerMetrics.activeCustomers / customerMetrics.totalCustomers) * 100).toFixed(1)}% active</li>
          <li>Growth rate: {customerMetrics.newCustomers} new customers added during reporting period</li>
          <li>Cross-selling success: Average of {customerMetrics.averageAccountsPerCustomer.toFixed(2)} accounts per customer</li>
          <li>Customer loyalty: {formatPercentage(customerMetrics.customerRetentionRate)} retention rate indicates strong customer satisfaction</li>
          <li>High-value segment: Top {customerMetrics.topCustomersByBalance.length} customers hold {formatCurrency(customerMetrics.topCustomersByBalance.reduce((sum, c) => sum + c.totalBalance, 0))}</li>
          <li>Customer concentration: Top customer represents {customerMetrics.topCustomersByBalance.length > 0 ? ((customerMetrics.topCustomersByBalance[0].totalBalance / customerMetrics.topCustomersByBalance.reduce((sum, c) => sum + c.totalBalance, 0)) * 100).toFixed(1) : '0'}% of top customer balances</li>
        </ul>
      </div>

      {/* Report Summary */}
      <div className="print-section">
        <div className="print-section-title">Executive Summary</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Key Metric</th>
              <th className="text-right">Current Value</th>
              <th>Performance Assessment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Customer Growth</td>
              <td className="text-right">{((customerMetrics.newCustomers / customerMetrics.totalCustomers) * 100).toFixed(1)}%</td>
              <td>{((customerMetrics.newCustomers / customerMetrics.totalCustomers) * 100) > 5 ? 'Strong Growth' : 'Moderate Growth'}</td>
            </tr>
            <tr>
              <td>Customer Retention</td>
              <td className="text-right">{formatPercentage(customerMetrics.customerRetentionRate)}</td>
              <td>{customerMetrics.customerRetentionRate > 90 ? 'Excellent' : customerMetrics.customerRetentionRate > 80 ? 'Good' : 'Needs Improvement'}</td>
            </tr>
            <tr>
              <td>Cross-selling Ratio</td>
              <td className="text-right">{customerMetrics.averageAccountsPerCustomer.toFixed(2)}</td>
              <td>{customerMetrics.averageAccountsPerCustomer > 2 ? 'Effective' : 'Opportunity for Improvement'}</td>
            </tr>
          </tbody>
        </table>
      </div>      {/* Print Footer */}
      <div className="print-footer">
        <div>ApexLink Banking System - Customer Metrics Report</div>
        <div>Confidential - For Internal Use Only</div>
      </div>
    </div>
  );
};

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
  };  const printReport = () => {
    // Get the current report's print layout ID
    const printLayoutId = `${selectedReport}-print`;
    const currentPrintLayout = document.getElementById(printLayoutId);
    
    if (!currentPrintLayout) {
      console.warn(`Print layout not found for ${selectedReport}`);
      return;
    }

    // Hide all print layouts first
    const allPrintLayouts = document.querySelectorAll('.print-layout');
    allPrintLayouts.forEach(layout => {
      (layout as HTMLElement).style.display = 'none';
    });
    
    // Clone the print layout to ensure it's completely isolated
    const printClone = currentPrintLayout.cloneNode(true) as HTMLElement;
    printClone.style.display = 'block';
    printClone.style.position = 'fixed';
    printClone.style.top = '0';
    printClone.style.left = '0';
    printClone.style.width = '100%';
    printClone.style.height = '100%';
    printClone.style.zIndex = '9999';
    printClone.style.background = 'white';
    printClone.id = 'print-clone';
    
    // Add print-ready class and append clone
    document.body.classList.add('print-ready');
    document.body.appendChild(printClone);
    
    setTimeout(() => {
      window.print();
      
      // Restore after printing
      setTimeout(() => {
        document.body.classList.remove('print-ready');
        const cloneElement = document.getElementById('print-clone');
        if (cloneElement) {
          document.body.removeChild(cloneElement);
        }
      }, 100);
    }, 100);
  };useEffect(() => {
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
  };  return (
    <div className="space-y-6 p-6">
      {/* Print Layouts for All Report Types */}
      {selectedReport === 'financial-summary' && financialSummary && (
        <FinancialSummaryPrintLayout
          financialSummary={financialSummary}
          filters={filters}
          formatCurrency={formatCurrency}
        />
      )}
      
      {selectedReport === 'account-analytics' && accountAnalytics && accountAnalytics.length > 0 && (
        <AccountAnalyticsPrintLayout
          accountAnalytics={accountAnalytics}
          filters={filters}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
      )}
      
      {selectedReport === 'loan-portfolio' && loanPortfolio && (
        <LoanPortfolioPrintLayout
          loanPortfolio={loanPortfolio}
          filters={filters}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
      )}
      
      {selectedReport === 'transaction-summary' && transactionSummary && transactionSummary.length > 0 && (
        <TransactionSummaryPrintLayout
          transactionSummary={transactionSummary}
          filters={filters}
          formatCurrency={formatCurrency}
        />
      )}
      
      {selectedReport === 'customer-metrics' && customerMetrics && (
        <CustomerMetricsPrintLayout
          customerMetrics={customerMetrics}
          filters={filters}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
      )}

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
