-- AlterTable
ALTER TABLE `loan` ADD COLUMN `guarantor1AccountId` VARCHAR(191) NULL,
    ADD COLUMN `guarantor2AccountId` VARCHAR(191) NULL,
    ADD COLUMN `guarantor3AccountId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor1AccountId_fkey` FOREIGN KEY (`guarantor1AccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor2AccountId_fkey` FOREIGN KEY (`guarantor2AccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor3AccountId_fkey` FOREIGN KEY (`guarantor3AccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
