import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Shield,
  Settings,
  Trash2,
  Eye,
  X,
  Pencil,
  Power
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { formatDate } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'TELLER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user: loggedInUser } = useAuth();

  // State for user data
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [isToggleStatusModalOpen, setIsToggleStatusModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<'ADMIN' | 'MANAGER' | 'TELLER'>('TELLER');

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users from API with pagination
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });
        
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }
        
        const response = await api.get(`/users?${params.toString()}`);
        setUsers(response.data.users || response.data || []);
        setTotalItems(response.data.pagination?.total || response.data.length || 0);
        setTotalPages(response.data.pagination?.totalPages || Math.ceil((response.data.length || 0) / itemsPerPage));
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, itemsPerPage, searchQuery]);

  // Handle search with debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    setCurrentUser(user);
    setIsDeleteModalOpen(true);
  };

  // Extracts the backend's specific message (e.g. "Cannot delete your own account") instead of
  // a generic string that hides exactly why the action was rejected. Surfaced via alert(), not
  // the page-level `error` state - that state triggers a full-page replacement (see the render
  // below), which would blow away the whole page instead of just reporting a failed modal action.
  const getActionErrorMessage = (err: unknown, fallback: string): string =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

  // Confirm delete user
  const confirmDeleteUser = async () => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      await api.delete(`/users/${currentUser.id}`);
      const updatedUsers = users.filter(user => user.id !== currentUser.id);
      setUsers(updatedUsers);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(getActionErrorMessage(err, 'Failed to delete user'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit role
  const handleEditRole = (user: User) => {
    setCurrentUser(user);
    setEditRoleValue(user.role);
    setIsEditRoleModalOpen(true);
  };

  // Confirm edit role
  const confirmEditRole = async () => {
    if (!currentUser) return;

    setActionLoading(true);

    try {
      const response = await api.put(`/users/${currentUser.id}`, { role: editRoleValue });
      const updatedUser: User = response.data.user;
      setUsers(users.map(user => (user.id === updatedUser.id ? updatedUser : user)));
      setIsEditRoleModalOpen(false);
      setCurrentUser(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      alert(getActionErrorMessage(err, 'Failed to update role'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle toggle status (activate/deactivate)
  const handleToggleStatus = (user: User) => {
    setCurrentUser(user);
    setIsToggleStatusModalOpen(true);
  };

  // Confirm toggle status - uses the dedicated toggle-status endpoint (not a generic PUT) so
  // the backend's self-deactivation guard ("Cannot disable your own account") still applies.
  const confirmToggleStatus = async () => {
    if (!currentUser) return;

    setActionLoading(true);

    try {
      const response = await api.patch(`/users/${currentUser.id}/toggle-status`);
      const updatedUser: User = response.data.user;
      setUsers(users.map(user => (user.id === updatedUser.id ? updatedUser : user)));
      setIsToggleStatusModalOpen(false);
      setCurrentUser(null);
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      alert(getActionErrorMessage(err, 'Failed to update user status'));
    } finally {
      setActionLoading(false);
    }
  };

  // Get role badge variant
  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'MANAGER':
        return 'warning';
      case 'TELLER':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield size={14} />;
      case 'MANAGER':
        return <Settings size={14} />;
      case 'TELLER':
        return <Eye size={14} />;
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-dark-text">Loading users...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-dark-text">User Management</h1>
          <p className="text-muted-foreground dark:text-gray-300">
            Manage system users and their roles
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearch}
              leftIcon={<Search size={18} />}
              rightIcon={
                searchQuery ? (
                  <button onClick={() => setSearchQuery('')}>
                    <X size={18} />
                  </button>
                ) : undefined
              }
              fullWidth
            />
          </div>
          <Button
            leftIcon={<UserPlus size={18} />}
            onClick={() => navigate('/users/new')}
          >
            Add User
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden dark:border dark:border-dark-border">
        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-dark-text">
                    {user.name}
                  </TableCell>
                  <TableCell className="dark:text-dark-text">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(user.role)} className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="dark:text-dark-text">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </TableCell>
                  <TableCell className="dark:text-dark-text">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil size={16} />}
                        onClick={() => handleEditRole(user)}
                        title="Edit role"
                      >
                        Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Power size={16} />}
                        onClick={() => handleToggleStatus(user)}
                        disabled={loggedInUser?.id === user.id}
                        title={loggedInUser?.id === user.id ? "You can't deactivate your own account" : undefined}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 size={16} />}
                        onClick={() => handleDeleteUser(user)}
                        disabled={loggedInUser?.id === user.id}
                        title={loggedInUser?.id === user.id ? "You can't delete your own account" : undefined}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500 dark:text-dark-text">
                    {searchQuery
                      ? 'No users found matching your search criteria'
                      : 'No users found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary Information */}
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} users
          {searchQuery && ` (search: "${searchQuery}")`}
        </span>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex justify-center items-center gap-4 p-4 bg-white dark:bg-dark-surface rounded-lg shadow dark:border dark:border-dark-border">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:text-dark-text rounded">
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Next
          </button>
          <div className="ml-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
            Total: {totalItems} users
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {currentUser && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete User"
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteUser}
                isLoading={isLoading}
              >
                Delete User
              </Button>
            </div>
          }
        >
          <p className="text-gray-700 dark:text-dark-text">
            Are you sure you want to delete user "{currentUser.name}"? This action cannot be undone.
          </p>
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Warning:</strong> Deleting this user will remove their access to the system immediately.
            </p>
          </div>
        </Modal>
      )}

      {/* Edit Role Modal */}
      {currentUser && (
        <Modal
          isOpen={isEditRoleModalOpen}
          onClose={() => setIsEditRoleModalOpen(false)}
          title="Edit User Role"
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsEditRoleModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmEditRole}
                isLoading={actionLoading}
              >
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-dark-text">
              Change the role for <strong>{currentUser.name}</strong> ({currentUser.username}).
            </p>
            <Select
              label="Role"
              value={editRoleValue}
              onChange={(value) => setEditRoleValue(value as 'ADMIN' | 'MANAGER' | 'TELLER')}
              options={[
                { value: 'ADMIN', label: 'Administrator' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'TELLER', label: 'Teller' }
              ]}
              fullWidth
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>Administrator:</strong> Full system access</p>
              <p><strong>Manager:</strong> Manage users and approve transactions</p>
              <p><strong>Teller:</strong> Process customer transactions</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Toggle Status Modal */}
      {currentUser && (
        <Modal
          isOpen={isToggleStatusModalOpen}
          onClose={() => setIsToggleStatusModalOpen(false)}
          title={currentUser.isActive ? 'Deactivate User' : 'Activate User'}
          footer={
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsToggleStatusModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={currentUser.isActive ? 'danger' : 'primary'}
                onClick={confirmToggleStatus}
                isLoading={actionLoading}
              >
                {currentUser.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          }
        >
          <p className="text-gray-700 dark:text-dark-text">
            Are you sure you want to {currentUser.isActive ? 'deactivate' : 'activate'} user "{currentUser.name}"?
          </p>
          {currentUser.isActive ? (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Note:</strong> This immediately blocks their access - both new logins and
                any of their currently active sessions.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-300">
                This user will be able to log in again immediately.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Users;
