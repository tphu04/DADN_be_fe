/*
  Warnings:

  - You are about to drop the `sensordata` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `sensordata` DROP FOREIGN KEY `SensorData_feedId_fkey`;

-- DropForeignKey
ALTER TABLE `sensordata` DROP FOREIGN KEY `sensordata_device_fk`;

-- DropTable
DROP TABLE `sensordata`;
