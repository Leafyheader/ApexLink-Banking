/*
  Warnings:

  - You are about to drop the column `reservedFromBalance` on the `withdrawalauthorization` table. All the data in the column will be lost.
  - You are about to drop the column `reservedFromShares` on the `withdrawalauthorization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `withdrawalauthorization` DROP COLUMN `reservedFromBalance`,
    DROP COLUMN `reservedFromShares`;

-- CreateTable
CREATE TABLE `Loan` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `interestRate` DECIMAL(65, 30) NOT NULL,
    `term` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'PAID', 'DEFAULTED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `repaymentFrequency` ENUM('MONTHLY', 'QUARTERLY', 'ANNUALLY') NOT NULL DEFAULT 'MONTHLY',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NOT NULL,
    `totalPayable` DECIMAL(65, 30) NOT NULL,
    `amountPaid` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `outstandingBalance` DECIMAL(65, 30) NOT NULL,
    `nextPaymentDate` DATETIME(3) NULL,
    `monthlyPayment` DECIMAL(65, 30) NOT NULL,
    `guarantor1Id` VARCHAR(191) NULL,
    `guarantor1Percentage` INTEGER NULL,
    `guarantor2Id` VARCHAR(191) NULL,
    `guarantor2Percentage` INTEGER NULL,
    `guarantor3Id` VARCHAR(191) NULL,
    `guarantor3Percentage` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,

    UNIQUE INDEX `Loan_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor1Id_fkey` FOREIGN KEY (`guarantor1Id`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor2Id_fkey` FOREIGN KEY (`guarantor2Id`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_guarantor3Id_fkey` FOREIGN KEY (`guarantor3Id`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
