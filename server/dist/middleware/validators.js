"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAccountStatus = exports.validateAccountData = exports.validateKYCStatus = exports.validateCustomerData = exports.validateLogin = void 0;
const express_validator_1 = require("express-validator");
exports.validateLogin = [
    (0, express_validator_1.body)('username')
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        next();
    }
];
exports.validateCustomerData = [
    (0, express_validator_1.body)('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail().withMessage('Invalid email format'), (0, express_validator_1.body)('phone')
        .optional()
        .matches(/^[\+]?[0-9][\d]{0,15}$/).withMessage('Invalid phone number format'),
    (0, express_validator_1.body)('dateOfBirth')
        .optional()
        .isISO8601().withMessage('Invalid date format'),
    (0, express_validator_1.body)('beneficiaryPercentage')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('Beneficiary percentage must be between 0 and 100'),
    (0, express_validator_1.body)('beneficiary2Percentage')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('Beneficiary 2 percentage must be between 0 and 100'),
    (0, express_validator_1.body)('beneficiary3Percentage')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('Beneficiary 3 percentage must be between 0 and 100'), (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        // Custom validation for total beneficiary percentage
        const { beneficiaryPercentage, beneficiary2Percentage, beneficiary3Percentage } = req.body;
        const total = (beneficiaryPercentage || 0) + (beneficiary2Percentage || 0) + (beneficiary3Percentage || 0);
        if (total > 100) {
            res.status(400).json({
                errors: [{ msg: 'Total beneficiary percentage cannot exceed 100%' }]
            });
            return;
        }
        next();
    }
];
exports.validateKYCStatus = [
    (0, express_validator_1.body)('kycStatus')
        .notEmpty().withMessage('KYC status is required')
        .isIn(['verified', 'pending', 'rejected']).withMessage('Invalid KYC status'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        next();
    }
];
// Account validators
exports.validateAccountData = [
    (0, express_validator_1.body)('customerId')
        .notEmpty().withMessage('Customer ID is required'),
    (0, express_validator_1.body)('type')
        .notEmpty().withMessage('Account type is required')
        .isIn(['SAVINGS', 'CURRENT', 'LOAN']).withMessage('Invalid account type'),
    (0, express_validator_1.body)('balance')
        .optional()
        .isNumeric().withMessage('Balance must be a number'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isString().withMessage('Currency must be a string'),
    (0, express_validator_1.body)('minimumBalance')
        .optional()
        .isNumeric().withMessage('Minimum balance must be a number'),
    (0, express_validator_1.body)('overdraftLimit')
        .optional()
        .isNumeric().withMessage('Overdraft limit must be a number'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        next();
    }
];
exports.validateAccountStatus = [
    (0, express_validator_1.body)('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['ACTIVE', 'DORMANT', 'CLOSED', 'FROZEN']).withMessage('Invalid account status'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        next();
    }
];
