import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate next customer ID in format CUST000000001
export async function generateCustomerId(): Promise<string> {
  try {
    // Get the count of existing customers to determine next ID
    const customerCount = await prisma.customer.count();
    const nextNumber = customerCount + 1;
    
    // Format as CUST000000001 (pad with zeros to make it 9 digits)
    const paddedNumber = nextNumber.toString().padStart(9, '0');
    return `CUST${paddedNumber}`;
  } catch (error) {
    console.error('Error generating customer ID:', error);
    throw new Error('Failed to generate customer ID');
  }
}

// Generate next account number in format ACC001000001
export async function generateAccountNumber(): Promise<string> {
  try {
    // Get the count of existing accounts to determine next ID
    const accountCount = await prisma.account.count();
    const nextNumber = accountCount + 1;
    
    // Format as ACC001000001 (pad with zeros to make it 6 digits after 001)
    const paddedNumber = nextNumber.toString().padStart(6, '0');
    return `ACC001${paddedNumber}`;
  } catch (error) {
    console.error('Error generating account number:', error);
    throw new Error('Failed to generate account number');
  }
}

// Generate other ID types if needed
export async function generateLoanId(): Promise<string> {
  try {
    const loanCount = await prisma.loan.count();
    const nextNumber = loanCount + 1;
    
    const paddedNumber = nextNumber.toString().padStart(8, '0');
    return `LOAN${paddedNumber}`;
  } catch (error) {
    console.error('Error generating loan ID:', error);
    throw new Error('Failed to generate loan ID');
  }
}

// Generate transaction reference
export async function generateTransactionReference(): Promise<string> {
  try {
    const transactionCount = await prisma.transaction.count();
    const nextNumber = transactionCount + 1;
    
    const paddedNumber = nextNumber.toString().padStart(10, '0');
    return `TXN${paddedNumber}`;
  } catch (error) {
    console.error('Error generating transaction reference:', error);
    throw new Error('Failed to generate transaction reference');
  }
}
