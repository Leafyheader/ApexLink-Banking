import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import CustomerTransactions from './pages/CustomerTransactions';
import NewCustomer from './pages/NewCustomer';
import EditCustomer from './pages/EditCustomer';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import AccountAuthorization from './pages/AccountAuthorization';
import WithdrawalAuthorization from './pages/WithdrawalAuthorization';
import Transactions from './pages/Transactions';
import Loans from './pages/Loans';
import BankIncome from './pages/BankIncome';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import ExpenseApproval from './pages/ExpenseApproval';
import Users from './pages/Users';
import CreateUser from './pages/CreateUser';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';

// Import other pages as they are created
// import Reports from './pages/Reports';
// import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route path="/" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/new" element={<NewCustomer />} />
              <Route path="customers/:id/edit" element={<EditCustomer />} />
              <Route path="customers/:id/transactions" element={<CustomerTransactions />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="accounts/:id" element={<AccountDetail />} />
              <Route path="account-authorizations" element={<AccountAuthorization />} />
              <Route path="withdrawal-authorizations" element={<WithdrawalAuthorization />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="loans" element={<Loans />} />
              <Route path="bank-income" element={<BankIncome />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="expense-approval" element={<ExpenseApproval />} />
              <Route path="users" element={<Users />} />
              <Route path="users/new" element={<CreateUser />} />
              <Route path="reports" element={<Reports />} />
              {/* Add routes for other pages as they are created */}
            </Route>
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </ToastProvider>
  );
};

// Simple 404 page
const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found</p>
      <p className="text-gray-500">The page you are looking for doesn't exist or has been moved.</p>
    </div>
  );
};

export default App;