import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ApexLinkLogo from '../components/icons/ApexLinkLogo';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');    try {
      const success = await login(formData.username, formData.password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

   
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-700 to-indigo-800 overflow-hidden">
      {/* Full Screen Background with Animation */}
      <div className="absolute inset-0">
        {/* Animated background elements */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-indigo-300 bg-opacity-15 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-white bg-opacity-20 rounded-lg rotate-12 animate-bounce delay-500"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-blue-400 bg-opacity-10 rounded-full animate-pulse delay-700"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-transparent to-transparent opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-5"></div>
      </div>

      {/* Banking-themed background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Bank building silhouettes */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent opacity-20"></div>
        <div className="absolute bottom-0 left-10 w-16 h-24 bg-black bg-opacity-30 rounded-t-lg"></div>
        <div className="absolute bottom-0 left-32 w-20 h-28 bg-black bg-opacity-25 rounded-t-lg"></div>
        <div className="absolute bottom-0 right-20 w-12 h-20 bg-black bg-opacity-35 rounded-t-lg"></div>
        <div className="absolute bottom-0 right-40 w-18 h-32 bg-black bg-opacity-20 rounded-t-lg"></div>
        
        {/* Currency symbols floating */}
        <div className="absolute top-16 left-1/4 text-white text-opacity-10 text-6xl font-bold animate-float">$</div>
        <div className="absolute top-1/2 right-16 text-white text-opacity-10 text-4xl font-bold animate-float-delayed">₵</div>
        <div className="absolute bottom-1/3 left-16 text-white text-opacity-10 text-5xl font-bold animate-float">€</div>
      </div>

      {/* Centered Login Card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-center relative overflow-hidden">
              {/* Decorative elements in header */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white border-opacity-30 rounded-full"></div>
                <div className="absolute top-8 right-8 w-6 h-6 border-2 border-white border-opacity-20 rounded-lg rotate-45"></div>
                <div className="absolute bottom-4 left-1/3 w-4 h-4 bg-white bg-opacity-20 rounded-full"></div>
                <div className="absolute bottom-8 right-1/4 w-3 h-3 bg-white bg-opacity-30 rounded-full"></div>
              </div>
                <div className="flex justify-center mb-6 relative z-10">                <div className="bg-white bg-opacity-20 p-4 rounded-full backdrop-blur-sm border border-white border-opacity-30 shadow-lg">
                  <ApexLinkLogo size={48} className="text-white drop-shadow-lg" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2 relative z-10 drop-shadow-sm">
                ApexLink Banking System
              </h1>
              <p className="text-blue-100 relative z-10">
                Sign in to your Banking System account
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-8 bg-gradient-to-b from-white to-gray-50">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center animate-pulse">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username"
                    leftIcon={<Mail size={18} />}
                    fullWidth
                    className="h-12"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      leftIcon={<Lock size={18} />}
                      fullWidth
                      className="h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => alert('Forgot password functionality coming soon!')}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting || isLoading}
                  className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSubmitting || isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Divider */}
              <div className="mt-8 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    
                  </div>
                </div>
              </div>

              {/* Demo Login Options */}
               
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-4 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600 flex items-center justify-center">
                <Lock className="h-3 w-3 mr-1" />
                Protected by enterprise-grade security
              </p>
            </div>
          </div>          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white text-opacity-90 bg-white bg-opacity-10 rounded-full px-6 py-3 backdrop-blur-sm border border-white border-opacity-20 shadow-lg">
              Need help? Contact{' '}
              <button className="text-blue-200 hover:text-white font-medium underline transition-colors">
                IT Support
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
