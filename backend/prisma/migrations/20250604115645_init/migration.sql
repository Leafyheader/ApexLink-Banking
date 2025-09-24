-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'TELLER') NOT NULL DEFAULT 'TELLER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `kycStatus` ENUM('VERIFIED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `dateJoined` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `firstName` VARCHAR(191) NULL,
    `surname` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `occupation` VARCHAR(191) NULL,
    `workplace` VARCHAR(191) NULL,
    `maritalStatus` VARCHAR(191) NULL,
    `residentialAddress` VARCHAR(191) NULL,
    `postalAddress` VARCHAR(191) NULL,
    `contactNumber` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `photo` VARCHAR(191) NULL,
    `signature` VARCHAR(191) NULL,
    `identificationType` VARCHAR(191) NULL,
    `identificationNumber` VARCHAR(191) NULL,
    `beneficiaryName` VARCHAR(191) NULL,
    `beneficiaryContact` VARCHAR(191) NULL,
    `beneficiaryPercentage` INTEGER NULL,
    `beneficiary2Name` VARCHAR(191) NULL,
    `beneficiary2Contact` VARCHAR(191) NULL,
    `beneficiary2Percentage` INTEGER NULL,
    `beneficiary3Name` VARCHAR(191) NULL,
    `beneficiary3Contact` VARCHAR(191) NULL,
    `beneficiary3Percentage` INTEGER NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `type` ENUM('SAVINGS', 'CURRENT', 'FIXED', 'LOAN') NOT NULL,
    `status` ENUM('ACTIVE', 'DORMANT', 'CLOSED', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
    `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `customerId` VARCHAR(191) NOT NULL,
    `dateOpened` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastTransactionDate` DATETIME(3) NULL,
    `minimumBalance` DECIMAL(65, 30) NULL,
    `overdraftLimit` DECIMAL(65, 30) NULL,
    `approvedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Account_accountNumber_key`(`accountNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `status` ENUM('COMPLETED', 'PENDING', 'FAILED') NOT NULL DEFAULT 'COMPLETED',
    `description` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transaction_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
