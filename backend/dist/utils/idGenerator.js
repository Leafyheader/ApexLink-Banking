"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCustomerId = generateCustomerId;
exports.generateAccountNumber = generateAccountNumber;
exports.generateLoanId = generateLoanId;
exports.generateTransactionReference = generateTransactionReference;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Generate next customer ID in format CUST000000001
async function generateCustomerId() {
    try {
        // Base it on the highest existing number, not a row count - a count drops when customers
        // are deleted, which would otherwise regenerate an already-taken number and collide on the
        // unique constraint. Zero-padding to a fixed width keeps string ordering == numeric ordering.
        let customerNumber;
        let exists = true;
        while (exists) {
            const lastCustomer = await prisma.customer.findFirst({
                where: { customerNumber: { startsWith: 'CUST' } },
                orderBy: { customerNumber: 'desc' }
            });
            const lastNumber = lastCustomer
                ? parseInt(lastCustomer.customerNumber.replace('CUST', ''), 10) || 0
                : 0;
            const paddedNumber = (lastNumber + 1).toString().padStart(9, '0');
            customerNumber = `CUST${paddedNumber}`;
            const existing = await prisma.customer.findUnique({ where: { customerNumber } });
            exists = !!existing;
        }
        return customerNumber;
    }
    catch (error) {
        console.error('Error generating customer ID:', error);
        throw new Error('Failed to generate customer ID');
    }
}
// Generate next account number in format ACC0000001. Based on the highest existing numeric
// suffix (across all ACC-prefixed accounts), not a row count - a count drops when accounts
// are deleted, which would otherwise regenerate an already-taken number and collide on the
// unique constraint. Existing data has inconsistent zero-padding widths, so this compares by
// parsed numeric value rather than string sort, matching accounts.controller.ts's own
// next-account-number preview logic.
async function generateAccountNumber() {
    try {
        const accounts = await prisma.account.findMany({
            where: { accountNumber: { startsWith: 'ACC' } },
            select: { accountNumber: true }
        });
        let maxNumber = 0;
        for (const account of accounts) {
            const parsed = parseInt(account.accountNumber.replace(/\D/g, ''), 10);
            if (!isNaN(parsed) && parsed > maxNumber) {
                maxNumber = parsed;
            }
        }
        let accountNumber;
        let exists = true;
        let candidate = maxNumber;
        while (exists) {
            candidate += 1;
            accountNumber = `ACC${candidate.toString().padStart(7, '0')}`;
            const existing = await prisma.account.findUnique({ where: { accountNumber } });
            exists = !!existing;
        }
        return accountNumber;
    }
    catch (error) {
        console.error('Error generating account number:', error);
        throw new Error('Failed to generate account number');
    }
}
// Generate other ID types if needed
async function generateLoanId() {
    try {
        const loanCount = await prisma.loan.count();
        const nextNumber = loanCount + 1;
        const paddedNumber = nextNumber.toString().padStart(8, '0');
        return `LOAN${paddedNumber}`;
    }
    catch (error) {
        console.error('Error generating loan ID:', error);
        throw new Error('Failed to generate loan ID');
    }
}
// Generate transaction reference
async function generateTransactionReference() {
    try {
        const transactionCount = await prisma.transaction.count();
        const nextNumber = transactionCount + 1;
        const paddedNumber = nextNumber.toString().padStart(10, '0');
        return `TXN${paddedNumber}`;
    }
    catch (error) {
        console.error('Error generating transaction reference:', error);
        throw new Error('Failed to generate transaction reference');
    }
}
