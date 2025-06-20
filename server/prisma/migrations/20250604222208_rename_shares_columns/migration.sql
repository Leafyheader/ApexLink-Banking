/*
  Warnings:

  - You are about to drop the column `shares` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `sharesBalance` on the `account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `account` DROP COLUMN `shares`,
    DROP COLUMN `sharesBalance`,
    ADD COLUMN `shareBalance` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `sharesAvailableBalance` DECIMAL(65, 30) NULL DEFAULT 0;
