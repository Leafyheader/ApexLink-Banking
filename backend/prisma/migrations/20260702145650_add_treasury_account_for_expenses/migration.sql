-- AlterTable
ALTER TABLE `account` MODIFY `type` ENUM('SAVINGS', 'CURRENT', 'FIXED', 'LOAN', 'TREASURY') NOT NULL;

-- AlterTable
ALTER TABLE `expense` ADD COLUMN `paidFromAccountId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_paidFromAccountId_fkey` FOREIGN KEY (`paidFromAccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
