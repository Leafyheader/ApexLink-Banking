/**
 * Guarantor Fund Reimbursement Management Script
 * 
 * This script helps manage guarantor fund reimbursements for completed loans.
 * It can:
 * 1. Check which loans need guarantor fund reimbursement
 * 2. Process reimbursement for specific loans
 * 3. Process all pending reimbursements
 * 4. View reimbursement history
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🏦 Guarantor Fund Reimbursement Management');
    console.log('=' * 50);

    // Import the reimbursement service
    const { createGuarantorReimbursementService } = require('../src/services/guarantorReimbursement.service');
    const reimbursementService = createGuarantorReimbursementService(prisma);

    // 1. Check for loans needing reimbursement
    console.log('\n📋 Checking for completed loans needing guarantor fund reimbursement...');
    const pendingLoans = await reimbursementService.findLoansNeedingGuarantorReimbursement();

    if (pendingLoans.length === 0) {
      console.log('✅ No loans found needing guarantor fund reimbursement.');
    } else {
      console.log(`\n📊 Found ${pendingLoans.length} completed loans needing guarantor fund reimbursement:`);
      console.log(''.padEnd(80, '-'));
      
      let totalPendingAmount = 0;
      
      for (const loan of pendingLoans) {
        console.log(`🏦 Loan: ${loan.accountNumber} (${loan.borrowerName})`);
        console.log(`   💰 Amount to credit back: ₵${loan.totalToCredit.toLocaleString()}`);
        console.log(`   👥 Guarantors: ${loan.guarantorCount}`);
        console.log(`   🆔 Loan ID: ${loan.loanId}`);
        console.log('');
        totalPendingAmount += loan.totalToCredit;
      }
      
      console.log(`📊 Total pending reimbursement amount: ₵${totalPendingAmount.toLocaleString()}`);
      
      // Ask user if they want to process all pending reimbursements
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const shouldProcess = await new Promise(resolve => {
        readline.question('\n❓ Do you want to process all pending guarantor fund reimbursements? (y/N): ', (answer) => {
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
      });

      readline.close();

      if (shouldProcess) {
        console.log('\n🔄 Processing all pending guarantor fund reimbursements...');
        const result = await reimbursementService.processAllPendingReimbursements();
        
        console.log(`\n✅ Processing complete!`);
        console.log(`   ✅ Loans processed: ${result.processed}/${pendingLoans.length}`);
        console.log(`   💰 Total amount credited: ₵${result.totalCredited.toLocaleString()}`);
        
        // Show detailed results
        console.log('\n📋 Detailed Results:');
        console.log(''.padEnd(80, '-'));
        
        for (const res of result.results) {
          if (res.success) {
            console.log(`✅ Loan ${res.loanId.slice(-8)}: ₵${res.totalCreditedBack} credited to ${res.reimbursements.length} guarantor(s)`);
            for (const reimbursement of res.reimbursements) {
              console.log(`   👤 ${reimbursement.guarantorName} (${reimbursement.accountNumber}): ₵${reimbursement.creditedBack}`);
            }
          } else {
            console.log(`❌ Loan ${res.loanId.slice(-8)}: ${res.error}`);
          }
          console.log('');
        }
      } else {
        console.log('\n⏭️  Skipping automatic processing. You can process individual loans manually.');
      }
    }

    // 2. Show recent reimbursement history
    console.log('\n📊 Recent Guarantor Fund Reimbursement History:');
    console.log(''.padEnd(80, '-'));
    
    const recentReimbursements = await prisma.transaction.findMany({
      where: {
        description: {
          contains: 'Guarantor fund reimbursement - loan completion'
        }
      },
      include: {
        account: {
          include: {
            customer: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (recentReimbursements.length === 0) {
      console.log('📋 No guarantor fund reimbursement transactions found.');
    } else {
      for (const txn of recentReimbursements) {
        const loanRef = txn.reference.match(/LCR-(\w+)-/);
        const loanId = loanRef ? loanRef[1] : 'Unknown';
        
        console.log(`💳 ${txn.createdAt.toLocaleDateString()} - ${txn.account.customer.name} (${txn.account.accountNumber})`);
        console.log(`   💰 Amount: ₵${Number(txn.amount).toLocaleString()}`);
        console.log(`   🏦 Loan: ${loanId}`);
        console.log(`   📄 Reference: ${txn.reference}`);
        console.log('');
      }
    }

    // 3. Show system statistics
    console.log('\n📊 Guarantor Fund Reimbursement Statistics:');
    console.log(''.padEnd(80, '-'));
    
    const stats = await prisma.transaction.aggregate({
      where: {
        description: {
          contains: 'Guarantor fund reimbursement - loan completion'
        }
      },
      _sum: { amount: true },
      _count: true
    });

    const totalReimbursed = Number(stats._sum.amount || 0);
    const transactionCount = stats._count;

    console.log(`💰 Total guarantor funds reimbursed: ₵${totalReimbursed.toLocaleString()}`);
    console.log(`📊 Total reimbursement transactions: ${transactionCount.toLocaleString()}`);
    
    if (transactionCount > 0) {
      const averageReimbursement = totalReimbursed / transactionCount;
      console.log(`📈 Average reimbursement per transaction: ₵${averageReimbursement.toLocaleString()}`);
    }

    console.log('\n✅ Guarantor fund reimbursement management completed.');

  } catch (error) {
    console.error('❌ Error during guarantor fund reimbursement management:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  const command = args[0];
  
  if (command === '--process-loan' && args[1]) {
    // Process specific loan
    const loanId = args[1];
    
    (async () => {
      try {
        const { createGuarantorReimbursementService } = require('../src/services/guarantorReimbursement.service');
        const reimbursementService = createGuarantorReimbursementService(prisma);
        
        console.log(`🔄 Processing guarantor fund reimbursement for loan: ${loanId}`);
        
        const result = await reimbursementService.processLoanCompletionReimbursement(loanId);
        
        if (result.success) {
          console.log(`✅ ${result.message}`);
          console.log(`💰 Total credited back: ₵${result.totalCreditedBack}`);
          
          for (const reimbursement of result.reimbursements) {
            console.log(`👤 ${reimbursement.guarantorName} (${reimbursement.accountNumber}): ₵${reimbursement.creditedBack}`);
          }
        } else {
          console.log(`❌ ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Error:', error);
      } finally {
        await prisma.$disconnect();
      }
    })();
  } else if (command === '--check-history' && args[1]) {
    // Check reimbursement history for specific loan
    const loanId = args[1];
    
    (async () => {
      try {
        const { createGuarantorReimbursementService } = require('../src/services/guarantorReimbursement.service');
        const reimbursementService = createGuarantorReimbursementService(prisma);
        
        console.log(`📋 Checking reimbursement history for loan: ${loanId}`);
        
        const history = await reimbursementService.getReimbursementHistory(loanId);
        
        if (history.length === 0) {
          console.log('📋 No reimbursement history found for this loan.');
        } else {
          console.log(`📊 Found ${history.length} reimbursement transaction(s):`);
          
          for (const item of history) {
            console.log(`💳 ${item.date.toLocaleDateString()} - ${item.guarantorName} (${item.accountNumber})`);
            console.log(`   💰 Amount: ₵${item.amount.toLocaleString()}`);
            console.log(`   📄 Reference: ${item.reference}`);
            console.log('');
          }
        }
      } catch (error) {
        console.error('❌ Error:', error);
      } finally {
        await prisma.$disconnect();
      }
    })();
  } else {
    console.log('📖 Usage:');
    console.log('  node guarantor-reimbursement-manager.js                    # Interactive management');
    console.log('  node guarantor-reimbursement-manager.js --process-loan <loanId>   # Process specific loan');
    console.log('  node guarantor-reimbursement-manager.js --check-history <loanId>  # Check loan history');
    process.exit(1);
  }
} else {
  main();
}