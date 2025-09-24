import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeftRight,
  Landmark,
  FileText,
  Settings,
  Menu,
  X,
  Bell,
  LogOut,
  Sun,
  Moon,
  PiggyBank,
  Receipt,
  UserCheck,
} from 'lucide-react';
import Button from '../ui/Button';
import ApexLinkLogo from '../icons/BankingIcon';
import { useAuth } from '../../contexts/AuthContext';
import BankingIcon from '../icons/BankingIcon';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  const location = useLocation();
  const { logout } = useAuth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Customers', path: '/customers', icon: <Users size={20} /> },
    { name: 'Accounts', path: '/accounts', icon: <CreditCard size={20} /> },
    { name: 'Account Authorization', path: '/account-authorizations', icon: <CreditCard size={20} /> },
    { name: 'Withdrawal Authorization', path: '/withdrawal-authorizations', icon: <ArrowLeftRight size={20} /> },
    { name: 'Transactions', path: '/transactions', icon: <ArrowLeftRight size={20} /> },
    { name: 'Loans', path: '/loans', icon: <Landmark size={20} /> },
    { name: 'Bank Income', path: '/bank-income', icon: <PiggyBank size={20} /> },
    { name: 'Expenses', path: '/expenses', icon: <Receipt size={20} /> },
    { name: 'Expense Approval', path: '/expense-approval', icon: <Receipt size={20} /> },
    { name: 'User Management', path: '/users', icon: <UserCheck size={20} /> },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const closeSidebarIfMobile = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-light-bg dark:bg-dark-bg">
      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          isSidebarOpen ? 'block' : 'hidden'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          aria-hidden="true"
          onClick={toggleSidebar}
        ></div>

        {/* Sidebar */}
        <div className="relative flex flex-col flex-1 w-full max-w-xs pt-5 pb-4 bg-light-surface dark:bg-dark-surface">
          <div className="absolute top-0 right-0 pt-2 mr-2">
            <button
              className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={toggleSidebar}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="w-6 h-6 text-gray-500" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center flex-shrink-0 px-4">
            <ApexLinkLogo size={28} className="text-blue-600 dark:text-blue-400 mr-3" />
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              BankCore
            </span>
          </div>
          <div className="flex-1 h-0 mt-5 overflow-y-auto">
            <nav className="px-2 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                  }`}
                  onClick={closeSidebarIfMobile}
                >
                  <span className="mr-4">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-1 min-h-0 bg-light-surface border-r border-light-border dark:bg-dark-surface dark:border-dark-border">
            <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <BankingIcon size={32} className="text-blue-600 dark:text-blue-400 mr-3" />
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ApexLink Banking System
                </span>
              </div>
              <nav className="flex-1 mt-5 px-2 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname === item.path
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex flex-shrink-0 p-4 border-t border-light-border dark:border-dark-border">
              <div className="flex items-center">
                <div>
                  <img
                    className="inline-block w-10 h-10 rounded-full"
                    src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=48"
                    alt="User avatar"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-light-text dark:text-dark-text">
                    John Smith
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Bank Manager
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top navigation */}
        <div className="flex-shrink-0 bg-light-surface border-b border-light-border dark:bg-dark-surface dark:border-dark-border">
          <div className="flex justify-between h-16">
            <div className="flex px-4 lg:px-0">
              <div className="flex items-center flex-shrink-0 lg:hidden">
                <button
                  className="px-4 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  onClick={toggleSidebar}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Menu className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center px-2 lg:px-6">
                <h1 className="text-xl font-semibold text-light-text dark:text-dark-text">
                  {navigationItems.find((item) => item.path === location.pathname)?.name || 'Dashboard'}
                </h1>
              </div>
            </div>
            <div className="flex items-center px-4 lg:px-6">
              <Button
                variant="ghost"
                size="sm"
                className="mr-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-500" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="mr-2 relative"
                aria-label="Notifications"
              >
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 dark:text-gray-400"
                aria-label="Logout"
                onClick={logout}
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-light-bg dark:bg-dark-bg">
          <div className="py-6">
            <div className="px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;