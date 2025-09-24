-- Add guarantor account ID fields to the Loan table
-- This allows us to track which specific accounts were used for guarantees
-- and enable proper disbursement during loan repayments

ALTER TABLE `loan` ADD COLUMN `guarantor1AccountId` VARCHAR(191) NULL;
ALTER TABLE `loan` ADD COLUMN `guarantor2AccountId` VARCHAR(191) NULL;  
ALTER TABLE `loan` ADD COLUMN `guarantor3AccountId` VARCHAR(191) NULL;

-- Add foreign key constraints to ensure guarantor accounts exist
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor1AccountId_fkey` FOREIGN KEY (`guarantor1AccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor2AccountId_fkey` FOREIGN KEY (`guarantor2AccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor3AccountId_fkey` FOREIGN KEY (`guarantor3AccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
