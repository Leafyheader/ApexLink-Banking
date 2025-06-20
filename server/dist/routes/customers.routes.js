"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customers_controller_1 = require("../controllers/customers.controller");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../middleware/validators");
const router = (0, express_1.Router)();
// GET /api/customers - Get all customers with pagination and search
router.get('/', auth_1.authenticateToken, customers_controller_1.getCustomers);
// GET /api/customers/:id - Get single customer by ID
router.get('/:id', auth_1.authenticateToken, customers_controller_1.getCustomerById);
// POST /api/customers - Create new customer
router.post('/', auth_1.authenticateToken, ...validators_1.validateCustomerData, customers_controller_1.createCustomer);
// PUT /api/customers/:id - Update customer
router.put('/:id', auth_1.authenticateToken, ...validators_1.validateCustomerData, customers_controller_1.updateCustomer);
// DELETE /api/customers/:id - Delete customer
router.delete('/:id', auth_1.authenticateToken, customers_controller_1.deleteCustomer);
// PATCH /api/customers/:id/kyc - Update KYC status
router.patch('/:id/kyc', auth_1.authenticateToken, ...validators_1.validateKYCStatus, customers_controller_1.updateKYCStatus);
exports.default = router;
