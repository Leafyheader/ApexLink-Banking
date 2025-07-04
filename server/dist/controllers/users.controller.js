"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleUserStatus = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getUsers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get all users with pagination and search
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        // Build where clause for search
        const whereClause = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { username: { contains: search, mode: 'insensitive' } }
                ]
            }
            : {};
        // Get users with pagination
        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    username: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    lastLoginAt: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.user.count({ where: whereClause })
        ]);
        const totalPages = Math.ceil(totalCount / limit);
        res.json({
            users,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUsers = getUsers;
// Get single user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUserById = getUserById;
// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, username, role, isActive } = req.body;
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // If username is being changed, check if new username already exists
        if (username && username !== existingUser.username) {
            const usernameExists = await prisma.user.findUnique({
                where: { username }
            });
            if (usernameExists) {
                return res.status(400).json({ message: 'Username already exists' });
            }
        }
        // Update user
        const updatedUser = await prisma.user.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (username && { username })), (role && { role })), (typeof isActive === 'boolean' && { isActive })),
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true,
                updatedAt: true
            }
        });
        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateUser = updateUser;
// Delete user
const deleteUser = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Prevent self-deletion
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        // Delete user
        await prisma.user.delete({
            where: { id }
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteUser = deleteUser;
// Toggle user active status
const toggleUserStatus = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Prevent disabling own account
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === id) {
            return res.status(400).json({ message: 'Cannot disable your own account' });
        }
        // Toggle active status
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive: !existingUser.isActive },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true,
                updatedAt: true
            }
        });
        res.json({
            message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.toggleUserStatus = toggleUserStatus;
