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
        // Get the count of existing customers to determine next ID
        const customerCount = await prisma.customer.count();
        const nextNumber = customerCount + 1;
        // Format as CUST000000001 (pad with zeros to make it 9 digits)
        const paddedNumber = nextNumber.toString().padStart(9, '0');
        return `CUST${paddedNumber}`;
    }
    catch (error) {
        console.error('Error generating customer ID:', error);
        throw new Error('Failed to generate customer ID');
    }
}
// Generate next account number in format ACC001000001
async function generateAccountNumber() {
    try {
        // Get the count of existing accounts to determine next ID
        const accountCount = await prisma.account.count();
        const nextNumber = accountCount + 1;
        // Format as ACC001000001 (pad with zeros to make it 6 digits after 001)
        const paddedNumber = nextNumber.toString().padStart(6, '0');
        return `ACC001${paddedNumber}`;
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
