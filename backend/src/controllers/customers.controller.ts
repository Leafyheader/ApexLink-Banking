import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types/auth';
import { generateCustomerId } from '../utils/idGenerator';

const prisma = new PrismaClient();

const formatCustomerResponse = (customer: any) => ({
  id: customer.id,
  customerNumber: customer.customerNumber,
  name: customer.name,
  isHidden: customer.isHidden,
  hiddenAt: customer.hiddenAt?.toISOString(),
  email: customer.email || '',
  phone: customer.phone || customer.contactNumber || '',
  address: customer.address || customer.residentialAddress || '',
  kycStatus: customer.kycStatus.toLowerCase(),
  dateJoined: customer.dateJoined.toISOString(),
  accounts: customer.accounts || [],
  firstName: customer.firstName,
  surname: customer.surname,
  otherName: customer.otherName,
  gender: customer.gender,
  dateOfBirth: customer.dateOfBirth?.toISOString(),
  occupation: customer.occupation,
  workplace: customer.workplace,
  maritalStatus: customer.maritalStatus,
  residentialAddress: customer.residentialAddress,
  postalAddress: customer.postalAddress,
  contactNumber: customer.contactNumber,
  city: customer.city,
  beneficiaryName: customer.beneficiaryName,
  beneficiaryContact: customer.beneficiaryContact,
  beneficiaryRelation: customer.beneficiaryRelation,
  beneficiaryPercentage: customer.beneficiaryPercentage,
  beneficiary2Name: customer.beneficiary2Name,
  beneficiary2Contact: customer.beneficiary2Contact,
  beneficiary2Relation: customer.beneficiary2Relation,
  beneficiary2Percentage: customer.beneficiary2Percentage,
  beneficiary3Name: customer.beneficiary3Name,
  beneficiary3Contact: customer.beneficiary3Contact,
  beneficiary3Relation: customer.beneficiary3Relation,
  beneficiary3Percentage: customer.beneficiary3Percentage,
  identificationType: customer.identificationType,
  identificationNumber: customer.identificationNumber,
  photo: customer.photo,
  signature: customer.signature,
  createdBy: customer.createdBy
});

// Get all customers with pagination and search
export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      search = '',
      kycStatus,
      includeHidden = 'false',
      hiddenOnly = 'false'
    } = req.query;

    const pageNum = parseInt(page as string);
    // Allow large limit values for export functionality, but cap at 100000 for safety
    const limitNum = Math.min(parseInt(limit as string), 100000);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause for search and filtering
    const whereClause: any = {};

    if (hiddenOnly === 'true') {
      whereClause.isHidden = true;
    } else if (includeHidden !== 'true') {
      whereClause.isHidden = false;
    }
    
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
    ]);    // Format the response to match frontend expectations
    const formattedCustomers = customers.map(formatCustomerResponse);

    res.json({
      customers: formattedCustomers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// Export all customers (optimized for CSV export)
export const exportCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search = '', kycStatus, includeHidden = 'false', hiddenOnly = 'false' } = req.query;

    // Build where clause for search and filtering
    const whereClause: any = {};

    if (hiddenOnly === 'true') {
      whereClause.isHidden = true;
    } else if (includeHidden !== 'true') {
      whereClause.isHidden = false;
    }
    
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

    // Fetch all customers without pagination, but with minimal includes for performance
    const customers = await prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        customerNumber: true,
        name: true,
        isHidden: true,
        hiddenAt: true,
        email: true,
        phone: true,
        address: true,
        kycStatus: true,
        dateJoined: true,
        firstName: true,
        surname: true,
        otherName: true,
        gender: true,
        dateOfBirth: true,
        occupation: true,
        workplace: true,
        maritalStatus: true,
        residentialAddress: true,
        postalAddress: true,
        contactNumber: true,
        city: true,
        beneficiaryName: true,
        beneficiaryContact: true,
        beneficiaryRelation: true,
        beneficiaryPercentage: true,
        beneficiary2Name: true,
        beneficiary2Contact: true,
        beneficiary2Relation: true,
        beneficiary2Percentage: true,
        beneficiary3Name: true,
        beneficiary3Contact: true,
        beneficiary3Relation: true,
        beneficiary3Percentage: true,
        identificationType: true,
        identificationNumber: true,
        photo: true,
        signature: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedCustomers = customers.map(formatCustomerResponse);

    res.json({
      customers: formattedCustomers,
      total: formattedCustomers.length
    });
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  }
};

// Get single customer by ID
export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const formattedCustomer = formatCustomerResponse(customer);

    res.json(formattedCustomer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// Create new customer
export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      address,
      firstName,
      surname,
      otherName,
      gender,
      dateOfBirth,
      occupation,
      workplace,
      maritalStatus,
      residentialAddress,
      postalAddress,
      contactNumber,
      city,
      beneficiaryName,
      beneficiaryContact,
      beneficiaryRelation,
      beneficiaryPercentage,
      beneficiary2Name,
      beneficiary2Contact,
      beneficiary2Relation,
      beneficiary2Percentage,
      beneficiary3Name,
      beneficiary3Contact,
      beneficiary3Relation,
      beneficiary3Percentage,
      identificationType,
      identificationNumber,
      photo,
      signature
    } = req.body;    const userId = req.user!.id;

    // Debug logging for beneficiary2Relation
    console.log('🔍 CreateCustomer Debug - Beneficiary2Relation:');
    console.log('  beneficiary2Name:', beneficiary2Name);
    console.log('  beneficiary2Contact:', beneficiary2Contact);
    console.log('  beneficiary2Relation:', beneficiary2Relation);
    console.log('  beneficiary2Percentage:', beneficiary2Percentage);

    // Generate customer number
    const customerNumber = await generateCustomerId();

    // Check if email already exists
    if (email) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { email }
      });      if (existingCustomer) {
        res.status(400).json({ error: 'Customer with this email already exists' });
        return;
      }
    }    const customer = await prisma.customer.create({
      data: {
        customerNumber,
        name: name.trim(),
        email: email?.trim(),
        phone: phone?.trim(),
        address: address?.trim(),
        firstName: firstName?.trim(),
        surname: surname?.trim(),
        otherName: otherName?.trim(),
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        occupation: occupation?.trim(),
        workplace: workplace?.trim(),
        maritalStatus,
        residentialAddress: residentialAddress?.trim(),
        postalAddress: postalAddress?.trim(),
        contactNumber: contactNumber?.trim(),
        city: city?.trim(),
        beneficiaryName: beneficiaryName?.trim(),
        beneficiaryContact: beneficiaryContact?.trim(),
        beneficiaryRelation: beneficiaryRelation?.trim(),
        beneficiaryPercentage,
        beneficiary2Name: beneficiary2Name?.trim(),
        beneficiary2Contact: beneficiary2Contact?.trim(),
        beneficiary2Relation: beneficiary2Relation?.trim(),
        beneficiary2Percentage,
        beneficiary3Name: beneficiary3Name?.trim(),
        beneficiary3Contact: beneficiary3Contact?.trim(),
        beneficiary3Relation: beneficiary3Relation?.trim(),
        beneficiary3Percentage,
        identificationType,
        identificationNumber: identificationNumber?.trim(),
        photo,
        signature,
        createdById: userId
      } as any  // Temporary type assertion until Prisma types update
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
    }    // Format the response
    const formattedCustomer = formatCustomerResponse(customerWithRelations);

    res.status(201).json(formattedCustomer);} catch (error) {
    console.error('Error creating customer:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(400).json({ error: 'Customer with this email already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// Update customer
export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 updateCustomer called with ID:', req.params.id);
    console.log('🔍 updateData received:', JSON.stringify(req.body, null, 2));
    
    const { id } = req.params;
    const updateData = req.body;    // Check if customer exists
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
      });      if (emailExists) {
        res.status(400).json({ error: 'Customer with this email already exists' });
        return;
      }
    }    // Prepare update data
    const dataToUpdate: any = {};
      console.log('🔍 Processing update data...');
    // Only update fields that are provided
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        if (key === 'dateOfBirth' && updateData[key]) {
          console.log(`🔍 Processing dateOfBirth: ${updateData[key]}`);
          dataToUpdate[key] = new Date(updateData[key]);
        } else if (key === 'kycStatus' && updateData[key]) {
          // Convert kycStatus to uppercase to match Prisma enum (PENDING, VERIFIED, REJECTED)
          console.log(`🔍 Processing kycStatus: ${updateData[key]} -> ${updateData[key].toUpperCase()}`);
          dataToUpdate[key] = updateData[key].toUpperCase();
        } else if (typeof updateData[key] === 'string') {
          dataToUpdate[key] = updateData[key].trim();
        } else {
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
    const formattedCustomer = formatCustomerResponse(customer);

    res.json(formattedCustomer);  } catch (error) {
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

// Delete customer
export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: {
        accounts: true
      }
    });    if (!existingCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }// Check if customer has any accounts with balance
    const accountsWithBalance = existingCustomer.accounts.filter((account: any) =>
      parseFloat(account.balance.toString()) > 0
    );    if (accountsWithBalance.length > 0) {
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
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// Update KYC status
export const updateKYCStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { kycStatus } = req.body;    if (!['verified', 'pending', 'rejected'].includes(kycStatus)) {
      res.status(400).json({ error: 'Invalid KYC status' });
      return;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { 
        kycStatus: kycStatus.toUpperCase() as 'VERIFIED' | 'PENDING' | 'REJECTED'
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
    const formattedCustomer = formatCustomerResponse(customer);

    res.json(formattedCustomer);
  } catch (error) {    console.error('Error updating KYC status:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
};

export const hideCustomersWithoutAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await prisma.customer.updateMany({
      where: {
        isHidden: false,
        accounts: {
          none: {}
        }
      },
      data: {
        isHidden: true,
        hiddenAt: new Date()
      }
    });

    res.json({
      message: 'Customers without accounts hidden successfully',
      hiddenCount: result.count
    });
  } catch (error) {
    console.error('Error hiding customers without accounts:', error);
    res.status(500).json({ error: 'Failed to hide customers without accounts' });
  }
};

export const unhideCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        isHidden: false,
        hiddenAt: null
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

    res.json(formatCustomerResponse(customer));
  } catch (error) {
    console.error('Error unhiding customer:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to unhide customer' });
  }
};
