"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireManagerOrAdmin = exports.requireAdmin = exports.requireRole = void 0;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        // Check if user has required role
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                message: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', ')
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'ADMIN') {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireManagerOrAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
        res.status(403).json({ message: 'Manager or Admin access required' });
        return;
    }
    next();
};
exports.requireManagerOrAdmin = requireManagerOrAdmin;
