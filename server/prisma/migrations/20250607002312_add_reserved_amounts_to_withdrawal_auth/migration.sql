-- AlterTable
ALTER TABLE `withdrawalauthorization` ADD COLUMN `reservedFromBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `reservedFromShares` DECIMAL(65, 30) NOT NULL DEFAULT 0;
