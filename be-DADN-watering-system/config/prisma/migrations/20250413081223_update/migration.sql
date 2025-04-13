-- CreateTable
CREATE TABLE `admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullname` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `adminCode` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Admin_email_key`(`email`),
    UNIQUE INDEX `Admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `deviceId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `humidityMax` DOUBLE NOT NULL DEFAULT 100,
    `humidityMin` DOUBLE NOT NULL DEFAULT 0,
    `lightOn` BOOLEAN NOT NULL DEFAULT false,
    `pumpWaterOn` BOOLEAN NOT NULL DEFAULT false,
    `pumpWaterSpeed` INTEGER NOT NULL DEFAULT 0,
    `soilMoistureMax` DOUBLE NOT NULL DEFAULT 100,
    `soilMoistureMin` DOUBLE NOT NULL DEFAULT 0,
    `temperatureMax` DOUBLE NOT NULL DEFAULT 100,
    `temperatureMin` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Configuration_deviceId_fkey`(`deviceId`),
    INDEX `Configuration_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feed` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `feedKey` VARCHAR(191) NOT NULL,
    `minValue` DOUBLE NULL,
    `maxValue` DOUBLE NULL,
    `lastValue` DOUBLE NULL,
    `deviceId` INTEGER NOT NULL,

    UNIQUE INDEX `feed_deviceId_key`(`deviceId`),
    INDEX `Feed_deviceId_fkey`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iotdevice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceCode` VARCHAR(191) NOT NULL,
    `deviceType` ENUM('temperature_humidity', 'soil_moisture', 'pump_water', 'light') NOT NULL,
    `status` ENUM('On', 'Off') NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mqttUsername` VARCHAR(191) NULL,
    `mqttApiKey` VARCHAR(191) NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `lastSeen` DATETIME(3) NULL,
    `lastSeenAt` DATETIME(3) NULL,

    UNIQUE INDEX `IoTDevice_deviceCode_key`(`deviceCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lightdata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('On', 'Off') NOT NULL,
    `readingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deviceId` INTEGER NOT NULL,
    `intensity` INTEGER NOT NULL DEFAULT 0,
    `lightUserId` INTEGER NULL,

    INDEX `LightData_deviceId_fkey`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deviceId` INTEGER NOT NULL,

    INDEX `Notification_deviceId_fkey`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pumpwaterdata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(191) NOT NULL,
    `pumpSpeed` INTEGER NOT NULL,
    `readingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deviceId` INTEGER NOT NULL,
    `pumpUserId` INTEGER NULL,

    INDEX `PumpWaterData_deviceId_fkey`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soilmoisturedata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moistureValue` DOUBLE NOT NULL,
    `readingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deviceId` INTEGER NOT NULL,

    INDEX `SoilMoistureData_deviceId_fkey`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `temperaturehumiditydata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `temperature` DOUBLE NOT NULL,
    `humidity` DOUBLE NOT NULL,
    `readingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deviceId` INTEGER NOT NULL,

    INDEX `TemperatureHumidityData_deviceId_fkey`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullname` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `role` VARCHAR(10) NULL DEFAULT 'USER',
    `isAccepted` BOOLEAN NULL DEFAULT false,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `configuration` ADD CONSTRAINT `Configuration_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iotdevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuration` ADD CONSTRAINT `Configuration_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feed` ADD CONSTRAINT `Feed_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iotdevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lightdata` ADD CONSTRAINT `LightData_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iotdevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `Notification_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iotdevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pumpwaterdata` ADD CONSTRAINT `PumpWaterData_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iotdevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soilmoisturedata` ADD CONSTRAINT `SoilMoistureData_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iotdevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temperaturehumiditydata` ADD CONSTRAINT `TemperatureHumidityData_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iotdevice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
