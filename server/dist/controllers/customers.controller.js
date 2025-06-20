"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKYCStatus = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomerById = exports.getCustomers = void 0;
const client_1 = require("@prisma/client");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new client_1.PrismaClient();
// Get all customers with pagination and search
const getCustomers = async (req, res) => {
    try {
        const { page = '1', limit = '10', search = '', kycStatus } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause for search and filtering
        const whereClause = {};
        if (search && typeof search === 'string' && search.trim()) {
            whereClause.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
                { contactNumber: { contains: search } }
            ];
        }
        if (kycStatus) {
            whereClause.kycStatus = kycStatus;
        }
        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where: whereClause,
                include: {
                    accounts: {
                        select: {
                            id: true,
                            accountNumber: true,
                            type: true,
                            status: true,
                            balance: true
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip: offset,
                take: limitNum
            }),
            prisma.customer.count({ where: whereClause })
        ]); // Format the response to match frontend expectations
        const formattedCustomers = customers.map((customer) => {
            var _a;
            return ({
                id: customer.id,
                name: customer.name,
                email: customer.email || '',
                phone: customer.phone || customer.contactNumber || '',
                address: customer.address || customer.residentialAddress || '',
                kycStatus: customer.kycStatus.toLowerCase(),
                dateJoined: customer.dateJoined.toISOString(),
                accounts: customer.accounts,
                // Extended fields
                firstName: customer.firstName,
                surname: customer.surname,
                gender: customer.gender,
                dateOfBirth: (_a = customer.dateOfBirth) === null || _a === void 0 ? void 0 : _a.toISOString(),
                occupation: customer.occupation,
                workplace: customer.workplace,
                maritalStatus: customer.maritalStatus,
                residentialAddress: customer.residentialAddress,
                postalAddress: customer.postalAddress,
                contactNumber: customer.contactNumber,
                city: customer.city,
                beneficiaryName: customer.beneficiaryName,
                beneficiaryContact: customer.beneficiaryContact,
                beneficiaryPercentage: customer.beneficiaryPercentage,
                beneficiary2Name: customer.beneficiary2Name,
                beneficiary2Contact: customer.beneficiary2Contact,
                beneficiary2Percentage: customer.beneficiary2Percentage,
                beneficiary3Name: customer.beneficiary3Name,
                beneficiary3Contact: customer.beneficiary3Contact,
                beneficiary3Percentage: customer.beneficiary3Percentage,
                identificationType: customer.identificationType,
                identificationNumber: customer.identificationNumber,
                photo: customer.photo,
                signature: customer.signature,
                createdBy: customer.createdBy
            });
        });
        res.json({
            customers: formattedCustomers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};
exports.getCustomers = getCustomers;
// Get single customer by ID
const getCustomerById = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                accounts: {
                    include: {
                        transactions: {
                            orderBy: { date: 'desc' },
                            take: 10
                        }
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Format the response
        const formattedCustomer = {
            id: customer.id,
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || customer.contactNumber || '',
            address: customer.address || customer.residentialAddress || '',
            kycStatus: customer.kycStatus.toLowerCase(),
            dateJoined: customer.dateJoined.toISOString(),
            accounts: customer.accounts,
            // Extended fields
            firstName: customer.firstName,
            surname: customer.surname,
            gender: customer.gender,
            dateOfBirth: (_a = customer.dateOfBirth) === null || _a === void 0 ? void 0 : _a.toISOString(),
            occupation: customer.occupation,
            workplace: customer.workplace,
            maritalStatus: customer.maritalStatus,
            residentialAddress: customer.residentialAddress,
            postalAddress: customer.postalAddress,
            contactNumber: customer.contactNumber,
            city: customer.city,
            beneficiaryName: customer.beneficiaryName,
            beneficiaryContact: customer.beneficiaryContact,
            beneficiaryPercentage: customer.beneficiaryPercentage,
            beneficiary2Name: customer.beneficiary2Name,
            beneficiary2Contact: customer.beneficiary2Contact,
            beneficiary2Percentage: customer.beneficiary2Percentage,
            beneficiary3Name: customer.beneficiary3Name,
            beneficiary3Contact: customer.beneficiary3Contact,
            beneficiary3Percentage: customer.beneficiary3Percentage,
            identificationType: customer.identificationType,
            identificationNumber: customer.identificationNumber,
            photo: customer.photo,
            signature: customer.signature,
            createdBy: customer.createdBy
        };
        res.json(formattedCustomer);
    }
    catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
};
exports.getCustomerById = getCustomerById;
// Create new customer
const createCustomer = async (req, res) => {
    var _a;
    try {
        const { name, email, phone, address, firstName, surname, gender, dateOfBirth, occupation, workplace, maritalStatus, residentialAddress, postalAddress, contactNumber, city, beneficiaryName, beneficiaryContact, beneficiaryPercentage, beneficiary2Name, beneficiary2Contact, beneficiary2Percentage, beneficiary3Name, beneficiary3Contact, beneficiary3Percentage, identificationType, identificationNumber, photo, signature } = req.body;
        const userId = req.user.id;
        // Generate customer number
        const customerNumber = await (0, idGenerator_1.generateCustomerId)();
        // Check if email already exists
        if (email) {
            const existingCustomer = await prisma.customer.findUnique({
                where: { email }
            });
            if (existingCustomer) {
                res.status(400).json({ error: 'Customer with this email already exists' });
                return;
            }
        }
        const customer = await prisma.customer.create({
            data: {
                customerNumber,
                name: name.trim(),
                email: email === null || email === void 0 ? void 0 : email.trim(),
                phone: phone === null || phone === void 0 ? void 0 : phone.trim(),
                address: address === null || address === void 0 ? void 0 : address.trim(),
                firstName: firstName === null || firstName === void 0 ? void 0 : firstName.trim(),
                surname: surname === null || surname === void 0 ? void 0 : surname.trim(),
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                occupation: occupation === null || occupation === void 0 ? void 0 : occupation.trim(),
                workplace: workplace === null || workplace === void 0 ? void 0 : workplace.trim(),
                maritalStatus,
                residentialAddress: residentialAddress === null || residentialAddress === void 0 ? void 0 : residentialAddress.trim(),
                postalAddress: postalAddress === null || postalAddress === void 0 ? void 0 : postalAddress.trim(),
                contactNumber: contactNumber === null || contactNumber === void 0 ? void 0 : contactNumber.trim(),
                city: city === null || city === void 0 ? void 0 : city.trim(),
                beneficiaryName: beneficiaryName === null || beneficiaryName === void 0 ? void 0 : beneficiaryName.trim(),
                beneficiaryContact: beneficiaryContact === null || beneficiaryContact === void 0 ? void 0 : beneficiaryContact.trim(),
                beneficiaryPercentage,
                beneficiary2Name: beneficiary2Name === null || beneficiary2Name === void 0 ? void 0 : beneficiary2Name.trim(),
                beneficiary2Contact: beneficiary2Contact === null || beneficiary2Contact === void 0 ? void 0 : beneficiary2Contact.trim(),
                beneficiary2Percentage,
                beneficiary3Name: beneficiary3Name === null || beneficiary3Name === void 0 ? void 0 : beneficiary3Name.trim(),
                beneficiary3Contact: beneficiary3Contact === null || beneficiary3Contact === void 0 ? void 0 : beneficiary3Contact.trim(),
                beneficiary3Percentage,
                identificationType,
                identificationNumber: identificationNumber === null || identificationNumber === void 0 ? void 0 : identificationNumber.trim(),
                photo,
                signature,
                createdById: userId
            } // Temporary type assertion until Prisma types update
        });
        // Fetch the customer with related data
        const customerWithRelations = await prisma.customer.findUnique({
            where: { id: customer.id },
            include: {
                accounts: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        });
        if (!customerWithRelations) {
            res.status(500).json({ error: 'Failed to fetch created customer' });
            return;
        } // Format the response
        const formattedCustomer = {
            id: customerWithRelations.id,
            customerNumber: customerWithRelations.customerNumber, // Temporary type assertion
            name: customerWithRelations.name,
            email: customerWithRelations.email || '',
            phone: customerWithRelations.phone || customerWithRelations.contactNumber || '',
            address: customerWithRelations.address || customerWithRelations.residentialAddress || '',
            kycStatus: customerWithRelations.kycStatus.toLowerCase(),
            dateJoined: customerWithRelations.dateJoined.toISOString(),
            accounts: customerWithRelations.accounts,
            // Include all extended fields
            firstName: customerWithRelations.firstName,
            surname: customerWithRelations.surname,
            gender: customerWithRelations.gender,
            dateOfBirth: (_a = customerWithRelations.dateOfBirth) === null || _a === void 0 ? void 0 : _a.toISOString(),
            occupation: customerWithRelations.occupation,
            workplace: customerWithRelations.workplace,
            maritalStatus: customerWithRelations.maritalStatus,
            residentialAddress: customerWithRelations.residentialAddress,
            postalAddress: customerWithRelations.postalAddress,
            contactNumber: customerWithRelations.contactNumber,
            city: customerWithRelations.city,
            beneficiaryName: customerWithRelations.beneficiaryName,
            beneficiaryContact: customerWithRelations.beneficiaryContact,
            beneficiaryPercentage: customerWithRelations.beneficiaryPercentage,
            beneficiary2Name: customerWithRelations.beneficiary2Name,
            beneficiary2Contact: customerWithRelations.beneficiary2Contact,
            beneficiary2Percentage: customerWithRelations.beneficiary2Percentage,
            beneficiary3Name: customerWithRelations.beneficiary3Name,
            beneficiary3Contact: customerWithRelations.beneficiary3Contact,
            beneficiary3Percentage: customerWithRelations.beneficiary3Percentage,
            identificationType: customerWithRelations.identificationType,
            identificationNumber: customerWithRelations.identificationNumber,
            photo: customerWithRelations.photo,
            signature: customerWithRelations.signature,
            createdBy: customerWithRelations.createdBy
        };
        res.status(201).json(formattedCustomer);
    }
    catch (error) {
        console.error('Error creating customer:', error);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            res.status(400).json({ error: 'Customer with this email already exists' });
            return;
        }
        res.status(500).json({ error: 'Failed to create customer' });
    }
};
exports.createCustomer = createCustomer;
// Update customer
const updateCustomer = async (req, res) => {
    var _a;
    try {
        console.log('🔍 updateCustomer called with ID:', req.params.id);
        console.log('🔍 updateData received:', JSON.stringify(req.body, null, 2));
        const { id } = req.params;
        const updateData = req.body; // Check if customer exists
        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });
        if (!existingCustomer) {
            console.log('❌ Customer not found with ID:', id);
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        console.log('✅ Found existing customer:', existingCustomer.name);
        // Check if email is being updated and if it already exists
        if (updateData.email && updateData.email !== existingCustomer.email) {
            const emailExists = await prisma.customer.findUnique({
                where: { email: updateData.email }
            });
            if (emailExists) {
                res.status(400).json({ error: 'Customer with this email already exists' });
                return;
            }
        } // Prepare update data
        const dataToUpdate = {};
        console.log('🔍 Processing update data...');
        // Only update fields that are provided
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && updateData[key] !== null) {
                if (key === 'dateOfBirth' && updateData[key]) {
                    console.log(`🔍 Processing dateOfBirth: ${updateData[key]}`);
                    dataToUpdate[key] = new Date(updateData[key]);
                }
                else if (key === 'kycStatus' && updateData[key]) {
                    // Convert kycStatus to uppercase to match Prisma enum (PENDING, VERIFIED, REJECTED)
                    console.log(`🔍 Processing kycStatus: ${updateData[key]} -> ${updateData[key].toUpperCase()}`);
                    dataToUpdate[key] = updateData[key].toUpperCase();
                }
                else if (typeof updateData[key] === 'string') {
                    dataToUpdate[key] = updateData[key].trim();
                }
                else {
                    dataToUpdate[key] = updateData[key];
                }
            }
        });
        console.log('🔍 Final dataToUpdate:', JSON.stringify(dataToUpdate, null, 2));
        console.log('🔍 Attempting database update...');
        const customer = await prisma.customer.update({
            where: { id },
            data: dataToUpdate,
            include: {
                accounts: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        });
        // Format the response
        const formattedCustomer = {
            id: customer.id,
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || customer.contactNumber || '',
            address: customer.address || customer.residentialAddress || '',
            kycStatus: customer.kycStatus.toLowerCase(),
            dateJoined: customer.dateJoined.toISOString(),
            accounts: customer.accounts,
            // Include all extended fields
            firstName: customer.firstName,
            surname: customer.surname,
            gender: customer.gender,
            dateOfBirth: (_a = customer.dateOfBirth) === null || _a === void 0 ? void 0 : _a.toISOString(),
            occupation: customer.occupation,
            workplace: customer.workplace,
            maritalStatus: customer.maritalStatus,
            residentialAddress: customer.residentialAddress,
            postalAddress: customer.postalAddress,
            contactNumber: customer.contactNumber,
            city: customer.city,
            beneficiaryName: customer.beneficiaryName,
            beneficiaryContact: customer.beneficiaryContact,
            beneficiaryPercentage: customer.beneficiaryPercentage,
            beneficiary2Name: customer.beneficiary2Name,
            beneficiary2Contact: customer.beneficiary2Contact,
            beneficiary2Percentage: customer.beneficiary2Percentage,
            beneficiary3Name: customer.beneficiary3Name,
            beneficiary3Contact: customer.beneficiary3Contact,
            beneficiary3Percentage: customer.beneficiary3Percentage,
            identificationType: customer.identificationType,
            identificationNumber: customer.identificationNumber,
            photo: customer.photo,
            signature: customer.signature,
            createdBy: customer.createdBy
        };
        res.json(formattedCustomer);
    }
    catch (error) {
        console.error('Error updating customer:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Request body:', req.body);
        console.error('Customer ID:', req.params.id);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            res.status(400).json({ error: 'Customer with this email already exists' });
            return;
        }
        res.status(500).json({ error: 'Failed to update customer' });
    }
};
exports.updateCustomer = updateCustomer;
// Delete customer
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if customer exists
        const existingCustomer = await prisma.customer.findUnique({
            where: { id },
            include: {
                accounts: true
            }
        });
        if (!existingCustomer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        } // Check if customer has any accounts with balance
        const accountsWithBalance = existingCustomer.accounts.filter((account) => parseFloat(account.balance.toString()) > 0);
        if (accountsWithBalance.length > 0) {
            res.status(400).json({
                error: 'Cannot delete customer with accounts that have a positive balance'
            });
            return;
        }
        // Delete customer (this will cascade delete accounts and transactions)
        await prisma.customer.delete({
            where: { id }
        });
        res.json({ message: 'Customer deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
};
exports.deleteCustomer = deleteCustomer;
// Update KYC status
const updateKYCStatus = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { kycStatus } = req.body;
        if (!['verified', 'pending', 'rejected'].includes(kycStatus)) {
            res.status(400).json({ error: 'Invalid KYC status' });
            return;
        }
        const customer = await prisma.customer.update({
            where: { id },
            data: {
                kycStatus: kycStatus.toUpperCase()
            },
            include: {
                accounts: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        });
        // Format the response
        const formattedCustomer = {
            id: customer.id,
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || customer.contactNumber || '',
            address: customer.address || customer.residentialAddress || '',
            kycStatus: customer.kycStatus.toLowerCase(),
            dateJoined: customer.dateJoined.toISOString(),
            accounts: customer.accounts,
            // Include extended fields
            firstName: customer.firstName,
            surname: customer.surname,
            gender: customer.gender,
            dateOfBirth: (_a = customer.dateOfBirth) === null || _a === void 0 ? void 0 : _a.toISOString(),
            occupation: customer.occupation,
            workplace: customer.workplace,
            maritalStatus: customer.maritalStatus,
            residentialAddress: customer.residentialAddress,
            postalAddress: customer.postalAddress,
            contactNumber: customer.contactNumber,
            city: customer.city,
            beneficiaryName: customer.beneficiaryName,
            beneficiaryContact: customer.beneficiaryContact,
            beneficiaryPercentage: customer.beneficiaryPercentage,
            beneficiary2Name: customer.beneficiary2Name,
            beneficiary2Contact: customer.beneficiary2Contact,
            beneficiary2Percentage: customer.beneficiary2Percentage,
            beneficiary3Name: customer.beneficiary3Name,
            beneficiary3Contact: customer.beneficiary3Contact,
            beneficiary3Percentage: customer.beneficiary3Percentage,
            identificationType: customer.identificationType,
            identificationNumber: customer.identificationNumber,
            photo: customer.photo,
            signature: customer.signature,
            createdBy: customer.createdBy
        };
        res.json(formattedCustomer);
    }
    catch (error) {
        console.error('Error updating KYC status:', error);
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.status(500).json({ error: 'Failed to update KYC status' });
    }
};
exports.updateKYCStatus = updateKYCStatus;
