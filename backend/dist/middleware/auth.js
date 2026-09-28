"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // The JWT's signature being valid only proves it was issued by us - it says nothing about
        // whether the user is still allowed in *right now*. Without this check, deactivating or
        // deleting a user (see users.controller.ts) would not actually revoke their access until
        // their existing token happened to expire (up to JWT_EXPIRES_IN, currently 24h) - the token
        // itself carries no live status. Re-checking against the DB on every request costs one
        // indexed lookup but is what makes "deactivate this user" actually take effect immediately.
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { isActive: true }
        });
        if (!user) {
            res.status(401).json({ message: 'User no longer exists' });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({ message: 'This account has been deactivated. Contact an administrator.' });
            return;
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({ message: 'Invalid token' });
        return;
    }
};
exports.authenticateToken = authenticateToken;
