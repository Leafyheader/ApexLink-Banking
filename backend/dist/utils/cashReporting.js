"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPesewas = exports.isValidAmount = exports.isReservedReference = exports.SQL_IS_FEE = exports.SQL_IS_LOAN_DISBURSEMENT = exports.SQL_IS_CASH_REVERSAL = exports.SQL_IS_CASH = exports.feesOnlyWhere = exports.cashReversalWhere = exports.loanDisbursementWhere = exports.cashLoanRepaymentWhere = exports.cashOnlyWhere = void 0;
exports.parseRangeStart = parseRangeStart;
exports.parseRangeEnd = parseRangeEnd;
const client_1 = require("@prisma/client");
// Date filters from the UI arrive as bare "YYYY-MM-DD" strings. new Date('2026-09-28') is
// midnight at the START of that day, so using it as an inclusive upper bound silently drops
// every transaction posted during the last day of the range (e.g. "Today" shows nothing).
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function parseRangeStart(value) {
    if (!value)
        return undefined;
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? undefined : date;
}
function parseRangeEnd(value) {
    if (!value)
        return undefined;
    const raw = String(value);
    const date = new Date(DATE_ONLY.test(raw) ? `${raw}T23:59:59.999Z` : raw);
    return isNaN(date.getTime()) ? undefined : date;
}
// Transactions that move a balance but are NOT physical cash crossing the counter. They are
// system-generated, so they're identified by the reference prefix each code path assigns:
//   CHG- / FEE-          withdrawal fees (income, not cash paid out)
//   REV-CHG-             fee refunds on reversal
//   REV-TRF-             source-side leg of a transfer reversal
//   OPEN- / ADJ-         opening balances / imports and admin balance corrections
//   LOAN- / GRT- / GRB- / LRD-  loan disbursement bookkeeping and guarantor movements
//   EXP- / TREASURY-     treasury expense payments and treasury funding
//   ...-CR               destination-side leg of a transfer (and of its reversal)
// Loan and treasury accounts are internal books, so everything on them is excluded too.
const NON_CASH_REFERENCE_PREFIXES = [
    'CHG-', 'FEE-', 'REV-CHG-', 'REV-TRF-', 'OPEN-', 'ADJ-',
    'LOAN-', 'GRT-', 'GRB-', 'LRD-', 'EXP-', 'TREASURY-'
];
const FEE_REFERENCE_PREFIXES = ['CHG-', 'FEE-'];
// Reversed withdrawals (plain REV-) are cash returned to the drawer - reported on their own
// line rather than mixed into deposits.
const REVERSAL_PREFIX = 'REV-';
// Legacy rows written before the prefixes above were consistent.
const NON_CASH_DESCRIPTION_PREFIXES = [
    'Guarantor contribution for loan',
    'Guarantor reimbursement from loan repayment',
    'Loan repayment disbursement from loan',
    'Guarantor fund reimbursement - loan completion',
    'Transfer from account',
    'Withdrawal processing fee',
    'withdrawal charge'
];
const referenceNotIn = (prefixes) => ({
    // Prisma's NOT drops rows whose column is NULL, so null references are let through explicitly.
    OR: [
        { reference: null },
        {
            NOT: {
                OR: [
                    ...prefixes.map(prefix => ({ reference: { startsWith: prefix } })),
                    { reference: { endsWith: '-CR' } }
                ]
            }
        }
    ]
});
const descriptionNotInternal = {
    OR: [
        { description: null },
        { NOT: { OR: NON_CASH_DESCRIPTION_PREFIXES.map(prefix => ({ description: { startsWith: prefix } })) } }
    ]
};
const customerAccountsOnly = {
    account: { type: { notIn: ['LOAN', 'TREASURY'] } }
};
// Cash deposits / withdrawals / share movements / loan repayments at the counter.
exports.cashOnlyWhere = {
    AND: [
        customerAccountsOnly,
        referenceNotIn([...NON_CASH_REFERENCE_PREFIXES, REVERSAL_PREFIX]),
        descriptionNotInternal
    ]
};
// Loan repayments are posted to the loan account itself but are real cash received.
exports.cashLoanRepaymentWhere = {
    type: 'LOAN_REPAYMENT'
};
// Loan disbursements - cash paid out to the borrower.
exports.loanDisbursementWhere = {
    type: 'WITHDRAWAL',
    account: { type: 'LOAN' },
    reference: { startsWith: 'LOAN-' }
};
// Reversed withdrawals - cash returned to the drawer.
exports.cashReversalWhere = {
    AND: [
        customerAccountsOnly,
        { reference: { startsWith: REVERSAL_PREFIX } },
        referenceNotIn(NON_CASH_REFERENCE_PREFIXES)
    ]
};
exports.feesOnlyWhere = {
    OR: FEE_REFERENCE_PREFIXES.map(prefix => ({ reference: { startsWith: prefix } }))
};
// Same classification for raw SQL (alias t = Transaction, a = Account).
const sqlReferenceNotIn = (prefixes) => client_1.Prisma.sql `(t.reference IS NULL OR (
  ${client_1.Prisma.join(prefixes.map(p => client_1.Prisma.sql `t.reference NOT LIKE ${p + '%'}`), ' AND ')}
  AND t.reference NOT LIKE '%-CR'
))`;
exports.SQL_IS_CASH = client_1.Prisma.sql `(
  a.type NOT IN ('LOAN', 'TREASURY')
  AND ${sqlReferenceNotIn([...NON_CASH_REFERENCE_PREFIXES, REVERSAL_PREFIX])}
  AND (t.description IS NULL OR (
    ${client_1.Prisma.join(NON_CASH_DESCRIPTION_PREFIXES.map(p => client_1.Prisma.sql `t.description NOT LIKE ${p + '%'}`), ' AND ')}
  ))
)`;
exports.SQL_IS_CASH_REVERSAL = client_1.Prisma.sql `(
  a.type NOT IN ('LOAN', 'TREASURY')
  AND t.reference LIKE ${REVERSAL_PREFIX + '%'}
  AND ${sqlReferenceNotIn(NON_CASH_REFERENCE_PREFIXES)}
)`;
exports.SQL_IS_LOAN_DISBURSEMENT = client_1.Prisma.sql `(
  a.type = 'LOAN' AND t.type = 'WITHDRAWAL' AND t.reference LIKE 'LOAN-%'
)`;
exports.SQL_IS_FEE = client_1.Prisma.sql `(
  ${client_1.Prisma.join(FEE_REFERENCE_PREFIXES.map(p => client_1.Prisma.sql `t.reference LIKE ${p + '%'}`), ' OR ')}
)`;
// User-typed references must not look like system ones, or a real cash deposit could be
// hidden from (or an internal entry slipped into) the cash totals above.
const isReservedReference = (reference) => {
    if (typeof reference !== 'string' || !reference)
        return false;
    const upper = reference.trim().toUpperCase();
    return [...NON_CASH_REFERENCE_PREFIXES, REVERSAL_PREFIX].some(prefix => upper.startsWith(prefix))
        || upper.endsWith('-CR');
};
exports.isReservedReference = isReservedReference;
// Valid money amount: finite, positive, at most 2 decimal places.
const isValidAmount = (value) => Number.isFinite(value) && value > 0 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
exports.isValidAmount = isValidAmount;
// Round to whole pesewas - balances must be countable in physical cash.
const toPesewas = (value) => Math.round(value * 100) / 100;
exports.toPesewas = toPesewas;
