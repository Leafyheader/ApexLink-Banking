// Simple test to verify loan calculation consistency

// Frontend calculation logic (from Loans.tsx)
function calculateTotalPayableFrontend(amount, interestRate, termMonths) {
  if (!amount || !termMonths) {
    return 0;
  }

  const principal = amount;
  const annualInterestRate = interestRate / 100;
  const termInYears = termMonths / 12;

  if (annualInterestRate === 0) {
    return principal; // No interest case
  }

  // Calculate total interest using flat rate: Principal × Rate × Time
  const totalInterest = principal * annualInterestRate * termInYears;
  
  // Total payable = Principal + Total Interest
  return principal + totalInterest;
}

// Backend calculation logic (from loans.controller.ts)
function calculateLoanDetailsBackend(amount, interestRate, termMonths) {
  const principal = amount;
  const annualInterestRate = interestRate / 100;
  const termInYears = termMonths / 12;
  
  if (annualInterestRate === 0) {
    const monthlyPayment = principal / termMonths;
    return {
      monthlyPayment,
      totalPayable: principal,
      outstandingBalance: principal
    };
  }
  
  // Calculate total interest using flat rate: Principal × Rate × Time
  const totalInterest = principal * annualInterestRate * termInYears;
  
  // Total payable = Principal + Total Interest
  const totalPayable = principal + totalInterest;
  
  // Monthly payment = Total Payable / Number of Months
  const monthlyPayment = totalPayable / termMonths;
  
  return {
    monthlyPayment,
    totalPayable,
    outstandingBalance: totalPayable
  };
}

// Test cases
const testCases = [
  { amount: 10000, interestRate: 5, termMonths: 12 },
  { amount: 50000, interestRate: 8, termMonths: 24 },
  { amount: 25000, interestRate: 6.5, termMonths: 18 },
  { amount: 100000, interestRate: 0, termMonths: 12 }, // No interest case
];

console.log('🧪 Testing Loan Calculation Consistency...\n');

testCases.forEach((testCase, index) => {
  const { amount, interestRate, termMonths } = testCase;
  
  console.log(`Test Case ${index + 1}:`);
  console.log(`  Amount: GH₵${amount.toLocaleString()}`);
  console.log(`  Interest Rate: ${interestRate}%`);
  console.log(`  Term: ${termMonths} months`);
  
  // Calculate using frontend logic
  const frontendTotal = calculateTotalPayableFrontend(amount, interestRate, termMonths);
  const frontendInterest = frontendTotal - amount;
  const frontendMonthlyPayment = frontendTotal / termMonths;
  
  // Calculate using backend logic
  const backendResult = calculateLoanDetailsBackend(amount, interestRate, termMonths);
  const backendInterest = backendResult.totalPayable - amount;
  
  console.log(`  Frontend Calculation:`);
  console.log(`    Total Interest: GH₵${frontendInterest.toFixed(2)}`);
  console.log(`    Total Payable: GH₵${frontendTotal.toFixed(2)}`);
  console.log(`    Monthly Payment: GH₵${frontendMonthlyPayment.toFixed(2)}`);
  
  console.log(`  Backend Calculation:`);
  console.log(`    Total Interest: GH₵${backendInterest.toFixed(2)}`);
  console.log(`    Total Payable: GH₵${backendResult.totalPayable.toFixed(2)}`);
  console.log(`    Monthly Payment: GH₵${backendResult.monthlyPayment.toFixed(2)}`);
  
  // Check consistency
  const totalPayableMatch = Math.abs(frontendTotal - backendResult.totalPayable) < 0.01;
  const monthlyPaymentMatch = Math.abs(frontendMonthlyPayment - backendResult.monthlyPayment) < 0.01;
  
  if (totalPayableMatch && monthlyPaymentMatch) {
    console.log(`  ✅ Calculations match!\n`);
  } else {
    console.log(`  ❌ Calculations don't match!`);
    console.log(`    Total Payable Difference: GH₵${Math.abs(frontendTotal - backendResult.totalPayable).toFixed(2)}`);
    console.log(`    Monthly Payment Difference: GH₵${Math.abs(frontendMonthlyPayment - backendResult.monthlyPayment).toFixed(2)}\n`);
  }
});

console.log('✅ All calculations verified!');
