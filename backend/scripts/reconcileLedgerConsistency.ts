import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient, TransactionType } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

type Finding = {
  severity: 'ERROR' | 'WARN';
  code: string;
  message: string;
};

function toNumber(value: unknown): number {
  return Number(value || 0);
}

async function reconcile(): Promise<number> {
  const findings: Finding[] = [];

  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      accountNumber: true,
      balance: true,
    },
  });

  console.log(`Checking ${accounts.length} accounts for ledger-balance consistency...`);

  for (const account of accounts) {
    const [creditAgg, debitAgg] = await Promise.all([
      prisma.ledgerEntry.aggregate({
        where: { accountId: account.id, type: 'CREDIT' },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { accountId: account.id, type: 'DEBIT' },
        _sum: { amount: true },
      }),
    ]);

    const ledgerBalance = toNumber(creditAgg._sum.amount) - toNumber(debitAgg._sum.amount);
    const accountBalance = toNumber(account.balance);
    const delta = Math.abs(ledgerBalance - accountBalance);

    if (delta > 0.0001) {
      findings.push({
        severity: 'ERROR',
        code: 'ACCOUNT_LEDGER_DRIFT',
        message: `Account ${account.accountNumber} (${account.id}) drift: account=${accountBalance.toFixed(2)} ledger=${ledgerBalance.toFixed(2)} delta=${delta.toFixed(2)}`,
      });
    }
  }

  const transactionalTypes: TransactionType[] = [
    'DEPOSIT',
    'WITHDRAWAL',
    'DEPOSIT_SHARES',
  ];

  const completedTransactions = await prisma.transaction.findMany({
    where: {
      status: 'COMPLETED',
      type: { in: transactionalTypes },
    },
    select: {
      id: true,
      accountId: true,
      type: true,
      amount: true,
      reference: true,
      description: true,
    },
  });

  console.log(`Checking ${completedTransactions.length} completed transactions for ledger linkage...`);

  for (const txn of completedTransactions) {
    const expectedLedgerType = txn.type === 'WITHDRAWAL' ? 'DEBIT' : 'CREDIT';

    const matchingEntries = await prisma.ledgerEntry.findMany({
      where: {
        transactionId: txn.id,
        accountId: txn.accountId,
        type: expectedLedgerType,
      },
      select: { id: true, amount: true },
    });

    if (matchingEntries.length === 0) {
      findings.push({
        severity: 'ERROR',
        code: 'MISSING_LEDGER_ENTRY',
        message: `Transaction ${txn.id} (${txn.type}, ref=${txn.reference || 'N/A'}) has no matching ${expectedLedgerType} ledger entry.`,
      });
      continue;
    }

    const totalLedgerAmount = matchingEntries.reduce((sum, e) => sum + toNumber(e.amount), 0);
    const txnAmount = toNumber(txn.amount);

    if (Math.abs(totalLedgerAmount - txnAmount) > 0.0001) {
      findings.push({
        severity: 'ERROR',
        code: 'LEDGER_AMOUNT_MISMATCH',
        message: `Transaction ${txn.id} amount mismatch: txn=${txnAmount.toFixed(2)} ledger=${totalLedgerAmount.toFixed(2)}.`,
      });
    }
  }

  const feeIncome = await prisma.bankIncome.findMany({
    where: {
      type: 'WITHDRAWAL_CHARGE',
    },
    select: {
      id: true,
      amount: true,
      sourceId: true,
      accountId: true,
    },
  });

  console.log(`Checking ${feeIncome.length} withdrawal charge income rows for source traceability...`);

  for (const fee of feeIncome) {
    if (!fee.sourceId) {
      findings.push({
        severity: 'WARN',
        code: 'FEE_INCOME_NO_SOURCE',
        message: `BankIncome ${fee.id} has no sourceId.`,
      });
      continue;
    }

    const sourceTxn = await prisma.transaction.findUnique({
      where: { id: fee.sourceId },
      select: { id: true, type: true, accountId: true },
    });

    if (!sourceTxn) {
      findings.push({
        severity: 'ERROR',
        code: 'FEE_INCOME_BAD_SOURCE',
        message: `BankIncome ${fee.id} references missing transaction ${fee.sourceId}.`,
      });
      continue;
    }

    if (sourceTxn.type !== 'WITHDRAWAL') {
      findings.push({
        severity: 'WARN',
        code: 'FEE_SOURCE_TYPE_UNEXPECTED',
        message: `BankIncome ${fee.id} references non-withdrawal transaction ${sourceTxn.id} (${sourceTxn.type}).`,
      });
    }
  }

  const errors = findings.filter(f => f.severity === 'ERROR');
  const warnings = findings.filter(f => f.severity === 'WARN');

  console.log('--- Reconciliation Summary ---');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  for (const finding of findings) {
    const prefix = finding.severity === 'ERROR' ? '❌' : '⚠️';
    console.log(`${prefix} [${finding.code}] ${finding.message}`);
  }

  return errors.length;
}

(async () => {
  try {
    const errorCount = await reconcile();
    if (errorCount > 0) {
      (globalThis as any).process.exitCode = 1;
    }
  } catch (error) {
    console.error('Reconciliation failed:', error);
    (globalThis as any).process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
