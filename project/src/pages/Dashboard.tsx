import React, { useState, useEffect } from 'react';
import { 
  Users, 
  PiggyBank, 
  Landmark, 
  ArrowLeftRight,
  ArrowDownCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import SummaryCard from '../components/dashboard/SummaryCard';
import RecentActivityTable from '../components/dashboard/RecentActivityTable';
import { DashboardSummary, Transaction } from '../types';
import api, { handleApiError } from '../lib/api';

// Dashboard chart data interfaces
interface MonthlyTransactionData {
  month: string;
  transactionCount: number;
  deposits: number;
  withdrawals: number;
}

interface AccountDistribution {
  type: string;
  count: number;
  totalBalance: number;
}

interface DashboardStats {
  monthlyTransactions: MonthlyTransactionData[];
  accountDistribution: AccountDistribution[];
}

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Format currency for charts
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format month labels
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [summaryResponse, transactionsResponse, statsResponse] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/transactions?limit=10'),
          api.get('/dashboard/stats')
        ]);
        
        setDashboardData(summaryResponse.data);
        setRecentTransactions(transactionsResponse.data);
        setDashboardStats(statsResponse.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Total Customers"
          value={dashboardData.totalCustomers}
          icon={<Users size={24} />}
          change={dashboardData.changes?.customers}
        />
        <SummaryCard
          title="Total Deposits"
          value={dashboardData.totalDeposits}
          icon={<PiggyBank size={24} />}
          change={dashboardData.changes?.deposits}
          isCurrency
        />
        <SummaryCard
          title="Total Withdrawals"
          value={dashboardData.totalWithdrawals}
          icon={<ArrowDownCircle size={24} />}
          change={dashboardData.changes?.withdrawals}
          isCurrency
        />
        <SummaryCard
          title="Total Loans"
          value={dashboardData.totalLoans}
          icon={<Landmark size={24} />}
          change={dashboardData.changes?.loans}
          isCurrency
        />
        <SummaryCard
          title="Today's Transactions"
          value={dashboardData.todayTransactions}
          icon={<ArrowLeftRight size={24} />}
          change={dashboardData.changes?.transactions}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Loan Portfolio Chart */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Account Distribution</h3>
          </div>
          <div className="p-6 h-80">
            {dashboardStats?.accountDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="count"
                    data={dashboardStats.accountDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, count }) => `${type.toUpperCase()}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                  >
                    {dashboardStats.accountDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} accounts`]}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0] && payload[0].payload) {
                        return payload[0].payload.type.toUpperCase();
                      }
                      return '';
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <p className="text-gray-500">Loading account distribution...</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Trends Chart */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Monthly Transaction Trends</h3>
          </div>
          <div className="p-6 h-80">
            {dashboardStats?.monthlyTransactions ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardStats.monthlyTransactions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={formatMonthLabel}
                  />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip 
                    labelFormatter={(label) => formatMonthLabel(label)}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'deposits' ? 'Deposits' : 'Withdrawals'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="deposits" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="Deposits"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="withdrawals" 
                    stroke="#FF8042" 
                    strokeWidth={2}
                    name="Withdrawals"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <p className="text-gray-500">Loading transaction trends...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Volume Bar Chart */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Transaction Volume</h3>
        </div>
        <div className="p-6 h-80">
          {dashboardStats?.monthlyTransactions ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardStats.monthlyTransactions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonthLabel}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => formatMonthLabel(label)}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'transactionCount' ? 'Total Transactions' : name
                  ]}
                />
                <Legend />
                <Bar 
                  dataKey="transactionCount" 
                  fill="#8884d8"
                  name="Total Transactions"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <p className="text-gray-500">Loading transaction volume...</p>
            </div>
          )}
        </div>
      </div>

      <RecentActivityTable transactions={recentTransactions} />
    </div>
  );
};

export default Dashboard;