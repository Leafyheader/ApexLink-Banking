-- AlterTable
ALTER TABLE `loan` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedById` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
