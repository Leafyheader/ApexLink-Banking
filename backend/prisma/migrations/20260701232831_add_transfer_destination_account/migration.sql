-- AlterTable
ALTER TABLE `withdrawalauthorization` ADD COLUMN `toAccountId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `WithdrawalAuthorization` ADD CONSTRAINT `WithdrawalAuthorization_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
