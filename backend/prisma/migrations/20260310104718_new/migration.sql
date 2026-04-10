-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'TELLER') NOT NULL DEFAULT 'TELLER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `customerNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `kycStatus` ENUM('VERIFIED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `dateJoined` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `firstName` VARCHAR(191) NULL,
    `surname` VARCHAR(191) NULL,
    `otherName` VARCHAR(191) NULL,
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
    `beneficiaryRelation` VARCHAR(191) NULL,
    `beneficiaryPercentage` INTEGER NULL,
    `beneficiary2Name` VARCHAR(191) NULL,
    `beneficiary2Contact` VARCHAR(191) NULL,
    `beneficiary2Relation` VARCHAR(191) NULL,
    `beneficiary2Percentage` INTEGER NULL,
    `beneficiary3Name` VARCHAR(191) NULL,
    `beneficiary3Contact` VARCHAR(191) NULL,
    `beneficiary3Relation` VARCHAR(191) NULL,
    `beneficiary3Percentage` INTEGER NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_customerNumber_key`(`customerNumber`),
    UNIQUE INDEX `Customer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `type` ENUM('SAVINGS', 'CURRENT', 'FIXED', 'LOAN') NOT NULL,
    `status` ENUM('ACTIVE', 'DORMANT', 'CLOSED', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
    `authorizationStatus` ENUM('APPROVED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `customerId` VARCHAR(191) NOT NULL,
    `dateOpened` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastTransactionDate` DATETIME(3) NULL,
    `minimumBalance` DECIMAL(65, 30) NULL,
    `overdraftLimit` DECIMAL(65, 30) NULL,
    `shareBalance` DECIMAL(65, 30) NULL DEFAULT 0,
    `sharesAvailableBalance` DECIMAL(65, 30) NULL DEFAULT 0,
    `approvedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,

    UNIQUE INDEX `Account_accountNumber_key`(`accountNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('DEPOSIT', 'DEPOSIT_SHARES', 'WITHDRAWAL', 'TRANSFER', 'LOAN_REPAYMENT') NOT NULL,
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

-- CreateTable
CREATE TABLE `WithdrawalAuthorization` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `type` ENUM('WITHDRAWAL', 'TRANSFER') NOT NULL,
    `description` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `toAccountNumber` VARCHAR(191) NULL,
    `toCustomerName` VARCHAR(191) NULL,
    `status` ENUM('APPROVED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestedById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedReason` VARCHAR(191) NULL,
    `isReversed` BOOLEAN NOT NULL DEFAULT false,
    `reversedById` VARCHAR(191) NULL,
    `reversedAt` DATETIME(3) NULL,
    `reversalReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Loan` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `interestRate` DECIMAL(65, 30) NOT NULL,
    `term` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'PAID', 'DEFAULTED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `authorizationStatus` ENUM('APPROVED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `repaymentFrequency` ENUM('MONTHLY', 'QUARTERLY', 'ANNUALLY') NOT NULL DEFAULT 'MONTHLY',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NOT NULL,
    `totalPayable` DECIMAL(65, 30) NOT NULL,
    `amountPaid` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `outstandingBalance` DECIMAL(65, 30) NOT NULL,
    `nextPaymentDate` DATETIME(3) NULL,
    `monthlyPayment` DECIMAL(65, 30) NOT NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `customerContribution` DECIMAL(65, 30) NOT NULL,
    `guaranteeRequired` DECIMAL(65, 30) NOT NULL,
    `totalPaid` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalInterestPaid` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `guarantorReimbursed` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `principalRemaining` DECIMAL(65, 30) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `lastPaymentDate` DATETIME(3) NULL,
    `lastPaymentAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Loan_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankIncome` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('WITHDRAWAL_CHARGE', 'LOAN_INTEREST', 'TRANSFER_FEE', 'OTHER') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `sourceType` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `vendor` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PAID', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `paymentMethod` VARCHAR(191) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedDate` DATETIME(3) NULL,
    `paidDate` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GHS',
    `reference` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,

    INDEX `LedgerEntry_accountId_createdAt_idx`(`accountId`, `createdAt`),
    INDEX `LedgerEntry_reference_idx`(`reference`),
    INDEX `LedgerEntry_transactionId_idx`(`transactionId`),
    INDEX `LedgerEntry_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PendingTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `type` ENUM('HOLD', 'RESERVE') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GHS',
    `reference` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `status` ENUM('ACTIVE', 'SETTLED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `settledAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,

    INDEX `PendingTransaction_accountId_status_idx`(`accountId`, `status`),
    INDEX `PendingTransaction_reference_idx`(`reference`),
    INDEX `PendingTransaction_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountBalanceSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `shareBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `ledgerBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `pendingBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `availableBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `lastLedgerEntryId` VARCHAR(191) NULL,
    `snapshotAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AccountBalanceSnapshot_accountId_key`(`accountId`),
    INDEX `AccountBalanceSnapshot_snapshotAt_idx`(`snapshotAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoanGuarantor` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `guarantorId` VARCHAR(191) NOT NULL,
    `guarantorAccountId` VARCHAR(191) NOT NULL,
    `guaranteedAmount` DECIMAL(65, 30) NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED', 'DEFAULTED', 'FUNDS_RETURNED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LoanGuarantor_guarantorId_idx`(`guarantorId`),
    INDEX `LoanGuarantor_loanId_idx`(`loanId`),
    UNIQUE INDEX `LoanGuarantor_loanId_guarantorId_key`(`loanId`, `guarantorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountRestriction` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `restrictionType` ENUM('LOAN_GUARANTEE', 'COURT_ORDER', 'COMPLIANCE_HOLD') NOT NULL,
    `restrictedAmount` DECIMAL(65, 30) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `loanGuarantorId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `releasedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,

    INDEX `AccountRestriction_accountId_isActive_idx`(`accountId`, `isActive`),
    INDEX `AccountRestriction_loanGuarantorId_idx`(`loanGuarantorId`),
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

-- AddForeignKey
ALTER TABLE `WithdrawalAuthorization` ADD CONSTRAINT `WithdrawalAuthorization_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalAuthorization` ADD CONSTRAINT `WithdrawalAuthorization_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalAuthorization` ADD CONSTRAINT `WithdrawalAuthorization_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalAuthorization` ADD CONSTRAINT `WithdrawalAuthorization_reversedById_fkey` FOREIGN KEY (`reversedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIncome` ADD CONSTRAINT `BankIncome_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankIncome` ADD CONSTRAINT `BankIncome_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendingTransaction` ADD CONSTRAINT `PendingTransaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountBalanceSnapshot` ADD CONSTRAINT `AccountBalanceSnapshot_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanGuarantor` ADD CONSTRAINT `LoanGuarantor_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanGuarantor` ADD CONSTRAINT `LoanGuarantor_guarantorId_fkey` FOREIGN KEY (`guarantorId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanGuarantor` ADD CONSTRAINT `LoanGuarantor_guarantorAccountId_fkey` FOREIGN KEY (`guarantorAccountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountRestriction` ADD CONSTRAINT `AccountRestriction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountRestriction` ADD CONSTRAINT `AccountRestriction_loanGuarantorId_fkey` FOREIGN KEY (`loanGuarantorId`) REFERENCES `LoanGuarantor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
