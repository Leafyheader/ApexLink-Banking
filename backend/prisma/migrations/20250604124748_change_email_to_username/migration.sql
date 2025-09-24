/*
  Warnings:

  - You are about to drop the column `email` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- First add the username column allowing NULL
ALTER TABLE `user` ADD COLUMN `username` VARCHAR(191);

-- Copy email values to username
UPDATE `user` SET `username` = `email`;

-- Make username NOT NULL after data is copied
ALTER TABLE `user` MODIFY `username` VARCHAR(191) NOT NULL;

-- Create the unique index for username
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- Finally drop the email column and its index
DROP INDEX `User_email_key` ON `user`;
ALTER TABLE `user` DROP COLUMN `email`;
