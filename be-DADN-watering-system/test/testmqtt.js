const mqttService = require('../src/services/mqtt.service');

async function testMQTTConnection() {
  const mqtt = new mqttService();
  
  // Đợi 1 giây để kết nối được thiết lập
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Kiểm tra trạng thái kết nối
  console.log('MQTT Connection status:', mqtt.checkConnection());
  
  // Test publish một message
  if (mqtt.checkConnection()) {
    mqtt.client.publish('test/topic', 'test message', (err) => {
      if (err) {
        console.error('Failed to publish:', err);
      } else {
        console.log('Test message published successfully');
      }
    });
  }
}

testMQTTConnection();