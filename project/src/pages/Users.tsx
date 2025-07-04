import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus,
  Search,
  Shield,
  Settings,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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
  
  // State for user data
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to delete user');
    } finally {
      setIsLoading(false);
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
        <div className="text-lg text-gray-600">Loading users...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  <TableCell className="font-medium text-gray-900">
                    {user.name}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
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
                  <TableCell>
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 size={16} />}
                        onClick={() => handleDeleteUser(user)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
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
      <div className="flex justify-between items-center text-sm text-gray-600">
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
        <div className="flex justify-center items-center gap-4 p-4 bg-white rounded-lg shadow">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded">
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            Next
          </button>
          <div className="ml-4 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
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
          <p className="text-gray-700">
            Are you sure you want to delete user "{currentUser.name}"? This action cannot be undone.
          </p>
          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700">
              <strong>Warning:</strong> Deleting this user will remove their access to the system immediately.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Users;
