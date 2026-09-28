"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateTreasuryAccount = getOrCreateTreasuryAccount;
const client_1 = require("@prisma/client");
const TREASURY_ACCOUNT_NUMBER = 'TREASURY-000001';
const TREASURY_CUSTOMER_NUMBER = 'SYS-TREASURY-001';
// The bank's own operating account, debited when an expense is marked PAID. Lazily
// provisioned on first use so no manual seed step is required. `accountNumber` is a fixed,
// well-known value so a race between two concurrent first-time callers is resolved by the
// unique constraint rather than producing two treasury accounts.
async function getOrCreateTreasuryAccount(client, createdByUserId) {
    const existing = await client.account.findFirst({ where: { type: 'TREASURY' } });
    if (existing) {
        return existing;
    }
    let systemCustomer = await client.customer.findUnique({ where: { customerNumber: TREASURY_CUSTOMER_NUMBER } });
    if (!systemCustomer) {
        try {
            systemCustomer = await client.customer.create({
                data: {
                    customerNumber: TREASURY_CUSTOMER_NUMBER,
                    name: 'ApexLink Bank - Treasury',
                    isHidden: true,
                    kycStatus: 'VERIFIED',
                    createdById: createdByUserId
                }
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                systemCustomer = await client.customer.findUniqueOrThrow({ where: { customerNumber: TREASURY_CUSTOMER_NUMBER } });
            }
            else {
                throw error;
            }
        }
    }
    try {
        return await client.account.create({
            data: {
                accountNumber: TREASURY_ACCOUNT_NUMBER,
                type: 'TREASURY',
                status: 'ACTIVE',
                authorizationStatus: 'APPROVED',
                balance: 0,
                currency: 'GHS',
                customerId: systemCustomer.id,
                createdBy: createdByUserId
            }
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return await client.account.findUniqueOrThrow({ where: { accountNumber: TREASURY_ACCOUNT_NUMBER } });
        }
        throw error;
    }
}
