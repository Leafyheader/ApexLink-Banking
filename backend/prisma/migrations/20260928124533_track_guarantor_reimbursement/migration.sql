-- AlterTable
ALTER TABLE `loanguarantor` ADD COLUMN `amountReimbursed` DECIMAL(65, 30) NOT NULL DEFAULT 0;

-- Backfill: split what each loan has already paid back to guarantors in proportion to their guarantee
UPDATE `LoanGuarantor` lg
JOIN `Loan` l ON l.id = lg.loanId
SET lg.amountReimbursed = ROUND(l.guarantorReimbursed * lg.guaranteedAmount / l.guaranteeRequired, 2)
WHERE l.guaranteeRequired > 0 AND l.guarantorReimbursed > 0;
