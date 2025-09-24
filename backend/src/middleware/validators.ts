import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validateUserRegistration = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['ADMIN', 'MANAGER', 'TELLER']).withMessage('Role must be ADMIN, MANAGER, or TELLER'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];

export const validateLogin = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('password').notEmpty().withMessage('Password is required'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];

export const validateCustomerData = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),  body('phone')
    .optional()
    .matches(/^[\+]?[0-9][\d]{0,15}$/).withMessage('Invalid phone number format'),
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('beneficiaryPercentage')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Beneficiary percentage must be between 0 and 100'),
  body('beneficiary2Percentage')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Beneficiary 2 percentage must be between 0 and 100'),
  body('beneficiary3Percentage')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Beneficiary 3 percentage must be between 0 and 100'),  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
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

export const validateKYCStatus = [
  body('kycStatus')
    .notEmpty().withMessage('KYC status is required')
    .isIn(['verified', 'pending', 'rejected']).withMessage('Invalid KYC status'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];

// Account validators
export const validateAccountData = [
  body('customerId')
    .notEmpty().withMessage('Customer ID is required'),
  body('type')
    .notEmpty().withMessage('Account type is required')
    .isIn(['SAVINGS', 'CURRENT', 'LOAN']).withMessage('Invalid account type'),
  body('balance')
    .optional()
    .isNumeric().withMessage('Balance must be a number'),
  body('currency')
    .optional()
    .isString().withMessage('Currency must be a string'),
  body('minimumBalance')
    .optional()
    .isNumeric().withMessage('Minimum balance must be a number'),
  body('overdraftLimit')
    .optional()
    .isNumeric().withMessage('Overdraft limit must be a number'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];

export const validateAccountStatus = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['ACTIVE', 'DORMANT', 'CLOSED', 'FROZEN']).withMessage('Invalid account status'),
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  }
];
