# Factory Pattern cho Thiết bị IoT

Trong dự án này, chúng tôi đã áp dụng Factory Pattern để tạo ra các thiết bị IoT khác nhau.

## Giới thiệu về Factory Pattern

Factory Pattern là một design pattern thuộc nhóm creational pattern, được sử dụng để tạo ra các đối tượng mà không cần chỉ định chính xác lớp của đối tượng sẽ được tạo. Pattern này đặc biệt hữu ích khi:

- Hệ thống cần tạo nhiều đối tượng khác nhau nhưng có liên quan đến nhau
- Quy trình khởi tạo đối tượng phức tạp và cần được tập trung hóa
- Muốn tạo ra các đối tượng mà không tiết lộ logic tạo đối tượng cho client

## Triển khai Factory Pattern trong dự án

Trong dự án, chúng tôi đã triển khai Factory Pattern với các thành phần sau:

### 1. Abstract Factory (DeviceFactory)
Đây là lớp cơ sở định nghĩa giao diện chung cho việc tạo thiết bị:

```javascript
class DeviceFactory {
    async createDevice(deviceData) {
        throw new Error('Method createDevice() must be implemented by subclasses');
    }
    
    async initializeDevice(device) {
        // Xử lý chung cho tất cả thiết bị
        // ...
    }
}
```

### 2. Concrete Factories

#### TemperatureHumidityDeviceFactory
Factory chuyên biệt để tạo thiết bị đo nhiệt độ và độ ẩm:

```javascript
class TemperatureHumidityDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        // Xử lý tạo thiết bị nhiệt độ và độ ẩm
        // ...
    }
}
```

#### SoilMoistureDeviceFactory
Factory chuyên biệt để tạo thiết bị đo độ ẩm đất:

```javascript
class SoilMoistureDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        // Xử lý tạo thiết bị đo độ ẩm đất
        // ...
    }
}
```

#### PumpWaterDeviceFactory
Factory chuyên biệt để tạo thiết bị bơm nước:

```javascript
class PumpWaterDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        // Xử lý tạo thiết bị bơm nước
        // ...
    }
}
```

### 3. Factory Creator
Lớp trung gian để chọn factory phù hợp dựa trên loại thiết bị:

```javascript
class DeviceFactoryCreator {
    static getFactory(deviceType) {
        switch (deviceType) {
            case 'temperature_humidity':
                return new TemperatureHumidityDeviceFactory();
            case 'soil_moisture':
                return new SoilMoistureDeviceFactory();
            case 'pump_water':
                return new PumpWaterDeviceFactory();
            default:
                throw new Error(`Không hỗ trợ loại thiết bị: ${deviceType}`);
        }
    }
}
```

### 4. Hàm tiện ích tạo thiết bị cụ thể 

Ngoài cách sử dụng Factory Pattern tiêu chuẩn, chúng tôi còn cung cấp các hàm tiện ích để tạo từng loại thiết bị cụ thể:

```javascript
// Tạo thiết bị đo nhiệt độ và độ ẩm
async function createTemperatureHumidityDevice(deviceData) {
    const factory = new TemperatureHumidityDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'temperature_humidity'
    });
}

// Tạo thiết bị đo độ ẩm đất
async function createSoilMoistureDevice(deviceData) {
    const factory = new SoilMoistureDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'soil_moisture'
    });
}

// Tạo thiết bị máy bơm nước
async function createPumpWaterDevice(deviceData) {
    const factory = new PumpWaterDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'pump_water'
    });
}

// Tạo thiết bị dựa vào loại
async function createDeviceByType(deviceType, deviceData) {
    const factory = DeviceFactoryCreator.getFactory(deviceType);
    return await factory.createDevice({
        ...deviceData,
        deviceType
    });
}
```

## Cách sử dụng

### 1. Sử dụng Factory thông qua DeviceFactoryCreator:

```javascript
const { DeviceFactoryCreator } = require('../factory/DevicePatternFactory');

// Dữ liệu thiết bị
const deviceData = {
    deviceCode: "PumpWater_123",
    deviceType: "pump_water",
    // ...
};

// Lấy factory phù hợp
const factory = DeviceFactoryCreator.getFactory(deviceData.deviceType);

// Tạo thiết bị
const device = await factory.createDevice(deviceData);
```

### 2. Sử dụng qua Model:

```javascript
const Device = require('../models/device');

// Dữ liệu thiết bị
const deviceData = {
    deviceCode: "PumpWater_123",
    deviceType: "pump_water",
    // ...
};

// Tạo thiết bị
const device = await Device.create(deviceData);
```

### 3. Sử dụng các hàm tiện ích tạo thiết bị cụ thể:

```javascript
const { 
    createTemperatureHumidityDevice,
    createSoilMoistureDevice,
    createPumpWaterDevice,
    createDeviceByType
} = require('../factory/DevicePatternFactory');

// Tạo thiết bị đo nhiệt độ và độ ẩm 
const tempHumidDevice = await createTemperatureHumidityDevice({
    deviceCode: "DHT20_123",
    description: "Thiết bị đo nhiệt độ và độ ẩm DHT20",
    status: "On",
    // ...
});

// Tạo thiết bị đo độ ẩm đất
const soilMoistureDevice = await createSoilMoistureDevice({
    deviceCode: "SoilSensor_123",
    description: "Cảm biến đo độ ẩm đất",
    // ...
});

// Tạo thiết bị máy bơm nước
const pumpDevice = await createPumpWaterDevice({
    deviceCode: "Pump_123",
    description: "Máy bơm nước tưới cây",
    // ...
});

// Tạo thiết bị bằng hàm chung createDeviceByType
const device = await createDeviceByType('temperature_humidity', {
    deviceCode: "Generic_123",
    description: "Thiết bị tạo bằng hàm createDeviceByType",
    // ...
});
```

## Lợi ích của Factory Pattern

1. **Đóng gói logic tạo đối tượng**: Tách biệt logic tạo đối tượng khỏi code sử dụng đối tượng
2. **Dễ bảo trì và mở rộng**: Khi cần thêm loại thiết bị mới, chỉ cần tạo factory mới mà không cần sửa đổi code cũ
3. **Đảm bảo tính nhất quán**: Mọi thiết bị đều được tạo theo quy trình chuẩn
4. **Tập trung xử lý lỗi**: Xử lý lỗi tập trung tại factory
5. **API đơn giản hóa**: Các hàm tiện ích giúp đơn giản hóa việc tạo thiết bị cụ thể

## Cách thêm loại thiết bị mới

Để thêm một loại thiết bị mới (ví dụ: light_sensor):

1. Cập nhật enum DeviceType trong Prisma schema:
```prisma
enum DeviceType {
  temperature_humidity
  soil_moisture
  pump_water
  light_sensor
}
```

2. Tạo factory mới:
```javascript
class LightSensorDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        // Xử lý tạo thiết bị đo ánh sáng
    }
}
```

3. Cập nhật DeviceFactoryCreator:
```javascript
static getFactory(deviceType) {
    switch (deviceType) {
        // Các case hiện tại
        case 'light_sensor':
            return new LightSensorDeviceFactory();
        default:
            throw new Error(`Không hỗ trợ loại thiết bị: ${deviceType}`);
    }
}
```

4. Thêm hàm tiện ích mới:
```javascript
async function createLightSensorDevice(deviceData) {
    const factory = new LightSensorDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'light_sensor'
    });
}
```

5. Cập nhật exports:
```javascript
module.exports = {
    // Các export hiện có
    createLightSensorDevice
};
``` 