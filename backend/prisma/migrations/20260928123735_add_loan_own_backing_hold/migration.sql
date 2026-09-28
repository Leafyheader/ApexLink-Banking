-- AlterTable
ALTER TABLE `accountrestriction` ADD COLUMN `loanId` VARCHAR(191) NULL,
    MODIFY `restrictionType` ENUM('LOAN_GUARANTEE', 'LOAN_OWN_BACKING', 'COURT_ORDER', 'COMPLIANCE_HOLD') NOT NULL;

-- CreateIndex
CREATE INDEX `AccountRestriction_loanId_idx` ON `AccountRestriction`(`loanId`);

-- AddForeignKey
ALTER TABLE `AccountRestriction` ADD CONSTRAINT `AccountRestriction_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
